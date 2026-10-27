# Implementation Plan: Legacy Gap Remediation

**Project**: Rudra Jewellery ERP  
**Execution Target**: Active Codebase  
**Plan Date**: October 2026

---

## 1. Planned Modules & Technical Scope

### Module 1: Old Gold / Metal Exchange Intake in Billing (Priority 1)
- **Objective**: Allow sales invoices to record old gold traded in by the customer, calculate net weight, melting loss, touch percentage, fine gold equivalent, and credit the value directly against the invoice payable balance.
- **Database Changes**:
  - Create table `invoice_old_golds`: `id`, `invoice_id`, `item_description`, `gross_weight`, `melting_loss`, `net_weight`, `purity_touch`, `fine_weight`, `rate_per_gram`, `total_credit`, `created_at`, `updated_at`.
- **Backend**:
  - Model: `app/Models/InvoiceOldGold.php`.
  - Update `app/Services/SaleService.php`: Validate old gold items, compute credit amount, persist `InvoiceOldGold` records, deduct credit from `invoices.paid_amount` / `invoices.due_amount`, and record raw material vault increment of scrap gold.
  - Update `app/Http/Controllers/Api/SalesController.php`: Handle `old_gold_items` payload in `createSale`.
- **Frontend**:
  - Update `resources/js/pages/sales/SalesModule.jsx`: Add "Old Gold Exchange" intake section with fields for Item Name, Gross Wt, Melting Loss / Purity Touch %, Gold Rate, and auto-computed credit. Display Old Gold Deduction in the financial summary cards and printable tax invoice.
- **Acceptance Criteria**:
  - Old gold credit deducts accurately from bill total.
  - Old gold line items appear on the printed A4 invoice.
  - Old gold additions credit raw material scrap stock for the vault.

---

### Module 2: Approval / Jangad Memo Management (Priority 1)
- **Objective**: Enable showroom pieces to be sent to clients on approval/memo.
- **Database Changes**:
  - Add status `'on_approval'` to `work_order_received_pieces`.
  - Create table `approval_memos`: `id`, `memo_number`, `client_id`, `memo_date`, `due_date`, `status` (`pending`, `returned`, `converted_to_sale`, `partial`), `total_pieces`, `total_weight`, `estimated_value`, `notes`.
  - Create table `approval_memo_items`: `id`, `approval_memo_id`, `piece_id`, `tag_number`, `product_id`, `gross_weight`, `net_weight`, `estimated_price`, `status` (`pending`, `returned`, `sold`).
- **Backend**:
  - Models: `app/Models/ApprovalMemo.php`, `app/Models/ApprovalMemoItem.php`.
  - Controller: `app/Http/Controllers/Api/ApprovalMemoController.php`.
  - Endpoints:
    - `POST /api/approvals`: Issue approval memo (sets piece status to `on_approval`).
    - `POST /api/approvals/{id}/return`: Return piece to showroom (restores piece status to `in_stock`).
    - `POST /api/approvals/{id}/convert-to-sale`: Convert accepted pieces to a sales invoice.
- **Acceptance Criteria**:
  - Pieces on approval cannot be double-sold.
  - Returned pieces immediately re-enter available stock.
  - Converting to sale marks pieces as sold and issues a standard GST invoice.

---

### Module 3: Karigar Metal Hisab & Settlement (Priority 1)
- **Objective**: Deliver a consolidated settlement sheet and ledger for each Karigar.
- **Backend**:
  - Add endpoint in `app/Http/Controllers/Api/KarigarController.php`: `GET /api/karigars/{id}/hisab-summary`.
  - Calculates:
    1. Total pure metal issued to date.
    2. Total pure metal received in finished pieces.
    3. Total scrap metal returned.
    4. Allowed wastage based on agreed percentage.
    5. Net outstanding metal balance (Owed by Karigar / Due to Karigar).
    6. Outstanding making charges payable.
- **Frontend**:
  - Update `resources/js/pages/karigar/` with a "Metal Hisab & Settlement" modal/tab showing the real-time balance sheet with print and export capabilities.

---

### Module 4: Customer Jewellery Repair Management (Priority 2)
- **Objective**: Intake customer repair jewellery, assign to Karigar, track added metal/stones, and bill repair labour.
- **Database Changes**:
  - Create table `repairs`: `id`, `repair_number`, `client_id`, `intake_date`, `promised_date`, `description`, `intake_weight`, `status` (`received`, `assigned`, `in_progress`, `ready`, `delivered`), `karigar_id`, `added_metal_weight`, `added_metal_cost`, `labour_charges`, `stone_charges`, `total_charges`, `notes`.
- **Backend**:
  - Model: `app/Models/Repair.php`.
  - Controller: `app/Http/Controllers/Api/RepairController.php`.
  - Full CRUD and lifecycle transition endpoints.

---

### Module 5: Customer CRM & Payment Reminders (Priority 3)
- **Objective**: Proactive customer relationship management and alerts.
- **Backend**:
  - Add service `app/Services/CustomerCrmService.php`:
    - Daily birthday alerts (`DOB = today`).
    - Anniversary alerts (`ASARY = today`).
    - Overdue payment reminders (`due_amount > 0` and `invoice_date + credit_days < today`).
  - Add endpoint `GET /api/notifications/customer-alerts`.

---

### Module 6: Statutory ITC-04 & GSTR-1 Reporting (Priority 3)
- **Objective**: Export GST-compliant Karigar movement (ITC-04) and sales outward summary (GSTR-1).
- **Backend**:
  - Add endpoints in `app/Http/Controllers/Api/ReportController.php`:
    - `GET /api/reports/itc04`: Quarterly job work summary (Goods sent, goods received, scrap loss).
    - `GET /api/reports/gstr1-summary`: B2B and B2C sales categorized by HSN `7113`.

---

## 2. Backward Compatibility & Non-Destructive Principles

- All migrations will strictly use `CREATE TABLE IF NOT EXISTS` or non-null nullable column additions.
- Existing records, active work orders, client data, and inventory tags will remain 100% untouched.
- Existing API endpoints will preserve their exact signature and response contracts.
- Automated tests will be run before and after implementation to verify 0 regressions.
