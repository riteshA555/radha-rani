# Catalog Modules: Product & Service Blueprint

This document explains how the Product Catalogue (Physical Items) and Service Catalogue (Labour/Job Work) are structured and integrated into the system.

---

## 1. PRODUCT CATALOGUE (Metal / Physical Items)

### **A) UI Screens**
- **Catalog View** (`Catalog.tsx`):
  - **Purpose**: Unified view to browse, search, and manage all products.
  - **Views**: Supports both **Grid View** (Image-heavy) and **List View** (Data-heavy).
- **Add/Edit Product Modal**:
  - **Purpose**: Define product parameters and initial stock.
  - **Fields**:
    | Field | Type | Mandatory | Default |
    |-------|------|-----------|---------|
    | Product Name | Text | Yes | - |
    | Category | Dropdown | Yes | - |
    | Size | Dropdown | No | Small/Medium/Large |
    | Default Weight (gm) | Number | Yes | 0 |
    | Wastage % | Number | No | 0 |
    | Labour Cost (₹) | Number | No | From Settings |
    | Current Stock (qty) | Number | Yes | 0 |
    | GST Rate % | Dropdown | Yes | From Settings (3%) |
    | Product Image | File Upload | No | Icon placeholder |

### **B) DATA MODEL (`products` table)**
| Column | Data Type | Purpose |
|--------|-----------|---------|
| `name` | TEXT | Display name of the ornament/item. |
| `category` | TEXT | Grouping (e.g. Rings, Necklace). |
| `default_weight`| NUMERIC | Standard weight used for calculations in Orders. |
| `current_stock` | NUMERIC | Real-time available quantity. |
| `wastage_percent`| NUMERIC | Default wastage added to weight during sale. |
| `labour_cost` | NUMERIC | Default making charge. |
| `is_active` | BOOLEAN | Soft-delete status. |

### **C) BUSINESS LOGIC**
- **Creation**: When a product is added with `current_stock > 0`, the system automatically calls `add_stock_entry_atomic` to record an "Opening Stock" transaction in the stock history.
- **Stock Tracking**: `current_stock` is not just a number; it is managed by transactional RPCs (Orders reduce it, Stock entries increase it).
- **Order Capture**: In Order module, selecting a product auto-fills its `weight`, `rate` (labour), and `GST`.

---

## 2. SERVICE CATALOGUE (Labour / Job Work)

### **A) UI Screens**
- **Catalog - Services Tab** (`Catalog.tsx`): Manage service rates with visual icons.
- **Service Master** (`ServiceMaster.tsx`): Dedicated tabular view for high-speed service management.
- **Add/Edit Service Modal**:
  | Field | Type | Mandatory | Default |
  |-------|------|-----------|---------|
  | Service Name | Text | Yes | - |
  | Unit | Dropdown | Yes | PCS |
  | Default Rate (₹) | Number | Yes | 0 |

### **B) DATA MODEL (`job_work_items` table)**
| Column | Data Type | Purpose |
|--------|-----------|---------|
| `name` | TEXT | Name of the service (e.g., Polishing, Meena). |
| `unit` | TEXT | Billing unit (KG, Piece, Jodi). |
| `default_rate` | NUMERIC | Standard labor charge per unit. |

### **C) BUSINESS LOGIC**
- **Rate Storage**: Stores a fixed `default_rate` which acts as the starting point during billing.
- **Order Retrieval**: Services appear in a searchable dropdown in the "Job Work" mode of the Order screen.

---

## 3. INTEGRATION & CONNECTIVITY

### **Order Module Connection**
- **Products**: Linked via `product_id`. When an "Own Material" order is saved, the item is linked to the catalog for stock depletion.
- **Services**: Linked via name/description. Used for both "Job Work" (main items) and "Sale" (additional services like hallmark).

### **Ledger Integration**
- **Client Raw Material Ledger**: Currently, this ledger uses a separate master called **Base Material Types** (`base_material_types`). 
- **The Link**: There is **no automated link** between Catalog products and the Raw Material Ledger. The Raw Material Ledger tracks "White Metal" weight, while the Catalog tracks "Finished Units".

---

## 4. LIMITATIONS

- **Manual Selection**: In the Order module, the user must manually toggle between 'Product' and 'Service' modes in the workbench.
- **Price Fluctuations**: Catalog rates are static (except labour). Metal rates are pulled from a separate `metal_rates` master.
- **Stock-Only Products**: Services do not have stock tracking. If an item needs stock tracking, it *must* be defined as a Product.

---

## 5. SUMMARY FLOW

**Management**: User adds Product → Atomic Stock Entry → Catalog Updated
**↓**
**Sales Flow**: User selects Product in Order → System pulls Default Weight/Rate → Stock Reserved
**↓**
**Completion**: Order Saved → `current_stock` reduced → Financials updated
