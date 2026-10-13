# 06. QUALITY CHECK (QC), REWORK & READY WORKFLOW AUDIT

**System:** Rudhra Jewellers ERP  
**Module:** Quality Assurance, Artisan Rework & Ready Staging  
**Frontend Components:** `QualityCheckDetails.jsx`, `ReadyDetails.jsx`  
**Backend Endpoints:** `POST /api/work-orders/{id}/qc-action`, `POST /api/work-orders/batch-submit-qc`, `POST /api/work-orders/{id}/mark-ready`  
**Evidence Source:** Confirmed from `WorkOrderController::qcAction` [Lines 1834-1991] and `QualityCheckDetails.jsx`.

---

## 1. Quality Check Eligibility & Workflow Architecture

Pieces become eligible for Quality Check as soon as they are completed by artisans during WIP updates (`order.qc_pending_qty > 0`).

```text
               Artisan WIP Update
                       │
                       ▼
             [ qc_pending_qty > 0 ]
                       │
                       ▼
           QualityCheckDetails.jsx
         (POST /api/work-orders/:id/qc-action)
                       │
         ┌─────────────┴─────────────┐
         ▼                           ▼
      [ PASS ]                   [ REWORK ]
         │                           │
  • qc_pending_qty -= pass    • qc_pending_qty -= rework
  • qc_approved_qty += pass   • rework_qty += rework
  • ready_qty += pass         • return_count += 1
  • current_stage = 'ready'   • current_stage = 'rework'
  • status = 'ready'          • status = 'returned'
         │                           │
         ▼                           ▼
   Ready Queue                 Artisan Workshop
(Receiving Eligible)         (Re-corrected in WIP)
```

---

## 2. Partial Inspection Capabilities

The `qcAction` method [Lines 1876-1946] supports simultaneous partial approval and partial rejection within the exact same inspection batch:

**Example:**
- Artisan submitted 7 pieces for inspection (`qc_pending_qty = 7`).
- The QC inspector finds 5 pieces perfect and 2 pieces with minor prong alignment issues.
- The inspector enters:
  - `action = 'partial'` (or `action = 'pass'`)
  - `approved_qty = 5`
  - `rework_qty = 2`
  - `reason = "Loose stone setting on 2 pieces"`
- **System Execution:**
  - `order.qc_pending_qty` decrements by 7 (becomes `0`).
  - `order.qc_approved_qty` increments by 5.
  - `order.ready_qty` increments by 5 (immediately receivable at the store counter).
  - `order.rework_qty` increments by 2 (remains locked in the workshop for correction).
  - Both quantities are completely segregated; non-passed items can NEVER be received into inventory.

---

## 3. Complete Field Inventory: QC Inspection Modal (`QualityCheckDetails.jsx`)

| Field Label | Input Type | Required? | Default Value | Validation Rule | Database Column | Notes / Next-Stage Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Inspection Decision**| Radio / Button| Yes | `Pass` | `in:pass,approve,rework,partial` | Controls quantity allocation | Determines pass vs rework path. |
| **Pass / Approved Qty**| Number | If passing | `qc_pending_qty` | `integer`, `min:0` | `qc_approved_qty` & `ready_qty` | Units unlocked for Receiving & Tagging. |
| **Rework / Return Qty**| Number | If rework | `0` | `integer`, `min:0` | `rework_qty` & `return_count` | Units locked for workshop rework. |
| **Inspection Checklist**| Checkboxes | No | Checked | Boolean array | `checklist` JSON | Verifies finish, weight, stones, stamps. |
| **Weight Tolerance Check**| Display | Auto | Comparison | Calculated | Tolerance check | Compares completed wt against planned wt. |
| **Rework Reason** | Dropdown / Text| If rework | Null | String | `return_reason` | Informs Karigar of defects. |
| **QC Inspector Remarks**| Textarea | No | Empty | String | `quality_notes` | Permanent audit comments. |

---

## 4. Zero-Duplicate Rework Cycle

In legacy jewelry systems, returning an item for rework frequently creates a brand new duplicate work order, corrupting order numbering and accounting.

In Rudhra Jewellers:
1. **Single Order Integrity:** No new work order is created upon rework.
2. The defective units remain on the existing Work Order with `rework_qty = N` and `status = 'returned'`.
3. When the Karigar rectifies the pieces and logs progress via `wipUpdate`, the software checks `rework_qty` first, decrements `rework_qty` back to 0, and re-queues them into `qc_pending_qty` without inflating total completed counts.
4. Total return cycles are tracked via `work_orders.return_count` for artisan performance scoring.

---

## 5. Ready Staging Area (`ReadyDetails.jsx`)

- Units with `ready_qty > 0` are staged in the **Ready** workbench (`/job-order/ready`).
- `ready_qty` represents the **strict physical ceiling** for the Receiving Desk:
  $$\text{Receivable Quantity} = \text{ready\_qty} - \text{received\_qty}$$
- A piece cannot be physically received or tagged until it has officially earned `ready_qty` through QC approval.
