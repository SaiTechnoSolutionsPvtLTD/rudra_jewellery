# Rudra Jewellery ERP — Complete Module & Feature Inventory

## 1. Overview

This document catalogs every functional module, submodule, and operational workflow discovered in the Rudra Jewellery ERP codebase (`c:\Users\Pugal Gokul\Documents\rudhra`). Each entry records verified frontend routes, React page components, backend REST API endpoints, controllers, domain services, Eloquent models, database tables, permission keys, and module dependencies.

---

## 2. Comprehensive Module Catalog

### Module 1: Dashboard & Analytics
- **Description**: Executive dashboard providing real-time KPI metrics, stock summaries, production WIP pipeline indicators, financial receivables/payables, live metal rates, and historical gold averages.
- **Frontend Route**: `/dashboard`, `/`
- **Frontend Component**: [`resources/js/pages/Dashboard.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/Dashboard.jsx)
- **API Endpoints**:
  - `GET api/dashboard` (`DashboardController@index`)
  - `GET api/metal-rates` (`DashboardController@metalRates`)
  - `POST api/metal-rates` (`DashboardController@updateMetalRates`)
  - `POST api/metal-rates/reset` (`DashboardController@resetMetalRates`)
  - `GET api/work-orders/dashboard-stats` (`WorkOrderController@dashboardStats`)
- **Backend Controller**: [`DashboardController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/DashboardController.php), [`WorkOrderController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/WorkOrderController.php)
- **Domain Services**: [`MetalRateService.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Services/MetalRateService.php)
- **Eloquent Models**: [`Invoice.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Invoice.php), [`Product.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Product.php), [`WorkOrder.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrder.php), [`WorkOrderReceivedPiece.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrderReceivedPiece.php), [`RawMaterial.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/RawMaterial.php), [`Karigar.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Karigar.php), [`Supplier.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Supplier.php), [`GoldRate.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/GoldRate.php)
- **Database Tables**: `invoices`, `products`, `work_orders`, `work_order_received_pieces`, `raw_materials`, `karigars`, `suppliers`, `gold_rates`
- **Permissions**: Authenticated user (`auth:sanctum`). Rate override requires administrator permissions.
- **Dependencies**: Feeds from Sales, Inventory, Job Orders, Purchases, and Suppliers.

---

### Module 2: Authentication, Users, Roles & Permissions
- **Description**: User identity management, Sanctum API token authentication, avatar file uploads, role assignment, and granular permission slug controls.
- **Frontend Routes**:
  - `/login` (Guest route)
  - `/authentication/users` (Permission: `users.view`)
  - `/authentication/roles` (Permission: `roles.view`)
  - `/authentication/permissions` (Permission: `permissions.view`)
- **Frontend Components**:
  - [`resources/js/pages/auth/Login.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/auth/Login.jsx)
  - [`resources/js/pages/authentication/Users.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/authentication/Users.jsx)
  - [`resources/js/pages/authentication/Roles.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/authentication/Roles.jsx)
  - [`resources/js/pages/authentication/Permissions.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/authentication/Permissions.jsx)
- **API Endpoints**:
  - `POST api/login`, `POST api/logout`, `GET api/me` (`AuthController`)
  - `apiResource api/users` (`UserController`)
  - `POST api/users/upload-avatar`, `POST api/users/{id}/avatar` (`UserController@uploadAvatar`)
  - `apiResource api/roles` (`RoleController`)
  - `apiResource api/permissions` (`PermissionController`)
- **Backend Controllers**: [`AuthController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/AuthController.php), [`UserController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/UserController.php), [`RoleController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/RoleController.php), [`PermissionController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/PermissionController.php)
- **Eloquent Models**: [`User.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/User.php), [`Role.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Role.php), [`Permission.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Permission.php)
- **Database Tables**: `users`, `roles`, `permissions`, `personal_access_tokens`
- **Permissions**: `users.view`, `users.create`, `users.edit`, `users.delete`, `roles.view`, `permissions.view`
- **Dependencies**: Base security foundation for all system routes and audit logs.

---

### Module 3: Masters & Configuration
- **Description**: Centralized configuration of jewellery domain hierarchies: Categories, Subcategories, Items, Setting Styles, Karats, Stamps, Units, Component Categories, Work Specifications, Operations, Bank Accounts, and Company Information.
- **Frontend Routes**:
  - `/masters/categories`, `/masters/subcategories`, `/masters/items`
  - `/masters/setting-styles`, `/masters/gold-types`, `/masters/diamond-ranges`, `/masters/diamond-colors`, `/masters/diamond-clarities`
  - `/masters/karats`, `/masters/stamps`, `/masters/units`, `/masters/component-categories`
  - `/masters/work-specifications`, `/masters/operations`, `/masters/bank-accounts`, `/masters/company-info`, `/masters/memberships`
- **Frontend Components**:
  - [`resources/js/pages/masters/Categories.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/Categories.jsx)
  - [`resources/js/pages/masters/Subcategories.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/Subcategories.jsx)
  - [`resources/js/pages/masters/ItemsMaster.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/ItemsMaster.jsx)
  - [`resources/js/pages/masters/SettingStyles.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/SettingStyles.jsx)
  - [`resources/js/pages/masters/GoldTypes.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/GoldTypes.jsx)
  - [`resources/js/pages/masters/DiamondRanges.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/DiamondRanges.jsx)
  - [`resources/js/pages/masters/DiamondColors.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/DiamondColors.jsx)
  - [`resources/js/pages/masters/DiamondClarities.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/DiamondClarities.jsx)
  - [`resources/js/pages/masters/Karats.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/Karats.jsx)
  - [`resources/js/pages/masters/Stamps.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/Stamps.jsx)
  - [`resources/js/pages/masters/Units.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/Units.jsx)
  - [`resources/js/pages/masters/ComponentCategories.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/ComponentCategories.jsx)
  - [`resources/js/pages/masters/WorkSpecifications.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/WorkSpecifications.jsx)
  - [`resources/js/pages/masters/Operations.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/Operations.jsx)
  - [`resources/js/pages/masters/BankAccounts.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/BankAccounts.jsx)
  - [`resources/js/pages/masters/CompanyInfoMaster.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/CompanyInfoMaster.jsx)
  - [`resources/js/pages/masters/Memberships.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/Memberships.jsx)
