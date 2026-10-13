# 07. RECEIVE WORK ORDER COMPLETE FIELD & CALCULATION AUDIT

**System:** Rudhra Jewellers ERP  
**Module:** Physical Piece Receiving & Thermal Tag Assignment  
**Frontend Component:** `resources/js/pages/job-order/ReceiverWork.jsx`  
**Backend Method:** `WorkOrderController::receivePiece` [Lines 2338–2640]  
**Database Tables:** `work_orders`, `work_order_items`, `work_order_received_pieces`, `products`  
**Evidence Source:** Confirmed from `WorkOrderController::receivePiece`, `WorkOrderReceivedPiece.php`, and `ReceiverWork.jsx`.

---

## 1. Receiving Desk Overview

The **Receive Work Order** page (`/job-order/receive` - `ReceiverWork.jsx`) is the intake checkpoint where physical finished jewelry pieces returned by artisans are weighed, verified against blueprints, cataloged with individual piece numbers, issued unique Receive Order numbers (`RWO-YYYY-XXXXXX`), and tagged with unique thermal barcode tags (`TAG-YYYY-XXXXXX`).

### Strict Intake Gatekeeping:
- Only work orders where `ready_qty > 0` and `received_qty < ready_qty` appear in the receiving list (`GET /api/work-orders/search-receiving`).
- The user cannot receive more pieces than have been approved by Quality Check.

---

## 2. Complete Field Inventory: Receiving Intake Form (`ReceiverWork.jsx`)

