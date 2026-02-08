# Orders Module: Complete Technical & Functional Blueprint

This document provides a comprehensive overview of the Orders module, covering UI, logic, data model, and system impacts.

---

## 1. UI SCREENS

### **A) Order List** (`Orders.tsx`)
- **Purpose**: High-level overview of all transactions.
- **Filters**:
  - Search (Customer Name, Order Number)
  - Status Tabs (All, Pending, In Production, Completed, Cancelled)
- **Columns Shown**:
  - Order # (Automatic Number)
  - Status (Badge)
  - Date (Order Date)
  - Customer Name
  - Items Summary (Truncated list + count)
  - Material Type (Own Material / Client Material)
  - Total Amount (₹)

### **B) Create Order** (`OrderCreate.tsx`)
- **Purpose**: Full-screen "Workbench" for rapid order entry.
- **Material Types**:
  - **Job Work (Client Material)**: Customer provides material.
  - **Sale (Own Material)**: System reduces finished goods stock.
- **Fields**:
  | Field | Type | Mandatory | Default |
  |-------|------|-----------|---------|
  | Customer Name | Searchable Text | Yes | - |
  | Order Date | Date Picker | Yes | Today |
  | Delivery Date | Date Picker | No | - |
  | Material Type | Toggle | Yes | Job Work |
  | Items | Dynamic List | Yes (min 1) | Empty |
  | GST Enabled | Toggle | Yes | Auto (Off for Client, On for Sale) |
  | Discount Amount | Number | No | 0 |
  | Advance Payment | Number | No | 0 |
  | Payment Mode | Dropdown | No | CASH |

### **C) Order View / Print** (`OrderPrint.tsx`)
- **Purpose**: Professional invoice generation for printing or sharing (WhatsApp).
- **Features**: Live Rate display, Business Header, Itemized Table, GST Breakdown, Round-off logic.

---

## 2. ITEM ROW STRUCTURE

The order uses a dynamic "Workbench" system where items are added to a draft bill before saving.

- **Maximum Lines**: Unlimited.
- **Row Columns**:
  - **Selection**: Product (from Catalog) OR Service (from Service Master).
  - **Description**: Auto-filled but editable.
  - **Quantity**: Numerical input (Manual or Auto-Detect).
  - **Unit**: PC / KG / Grams etc.
  - **Rate**: Price per unit (Auto-filled from Catalog/JobWork).
  - **Karigar**: Optional selection for worker tracking.
- **Calculation**: 
  - `Item Total = Quantity * Rate`
  - `Grand Total = (Sum of Item Totals - Discount) + GST`

---

## 3. DATA MODEL

### **Table: `orders`**
| Column | Type | Purpose |
|--------|------|---------|
| `id` | UUID | Primary Key |
| `order_number` | Serial | Human readable ID (e.g. 1001) |
| `customer_name`| TEXT | Name of the buyer/client |
| `material_type`| TEXT | 'OWN' or 'CLIENT' |
| `status` | TEXT | Pending / Completed / Cancelled |
| `subtotal` | NUMERIC| Total before GST |
| `gst_amount` | NUMERIC| Tax calculated |
| `total_amount` | NUMERIC| Final bill value |

### **Table: `order_items`**
| Column | Type | Purpose |
|--------|------|---------|
| `order_id` | UUID | Link to parent order |
| `description` | TEXT | Item name/type |
| `quantity` | NUMERIC| Amount ordered |
| `rate` | NUMERIC| Selling price per unit |
| `product_id` | UUID | Link to inventory (if OWN) |

---

## 4. BUSINESS LOGIC (SAVE FLOW)

When the user clicks **SAVE ORDER**, the system executes a single **Atomic Transaction** (PostgreSQL RPC):

1. **Isolation**: Identifies user-specific ledgers (Customers, Sales, GST).
2. **Subtotal Calc**: Multiplies `qty * rate` for all items.
3. **GST Calc**: Applies current GST rate on taxable amount.
4. **Order Creation**: Inserts header into `orders` table.
5. **Item Processing** (Loop):
   - Inserts into `order_items`.
   - **Stock**: If 'OWN' material, reduces `products.current_stock`.
   - **Karigar**: If a worker is assigned, creates a `karigar_work_records` entry (Status: PENDING).
6. **Accounting (Ledger Posting)**:
   - **Debit**: Customer Ledger (Total Amount).
   - **Credit**: Sales/JobWork Income Ledger (Subtotal).
   - **Credit**: GST Output Tax Ledger (Tax Amount).

---

## 5. STOCK IMPACT

| Condition | Action | Result |
|-----------|--------|--------|
| **Own Material** (Sale) | Reduce Stock | `current_stock = current_stock - quantity` |
| **Client Material** (Job Work) | No Action | Inventory remains unchanged. |
| **Service Only** | No Action | No physical items involved. |

---

## 6. ACCOUNTING IMPACT

- **Immediate Debt**: The moment an order is saved, the Customer Ledger is debited for the full amount. This reflects as "Amount Receivable" from that customer.
- **Advance/Payment**: If an advance is entered, it creates a separate PAYMENT transaction in the ledger to offset the debit.

---

## 7. LIMITATIONS

- **Editing**: Orders cannot be directly "Edited" to change quantities or prices once saved. This is a safety feature to maintain accounting integrity.
  - *Workaround*: Cancel/Delete the order and create a new one.
- **Material Mixing**: A single order cannot mix 'OWN' and 'CLIENT' materials (Logic is per order header).
- **Stock Reversal**: Deleting an order *automatically* restores the stock and removes ledger entries using the `delete_order_atomic` logic.

---

## 8. SUMMARY FLOW

**User Action** → `Create Order` (Fills form, Adds items)
**↓**
**User Interaction** → `Save Order`
**↓**
**System Process** → Check Stock → Insert Order & Items → **Reduce Stock** → **Post to Ledgers** → Create Karigar Record
**↓**
**Result** → Success Modal → Print Invoice / Share on WhatsApp.