- **API Endpoints**:
  - `apiResource api/categories`, `subcategories`, `items`, `styles`, `gold-types`, `diamond-ranges`, `diamond-colors`, `diamond-clarities`, `karats`, `stamps`, `units`, `component-categories`, `operations`, `work-specifications`, `bank-accounts`, `company-info`, `memberships`
  - `POST api/company-info/{id}/set-default`, `POST api/bank-accounts/{id}/set-default`
- **Backend Controllers**: [`CategoryController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/CategoryController.php), [`SubcategoryController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/SubcategoryController.php), [`ItemController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/ItemController.php), [`StyleController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/StyleController.php), [`GoldTypeController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/GoldTypeController.php), [`DiamondRangeController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/DiamondRangeController.php), [`DiamondColorController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/DiamondColorController.php), [`DiamondClarityController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/DiamondClarityController.php), [`KaratController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/KaratController.php), [`StampController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/StampController.php), [`UnitController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/UnitController.php), [`ComponentCategoryController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/ComponentCategoryController.php), [`OperationController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/OperationController.php), [`WorkSpecificationController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/WorkSpecificationController.php), [`BankAccountController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/BankAccountController.php), [`CompanyInfoController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/CompanyInfoController.php), [`MembershipController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/MembershipController.php)
- **Eloquent Models**: `Category`, `Subcategory`, `Item`, `Style`, `GoldType`, `DiamondRange`, `DiamondColor`, `DiamondClarity`, `Karat`, `Stamp`, `Unit`, `ComponentCategory`, `Operation`, `WorkSpecification`, `BankAccount`, `CompanyInfo`, `Membership`
- **Database Tables**: `categories`, `subcategories`, `items`, `styles`, `gold_types`, `diamond_ranges`, `diamond_colors`, `diamond_clarities`, `karats`, `stamps`, `units`, `component_categories`, `operations`, `work_specifications`, `bank_accounts`, `company_infos`, `memberships`
- **Permissions**: Authenticated administrative users.
- **Dependencies**: Required upfront by Products, Purchases, Work Orders, Receivings, and Sales.

---

### Module 4: Gold Rates & Pricing Configuration
- **Description**: Daily gold and silver market rate maintenance per gram across 24K, 22K, 18K, 14K purities. Supports live rate overrides, historical date tracking, and fallback defaults.
- **Frontend Route**: Embedded in `/dashboard` and `/sales/rates`
- **API Endpoints**:
  - `GET api/metal-rates`, `POST api/metal-rates`, `POST api/metal-rates/reset` (`DashboardController`)
  - `GET api/gold-rates/today`, `apiResource api/gold-rates` (`GoldRateController`)
- **Backend Controllers**: [`GoldRateController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/GoldRateController.php), [`DashboardController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/DashboardController.php)
- **Domain Services**: [`MetalRateService.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Services/MetalRateService.php), [`PricingService.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Services/PricingService.php)
- **Eloquent Models**: [`GoldRate.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/GoldRate.php)
- **Database Tables**: `gold_rates`
- **Dependencies**: Consumed by Sales invoicing, Work Order costing, Inventory piece valuation, and Client Price Lists.

---

### Module 5: Client / Customer Management
- **Description**: Full retail and wholesale client profile directory, client code auto-generation (`RJ-CL-XXXX`), contact details, GSTIN, PAN, anniversary/DOB records, opening balance tracking (receivable/payable), metal deposit intake, soft-deletion/removal, and restoration.
- **Frontend Routes**:
  - `/clients` (Client directory)
  - `/clients/create`, `/clients/:id/edit` (Register / Edit client)
  - `/clients/removed` (Removed clients recycle bin)
- **Frontend Components**:
  - [`resources/js/pages/clients/ClientList.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/clients/ClientList.jsx)
  - [`resources/js/pages/clients/RegisterClient.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/clients/RegisterClient.jsx)
  - [`resources/js/pages/clients/RemovePage.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/clients/RemovePage.jsx)
- **API Endpoints**:
  - `GET api/clients/generate-code` (`ClientController@generateCode`)
  - `GET api/clients/removed` (`ClientController@removedClients`)
  - `POST api/clients/{id}/remove` (`ClientController@removeClient`)
  - `POST api/clients/{id}/restore` (`ClientController@restoreClient`)
  - `POST api/clients/{id}/metal-deposit` (`ClientController@recordMetalDeposit`)
  - `apiResource api/clients` (`ClientController`)
- **Backend Controller**: [`ClientController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/ClientController.php)
- **Eloquent Models**: [`Client.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Client.php), [`Membership.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Membership.php)
- **Database Tables**: `clients`, `memberships`
- **Permissions**: `clients.view`, `clients.create`, `clients.edit`, `clients.delete`
- **Dependencies**: Linked to Work Orders, Invoices, Sales, Price Lists, Approvals, and Repairs.

---

