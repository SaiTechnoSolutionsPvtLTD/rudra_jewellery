# 03. INVENTORY & STOCK LOGIC DEEP ANALYSIS

**System:** Rudhra Jewellers ERP  
**Scope:** Raw Materials Vault, Finished Goods Inventory, Physical Piece Tags, Stock Ledger, Valuation, and Cross-Module Synchronization.  
**Evidence Source:** Confirmed from `RawMaterial.php`, `Product.php`, `InventoryMovement.php`, `InventoryController.php`, `WorkOrderController.php`, `PurchaseEntryController.php`, and `SaleService.php`.

---

## 1. Dual-Track Inventory Architecture

The software operates two distinct, parallel inventory engines:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      RUDHRA JEWELLERS INVENTORY                        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┴──────────────────────────┐
         ▼                                                     ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│     RAW MATERIALS VAULT         │   │    FINISHED GOODS CATALOG       │
│    (Table: raw_materials)       │   │       (Table: products)         │
├─────────────────────────────────┤   ├─────────────────────────────────┤
│ • Tracks Bulk Bullion & Metals  │   │ • Tracks Finished Jewellery     │
│ • Gold 24K / 22K (kg / grams)   │   │ • Stocked by Design No / SKU    │
│ • Silver (kg / grams)           │   │ • Physical Piece Count (Qty)    │
│ • Diamonds (Carats)             │   │ • Gross Weight (grams)          │
│ • Debited upon Job Order Allot  │   │ • Pure 24K Gold Equivalent      │
│ • Credited upon Metal Purchase  │   │ • Credited upon Final Receive   │
└─────────────────────────────────┘   │ • Decremented upon POS Sale     │
                                      └────────────────┬────────────────┘
                                                       │ 1 : N
                                                       ▼
                                      ┌─────────────────────────────────┐
                                      │  PHYSICAL PIECE BARCODE TAGS    │
                                      │(work_order_received_pieces)     │
                                      ├─────────────────────────────────┤
                                      │ • Unique TAG-YYYY-XXXXXX        │
                                      │ • Exact Piece Gross & Net Wt    │
                                      │ • Individual Karat & Touch %    │
                                      │ • Individual HUID / Cert No     │
                                      │ • Linked to Product Master ID   │
                                      └─────────────────────────────────┘