| Field Label | Input Type | Required? | Default Value | Data Source | Stored Column | Notes / Next-Stage Impact |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Work Order Number** | Display | Readonly | Auto-filled | `work_orders.work_order_number` | `work_order_received_pieces.work_order_id` | Originating manufacturing voucher. |
| **Receive Work Order No**| Display / Auto| Readonly | `RWO-2026-XXXXXX` | Auto-generated | `work_order_received_pieces.receive_order_number`| Concurrency-safe unique receiving voucher. |
| **Tag Number** | Display / Auto| Readonly | `TAG-2026-XXXXXX` | Auto-generated | `work_order_received_pieces.tag_number` | Globally unique barcode printed on piece. |
| **Piece Number** | Display | Readonly | `received_qty + 1` | Calculated | `work_order_received_pieces.piece_number` | Physical sequence (Piece #1, Piece #2). |
| **Design Number** | Display / Edit | Yes | Pre-filled | Work order / Item | `work_order_received_pieces.design_no` | Blueprint & product master link. |
| **Product Name** | Display | Readonly | Pre-filled | Cleaned name | `work_order_received_pieces.product_name` | Printed on tag & reports. |
| **Artisan (Karigar)** | Display | Readonly | Pre-filled | `karigars.name` | `work_order_received_pieces.karigar_id` | Bench liability clearance. |
| **Gross Weight (g)** | Decimal (3) | Yes | `0.000` | Scale reading (grams) | `work_order_received_pieces.gross_weight` | Base physical weight on scale. |
| **Old / Scrap Weight (g)**| Decimal (3)| No | `0.000` | Scale reading (grams) | `work_order_received_pieces.old_weight` | Customer old gold or recovered scrap. |
| **Diamond Weight (Ct)**| Decimal (3)| No | `0.000` | Carats | `work_order_received_pieces.diamond_weight` | Converted via `0.20g per Ct` for net gold. |
| **Diamond Count** | Number | No | Dynamic from product | Integer | `work_order_received_pieces.diamond_count` | Number of mounted diamonds. |
| **Diamond Stamp** | Text / Dropdown| No | Dynamic from product | `+0`, `+7`, `7U` | Parsed into `diamond_details` | Dynamic stamp printed on tag (`+0`, `+6`). |
| **Colour Stone Wt** | Decimal (3) | No | `0.000` | Carats / Grams | `work_order_received_pieces.color_stone_weight` | Converted via `0.20g per Ct` for net gold. |
| **Colour Stone Count** | Number | No | `0` | Integer | `work_order_received_pieces.color_stone_count` | Number of colored stones mounted. |
| **Silver Weight (g)** | Decimal (3) | No | `0.000` | Grams | `work_order_received_pieces.silver_weight` | Silver weight in piece. |
| **Net Gold Weight (g)** | Decimal (3) | Live Calc | Calculated | Formula | `work_order_received_pieces.net_gold_weight` | Pure gold alloy weight in piece. |
| **Touch (Purity %)** | Decimal (2) | Yes | `91.60` | Dropdown / entered | `work_order_received_pieces.purity` | Assay touch percentage. |
| **Gold Karat** | Dropdown | Yes | `22K` | Dropdown | `work_order_received_pieces.gold_karat` | Stamped karat rating. |
| **Pure 24K Weight (g)** | Decimal (3) | Live Calc | Calculated | Formula | `work_order_received_pieces.pure_24k_weight` | 24K bullion equivalent. |
| **Making Charge Type** | Dropdown | Yes | `per_gram` | `per_gram`, `fixed`, `percentage` | `work_order_received_pieces.making_charge_type` | Labor billing formula. |
| **Making Charge Rate** | Decimal (2) | Yes | Pre-filled | Rupee rate | `work_order_received_pieces.making_charge_per_gram`| Labor rate per gram / percent. |
| **Total Making Charge** | Decimal (2) | Live Calc | Calculated | Formula | `work_order_received_pieces.total_making_charge`| Total payable to artisan. |
| **Given Metal (g)** | Decimal (3) | No | `0.000` | Grams | `work_order_received_pieces.given_metal_qty` | Excess metal returned by artisan. |
| **Given Cash** | Decimal (2) | No | `0.00` | Rupees | `work_order_received_pieces.given_cash` | Cash advance or settlement. |
| **HUID Code** | Text | No | From Hallmark / New | 6-char alphanumeric | `work_order_received_pieces.huid` | BIS Hallmarking Unique Identification. |
| **Certificate Number** | Text | No | From Cert / New | String | `work_order_received_pieces.certificate_no` | IGI / GIA / BIS certificate number. |
| **Piece Description** | Textarea | No | Empty | String | `work_order_received_pieces.description` | Detailed inspection notes. |

---

## 3. Mathematical Calculations & Formulas

All calculations are enforced identically in both frontend React live state and backend Laravel controller:

### 1. Net Gold Weight Formula
Carat weights are converted to grams using the international jewellery standard: $1\text{ ct} = 0.200\text{ g}$.
$$\text{Diamond Weight (g)} = \text{Diamond Weight (Ct)} \times 0.200$$
$$\text{Colour Stone Weight (g)} = \text{Colour Stone Weight (Ct)} \times 0.200$$
$$\mathbf{\text{Net Gold Weight}} = \text{Gross Weight} - \text{Diamond Weight (g)} - \text{Colour Stone Weight (g)} - \text{Old Weight}$$

### 2. Pure 24K Gold Equivalent Formula
$$\mathbf{\text{Pure 24K Weight}} = \frac{\text{Net Gold Weight} \times \text{Touch (\%)}}{100}$$
*Example:* Gross $8.350\text{g}$, no stones, Touch $91.60\%$:
$$\text{Pure 24K} = \frac{8.350 \times 91.60}{100} = 7.649\text{g}$$

### 3. Total Making Charge Formula
- **If `making_charge_type == 'per_gram'`:**
  $$\mathbf{\text{Total MC}} = \text{Making Charge Rate} \times \text{Gross Weight}$$
- **If `making_charge_type == 'percentage'`:**
  $$\mathbf{\text{Total MC}} = \frac{\text{Rate}}{100} \times (\text{Net Gold Weight} \times \text{Live Gold Rate})$$
- **If `making_charge_type == 'fixed'`:**
  $$\mathbf{\text{Total MC}} = \text{Making Charge Rate}$$

### 4. Diamond Specification String (`diamond_details`)
Constructed dynamically from piece and inventory product specifications:
$$\mathbf{\text{Dia Spec}} = \text{Dia-}[\text{Weight in Ct}]/\mathbf{+}[\text{Stamp}]/[\text{Count}]$$
*Example:* $0.00\text{ Ct}$, $0\text{ diamonds}$, $+0\text{ stamp}$: `Dia-0.00/+0/0`.

---

## 4. Concurrency-Safe Voucher & Tag Generation

To prevent race conditions and duplicate tags under high-traffic multi-counter receiving, the backend executes atomic sequential counter generation under pessimistic table locks [Lines 2442–2472]:

```php
// 1. Receive Work Order Number (RWO-YYYY-XXXXXX)
$latestRwo = WorkOrderReceivedPiece::where('receive_order_number', 'like', "RWO-{$year}-%")
    ->lockForUpdate()
    ->orderBy('id', 'desc')
    ->first();
$nextRwoNum = $latestRwo ? ((int)explode('-', $latestRwo->receive_order_number)[2] + 1) : 1;
$receiveOrderNumber = "RWO-{$year}-" . str_pad($nextRwoNum, 6, '0', STR_PAD_LEFT);

// 2. Globally Unique Tag Number (TAG-YYYY-XXXXXX)
$latestPiece = WorkOrderReceivedPiece::where('tag_number', 'like', "TAG-{$year}-%")
    ->lockForUpdate()
    ->orderBy('id', 'desc')
    ->first();
$nextNum = $latestPiece ? ((int)explode('-', $latestPiece->tag_number)[2] + 1) : 1;
$tagNumber = "TAG-{$year}-" . str_pad($nextNum, 6, '0', STR_PAD_LEFT);
```

---

## 5. Physical Receipt vs. Final Inventory Posting

> [!CRITICAL]
> **Key Architectural Discovery:**
> Clicking **[ Receive 1 Piece & Generate Tag ]** performs **Physical Receiving**, NOT instantaneous catalog stock expansion.
> 1. It creates the `work_order_received_pieces` record.
> 2. Sets `is_inventory_posted = false`.
> 3. Increments `work_orders.received_qty` by 1.
> 4. Generates the thermal barcode tag for the physical piece.
> 5. Decrements Karigar bench gold liability via `syncKarigarGoldBalance()`.
> 6. Triggers `syncInventoryPosting($order)`:
>    - If Certification and Hallmarking are still pending, `syncInventoryPosting` leaves `is_inventory_posted = false`.
>    - Stock is only finalized into `products.current_stock_qty` once required certification/hallmarking steps are completed or explicitly skipped!