### Module 6: Customer-Specific Price Lists & Versioning
- **Description**: Client-specific pricing contracts with versioning (`01`, `02`, etc.), custom metal rates (24K, 22K, 18K, 14K), diamond stone sieve slabs, color stone rates, labour/making charge tables, stamping instructions, and COD/credit payment terms. Activating a version automatically archives previous versions.
- **Frontend Routes**: `/clients/price-list`, `/clients/:id/price-list`
- **Frontend Component**: [`resources/js/pages/clients/ClientPriceList.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/clients/ClientPriceList.jsx)
- **API Endpoints**:
  - `GET api/clients/{client}/price-list` (`ClientPriceListController@show`)
  - `POST api/clients/{client}/price-list` (`ClientPriceListController@storeOrUpdate`)
  - `POST api/clients/{client}/price-list/activate/{priceList}` (`ClientPriceListController@activateVersion`)
  - `GET api/clients/{client}/price-list/history` (`ClientPriceListController@history`)
- **Backend Controller**: [`ClientPriceListController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/ClientPriceListController.php)
- **Domain Services**: [`PricingService.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Services/PricingService.php)
- **Eloquent Models**: [`ClientPriceList.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/ClientPriceList.php), [`Client.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Client.php)
- **Database Tables**: `client_price_lists`
- **Dependencies**: Resolves rates during Sales invoicing and Work Order pricing. Historical invoices preserve the snapshot version in `invoices.price_list_version` and `sale_items.price_list_version`.

---

### Module 7: Supplier Management
- **Description**: Bullion and gemstone vendor directory, tracking contact info, GSTIN, payment terms, and independent metal (gold/silver 24K pure grams) and cash balances.
- **Frontend Routes**: `/suppliers`, `/stock-management/suppliers`
- **Frontend Component**: [`resources/js/pages/stock/SupplierManagement.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/stock/SupplierManagement.jsx)
- **API Endpoints**:
  - `GET api/suppliers/{id}/ledger` (`SupplierController@ledger`)
  - `POST api/suppliers/{id}/settle`, `POST api/suppliers/{id}/settlements` (`SupplierController@settle`)
  - `POST api/suppliers/{id}/adjust-balance` (`SupplierController@adjustBalance`)
  - `apiResource api/suppliers` (`SupplierController`)
- **Backend Controller**: [`SupplierController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/SupplierController.php)
- **Eloquent Models**: [`Supplier.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Supplier.php), [`SupplierSettlement.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/SupplierSettlement.php), [`PurchaseEntry.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/PurchaseEntry.php)
- **Database Tables**: `suppliers`, `supplier_settlements`, `purchase_entries`
- **Dependencies**: Feeds Purchase Entries and Raw Material replenishment.

---

### Module 8: Purchase Entry & Raw-Material Purchasing
- **Description**: Procurement entry of Bullion (Gold, Silver), Diamonds (multi-sieve parcels), Colour Stones, or Finished Jewellery from suppliers. Supports priced purchases (cash payable) and unpriced/unfixed purchases (24K fine-gold metal debt), credit days calculation, tax breakdown (CGST, SGST, IGST), and automatic master stamp auto-creation.
- **Frontend Routes**: `/purchase/entry`, `/purchase/new`, `/purchase/details`, `/purchase/stock`
- **Frontend Component**: [`resources/js/pages/purchase/PurchaseEntry.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/purchase/PurchaseEntry.jsx)
- **API Endpoints**:
  - `GET api/purchase-entries/generate-no` (`PurchaseEntryController@generateNo`)
  - `GET api/purchase-entries/due-reminders` (`PurchaseEntryController@dueReminders`)
  - `POST/PATCH api/purchase-entries/{id}/payment-status` (`PurchaseEntryController@updatePaymentStatus`)
  - `POST api/purchase-entries/{id}/convert-payment-mode` (`PurchaseEntryController@convertPaymentMode`)
  - `apiResource api/purchase-entries` (`PurchaseEntryController`)
- **Backend Controller**: [`PurchaseEntryController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/PurchaseEntryController.php)
- **Eloquent Models**: [`PurchaseEntry.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/PurchaseEntry.php), [`RawMaterial.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/RawMaterial.php), [`Product.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Product.php), [`Supplier.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Supplier.php), [`InventoryMovement.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/InventoryMovement.php), [`WorkOrderReceivedPiece.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrderReceivedPiece.php)
- **Database Tables**: `purchase_entries`, `raw_materials`, `products`, `suppliers`, `inventory_movements`, `work_order_received_pieces`
- **Dependencies**: Direct upstream source for Raw Material vault balances, Supplier Ledgers, and Finished Inventory.

---

### Module 9: Raw-Material Inventory & Stock Management
- **Description**: Management of company vaults for Gold (tracked in 24K pure weight), Silver, Diamonds (carats and piece counts), and Colour Stones. Supports opening stock entries, quick additions, unified stock summaries, and allocation recalculation against Karigar workbench issuances.
- **Frontend Routes**: `/masters/raw-materials`, `/stock-management`
- **Frontend Components**:
  - [`resources/js/pages/masters/RawMaterials.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/masters/RawMaterials.jsx)
  - [`resources/js/pages/stock/StockManagement.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/stock/StockManagement.jsx)
- **API Endpoints**:
  - `GET api/raw-materials/unified-stock`, `POST api/raw-materials/unified-stock/update` (`MaterialOpeningStockController`)
  - `POST api/raw-materials/quick-stock-add` (`RawMaterialController@quickStockAdd`)
  - `apiResource api/raw-materials` (`RawMaterialController`)
  - `GET api/material-opening-stocks/generate-no`, `apiResource api/material-opening-stocks` (`MaterialOpeningStockController`)
- **Backend Controllers**: [`RawMaterialController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/RawMaterialController.php), [`MaterialOpeningStockController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/MaterialOpeningStockController.php)
- **Eloquent Models**: [`RawMaterial.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/RawMaterial.php), [`MaterialOpeningStock.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/MaterialOpeningStock.php)
- **Database Tables**: `raw_materials`, `material_opening_stocks`, `material_types`
- **Dependencies**: Deducted when materials are allocated to Karigars; credited on purchases, supplier returns, old gold intake, or unused artisan vault returns.

---

