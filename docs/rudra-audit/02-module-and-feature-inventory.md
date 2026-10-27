# Rudra Jewellery ERP — Master Technical Audit
## Document 02: Module and Feature Inventory

This inventory documents all actual modules present in the codebase, their user-facing screens, controllers, database tables, and verification status.

---

### Module 1: Authentication & Authorization (RBAC)
- **Business Purpose**: Multi-user login, session token lifecycle, role definitions (Super Admin, Admin, Manager, Staff), granular permission toggles.
- **Frontend Pages**:
  - `Login.jsx` (`/login`)
  - `Users.jsx` (`/settings/users`)
  - `Roles.jsx` (`/settings/roles`)
  - `Permissions.jsx` (`/settings/permissions`)
- **Backend Controllers**: `AuthController.php`, `UserController.php`, `RoleController.php`, `PermissionController.php`
- **Database Tables**: `users`, `roles`, `permissions`, `personal_access_tokens`
- **Status**: Complete & Verified (Bearer token Sanctum authentication active).

---

### Module 2: Dashboard & Quick Points Analytics
- **Business Purpose**: Real-time sales overview, today's sales, average order value, gold values buying/selling trend comparison, top selling categories, and quick action requirements.
- **Frontend Pages**: `Dashboard.jsx` (`/`)
- **Backend Controllers**: `DashboardController.php`, `WorkOrderController.php` (`/api/work-orders/dashboard-stats`)
- **Database Tables**: `invoices`, `sale_items`, `products`, `work_orders`, `gold_rates`
- **Status**: Complete & Verified (100% database-driven with zero-state fallbacks).

---

### Module 3: Client & Customer Management
- **Business Purpose**: Client registry, contact directory, membership tiers (Gold, Silver, Platinum), metal ledger deposits (with/without rate), transaction history, customer price lists, and billing summary.
- **Frontend Pages**:
  - `ClientList.jsx` (`/clients`)
  - `RegisterClient.jsx` (`/clients/register`, `/clients/edit/:id`)
  - `ClientPriceList.jsx` (`/clients/price-list`)
  - `BillingDashboard.jsx` (`/clients/billing`)
- **Backend Controllers**: `ClientController.php`, `ClientPriceListController.php`
- **Database Tables**: `clients`, `client_histories`, `client_price_lists`, `client_orders`
- **Status**: Complete & Verified (Includes Pure Gold metal deposit modal).

---

### Module 4: Supplier Management & Purchase Entry
- **Business Purpose**: Bullion and raw stone vendor directory, raw material purchasing (Gold bars, Diamond parcels, Silver grain), invoice reconciliation, touch%, wastage%, stone count, and tax breakdown.
- **Frontend Pages**:
  - `SupplierManagement.jsx` (`/suppliers`)
  - `PurchaseEntry.jsx` (`/purchase/entry`)
- **Backend Controllers**: `SupplierController.php`, `PurchaseEntryController.php`
- **Database Tables**: `suppliers`, `purchase_entries`, `raw_materials`, `inventory_movements`
- **Status**: Complete & Verified (Supports diamond stamp filtering and direct vault stock crediting).

---

### Module 5: Raw Materials & Vault Inventory
- **Business Purpose**: Vault stock levels across Gold (24K, 22K, 18K), Silver (925, Fine), Platinum, and Diamond carats. Real-time debiting during artisan issue and crediting upon purchase.
- **Frontend Pages**:
  - `RawMaterials.jsx` (`/masters/raw-materials`)
  - `StockManagement.jsx` (`/stock`)
- **Backend Controllers**: `RawMaterialController.php`, `StockController.php`
- **Database Tables**: `raw_materials`, `material_opening_stocks`
- **Status**: Complete & Verified (Isolated units: grams for gold, carats for diamond).

---

### Module 6: Finished Products & Catalogue Upload
- **Business Purpose**: Finished jewellery master catalogue, multi-component specifications (Gross wt, Net gold wt, Diamond cts, Stone cts), SKU/design number generator, image upload, bulk Excel/CSV import.
- **Frontend Pages**:
  - `InventoryDashboard.jsx` (`/inventory`)
  - `InventoryAddNewUpload.jsx` (`/inventory/upload`)
  - `InventoryBulkUpload.jsx` (`/inventory/bulk-upload`)
  - `InventoryViewProduct.jsx` (`/inventory/view/:id`)
  - `InventoryEditProduct.jsx` (`/inventory/edit/:id`)
