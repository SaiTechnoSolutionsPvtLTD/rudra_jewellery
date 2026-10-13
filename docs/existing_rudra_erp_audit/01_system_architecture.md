# 01. SYSTEM ARCHITECTURE & TECHNICAL OVERVIEW

**System:** Rudhra Jewellers ERP & Manufacturing Execution System  
**Audit Date:** October 2026  
**Auditor:** Senior ERP Business Analyst & Software Architect  
**Evidence Source:** Verified directly from active repository source code, migrations, controllers, models, and UI components.

---

## 1. Executive Technical Summary

The Rudhra Jewellers software is an on-premise/cloud-capable jewellery manufacturing, inventory, wholesale, and retail enterprise system built with:
- **Backend Framework:** Laravel 11.x (PHP 8.2+) running a RESTful API architecture.
- **Frontend Framework:** React 18 (SPA) powered by Vite, Tailwind CSS, FontAwesome icons, and React Router DOM v6.
- **Database Engine:** MySQL 8.0+ / MariaDB relational database with 62 migrations and InnoDB storage engine.
- **Authentication:** Laravel Sanctum token-based authentication (`auth:sanctum`), with Bearer tokens stored in frontend local storage (`localStorage.getItem('token')`).
- **Application Entry Point:** `http://127.0.0.1:8000/` serving the React SPA through `resources/views/welcome.blade.php` / `resources/js/app.jsx`.

---

## 2. Directory & Component Organization

### A. Backend Architecture (`app/`)
```
app/
├── Http/
│   ├── Controllers/
│   │   ├── Api/
│   │   │   ├── AuthController.php               # User login/logout/profile
│   │   │   ├── CategoryController.php           # Product categories & dynamic form schema
│   │   │   ├── SubcategoryController.php        # Subcategories & dynamic form schema
│   │   │   ├── ProductController.php            # Core inventory master catalog CRUD
│   │   │   ├── ProductDesignController.php      # CAD designs, styles & catalog sync
│   │   │   ├── InventoryController.php          # Inventory dashboard, stock movements & bulk CSV
│   │   │   ├── WorkOrderController.php          # Core manufacturing engine (3,495 lines)
│   │   │   ├── KarigarController.php            # Artisan master & bench balance tracking
│   │   │   ├── ClientController.php             # Customer master, price lists & billing
│   │   │   ├── SalesController.php              # POS retail/wholesale sales & invoice settlements
│   │   │   ├── PurchaseEntryController.php      # Raw material & finished goods procurement
│   │   │   ├── ReportController.php             # Financial, metal & sales reporting
│   │   │   ├── DashboardController.php          # Live metal rates & executive KPIs
│   │   │   ├── ItemController.php               # Line item definitions
│   │   │   ├── StampController.php              # Purity stamps (+7, +0, 916 BIS)
│   │   │   ├── KaratController.php              # Karat definitions (18K, 22K, 24K)
│   │   │   ├── GoldTypeController.php           # Yellow, Rose, White Gold
│   │   │   ├── DiamondRangeController.php       # Diamond carats, sieve sizes & rates
│   │   │   ├── DiamondColorController.php       # D, E, F, G, H, etc.
│   │   │   ├── DiamondClarityController.php     # IF, VVS1, VS1, SI1, etc.
│   │   │   ├── ComponentCategoryController.php  # Multi-part design components
│   │   │   ├── BankAccountController.php        # Company ledger accounts
│   │   │   ├── CompanyInfoController.php        # Business identity & GST/BIS data
│   │   │   └── WorkSpecificationController.php  # Workshop checklists & standards
│   └── Middleware/
├── Models/
│   ├── Product.php                              # Finished jewellery master record
│   ├── ProductDesign.php                        # Reusable CAD/Design definitions
│   ├── JobOrder.php                             # Parent customer job order header
│   ├── WorkOrder.php                            # Manufacturing production work order
│   ├── WorkOrderItem.php                        # Multi-job design item within work order
│   ├── WorkOrderReceivedPiece.php               # Physical piece receiving & unique tag
│   ├── WorkOrderOperation.php                   # Production stages (casting, filing, etc.)
│   ├── WorkOrderTimeline.php                    # Immutable audit trail of state transitions
│   ├── WorkOrderNotification.php                # Notification queue entries
│   ├── RawMaterial.php                          # Metal vault (Gold, Silver, Diamond)
│   ├── InventoryMovement.php                    # Stock ledger audit log (in/out/adjust)
│   ├── Karigar.php                              # Artisan profile & bench gold balance
│   ├── Client.php                               # Client/customer account
│   ├── Invoice.php                              # Sales billing invoice header
│   ├── SaleItem.php                             # Sold product line items
│   ├── SalePayment.php                          # Payment receipt transactions
│   ├── PurchaseEntry.php                        # Purchase voucher header
│   ├── Category.php                             # Category master
│   ├── Subcategory.php                          # Subcategory master
│   └── User.php                                 # System user & role mapping
└── Services/
    └── SaleService.php                          # Transactional sales & stock decrement service
```

