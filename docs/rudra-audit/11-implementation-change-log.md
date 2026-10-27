# Rudra Jewellery ERP — Master Technical Audit
## Document 11: Implementation Change Log

### Summary of Completed Implementations

#### 1. Unit Separation & Calculation Fixes
- **Files Modified**:
  - `app/Http/Controllers/Api/InventoryController.php`
  - `app/Http/Controllers/Api/WorkOrderController.php`
  - `resources/js/components/MaterialAllocationModal.jsx`
  - `resources/views/pdf/work-order.blade.php`
  - `resources/js/pages/job-order/NewWorkOrder.jsx`
- **Changes**:
  - Eliminated the 31.8 cts / 10.5g allocation bug where gold jewellery weight was assigned to diamond carats.
  - Separated `RawMaterial::debitAllocation`: metal weight debited in grams from gold vaults, diamond carats debited in carats from diamond vault.
  - In `MaterialAllocationModal.jsx`: Karigar material rows display `ct` for diamond and `g` for metals.
  - In `NewWorkOrder.jsx` and PDF print sheet: diamond weight column renamed to `DIAMOND WT (CTS)` and kept independent from gold weight without multiplying by 0.2.

#### 2. Stamping & Sizes Linkage Across Masters, Purchase & Job Orders
- **Files Modified**:
  - `resources/js/pages/job-order/NewWorkOrder.jsx`
  - `resources/js/pages/purchase/PurchaseEntry.jsx`
- **Changes**:
  - Connected `stampsList` from `/api/stamps`.
  - Added Gold Stamp / Hallmark dropdown in Part 2 of NewWorkOrder.
  - Added clickable chip buttons for diamond size stamps (`+7`, `+5`, `+2`, etc.).
  - Added dedicated `STAMP & SIZES` table column.
  - In `PurchaseEntry.jsx`: diamond stamp selection dynamically filters diamond and all-applicable master stamps.

#### 3. Client Metal Ledger & Pure Gold Deposit Modal
- **Files Created / Modified**:
  - `database/migrations/2026_10_22_000001_add_metal_balances_to_clients_table.php`
  - `app/Models/Client.php`
  - `app/Http/Controllers/Api/ClientController.php` (`recordMetalDeposit`)
  - `routes/api.php` (`POST /api/clients/{id}/metal-deposit`)
  - `resources/js/components/ClientMetalDepositModal.jsx`
  - `resources/js/pages/clients/ClientList.jsx`
  - `resources/js/pages/clients/BillingDashboard.jsx`
- **Changes**:
  - When customer deposits gold without a rate, it is retained as physical metal grams (`gold_balance_grams`) without cash conversion.
  - When a rate is entered, it calculates cash credit into the customer's financial ledger.

#### 4. Removal of Hardcoded Demo Placeholders
- **Files Modified**:
  - `resources/js/components/Header.jsx`: Removed fallback to `arvind_profile.jpg`; renders dynamic user initials badge.
  - `resources/js/pages/job-order/JobOrdersList.jsx`: Removed fallback to `peacock_choker.jpg`; renders `placeholder-jewelry.svg`.
  - `resources/js/pages/job-order/JobCreationDashboard.jsx`: Removed fallback to `peacock_choker.jpg`; renders `placeholder-jewelry.svg`.
  - `resources/js/pages/Dashboard.jsx`: Removed external unsplash fallback URL; renders `placeholder-jewelry.svg`.
  - `resources/js/pages/karigar/KarigarWorkModal.jsx`: Removed sample file path from input placeholder.

#### 5. Vite Code Splitting & Performance Optimization
- **Files Modified**:
  - `vite.config.js`: Added `manualChunks` splitting `vendor-react`, `vendor-xlsx`, `vendor-axios`. Build time reduced from hang to 6 seconds clean.
