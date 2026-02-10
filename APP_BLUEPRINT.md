# Radha Rani (Nexora) - Technical Blueprint

This document provides a comprehensive technical overview of the application architecture, database design, and core business logic for the Radha Rani ERP system.

## 🚀 Tech Stack

- **Frontend**: React (Vite)
- **Styling**: Vanilla CSS with Tailwind CSS utilities.
- **Backend/DB**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (JWT based)
- **Storage**: Supabase Storage (for product/image uploads)

---

## 📂 Project Structure

```text
/src
  /app
    /components     # Reusable UI components (Modals, Skeletons, Layout)
    /pages          # Main page components (Dashboard, Orders, Catalog, etc.)
  /context          # React Context (Auth, Settings) for global state
  /services         # Core business logic and API wrappers (Supabase RPCs)
  /types            # TypeScript interfaces and types
  /utils            # Helper functions (Formatting, PDF generation)
/supabase
  /migrations       # SQL migration files for DB schema
```

---

## 🗄️ Database Architecture (Supabase)

The database follows a multi-tenant design where every table is secured via **Row Level Security (RLS)** using `auth.uid() = user_id`.

### Core Tables
| Table | Description | Key Columns |
| :--- | :--- | :--- |
| `ledgers` | Accounts for customers, vendors, and expenses. | `name`, `type` (ASSET/LIABILITY), `is_system`, `running_balance` |
| `orders` | Sales and Job Work orders. | `order_number`, `material_type` (OWN/CLIENT), `total_amount`, `status` |
| `order_items` | Line items for each order. | `description`, `quantity`, `rate`, `item_type` (PRODUCT/SERVICE) |
| `products` | Finished goods catalog. | `name`, `category`, `current_stock`, `default_weight`, `barcode` |
| `transactions` | Financial entries (Double-entry). | `ledger_id`, `debit`, `credit`, `order_id` |
| `stock_transactions`| Inventory movement logs. | `type` (PRODUCTION/WASTAGE/OUT), `weight_gm`, `item_type` |
| `metal_rates` | Live and Local rates. | `metal_type` (GOLD/SILVER), `selling_rate`, `buying_rate`, `source` |
| `karigars` | Artisans management. | `name`, `work_type`, `current_balance` |

---

## ⚙️ Core Application Logic

### 1. Metal Pricing System (`rateService.ts`)
- **Live Market Rates**: Historical rates from MCX or other sources.
- **Local Shop Rates**: Controlled manually by the user, used for calculations.
- **Real-time Sync**: The Dashboard uses a "Super RPC" and listens to `metal_rates` for instant UI updates.

### 2. Accounting Logic (`accountingService.ts`)
- **Double-Entry**: Every order or payment creates balanced entries in `transactions`.
- **Ledger Balances**: Calculated as `SUM(debit) - SUM(credit)`.
- **Receivables/Advances**: Aggregated per tenant to prevent double-counting.

### 3. Inventory Management (`inventoryService.ts`)
- **Raw Material**: Tracked in `metal_inventory` and `stock_transactions`.
- **Wastage**: Automatically calculated/deducted during production.
- **Finished Goods**: Managed in the `products` table with linked transactions.

---

## 🛠️ Critical Workflows

### Order Lifecycle
1. **Creation**: `OrderCreate.tsx` collects items -> calculates GST -> saved to `orders`.
2. **Accounting**: On save, a transaction is created in the customer's ledger.
3. **Stock**: Finished goods stock is updated if available.

### Dashboard Performance
- **Super RPC**: `get_dashboard_composite_data()` fetches KPIs, Recent Orders, Stock, and Rates in **one single database call** to ensure <1s page load.
- **Cache Strategy**: `cacheStore.ts` provides a 1-minute TTL with "Stale-While-Revalidate" logic and cross-tab invalidation.

---

## 🔐 Security & Maintenance
- **Multi-Tenancy**: Users can only see their own data via RLS.
- **Backups**: Managed via the `BackupRestore.tsx` page using JSON exports.
- **Audit Logs**: Every critical action is logged in the `audit_logs` table.

---
**Document Version**: 1.0 (Feb 2026)
**Handover Status**: Complete