### Module 10: Finished Jewellery / Product Inventory
- **Description**: Inventory management of finished jewellery products with multi-component JSON attributes (metal purity, gross/net weights, diamond sieve specs, stone counts, tags). Supports single product creation, bulk CSV/Excel upload with background image extraction, inline editing, and deletion.
- **Frontend Routes**:
  - `/inventory` (Inventory Dashboard)
  - `/inventory/bulk-upload` (Bulk CSV Upload)
  - `/inventory/add-new/category`, `/inventory/add-new/subcategory`, `/inventory/add-new/upload`, `/inventory/upload-complete`
  - `/inventory/products/:id`, `/inventory/products/:id/edit`
- **Frontend Components**:
  - [`resources/js/pages/inventory/InventoryDashboard.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/inventory/InventoryDashboard.jsx)
  - [`resources/js/pages/inventory/InventoryBulkUpload.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/inventory/InventoryBulkUpload.jsx)
  - [`resources/js/pages/inventory/InventoryAddNewUpload.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/inventory/InventoryAddNewUpload.jsx)
  - [`resources/js/pages/inventory/InventoryViewProduct.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/inventory/InventoryViewProduct.jsx)
  - [`resources/js/pages/inventory/InventoryEditProduct.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/inventory/InventoryEditProduct.jsx)
- **API Endpoints**:
  - `GET api/inventory/categories`, `GET api/inventory/sample-csv`, `GET api/inventory/sample-excel`
  - `POST api/inventory/bulk-upload/preview`, `POST api/inventory/bulk-upload`
  - `GET api/inventory/products/{id}`, `PUT api/inventory/products/{id}`, `DELETE api/inventory/products/{id}`
  - `POST api/inventory/products/{id}/movements`
  - `GET api/inventory`, `POST api/inventory`
  - `POST api/products/bulk-opening-stock`, `POST api/products/{id}/opening-stock`
  - `apiResource api/products`
- **Backend Controllers**: [`InventoryController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/InventoryController.php), [`ProductController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/ProductController.php)
- **Domain Services**: [`ProductBulkUploadService.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Services/ProductBulkUploadService.php)
- **Eloquent Models**: [`Product.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Product.php), [`InventoryMovement.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/InventoryMovement.php)
- **Database Tables**: `products`, `inventory_movements`
- **Dependencies**: Fed by Work Order inventory posting and Purchase Entries; deducted by Sales invoicing.

---

### Module 11: Product Parent-Child Relationships & Individual Tags
- **Description**: Strict hierarchy between parent catalogue product designs (`Product`, `ProductDesign`) and individual serialized child jewellery pieces (`WorkOrderReceivedPiece`). Stores individual tag numbers (`TAG-YYYY-XXXXXX`), gross/net weights, diamond sieve breakdowns, and prevents double-selling.
- **Frontend Routes**:
  - `/inventory/products/:id/jewellery-tag`
  - `/inventory/products/:id/barcode-tag`
- **Frontend Components**:
  - [`resources/js/pages/inventory/InventoryJewelleryTag.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/inventory/InventoryJewelleryTag.jsx)
  - [`resources/js/pages/inventory/InventoryBarcodeTag.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/inventory/InventoryBarcodeTag.jsx)
- **API Endpoints**:
  - `GET api/work-orders/tags` (`WorkOrderController@getTags`)
  - `GET api/inventory/products/{id}/tags` (`WorkOrderController@getProductTags`)
  - `GET api/inventory/jewellery-tags/{tag}` (`WorkOrderController@getTagDetails`)
- **Backend Controller**: [`WorkOrderController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/WorkOrderController.php)
- **Eloquent Models**: [`WorkOrderReceivedPiece.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrderReceivedPiece.php), [`Product.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Product.php)
- **Database Tables**: `work_order_received_pieces`, `products`
- **Dependencies**: Bridge between manufacturing completion and retail POS invoicing.

---

### Module 12: Job Creation & Work Orders
- **Description**: Creation of parent Job Orders (`JO-YYYY-XXXX`) and multi-job child Work Orders (`WO-YYYY-XXXX`). Computes expected gold weight, diamond carat quotas, stamp requirements, and allowed wastage. Work Order creation does **not** deduct vault inventory immediately; it records quotas awaiting physical material allocation.
- **Frontend Routes**:
  - `/job-creation`, `/job-creation/dashboard`
  - `/job-order/new` (Creation view)
  - `/job-order/:id`, `/job-order/:id/details` (Work order overview)
- **Frontend Components**:
  - [`resources/js/pages/job-order/JobCreationDashboard.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/job-order/JobCreationDashboard.jsx)
  - [`resources/js/pages/job-order/NewWorkOrder.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/job-order/NewWorkOrder.jsx)
- **API Endpoints**:
  - `GET api/work-orders/generate-number`, `GET api/job-orders/generate-number`
  - `POST api/work-orders`, `GET api/work-orders/{id}`, `PUT api/work-orders/{id}`, `DELETE api/work-orders/{id}`
  - `GET api/work-orders/{id}/material-requirements` (`WorkOrderController@materialRequirements`)
  - `GET api/work-orders/{id}/pdf` (`WorkOrderController@exportPdf`)
  - `GET api/jobs/new-id`, `GET api/jobs/{id}`, `POST api/jobs` (`JobController`)
- **Backend Controllers**: [`WorkOrderController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/WorkOrderController.php), [`JobController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/JobController.php)
- **Domain Services**: [`WorkOrderMaterialRequirementService.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Services/WorkOrderMaterialRequirementService.php)
- **Eloquent Models**: [`JobOrder.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/JobOrder.php), [`WorkOrder.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrder.php), [`WorkOrderItem.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrderItem.php), [`WorkOrderTimeline.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrderTimeline.php)
- **Database Tables**: `job_orders`, `work_orders`, `work_order_items`, `work_order_timelines`
- **Dependencies**: Initiates the manufacturing pipeline; feeds Karigar Material Allocation.

