# 04. JOB CREATION & ALLOCATION WORKFLOW AUDIT

**System:** Rudhra Jewellers ERP  
**Module:** Job Order Creation & Workshop Allocation  
**Frontend Components:** `JobCreationDashboard.jsx`, `NewWorkOrder.jsx`, `KarigarWorkModal.jsx`  
**Backend Controllers:** `WorkOrderController.php`, `JobController.php`, `KarigarController.php`  
**Evidence Source:** Confirmed from `WorkOrderController::store`, `WorkOrder.php`, `JobOrder.php`, `WorkOrderItem.php`, `RawMaterial.php`, and `NewWorkOrder.jsx`.

---

## 1. Two-Tier Order Hierarchy

In Rudhra Jewellers, manufacturing jobs are governed by an overarching parent-child order relationship:

1. **Parent Entity (`job_orders` Table):**
   - Represents the commercial client contract or custom manufacturing request.
   - Unique Number format: `JO-YYYY-XXXX` (e.g. `JO-2026-0001`).
   - Tracks client reference (`client_id`, `customer_name`), overall order date, promised delivery date, total job count, and aggregated weight metrics (`total_allotted_weight`, `total_completed_weight`, `total_pending_weight`).

2. **Child Entity (`work_orders` Table):**
   - Represents the physical manufacturing workshop voucher assigned to a specific artisan.
   - Unique Number format: `WO-YYYY-XXXX` (e.g. `WO-2026-0001`).
   - Contains artisan assignment (`karigar_id`, `karigar_name`), purity specifications (`material_type`), planned piece quantities, allotted gold weight, and manufacturing lifecycle stages.

3. **Multi-Job Line Items (`work_order_items` Table):**
   - A single Work Order can contain multiple distinct designs or product items (e.g., a bridal set consisting of 1 Necklace, 2 Earrings, 1 Maang Tikka).
   - Each item row in `work_order_items` tracks its own `design_no`, `required_qty`, `allotted_weight`, `completed_qty`, `qc_approved_qty`, and `received_qty`.

---

## 2. Product & Design Selection in Job Creation

When creating a job in `NewWorkOrder.jsx`:
- **Design Search & Lookup:** The user can search existing products or CAD designs using `design_no`, `product_code`, or product name via `GET /api/products/lookup-design?design_no=...`.
- **Pre-fill Behavior:** Selecting an existing inventory product automatically populates:
  - Product Name & Category / Subcategory.
  - Default Purity & Karat (e.g. `22K (916)`).
  - Default Gross & Net Gold Weight.
  - Stamp preference (e.g. `916 BIS`).
  - Making charge rate per gram.
  - Component breakdown (stones, diamonds, pearls).
  - Reference CAD images.
- **Custom / Ad-hoc Designs:** The software allows entering a completely new, uncataloged design number (e.g. `CUST-BRIDE-01`). The system accepts ad-hoc specifications and creates the design dynamically.

---

## 3. Complete Field Inventory: Job Creation Form (`NewWorkOrder.jsx`)

