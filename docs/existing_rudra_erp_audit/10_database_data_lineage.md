# 10. DATABASE DATA LINEAGE & ENTITY RELATIONSHIP AUDIT

**System:** Rudhra Jewellers ERP  
**Scope:** Complete Relational Schema, Foreign Key Mapping & Data Traceability  
**Database Tables Covered:** `products`, `product_designs`, `categories`, `subcategories`, `raw_materials`, `job_orders`, `work_orders`, `work_order_items`, `work_order_received_pieces`, `work_order_operations`, `work_order_timelines`, `karigars`, `clients`, `invoices`, `sale_items`, `inventory_movements`, `purchase_entries`  
**Evidence Source:** Confirmed from migrations, Eloquent model relationships, and foreign key definitions.

---

## 1. Complete Entity Relationship Summary (ERD)

```text
┌──────────────┐
│  categories  │
└──────┬───────┘
       │ 1 : N
       ├─────────────────────────────────────────┐
       ▼                                         ▼
┌──────────────┐                          ┌──────────────┐
│subcategories │                          │   products   │ ◄──────────────────┐
└──────┬───────┘                          └──────┬───────┘                    │
       │ 1 : N                                   │                            │
       └─────────────────────────────────────────┤ 1 : N                      │
                                                 ▼                            │
┌──────────────┐                          ┌──────────────┐                    │
│   clients    │                          │product_design│                    │
└──────┬───────┘                          └──────────────┘                    │
       │ 1 : N                                                                │
       ▼                                                                      │
┌──────────────┐                          ┌──────────────┐                    │
│  job_orders  │                          │raw_materials │                    │
└──────┬───────┘                          └──────────────┘                    │
       │ 1 : N                                                                │
       ▼                                                                      │
┌──────────────┐ 1 : N ┌────────────────┐                                     │
│ work_orders  ├──────►│work_order_items│                                     │
└──────┬───────┘       └────────────────┘                                     │
       │                                                                      │
       ├─► 1 : N ──► ┌───────────────────────────┐                            │
       │             │   work_order_timelines    │                            │
       │             └───────────────────────────┘                            │
       ├─► 1 : N ──► ┌───────────────────────────┐                            │
       │             │   work_order_operations   │                            │
       │             └───────────────────────────┘                            │
       ├─► 1 : N ──► ┌───────────────────────────┐                            │
       │             │work_order_received_pieces ├────────────────────────────┘ (product_id)
       │             └─────────────┬─────────────┘
       ▼ N : 1                     │
┌──────────────┐                   │
│   karigars   │                   │
└──────────────┘                   │
                                   ▼ 1 : 1
┌──────────────┐ 1 : N ┌─────────────────────────┐
│   invoices   ├──────►│   sale_items            │
└──────┬───────┘       └─────────────────────────┘
       │ 1 : N
       ▼
┌──────────────┐       ┌─────────────────────────┐
│ sale_payments│       │   inventory_movements   │
└──────────────┘       └─────────────────────────┘
```

---

## 2. End-to-End Field Traceability Matrix

This table maps the exact lineage of key jewellery attributes across all system lifecycle transitions:

| Business Metric | Product Master (`products`) | Job Creation (`work_orders`) | Work Item (`work_order_items`) | Receiving (`work_order_received_pieces`) | Printed Tag (`JewelleryTagCard`) | Sales (`sale_items`) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Design Reference** | `design_no` / `product_code` | `design_code` | `design_no` | `design_no` | Upper right & lower right text | `product_code` |
| **Gross Weight** | `opening_stock_weight` | `allotted_weight` (est) | `allotted_weight` | `gross_weight` | Left panel `G.Wt -{gross}` | `gross_weight` |
| **Net Gold Weight** | `opening_fine_weight` | Derived from items | Calculated | `net_gold_weight` | Formula deducts stones | `net_weight` |
| **Purity / Karat** | `attributes->purity` | `material_type` | `material_type` | `gold_karat` / `purity` | Left panel `22K` / `18K` | `purity` |
| **Diamond Carats** | `attributes->dia_wt_ct` | `pricing_details['dia_wt']`| `stone_details` | `diamond_weight` | Left panel `Dia-{wt}` & `T.Dia-`| `stone_weight` |
| **Diamond Count** | `attributes->diamond_count`| `pricing_details['diamonds']`| `stone_details` | `diamond_count` | Left panel `/{count}` in spec | `details->dia_count` |
| **Diamond Stamp** | `attributes->stamp` | `pricing_details['stamp']` | `pricing_details` | `diamond_details` | Left panel `/+{stamp}/` in spec| `details->stamp` |
| **Unique Barcode** | `product_code` / SKU | `work_order_number` | `item_code` | `tag_number` (`TAG-YYYY-XXXXXX`)| Vector SVG & Monospace text | `product_code` |
| **Making Charges** | `attributes->making_charge`| `making_charge_per_gram`| `making_charge_per_gram`| `total_making_charge` | N/A (Internal cost) | `making_charge` |
| **HUID Code** | `attributes->huid` | `pricing_details['huid']`| `pricing_details['huid']`| `huid` | Optional tag footnote | `details->huid` |

---

## 3. Relational Foreign Key Integrity

### 1. `job_orders` ➔ `work_orders`:
- Key: `work_orders.job_order_id` references `job_orders.id` (`onDelete('cascade')`).
- Parent summarizes child weights via `JobOrder::updateDerivedStatus()`.

### 2. `work_orders` ➔ `work_order_items`:
- Key: `work_order_items.work_order_id` references `work_orders.id` (`onDelete('cascade')`).
- Represents multi-job design breakdown.

### 3. `work_orders` ➔ `work_order_received_pieces`:
- Key: `work_order_received_pieces.work_order_id` references `work_orders.id`.
- Key: `work_order_received_pieces.work_order_item_id` references `work_order_items.id`.
- Key: `work_order_received_pieces.product_id` references `products.id` (Single-Master link).
- Unique Index: `work_order_received_pieces.tag_number` (Globally unique index preventing duplicate tags).

### 4. `work_orders` ➔ `karigars`:
- Key: `work_orders.karigar_id` references `karigars.id`.
- Drives artisan workbench queries and gold-on-bench liabilities.

### 5. `products` ➔ `inventory_movements`:
- Key: `inventory_movements.product_id` references `products.id`.
- Permanent ledger audit trail for every physical quantity and weight modification.

---

## 4. Identified Relational Anomalies & Schema Nuances

1. **Dual Column Representation for Product Codes:**
   - In `products`: `product_code` was the original SKU column; migration `2026_10_06_000001` added `design_no`. In older products, `design_no` is null and `product_code` holds the design string. The application safely handles this using `$product->design_no ?: $product->product_code`.
2. **JSON Blob Redundancy:**
   - In `work_orders`, the column `pricing_details` stores a serialized JSON snapshot of all items, documents, delays, and worker allocations. This duplicate representation exists alongside the strongly typed relational tables (`work_order_items`, `work_order_received_pieces`).
   - **Recommendation for New ERP:** Deprecate JSON redundancy in favor of pure relational normalization.