---

### Module 13: Karigar Management & Material Allocation
- **Description**: Artisan profile directory and material allocation engine. Supports multi-material allocations (Gold by karat/touch with 24K fine conversion, Diamonds by stamp/sieve, Colour Stones). Allows issuing from Company Vault (debits raw material) or carrying forward from Karigar Bench Balance (no vault debit).
- **Frontend Route**: `/karigars`
- **Frontend Components**:
  - [`resources/js/pages/karigar/KarigarManagement.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/karigar/KarigarManagement.jsx)
  - [`resources/js/pages/karigar/KarigarWorkModal.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/karigar/KarigarWorkModal.jsx)
- **API Endpoints**:
  - `GET api/karigars`, `POST api/karigars`, `GET api/karigars/{id}`, `PUT api/karigars/{id}`
  - `GET api/karigars/generate-code`
  - `GET api/karigar-materials` (`KarigarMaterialController@index`)
  - `GET api/karigars/{id}/material-ledger` (`KarigarMaterialController@ledger`)
  - `POST api/karigars/{id}/allocate-materials` (`KarigarMaterialController@allocateMaterials`)
  - `GET api/karigars/{id}/work-orders/{woId}/material-requirements`
  - `POST api/karigars/{id}/reverse-material-transaction/{txId}`
  - `PUT/POST api/karigars/{id}/material-transactions/{txId}`
  - `POST api/karigars/{id}/material-action`
- **Backend Controllers**: [`KarigarMaterialController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/KarigarMaterialController.php), [`KarigarController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/KarigarController.php)
- **Eloquent Models**: [`Karigar.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Karigar.php), [`KarigarMaterialTransaction.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/KarigarMaterialTransaction.php), [`RawMaterial.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/RawMaterial.php)
- **Database Tables**: `karigars`, `karigar_material_transactions`, `raw_materials`
- **Permissions**: `karigars.view`, `karigars.manage` (Manager authorization required for transaction reversals/edits).
- **Dependencies**: Transfers physical and fine gold accountability from Vault to Karigar.

---

### Module 14: Work in Process (WIP)
- **Description**: Real-time production execution tracking. Artisans record operational stages (Casting, Setting, Polishing, Filing) and submit completed quantities for Quality Check inspection. Handles partial piece completion and rework piece re-submission.
- **Frontend Routes**: `/job-order/work-in-progress`, `/job-order/in-progress`, `/job-orders`
- **Frontend Component**: [`resources/js/pages/job-order/WorkInProgress.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/job-order/WorkInProgress.jsx)
- **API Endpoints**:
  - `POST api/work-orders/{id}/wip-update` (`WorkOrderController@wipUpdate`)
  - `GET api/work-orders/{id}/operations`, `POST api/work-orders/{id}/operations`
  - `POST api/work-orders/batch-submit-qc`
- **Backend Controller**: [`WorkOrderController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/WorkOrderController.php)
- **Eloquent Models**: [`WorkOrder.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrder.php), [`WorkOrderItem.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrderItem.php), [`WorkOrderOperation.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrderOperation.php), [`WorkOrderReceivedPiece.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrderReceivedPiece.php)
- **Database Tables**: `work_orders`, `work_order_items`, `work_order_operations`, `work_order_received_pieces`
- **Dependencies**: Advances Work Orders from `assigned` to `quality_check`.

---

### Module 15: Karigar Workbench & Material-on-Bench Balances
- **Description**: Persistent, cross-order balance calculation tracking materials remaining physically in each artisan's custody. Calculated strictly on 24K fine-gold equivalent weight:
  $$\text{Bench Balance} = \sum \text{Vault Issued} - \sum \text{Production Consumed} - \sum \text{Approved Wastage} - \sum \text{Vault Returns} \pm \sum \text{Adjustments}$$
- **Frontend Route**: Embedded in `/karigars`
- **API Endpoints**:
  - `GET api/karigars/{id}/hisab-summary` (`KarigarController@hisabSummary`)
  - `GET api/work-orders/{id}/gold-reconciliation` (`WorkOrderController@goldReconciliation`)
- **Backend Controller**: [`KarigarMaterialController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/KarigarMaterialController.php)
- **Domain Services**: [`WorkOrderGoldReconciliationService.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Services/WorkOrderGoldReconciliationService.php)
- **Eloquent Models**: [`Karigar.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Karigar.php), [`KarigarMaterialTransaction.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/KarigarMaterialTransaction.php)
- **Database Tables**: `karigars`, `karigar_material_transactions`
- **Dependencies**: Core material audit mechanism across all work orders.

---

### Module 16: Delay Management
- **Description**: Automated monitoring of production schedule bottlenecks. Flags overdue work orders where `delivery_date < today` and computes dynamic elapsed delay days. Allows entering delay reasons, client remarks, and extending delivery deadlines.
- **Frontend Routes**: `/job-order/delay`, `/job-order/delay-hold`
- **Frontend Component**: [`resources/js/pages/job-order/JobOrderDelay.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/job-order/JobOrderDelay.jsx)
- **API Endpoints**:
  - `GET api/work-orders/delays` (`WorkOrderController@delays`)
  - `POST api/work-orders/{id}/delay-update` (`WorkOrderController@delayUpdate`)