| Field Label | Input Type | Required? | Default Value | Data Source | Database Destination | Next-Stage Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Job Order No** | Text | No (Auto) | `JO-2026-XXXX` | Auto-generated | `job_orders.job_order_number` | Top-level tracking key. |
| **Work Order No** | Text | No (Auto) | `WO-2026-XXXX` | Auto-generated | `work_orders.work_order_number` | Workshop voucher key. |
| **Client / Customer**| Dropdown / Text| Yes | Walk-in / Select | `clients` table | `work_orders.client_id`, `customer_name` | Customer billing & order alerts. |
| **Artisan (Karigar)**| Dropdown | Yes | Select Artisan | `karigars` table | `work_orders.karigar_id`, `karigar_name`| Karigar bench balance & workshop dispatch. |
| **Design Number** | Text | Yes | Pre-filled / Auto | Product master / CAD | `work_orders.design_code` & item row | Unique blueprint reference. |
| **Product Name** | Text | Yes | `Jewellery Piece`| Product master / Custom| `work_orders.product_name` | Production label. |
| **Category** | Dropdown | Yes | Select Category | `categories` table | `work_orders.category_id` | Classification. |
| **Subcategory** | Dropdown | Yes | Select Subcategory| `subcategories` table | `work_orders.subcategory_id` | Classification. |
| **Metal & Purity** | Dropdown | Yes | `Gold 22K (916)` | `gold_types` / `karats` | `work_orders.material_type` | Metal vault debit bucket. |
| **Required Quantity**| Number | Yes | `1` | User entered | `work_orders.required_qty` & items | Benchmark for WIP, QC & Receiving. |
| **Allotted Gold Wt** | Decimal (3) | Yes | `0.000` | Sum of item weights | `work_orders.allotted_weight` | Raw material vault debit amount. |
| **Allotted Date** | Date | Yes | Current Date | System date | `work_orders.allotted_date` | Start date for SLA & delay metrics. |
| **Delivery Date** | Date | Yes | `Allotted + 7 Days` | User entered | `work_orders.delivery_date` | Deadline for delay tracking. |
| **Allowed Wastage (%)**| Decimal (2)| No | Artisan standard % | `karigars.standard_wastage_percent` | `work_orders.wastage_allowed_percent`| Maximum allowable process loss. |
| **Making Charge Rate**| Decimal (2)| Yes | `650.00` | Karigar / Product rate | `work_orders.making_charge_per_gram` | Artisan remuneration basis. |
| **Priority** | Dropdown | No | `Normal` | `Normal`, `Urgent`, `High` | `work_orders.priority` | Workshop queue sorting. |
| **Notes / Instructions**| Textarea | No | Empty | User entered | `work_orders.notes` | Special crafting instructions. |
| **CAD / Design Image**| File Upload | No | Null | Base64 / File | `work_orders.image_url` | Visual workbench reference. |

---

## 4. Multi-Job Work Order Array (`items` Payload)

When multiple pieces are grouped into a single work order, the client sends an `items` array:
```json
{
  "client_id": 14,
  "karigar_id": 6,
  "items": [
    {
      "design_number": "D001",
      "product_name": "Temple Choker",
      "need_pcs": 1,
      "gold_weight": 42.500,
      "making_charge_per_gram": 850
    },
    {
      "design_number": "D002",
      "product_name": "Matching Jhumkas",
      "need_pcs": 2,
      "gold_weight": 18.200,
      "making_charge_per_gram": 750
    }
  ]
}
```

### Server-Side Processing (`WorkOrderController::store`):
1. **Aggregates Quantities & Weights:**
   $$\text{totalAllottedWeight} = \sum \text{gold\_weight} = 42.500 + 18.200 = 60.700\text{g}$$
   $$\text{totalRequiredQty} = \sum \text{need\_pcs} = 1 + 2 = 3\text{ pcs}$$
2. **Creates Parent `work_orders` Record:** Holds aggregate metrics ($60.700\text{g}$, $3\text{ pcs}$).
3. **Creates Child `work_order_items` Records:** Individual rows created for each design, enabling piece-by-piece and item-by-item progress tracking.
4. **Preserves Complete Blueprint:** Serializes the full item array into `work_orders.pricing_details['items']`.

---

## 5. Transactional Effects upon Saving a Job

When the user clicks **"Create Work Order"**:
1. **Parent Job Order & Work Order Rows Created:** Written atomically inside `DB::transaction()`.
2. **Initial Audit Trail Created:** Inserts a row in `work_order_timelines` with stage `created` and status `completed`.
3. **Artisan Notification Queued:** Inserts a row in `work_order_notifications` alerting staff of the assignment.
4. **Raw Material Vault Debited:**
   ```php
   \App\Models\RawMaterial::debitAllocation($debitMatType, $totalGoldWeight);
   \App\Models\RawMaterial::recalculateAllocations();
   ```
   - Decrements available vault bullion immediately.
5. **Karigar Bench Balance Updated:**
   ```php
   $this->syncKarigarGoldBalance($itemKarigarId);
   ```
   - Increments `karigars.current_gold_balance_grams` by the new pending weight, updating the artisan's active workshop liability.
