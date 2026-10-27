# Legacy vs. Current Gap Analysis

**Project**: Rudra Jewellery ERP  
**Analysis Date**: October 2026

---

## 1. Feature-by-Feature Comparison Matrix

| # | Legacy Feature | Legacy Evidence | Current Implementation | Classification | Gap Description | Risk Level | Required Action |
|---|---|---|---|---|---|---|---|
| **1** | **Customer Old Gold Exchange in Billing** | `tran1.BHAVWT`, `tran1.BHAVTUNCH`, `kachi1` | `SalePayment` accepts cash/bank/card, but no old gold weight/tunch intake | **Partially Implemented** | Billing checkout does not support customer old gold intake, weight, melting loss, tunch, and credit deduction on invoice | **High** (Operational blocker for jewellery retail) | Implement `OldGoldIntake` model, backend calculation in `SaleService`, and UI in `SalesModule` |
| **2** | **Customer Jewellery Approval / Jangad Memo** | `APPROVAL` flag in `tgm1`, `tran1`, `mnu.d_` | Tags only have `in_stock` and `sold`; no memo checkout | **Missing** | Cannot issue jewellery to customers on approval or reconcile approval returns/sales | **Medium** | Add `on_approval` status, approval memo voucher endpoint, return handler, and sale converter |
| **3** | **Customer Jewellery Repair Management** | `REPAIR` in `FORMMST.D_`, `accmast.REPAIR`, `jobmast` | Only new manufacturing work orders exist; no repair intake | **Missing** | Cannot register customer repair items, track added gold/stones, or bill repair labour | **Medium** | Implement Repair intake module and repair work order workflow |
| **4** | **Karigar Metal Hisab & Settlement Summary** | `KHISAB`, `wtran1.KHISAB`, `gissue1`, `grcpt1` | `KarigarMaterialController` tracks issues/returns, but lacks consolidated settlement sheet | **Partially Implemented** | No single screen or report showing total issued pure gold, received pieces, scrap, allowed wastage, and net gold balance | **High** (Financial & inventory risk) | Implement Karigar Hisab summary endpoint and settlement reporting |
| **5** | **Customer CRM Alerts (Birthday, Anniversary, Ready Order)** | `features.m_`, `calert1`, `accmast.DOB`, `accmast.ASARY` | Internal work order notifications exist; customer CRM alerts missing | **Partially Implemented** | No proactive alerts for customer birthdays, anniversaries, or order ready notifications | **Low** | Add customer greeting and payment reminder alert service and API |
| **6** | **Statutory ITC-04 & GSTR-1 Reporting** | `ITC04.xlsm`, `gstr1.xlsx`, `gstr2.xlsx` | Basic sales reports exist; statutory job work ITC-04 export missing | **Partially Implemented** | Missing government-compliant quarterly ITC-04 Karigar movement export and GSTR-1 summary | **Medium** | Implement ITC-04 Karigar movement report and GSTR-1 GST summary endpoints |
| **7** | **Piece-Level Unique Tagging & Stock Deductions** | `tgm1.TGNO`, `vtgno`, `BARNUM` | `WorkOrderReceivedPiece.tag_number`, unique DB index | **Fully Implemented** | None. Exact piece selection and inventory deduction verified | **None** | Retain existing implementation |
| **8** | **Multi-Stage Work Order Production Tracking** | `job`, `jobmast`, `gissue1`, `grcpt1` | `WorkOrder`, `WorkOrderItem`, `WorkOrderOperation` | **Fully Implemented** | None. Industrial multi-stage tracking exceeds legacy capabilities | **None** | Retain existing implementation |
| **9** | **BIS Hallmarking HUID & Diamond Certification** | `tgm1.hm`, `tgm1.CERTNO`, `labmast` | `WorkOrderReceivedPiece.huid`, certification tracking | **Fully Implemented** | None. Completed and skipped states verified by automated tests | **None** | Retain existing implementation |
| **10** | **Sales Invoice Concurrency & Cancellation Reversal** | `locktbl`, `tran1`, `vretvar` | `lockForUpdate()`, `SaleService::cancel()` | **Fully Implemented** | None. Full stock, piece, and delivery status reversal verified | **None** | Retain existing implementation |
| **11** | **A4 Tax Invoice Print Parity** | `_gstinv.frx`, `_gstinv.FRT` | `SalesModule.jsx` outer table `thead`/`tfoot`, `printHelper.js` | **Fully Implemented** | None. Exact visual print parity and multi-page header/footer verified | **None** | Retain existing implementation |
| **12** | **Desktop VFP-Specific Legacy Components** | `jwftp.exe`, `cabarc.exe`, `vfp9r.dll` | Web-based API architecture (Laravel + React) | **Intentionally Different** | Replaced with modern web standards; desktop binaries not applicable to cloud web ERP | **None** | Preserve modern web architecture |

---

## 2. Priority Ranking for Implementation

1. **Priority 1 (Critical Financial & Inventory Integrity)**:
   - **Customer Old Gold Exchange Intake in Billing**: Crucial for real-world jewellery retail transactions where customers trade old ornaments.
   - **Karigar Metal Hisab & Settlement**: Necessary for accurate metal balancing between showroom vault and artisans.
2. **Priority 2 (Core Jewellery Workflows)**:
   - **Approval / Jangad Memo System**: Standard jewellery trade practice allowing approval tracking without premature inventory or tax recognition.
   - **Jewellery Repair Management**: Intake, artisan job tracking, metal addition, and repair invoicing.
3. **Priority 3 (Compliance & CRM)**:
   - **Statutory ITC-04 Job Work & GSTR-1 Export**: Government compliance for karigar job work.
   - **Customer CRM Reminders**: Birthday, anniversary, and ready order notifications.