- **Backend Controller**: [`WorkOrderController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/WorkOrderController.php)
- **Eloquent Models**: [`WorkOrder.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrder.php), [`WorkOrderTimeline.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrderTimeline.php)
- **Database Tables**: `work_orders`, `work_order_timelines`
- **Dependencies**: Feeds executive notifications and dashboard delay KPIs.

---

### Module 17: Quality Control (QC) & Inspection
- **Description**: Technical inspection of artisan-completed pieces. Inspects individual or batch pieces, recording verified gross weights, diamond carats/counts, gold wastage, defects, and remarks. Pieces can be Passed (`pass`) to Ready status, or sent for Rework (`rework`) back to the artisan workbench.
- **Frontend Route**: `/job-order/quality-check`
- **Frontend Component**: [`resources/js/pages/job-order/QualityCheckDetails.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/job-order/QualityCheckDetails.jsx)
- **API Endpoints**:
  - `POST api/work-orders/{id}/qc-action` (`WorkOrderController@qcAction`)
- **Backend Controller**: [`WorkOrderController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/WorkOrderController.php)
- **Eloquent Models**: [`WorkOrder.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrder.php), [`WorkOrderItem.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrderItem.php), [`WorkOrderReceivedPiece.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrderReceivedPiece.php)
- **Database Tables**: `work_orders`, `work_order_items`, `work_order_received_pieces`
- **Dependencies**: Gatekeeper between WIP manufacturing and piece receiving.

---

### Module 18: Ready Products & Work-Order Completion
- **Description**: Queue of pieces that have successfully passed Quality Control inspection and are ready for physical receiving, certification, or hallmarking.
- **Frontend Route**: `/job-order/ready`
- **Frontend Component**: [`resources/js/pages/job-order/ReadyDetails.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/job-order/ReadyDetails.jsx)
- **API Endpoints**:
  - `GET api/work-orders/ready-pieces` (`WorkOrderController@readyPieces`)
  - `POST api/work-orders/{id}/mark-ready`, `POST api/work-orders/{id}/move-to-ready`
- **Backend Controller**: [`WorkOrderController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/WorkOrderController.php)
- **Eloquent Models**: `WorkOrder`, `WorkOrderReceivedPiece`
- **Database Tables**: `work_orders`, `work_order_received_pieces`
- **Dependencies**: Upstream feeder for physical receiving.

---

### Module 19: Receive Work Order
- **Description**: Physical piece intake modal/form. Captures gross weight, old weight, diamond weights/sieves, stone weights, purity touch, making charges, completion images, scrap gold returns, and wastage. Calculates net gold weight, generates unique `RWO-YYYY-XXXX` and `TAG-YYYY-XXXXXX` numbers, triggers automatic Karigar making charge payables (`KarigarPayment`), credits returned gold to vault, and updates workbench balances.
- **Frontend Route**: `/job-order/receive`
- **Frontend Component**: [`resources/js/pages/job-order/ReceiverWork.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/job-order/ReceiverWork.jsx)
- **API Endpoints**:
  - `GET api/work-orders/{id}/receiving-data` (`WorkOrderController@receivingData`)
  - `POST api/work-orders/{id}/receive-piece` (`WorkOrderController@receivePiece`)
  - `POST api/work-orders/{id}/receive`, `POST api/work-orders/{id}/final-receive`
  - `POST api/work-orders/{id}/finalize-inventory` (`WorkOrderController@finalizeInventory`)
- **Backend Controller**: [`WorkOrderController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/WorkOrderController.php)
- **Eloquent Models**: [`WorkOrderReceivedPiece.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrderReceivedPiece.php), [`KarigarPayment.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/KarigarPayment.php), [`KarigarMaterialTransaction.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/KarigarMaterialTransaction.php)
- **Database Tables**: `work_order_received_pieces`, `karigar_payments`, `karigar_material_transactions`
- **Dependencies**: Core operational transaction connecting production to inventory.

---

### Module 20: Certification
- **Description**: Tracking diamond and gemstone laboratory certification (e.g., SGL, IGI, GIA). Records Certificate Number, lab fees, verification status (pending, completed, skipped, not_required), and certificate dates.
- **Frontend Route**: `/job-order/certification`
- **Frontend Component**: [`resources/js/pages/job-order/CertificationDetails.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/job-order/CertificationDetails.jsx)
- **API Endpoints**:
  - `POST api/work-orders/{id}/certification-action` (`WorkOrderController@certificationAction`)
  - `POST api/work-orders/{id}/update-certification` (`WorkOrderController@updateCertification`)
  - `POST api/received-pieces/{id}/update-certification` (`WorkOrderController@updatePieceCertification`)
- **Backend Controller**: [`WorkOrderController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/WorkOrderController.php)
- **Eloquent Models**: `WorkOrder`, `WorkOrderReceivedPiece`
- **Database Tables**: `work_orders`, `work_order_received_pieces`
- **Dependencies**: Gate condition required prior to finished inventory posting (unless marked skipped/not_required).

---

### Module 21: Hallmarking
- **Description**: Compliance tracking for BIS Hallmarking and 6-digit alphanumeric Hallmarking Unique ID (HUID). Records hallmarking center, HUID stamp, status (pending, completed, skipped, not_required), and charges.
- **Frontend Route**: `/job-order/hallmarking`
- **Frontend Component**: [`resources/js/pages/job-order/HallmarkingDetails.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/job-order/HallmarkingDetails.jsx)
- **API Endpoints**:
  - `POST api/work-orders/{id}/hallmarking-action` (`WorkOrderController@hallmarkingAction`)
  - `POST api/work-orders/{id}/update-hallmarking` (`WorkOrderController@updateHallmarking`)
  - `POST api/received-pieces/{id}/update-hallmarking` (`WorkOrderController@updatePieceHallmarking`)
- **Backend Controller**: [`WorkOrderController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/WorkOrderController.php)
- **Eloquent Models**: `WorkOrder`, `WorkOrderReceivedPiece`
- **Database Tables**: `work_orders`, `work_order_received_pieces`
- **Dependencies**: Final downstream gate enabling finished inventory posting.

---

### Module 22: Tag Printing & Tag-Printing History
- **Description**: Printing barcode labels and jewellery tags containing Design Code, Purity, Gross Weight, Net Weight, Diamond Carat/Count/Stamp, and HUID. Tracks print status and reprint history.
- **Frontend Route**: `/job-order/tag-printing`
- **Frontend Component**: [`resources/js/pages/job-order/TagPrinting.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/job-order/TagPrinting.jsx)
- **API Endpoints**:
  - `GET api/work-orders/tags` (`WorkOrderController@getTags`)
  - `GET api/inventory/jewellery-tags/{tag}` (`WorkOrderController@getTagDetails`)