```

---

## 2. Raw Material Vault (`raw_materials` Table)

### A. Schema Structure
- `id`: Primary key.
- `material_type`: Enum / string (`gold`, `gold_22k`, `silver`, `platinum`, `diamond`, `stone`).
- `name`: Display label (`Raw Gold`, `Raw Silver`, `Raw Diamond`).
- `purchased_weight`: Total lifetime purchased weight (float).
- `allocated_weight`: Current active weight allocated to ongoing work orders (float).
- `current_balance`: Real-time available vault stock (`purchased_weight - allocated_weight`).
- `unit`: Measurement unit (`kg`, `grams`, `ct`, `units`).

### B. Debit & Credit Rules
1. **Crediting Vault (`RawMaterial::creditPurchase($matType, $weightOrQty)`):**
   - Triggered when a purchase entry with `purchase_type = 'raw_material'` is saved in `PurchaseEntryController::store()`.
   - If unit is `kg` and input weight > 50g, automatically divides by 1000 to convert grams to kg.
   - Formula:
     $$\text{purchased\_weight} = \text{purchased\_weight} + \text{added\_weight}$$
     $$\text{current\_balance} = \max(0, \text{purchased\_weight} - \text{allocated\_weight})$$

2. **Debiting Vault (`RawMaterial::debitAllocation($matType, $weightOrQty)`):**
   - Triggered when a new Work Order is saved in `WorkOrderController::store()`.
   - Adds the new work order's allotted weight to `allocated_weight`.
   - Formula:
     $$\text{allocated\_weight} = \text{allocated\_weight} + \text{allotted\_weight}$$
     $$\text{current\_balance} = \text{purchased\_weight} - \text{allocated\_weight}$$

> [!IMPORTANT]
> **Negative Balance Allowance Rule:**
> In `RawMaterial::debitAllocation()`, the software intentionally allows `current_balance` to drop into **negative values** (e.g. allocating 50g when current stock is 0g yields `-50.000g`).
> **Business Rationale:** In jewelry manufacturing, physical bullion is frequently issued from the workshop safe or scrap melt before the administrative purchase voucher is finalized in the system. Clamping to zero would artificially block job assignment and halt artisan production.

3. **Dynamic Re-synchronization (`RawMaterial::recalculateAllocations()`):**
   - Executed on Dashboard load and Work Order completion:
     $$\text{Gold Allocated} = \sum_{\text{Active Work Orders}} \text{allotted\_weight} \quad (\text{status} \notin [\text{completed}, \text{cancelled}, \text{delivered}])$$

---

## 3. Finished Goods Inventory (`products` Table)

### A. Core Metrics & Source of Truth
Every finished product record in `products` maintains:
1. `current_stock_qty` (Integer): Total physical units currently on the store shelf.
2. `opening_stock_weight` (Float): Gross weight of available inventory in grams.
3. `opening_fine_weight` (Float): Net gold weight / pure 24K equivalent in grams.
4. `opening_touch` (Float): Purity rating (e.g. `91.60`).
5. `opening_stock_rate` (Float): Valuation rate per gram.

### B. Finished Stock Inward vs. Outward Triggers

| Event | Triggering Action | Controller / Service | Database Writes |
| :--- | :--- | :--- | :--- |
| **New Product Master** | Product Creation Form | `InventoryController::store` | Sets initial `opening_stock_qty` and `current_stock_qty`. |
| **Work Order Receive** | Physical Piece Receiving | `WorkOrderController::receivePiece` | Creates `WorkOrderReceivedPiece`. Inventory posting remains deferred (`is_inventory_posted = false`). |
| **Final Stock Posting** | Cert / Hallmark Completion or `finalizeInventory` | `WorkOrderController::syncInventoryPosting` | Aggregates onto Product Master: `current_stock_qty += 1`, `opening_stock_weight += gross_weight`, `opening_fine_weight += pure_24k_weight`. Sets `is_inventory_posted = true`. |
| **Purchased Finished Piece**| Vendor Purchase Voucher | `PurchaseEntryController::store` | `current_stock_qty += qty`, `opening_stock_weight += weight`. |
| **Customer Sale (POS)** | Sales Invoice Creation | `SaleService::create` | `product->decrement('current_stock_qty', $qty)`. Decrements available stock. |
| **Manual Stock Adjustment** | Inward / Outward Modal | `InventoryController::addMovement` | Overrides `current_stock_qty = max(0, current + change)`. Logs `InventoryMovement`. |

---

## 4. Single-Master Aggregation vs. Multi-Tag Tracking

One of the most critical architectural mechanisms in Rudhra Jewellers is the **Single-Master Aggregation Rule**:
- When multiple physical pieces of the same design (e.g. Design `D001`) are received across different work orders or batches, the system **NEVER creates duplicate Product records**.
- It locates the existing master via:
  ```php
  $product = Product::where('design_no', $designNo)
      ->orWhere('product_code', $designNo)
      ->first();
  ```
- It increments the existing product master's count and cumulative weight.
- Each individual physical piece receives its own permanent row in `work_order_received_pieces` with a globally unique tag (`TAG-2026-000001`, `TAG-2026-000002`, etc.) pointing to `product_id`.
- In the UI (`InventoryViewProduct.jsx`), the product view displays both:
  1. The **Aggregated Master Summary** (Total units in stock, total cumulative weight).
  2. The **Physical Tag Ledger** (Table listing every individual tag, piece number, gross weight, net gold weight, Karigar, HUID, and print action).

---

## 5. Stock Movement Ledger (`inventory_movements` Table)

Every change in finished product stock creates an immutable audit row in `inventory_movements`:
- `product_id`: Target product foreign key.
- `invoice_id`: Nullable link to sales invoice if movement was a customer sale.
- `movement_type`: Categorical reason (`receipt`, `sale`, `purchase`, `Stock Addition (Updated)`, `Stock Reduction`).
- `quantity`: Signed change (`+1`, `-1`, `+5`).
- `weight`: Signed weight change in grams.
- `unit_cost`: Gold rate / cost valuation at the moment of movement.
- `notes`: Descriptive audit explanation including tag numbers, invoice numbers, or staff identity.
- `created_by`: User ID of the logged-in staff member.

---

## 6. Live Valuation Formulas

Inventory valuation displayed on the Inventory Dashboard (`InventoryDashboard.jsx` / `InventoryController::index`) is dynamically calculated:

1. **Total Gold Value:**
   $$\text{Gold Valuation} = \left(\sum \text{Product Gross Weight}\right) \times \text{Live 22K Rate}$$
2. **Total Net Gold Value:**
   $$\text{Net Gold Valuation} = \left(\sum \text{Product Fine Weight}\right) \times \text{Live 24K Pure Rate}$$
3. **Live Rates Source:** Consumed dynamically from `DashboardController::getLiveMetalRatesData()` which computes benchmark rates based on recent purchase entries or the store's configured daily market board rate.
