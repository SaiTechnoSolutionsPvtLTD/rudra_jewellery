# 05. PRODUCTION & WORK UPDATES AUDIT

**System:** Rudhra Jewellers ERP  
**Module:** Work in Progress (WIP) & Workshop Production  
**Frontend Components:** `WorkInProgress.jsx`, `JobOrderDelay.jsx`  
**Backend Controllers:** `WorkOrderController.php` (`wipUpdate`, `recordOperation`, `getOperations`, `delayUpdate`)  
**Database Tables:** `work_orders`, `work_order_items`, `work_order_operations`, `work_order_timelines`  
**Evidence Source:** Confirmed from `WorkOrderController::wipUpdate` [Lines 1450-1623] and `WorkOrderController::recordOperation` [Lines 1650-1730].

---

## 1. Production Execution Overview

Once a Work Order is assigned to an artisan, it appears in the **Work in Progress (WIP)** workbench (`/job-order/in-progress` - `WorkInProgress.jsx`).
The system supports two complementary methods of recording workshop manufacturing progress:
1. **Physical Piece Completion & QC Dispatch (`wipUpdate`):** Records completed pieces, logs physical weights, handles production delays, and automatically pushes completed units into the Quality Check queue (`qc_pending_qty`).
2. **Granular Stage Operations (`recordOperation`):** Tracks step-by-step artisan operations (Casting, Filing, Assembly, Setting, Polishing) without immediately dispatching pieces out of the workshop.

---

## 2. Partial Production Workflow (`POST /api/work-orders/{id}/wip-update`)

The software fully supports **atomic partial production** using incremental batches:

```text
Assigned Work Order: Required Qty = 10 pcs
  │
  ├─► Update 1: Artisan finishes 2 pcs
  │   - completed_now = 2
  │   - order.completed_qty = 2
  │   - order.qc_pending_qty = 2
  │   - Remaining in production = 8 pcs
  │   - Stage -> quality_check (for the 2 pcs)
  │
  ├─► Update 2: Artisan finishes 5 pcs
  │   - completed_now = 5
  │   - order.completed_qty = 7
  │   - order.qc_pending_qty = 2 (previous) + 5 = 7 (minus any QC passed)
  │   - Remaining in production = 3 pcs
  │
  └─► Update 3: Artisan finishes remaining 3 pcs
      - completed_now = 3
      - order.completed_qty = 10
      - Order status -> pending_approval / quality_check
      - Remaining in production = 0 pcs
```

### Complete Field Inventory: WIP Update Form (`WorkInProgress.jsx`)

| Field Label | Input Type | Required? | Default Value | Validation Rule | Database Column | Notes / Next-Stage Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Completed Now (Qty)**| Number | Yes | `1` | `min:1`, `max:pending_production` | Increments `completed_qty` & `qc_pending_qty` | Pushes units into QC inspection queue. |
| **Work Order Item** | Dropdown | No | First Item | `exists:work_order_items,id` | Child item tracking | Directs completion to specific item in multi-job orders. |
| **Actual / Completed Wt**| Decimal (3)| Yes | `0.000` | `min:0.001` (grams) | Increments `completed_weight` | Decrements `pending_weight` on bench balance. |
| **Old / Scrap Weight** | Decimal (3)| No | `0.000` | `min:0` (grams) | `pricing_details['old_weight']` | Recovered metal weight. |
| **Colour Stone Wt** | Decimal (3)| No | `0.000` | `min:0` (grams) | `pricing_details['stone_weight']`| Embedded gemstones weight. |
| **Silver Weight** | Decimal (3)| No | `0.000` | `min:0` (grams) | `pricing_details['silver_weight']`| Silver solder or components. |
| **Diamond Weight (Ct)**| Decimal (3)| No | `0.000` | `min:0` (carats) | `pricing_details['diamond_weight']`| Carats mounted into piece. |
| **Diamond Count** | Number | No | `0` | `integer`, `min:0` | `pricing_details['diamond_count']`| Number of diamonds mounted. |
| **Is Production Delayed?**| Checkbox | No | `false` | Boolean | `is_delayed` | Flags work order on Delay Dashboard. |
| **Delay Reason** | Dropdown / Text| If delayed | Null | String | `delay_reason` | Categorical reason (Material, CAD, Worker, QC). |
| **Delay Days** | Number | If delayed | `1` | `integer`, `min:1` | `delay_days` | Number of days delayed. |
| **New Delivery Date**| Date | If delayed | Null | `date` | `delivery_date` | Postpones committed completion date. |
| **Worker / Manager Notes**| Textarea | No | Empty | String | `notes` & timeline entry | Workshop execution notes. |

---

## 3. Atomic Quantity & Weight Transition Rules

In `WorkOrderController::wipUpdate` [Lines 1475-1545], execution occurs inside a database transaction with pessimistic locking (`WorkOrder::lockForUpdate()->findOrFail($id)`):

1. **Validation Against Over-Completion:**
   ```php
   $pendingProduction = max(0, (int)$order->required_qty - (int)$order->completed_qty);
   if ($completedNow > $pendingProduction) {
       return response()->json([
           'status' => 'error',
           'message' => "Completed Now ({$completedNow}) cannot exceed remaining production quantity ({$pendingProduction})."
       ], 422);
   }
   ```
2. **Rework Clearing Logic:**
   If units were previously returned from QC for rework (`rework_qty > 0`), the software clears the rework counter first before incrementing new production:
   ```php
   $reworkToClearOrder = min((int)$order->rework_qty, $completedNow);
   $newQtyForOrder = $completedNow - $reworkToClearOrder;
   $order->rework_qty = max(0, (int)$order->rework_qty - $reworkToClearOrder);
   $order->completed_qty = (int)$order->completed_qty + $newQtyForOrder;
   $order->qc_pending_qty = (int)$order->qc_pending_qty + $completedNow;
   ```
   **Benefit:** This guarantees that corrected rework pieces do NOT artificially inflate `completed_qty` beyond `required_qty`.
3. **Weight Progression:**
   $$\text{completed\_weight} = \text{completed\_weight} + \text{actual\_weight}$$
   $$\text{pending\_weight} = \max(0, \text{allotted\_weight} - \text{completed\_weight})$$
4. **Stage Transition:**
   - If `order->completed_qty >= order->required_qty`, sets `current_stage = 'quality_check'` and `status = 'pending_approval'`.
   - If partial (`completed_qty < required_qty`), sets `current_stage = 'work_in_progress'` and `status = 'in_progress'`.

---

## 4. Delay & Hold Management (`JobOrderDelay.jsx` / `delayUpdate`)

When production is postponed:
- The work order is marked with `is_delayed = true`.
- Appends an audit entry into `work_orders.pricing_details['delay_history']` recording `reason`, `delay_days`, `from_date`, `to_date`, `updated_by`, and timestamp.
- Work orders flagged as delayed are exposed via a dedicated endpoint: `GET /api/work-orders/delays`.
- Accessible in the navigation under **Delay & Hold Workbench** (`JobOrderDelay.jsx`).