- **Backend Controller**: [`WorkOrderController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/WorkOrderController.php)
- **Eloquent Models**: `WorkOrderReceivedPiece`
- **Database Tables**: `work_order_received_pieces`
- **Dependencies**: Consumes physically received pieces from Module 19.

---

### Module 23: Sales, Billing & Invoice Generation
- **Description**: Point of Sale (POS) and invoice generation. Handles customer selection, item selection (parent product or specific physical child piece tag), dynamic pricing resolution via `PricingService`, making charges, stone charges, discounts, 3% jewellery GST, Old Gold intake (auto-deposited to scrap vault), and invoice number generation (`INV-YYYY-XXXXX`).
- **Frontend Routes**:
  - `/sales`, `/sales/dashboard` (Sales Dashboard)
  - `/sales/list` (Invoices list)
  - `/sales/create`, `/sales/customer` (POS Billing interface)
  - `/sales/:id` (Invoice print & details)
  - `/clients/billing` (Client Billing Dashboard)
- **Frontend Components**:
  - [`resources/js/pages/sales/SalesModule.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/sales/SalesModule.jsx)
  - [`resources/js/pages/clients/BillingDashboard.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/clients/BillingDashboard.jsx)
- **API Endpoints**:
  - `GET api/sales`, `POST api/sales`, `GET api/sales/{sale}` (`SalesController`)
  - `POST api/sales/{sale}/finalize` (`SalesController@finalize`)
  - `POST api/sales/{sale}/cancel` (`SalesController@cancel`)
  - `GET api/sales/available-pieces` (`SalesController@availablePieces`)
  - `GET api/sales/products` (`SalesController@products`)
  - `GET api/sales/profit`, `GET api/sales/profit-per-invoice` (`SalesController@profit`)
  - `GET api/billing`, `POST api/invoices`, `PUT api/invoices/{id}`, `DELETE api/invoices/{id}` (`ClientController`)
- **Backend Controllers**: [`SalesController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/SalesController.php), [`ClientController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/ClientController.php)
- **Domain Services**: [`SaleService.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Services/SaleService.php), [`PricingService.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Services/PricingService.php)
- **Eloquent Models**: [`Invoice.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Invoice.php), [`SaleItem.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/SaleItem.php), [`InvoiceOldGold.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/InvoiceOldGold.php), [`WorkOrderReceivedPiece.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrderReceivedPiece.php), [`Product.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Product.php)
- **Database Tables**: `invoices`, `sale_items`, `invoice_old_golds`, `work_order_received_pieces`, `products`
- **Dependencies**: Deducts product stock, marks pieces `sold`, logs `InventoryMovement` of type `sale`.

---

### Module 24: Credit Sales, Payments & Outstanding Balances
- **Description**: Installment payment tracking for sales invoices (`paid_amount`, `due_amount`, `due_date`, `status: paid|partial|pending`). Records payments via cash, bank transfer, UPI, or cheque, recalculating invoice balances and updating client lifetime purchase values.
- **Frontend Route**: Embedded in `/sales/:id` and `/clients/billing`
- **API Endpoints**:
  - `POST api/sales/{sale}/payments` (`SalesController@payment`)
  - `PUT api/sales/{sale}/payments/{payment}` (`SalesController@updatePayment`)
  - `DELETE api/sales/{sale}/payments/{payment}` (`SalesController@deletePayment`)
- **Backend Controller**: [`SalesController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/SalesController.php)
- **Domain Services**: [`SaleService.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Services/SaleService.php)
- **Eloquent Models**: [`SalePayment.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/SalePayment.php), [`Invoice.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Invoice.php)
- **Database Tables**: `sale_payments`, `invoices`
- **Dependencies**: Feeds customer account balances and financial cash flow reports.

---

### Module 25: Supplier & Karigar Financial Ledgers
- **Description**: Two-way financial ledgers for external partners:
  - **Supplier Ledger**: Distinguishes cash liabilities (priced purchases, cash payments, advance held) from physical metal liabilities (unpriced bullion weight owed).
  - **Karigar Financial Ledger**: Tracks earned making charges (`payable` auto-created on piece receive), advances paid (`advance`), cash payments (`payment`), and wage adjustments (`adjustment`).
- **Frontend Routes**: Embedded in `/suppliers` and `/karigars`
- **API Endpoints**:
  - `GET api/suppliers/{id}/ledger`, `POST api/suppliers/{id}/settle` (`SupplierController`)
  - `GET api/karigars/{id}/financial-ledger`, `POST api/karigars/{id}/settle-cash` (`KarigarMaterialController`)
- **Backend Controllers**: [`SupplierController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/SupplierController.php), [`KarigarMaterialController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/KarigarMaterialController.php)
- **Eloquent Models**: [`SupplierSettlement.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/SupplierSettlement.php), [`KarigarPayment.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/KarigarPayment.php)
- **Database Tables**: `supplier_settlements`, `karigar_payments`
- **Dependencies**: Governs vendor disbursements and artisan payroll.

---

### Module 26: Returns, Cancellations, Reversals & Stock Adjustments
- **Description**: Idempotent transactional reversal mechanisms across modules:
  - **Sales Cancellation**: Reverses stock deduction, restores pieces from `sold` back to `in_stock`, clears `invoice_id`, resets Work Order delivery status if delivered, and logs an `InventoryMovement` return.
  - **Karigar Material Reversal**: Marks transaction `is_reversed = true`, creates inverse compensating transaction, restores vault raw materials, and resynchronizes artisan bench balance.
  - **QC Rework / Rejection**: Re-queues rejected pieces for rework without losing serial identity.