- **Backend Controllers**: `InventoryController.php`, `ProductController.php`
- **Database Tables**: `products`, `categories`, `subcategories`, `inventory_movements`
- **Status**: Complete & Verified (31.8 cts / 10.5g allocation bug resolved).

---

### Module 7: Job Creation & Work Orders Lifecycle
- **Business Purpose**: Custom jewellery manufacturing pipeline: Part 1 Work Specifications, Part 2 Order Items with Gold Stamp and Diamond Stamp / Sieves, Part 3 Karigar allocation, Part 4 Approval, Part 5 PDF Work Order print sheet.
- **Frontend Pages**:
  - `JobOrderHub.jsx` (`/job-orders`)
  - `NewWorkOrder.jsx` (`/job-orders/create`, `/job-orders/edit/:id`)
  - `JobOrdersList.jsx` (`/job-orders/list`)
  - `WorkInProgress.jsx` (`/job-orders/wip`)
  - `JobOrderDelay.jsx` (`/job-orders/delays`)
  - `QualityCheckDetails.jsx` (`/job-orders/qc`)
  - `ReadyDetails.jsx` (`/job-orders/ready`)
  - `ReceiverWork.jsx` (`/job-orders/receive`)
  - `CertificationDetails.jsx` (`/job-orders/certification`)
  - `HallmarkingDetails.jsx` (`/job-orders/hallmarking`)
  - `TagPrinting.jsx` (`/job-orders/tags`)
- **Backend Controllers**: `WorkOrderController.php`, `WorkSpecificationController.php`, `WorkOrderNotificationController.php`
- **Database Tables**: `work_orders`, `work_order_items`, `work_order_received_pieces`, `work_order_operations`, `work_order_timelines`, `work_order_notifications`, `work_specifications`
- **Status**: Complete & Verified (Unit separation between diamond carats and gold grams strictly preserved).

---

### Module 8: Karigar (Artisan) Management & Metal Ledger
- **Business Purpose**: Artisan registry, daily gold issue & return, metal hisab balance summary, wastage tolerance tracking, making charge settlements.
- **Frontend Pages**:
  - `KarigarManagement.jsx` (`/karigars`)
  - `KarigarWorkModal.jsx` (Integrated modal)
- **Backend Controllers**: `KarigarController.php`
- **Database Tables**: `karigars`, `karigar_material_transactions`
- **Status**: Complete & Verified (Diamond weight displays in `ct`, gold in `g`).

---

### Module 9: Sales, Billing & Invoicing
- **Business Purpose**: Retail counter billing, finished piece selection, tag lookup, old gold exchange deduction, GST calculation (CGST/SGST/IGST), multi-mode payments (Cash, UPI, Card, Bank, Client Advance), PDF invoice generation.
- **Frontend Pages**: `SalesModule.jsx` (`/sales`)
- **Backend Controllers**: `SaleController.php`, `InvoiceController.php`
- **Database Tables**: `invoices`, `sale_items`, `sale_payments`, `invoice_old_golds`, `approval_memos`, `approval_memo_items`
- **Status**: Complete & Verified.

---

### Module 10: Masters & Configuration
- **Business Purpose**: System-wide reference masters for jewellery manufacturing standards:
  - Gold Karats (24K, 22K, 18K, 14K, 10K)
  - Hallmarks & Diamond Stamps / Sieves (+7, +5, +2, DI12, etc.)
  - Categories & Subcategories
  - Diamond 4Cs (Colors D-Z, Clarities FL-I3, Ranges)
  - Setting Styles (Prong, Pave, Bezel, Channel)
  - Bank Accounts & Company Info
- **Frontend Pages**: 20 Dedicated pages under `/masters/*`
- **Backend Controllers**: 15 Master controllers (`KaratController.php`, `StampController.php`, `CategoryController.php`, `SubcategoryController.php`, etc.)
- **Database Tables**: `karats`, `stamps`, `categories`, `subcategories`, `diamond_colors`, `diamond_clarities`, `diamond_ranges`, `styles`, `units`, `bank_accounts`, `company_infos`
- **Status**: Complete & Verified.

---

### Module 11: Reports & Compliance
- **Business Purpose**: Daily sales register, Stock valuation, Metal hisab report, GST summaries (GSTR-1, ITC-04 Karigar job work), Profit per invoice/metal.
- **Frontend Pages**: `ReportModule.jsx` (`/reports`)
- **Backend Controllers**: `ReportController.php`
- **Database Tables**: Dynamic queries across `invoices`, `inventory_movements`, `purchase_entries`, `karigar_material_transactions`
- **Status**: Complete & Verified.
