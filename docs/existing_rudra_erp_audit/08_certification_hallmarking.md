# 08. CERTIFICATION, HALLMARKING & TAG GENERATION AUDIT

**System:** Rudhra Jewellers ERP  
**Modules:** Certification, BIS Hallmarking (HUID), and Thermal Tag Generation  
**Frontend Components:** `CertificationDetails.jsx`, `HallmarkingDetails.jsx`, `JewelleryTagCard.jsx`, `TagPrinting.jsx`  
**Backend Endpoints:** `POST /api/work-orders/{id}/certification-action`, `POST /api/work-orders/{id}/hallmarking-action`, `GET /api/work-orders/tags`  
**Evidence Source:** Confirmed from `WorkOrderController.php` [Lines 2176–2334, 2723–2805], `JewelleryTagCard.jsx`, and `TagPrinting.jsx`.

---

## 1. Quality Certification Stage (`CertificationDetails.jsx`)

Certification is an optional or mandatory compliance stage validating diamond quality, gemstone authenticity, or gold purity before public sale.

### A. Queue Eligibility
- Work orders appear in the Certification workbench (`/job-order/certification`) once units pass QC inspection (`ready_qty > 0`).

### B. Actions Supported (`POST /api/work-orders/{id}/certification-action`)
1. **Record Certificate (`action = 'add'`):**
   - Captures `certification_no` (e.g. `IGI-LG-1029384`, `GIA-5839201`).
   - Captures `agency` (e.g. `IGI`, `GIA`, `SGL`, `BIS Certified`).
   - Sets `work_orders.certification_status = 'completed'`.
   - Sets `certified_qty = ready_qty`.
2. **Explicit Skip (`action = 'skip'` / `'not_required'`):**
   - For non-studded plain gold items where external diamond certification is irrelevant.
   - Sets `work_orders.certification_status = 'skipped'`.
   - Logs an explicit audit entry in `work_order_timelines`: `"Certification step explicitly marked as skipped / not required."`
   - Satisfies the compliance gate for final inventory posting.

---

## 2. BIS Hallmarking & HUID Stage (`HallmarkingDetails.jsx`)

Hallmarking represents the legal assaying process under the Bureau of Indian Standards (BIS), registering a unique 6-character alphanumeric **HUID (Hallmark Unique Identification)** code.

### A. Queue Eligibility
- Work orders appear in the Hallmarking workbench (`/job-order/hallmarking`) once QC is passed (`ready_qty > 0`).

### B. Actions Supported (`POST /api/work-orders/{id}/hallmarking-action`)
1. **Record HUID (`action = 'add'`):**
   - Captures `huid` (strict 6-character alphanumeric, e.g. `H-BGL10`, `AB12CD`).
   - Captures `hallmark_center` (e.g. `Chennai Gold Assaying Centre`).
   - Sets `work_orders.hallmarking_status = 'completed'`.
   - Sets `hallmarked_qty = ready_qty`.
2. **Explicit Skip (`action = 'skip'` / `'not_required'`):**
   - For items below mandatory hallmarking weight thresholds or silver articles.
   - Sets `work_orders.hallmarking_status = 'skipped'`.
   - Logs audit entry in `work_order_timelines`.
   - Satisfies the compliance gate for final inventory posting.

---

## 3. The Three-Gate Inventory Posting Dependency

The software establishes a strict mathematical rule in `syncInventoryPosting` [Lines 2022–2034]:

$$\mathbf{\text{Postable}} \iff (\text{QC Approved}) \land (\text{Cert Satisfied}) \land (\text{Hallmark Satisfied})$$

```php
$certStatus = strtolower($order->certification_status ?? 'pending');
$certSatisfied = in_array($certStatus, ['completed', 'skipped', 'not_required']);

$hallStatus = strtolower($order->hallmarking_status ?? 'pending');
$hallSatisfied = in_array($hallStatus, ['completed', 'skipped', 'not_required']);

$qcApproved = ($order->ready_qty > 0 || $order->qc_approved_qty > 0);

if (!$qcApproved || !$certSatisfied || !$hallSatisfied) {
    return 0; // Stock cannot post to Product Catalog yet
}
```

> [!NOTE]
> Even if physical pieces are weighed and received at the receiving desk, their status remains `is_inventory_posted = false` until Certification and Hallmarking are either recorded or explicitly skipped.

---

## 4. Thermal Jewellery Tag Specification (`JewelleryTagCard.jsx`)

The physical jewelry tag follows the official thermal label format designed for folded jewelry tags:

### Dimensions & Print Format:
- **Card Size:** $105\text{mm} \times 33\text{mm}$ (Dual-sided foldable format).
- **Print Subsystem:** Direct browser thermal printer output (`buildPrintableTagsHtml`) with zero margins and CSS page breaks.
- **Dotted Fold Line:** A 2px vertical dotted border divides the tag into two symmetric panels.

### Layout Topology:

```text
┌──────────────────────────────────────┬─ ─ ─ ─ ─┬──────────────────────────────────────┐
│ G.Wt -8.350                     D001 │         │  ||||||||||||||||||||||||||||||||||| │ (1. Barcode Strip)
│                                      │    D    │                                      │
│ Dia-0.00/+0/0                    22K │    O    │           TAG-2026-000003            │ (2. Tag Number exactly below)
│                                      │    T    │                                      │
│                      T.Dia- 0.00Ct.  │    T    │           T.Dia- 0.00Ct.             │ (3. Total Dia Value)
│                                      │    E    │                                      │
│                                      │    D    │                D001                  │ (4. Design Number bold)
└──────────────────────────────────────┴─ ─ ─ ─ ─┴──────────────────────────────────────┘
             [ LEFT PANEL ]                                  [ RIGHT PANEL ]
```

### Exact Specifications per Panel:
1. **Left Panel (Specifications):**
   - **Row 1:** Gross Weight (`G.Wt -8.350`) aligned left, Design Number (`D001`) aligned right.
   - **Row 2:** Dynamic Diamond Specification (`Dia-0.00/+0/0`) aligned left, Gold Karat (`22K`) aligned right.
   - **Row 3:** Total Diamond Carat (`T.Dia- 0.00Ct.`) right-aligned under 22K.
2. **Divider:** Vertical dotted separation fold line (`border-left: 2px dotted #000000`).
3. **Right Panel (Barcode & Machine Scan):**
   - **Top:** Machine-readable vector barcode SVG (`BarcodeSvgLines`).
   - **Below Barcode:** Monospace Tag Number (`TAG-2026-000003`) placed **exactly below the barcode**.
   - **Then:** Total Diamond Value (`T.Dia- 0.00Ct.`), centered.
   - **Then:** Design Number (`D001`), centered and bold uppercase.

---

## 5. Dynamic Diamond Spec Resolution

In `JewelleryTagCard.jsx`, the diamond string `formatTagDiamondSpec(piece)` eliminates hardcoded fallbacks and resolves dynamically:
1. `diamond_weight`: Extracted from piece or product attributes.
2. `diamond_count`: Extracted from `piece.diamond_count`, `attributes.diamond_count`, or component array. Defaults to `0` if no diamonds.
3. `stamp`: Extracted from `piece.diamond_stamp`, `attributes.stamp`, or diamond component stamp. Defaults to `0` if plain gold.
4. Output format: `Dia-{wt}/+{stamp}/{count}` (e.g. `Dia-0.00/+0/0` for plain gold, `Dia-0.45/+7/12` for studded diamond ring).