- **API Endpoints**:
  - `POST api/sales/{sale}/cancel` (`SalesController@cancel`)
  - `POST api/karigars/{id}/reverse-material-transaction/{txId}` (`KarigarMaterialController@reverseMaterialTransaction`)
  - `POST api/work-orders/{id}/return` (`WorkOrderController@returnOrReject`)
- **Backend Controllers**: `SalesController`, `KarigarMaterialController`, `WorkOrderController`
- **Dependencies**: Restores database integrity during business exceptions.

---

### Module 27: Reports, Transaction History & Audit Logs
- **Description**: Comprehensive reporting engine supporting tabbed analytics: Sales summaries, Inventory valuation, Karigar performance, Purchase journals, Profit per Metal, Profit per Invoice, Statutory ITC-04 (Job Work GST report for goods dispatched/received), GSTR-1 outward supplies summary (HSN 7113), Karigar Monthly reconciliation, and Supplier Monthly statements.
- **Frontend Routes**: `/reports`, `/reports/:tab`
- **Frontend Component**: [`resources/js/pages/reports/ReportModule.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/reports/ReportModule.jsx)
- **API Endpoints**:
  - `GET api/reports` (`ReportController@index`)
  - `GET api/reports/profit-per-metal` (`ReportController@profitPerMetal`)
  - `GET api/reports/itc04` (`ReportController@itc04Report`)
  - `GET api/reports/gstr1` (`ReportController@gstr1Summary`)
  - `GET api/reports/karigar-monthly` (`ReportController@karigarMonthlyReport`)
  - `GET api/reports/supplier-monthly` (`ReportController@supplierMonthlyReport`)
- **Backend Controller**: [`ReportController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/ReportController.php)
- **Database Tables**: Queries live transactional tables (`invoices`, `sale_items`, `products`, `work_orders`, `work_order_received_pieces`, `karigar_material_transactions`, `purchase_entries`, `supplier_settlements`).
- **Permissions**: `reports.view`
- **Dependencies**: Read-only aggregation across all operational modules.

---

### Module 28: Supporting Workflows & Additional Modules

#### 28.1 Approval Memos / Jangad Memos
- **Description**: Issue of finished jewellery to clients on temporary approval (`status: on_approval`). Pieces cannot be sold while on approval. Supports partial piece return (restores status to `in_stock`) or conversion into a finalized sale invoice.
- **Frontend Route**: API-driven / POS modal integration
- **API Endpoints**:
  - `GET api/approvals`, `POST api/approvals`, `GET api/approvals/{id}`
  - `POST api/approvals/{id}/return-piece/{itemId}`
  - `POST api/approvals/{id}/convert-to-sale`
- **Backend Controller**: [`ApprovalMemoController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/ApprovalMemoController.php)
- **Eloquent Models**: [`ApprovalMemo.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/ApprovalMemo.php), [`ApprovalMemoItem.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/ApprovalMemoItem.php)
- **Database Tables**: `approval_memos`, `approval_memo_items`

#### 28.2 Customer Jewellery Repair Management
- **Description**: Intake, artisan assignment, progress tracking, cost estimation, advance payment, and customer delivery of repair jobs.
- **API Endpoints**:
  - `GET api/repairs`, `POST api/repairs`, `GET api/repairs/{id}`
  - `PUT api/repairs/{id}` (`updateProgress`), `POST api/repairs/{id}/deliver`
- **Backend Controller**: [`RepairController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/RepairController.php)
- **Eloquent Models**: [`Repair.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/Repair.php)
- **Database Tables**: `repairs`

#### 28.3 Product Design Catalog & Multi-Step Wizard
- **Description**: Design catalog repository (`product_designs`) and 4-step client catalog selection/download wizard (Step 1 Upload -> Step 2 Catalog -> Step 3 Selection -> Step 4 Download / Export PDF/Excel).
- **Frontend Routes**: `/product-upload/step1`, `/step2`, `/step3`, `/step4`
- **Frontend Components**: [`resources/js/pages/product-upload/Step1Upload.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/product-upload/Step1Upload.jsx), `Step2Catalog.jsx`, `Step3Selection.jsx`, `Step4Download.jsx`
- **API Endpoints**: `apiResource api/product-designs`, `GET api/product-designs/meta`, `POST api/product-designs/sync-inventory`, `GET api/product-designs/export-pdf`, `GET api/product-designs/export-excel`
- **Backend Controller**: [`ProductDesignController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/ProductDesignController.php)
- **Eloquent Models**: [`ProductDesign.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/ProductDesign.php)
- **Database Tables**: `product_designs`

#### 28.4 Notification System & Live Feeds
- **Description**: Topbar alert feed and history tracking operational milestones: Work Order assigned, piece physically received, inventory posted, and purchase recorded.
- **Frontend Route**: `/notifications`
- **Frontend Component**: [`resources/js/pages/notifications/NotificationsHistory.jsx`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/resources/js/pages/notifications/NotificationsHistory.jsx)
- **API Endpoints**: `GET api/notifications`, `GET api/notifications/unread-count`, `POST/PATCH api/notifications/{id}/read`, `POST api/notifications/mark-all-read`, `DELETE api/notifications/{id}`
- **Backend Controller**: [`NotificationController.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Http/Controllers/Api/NotificationController.php)
- **Domain Services**: [`NotificationService.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Services/NotificationService.php)
- **Eloquent Models**: [`WorkOrderNotification.php`](file:///c:/Users/Pugal%20Gokul/Documents/rudhra/app/Models/WorkOrderNotification.php)
- **Database Tables**: `work_order_notifications`