### B. Frontend Architecture (`resources/js/`)
```
resources/js/
├── app.jsx                                      # Main React router & role protection routes
├── index.css                                    # Tailwind and thermal print stylesheet
├── components/
│   ├── Sidebar.jsx                              # Navigation sidebar with permission filtering
│   ├── Navbar.jsx                               # Header bar with live metal rates & notifications
│   ├── JewelleryTagCard.jsx                     # Thermal jewellery tag layout & SVG barcode
│   └── ConfirmModal.jsx                         # Reusable action confirmation modal
├── context/
│   └── AuthContext.jsx                          # User authentication state & token holder
├── services/
│   └── api.js                                   # Axios interceptor attaching Sanctum token
└── pages/
    ├── Dashboard.jsx                            # Main ERP dashboard & metal rates ticker
    ├── inventory/
    │   ├── InventoryDashboard.jsx               # Stock KPIs, filterable product grid & alerts
    │   ├── InventoryViewProduct.jsx             # Deep product view, movement history & physical tags
    │   ├── InventoryAddNewUpload.jsx            # Multi-part product addition wizard
    │   ├── InventoryEditProduct.jsx             # Full attribute modification form
    │   ├── InventoryBulkUpload.jsx              # CSV sample download and batch importer
    │   └── InventoryBarcodeTag.jsx              # Product SKU barcode printing
    ├── job-order/
    │   ├── JobCreationDashboard.jsx             # Ongoing work orders, status tabs & live stats
    │   ├── NewWorkOrder.jsx                     # Work order creation & multi-job design picker
    │   ├── WorkInProgress.jsx                   # Workshop progress logger & partial completion
    │   ├── QualityCheckDetails.jsx              # Inspection workbench (Pass / Rework)
    │   ├── CertificationDetails.jsx             # BIS/IGI certification registration & skipping
    │   ├── HallmarkingDetails.jsx               # BIS HUID registration & skipping
    │   ├── ReadyDetails.jsx                     # Fully ready goods staging area
    │   ├── ReceiverWork.jsx                     # Reception desk piece receiving & tag generation
    │   ├── TagPrinting.jsx                      # Thermal tag batch preview & direct printing
    │   ├── JobOrderDelay.jsx                    # Manufacturing delay tracking & reason logger
    │   └── HistoryDetails.jsx                   # Completed job order archives & timeline audit
    ├── karigar/
    │   ├── KarigarManagement.jsx                # Artisan directory & live bench balance cards
    │   └── KarigarWorkModal.jsx                 # Artisan job allocation & update modal
    ├── masters/                                 # 18 master data management screens
    ├── sales/                                   # POS sales, customer ledger & invoice history
    ├── purchase/                                # Raw metal & product purchase vouchers
    ├── stock/                                   # Raw material vault & supplier balances
    └── reports/                                 # Profit per metal & transactional analytics
```

---

## 3. Database Engine & Schema Overview

- **Engine:** MySQL 8.0+ / MariaDB.
- **Default Charset:** `utf8mb4` with collation `utf8mb4_unicode_ci`.
- **Primary Keys:** Auto-incrementing unsigned big integers (`id`).
- **Foreign Keys:** Enforced cascading constraints on key relationships (`work_order_id`, `client_id`, `category_id`).
- **Concurrency & Locking:** High-risk write operations (`receivePiece`, `wipUpdate`, `qcAction`, `debitAllocation`) use `DB::transaction()` paired with `lockForUpdate()` row locks.
- **Audit Trails:** Managed via dedicated timeline (`work_order_timelines`) and ledger (`inventory_movements`) tables rather than soft deletes or database triggers.

---

## 4. Authentication, Roles & Authorization (RBAC)

### A. Authentication Mechanism
1. Client sends `POST /api/login` with `email` (or `mobile`) and `password`.
2. `AuthController::login()` validates credentials and creates a Personal Access Token via Laravel Sanctum (`$user->createToken('auth-token')->plainTextToken`).
3. Frontend stores the token in `localStorage.getItem('token')` and configures Axios headers:
   ```javascript
   api.interceptors.request.use((config) => {
     const token = localStorage.getItem('token');
     if (token) config.headers.Authorization = `Bearer ${token}`;
     return config;
   });
   ```

### B. Role Hierarchy & Reality Check
The database defines 4 standard roles (`roles` table):
1. `Admin` / `Super Admin`: Unrestricted access across all modules.
2. `Manager`: Workshop management, assignment, WIP tracking, and QC.
3. `Receptionist` / `Store Staff`: Physical intake, tag printing, customer sales.
4. `Karigar` (Artisan): Designed for workshop workers.

> [!IMPORTANT]
> **Source Code Finding on Karigar Login:**
> In `app/Models/User.php:96`, the method `isKarigar()` is hardcoded to `return false;`.
> Furthermore, in `resources/js/context/AuthContext.jsx:102`, `const isKarigar = false;` is permanently assigned.
> **Operational Reality:** Karigars do not log into the software directly. All job updates, completions, receiving, and rework logging are performed by Workshop Managers or Receptionists on behalf of the artisans.

---

## 5. External Integrations & Scheduled Jobs

- **Thermal Printing:** Native browser print subsystem using CSS `@media print` rules formatted for 105mm × 33mm thermal jewellery tags.
- **Barcode Encoding:** Vector SVG rendering (`BarcodeSvgLines`) seeded directly from string character codes, ensuring zero external font or cloud dependency.
- **PDF Generation:** Handled server-side for Work Order summaries via `WorkOrderController::exportPdf()` using standard HTML stream responses.
- **Metal Rate Feed:** Dashboard consumes rates configured in `CompanyInfo` or updated live via `POST /api/metal-rates`.
