# Rudra Jewellery ERP — Master Technical Audit
## Document 05: API and Frontend Dependency Map

### 1. API Route Topology Summary
- **Total Registered API Endpoints**: 283
- **Authentication Guard**: `auth:sanctum`
- **Primary Base URL**: `/api`

---

### 2. Frontend Screen to API Dependency Matrix

| Frontend Page / Component | Route Path | Primary API Endpoints Called | Purpose |
|---|---|---|---|
| `Dashboard.jsx` | `/` | `GET /api/dashboard`<br>`GET /api/work-orders/dashboard-stats`<br>`GET /api/metal-rates`<br>`GET /api/karigars?all=true` | Quick stats, live metal rates, pending approvals |
| `NewWorkOrder.jsx` | `/job-orders/create` | `GET /api/products`<br>`GET /api/clients`<br>`GET /api/karigars`<br>`GET /api/stamps`<br>`POST /api/work-orders` | Work order creation & auto-debit of raw materials |
| `JobOrdersList.jsx` | `/job-orders/list` | `GET /api/work-orders`<br>`DELETE /api/work-orders/{id}` | Order directory, status filter, print modal |
| `QualityCheckDetails.jsx` | `/job-orders/qc` | `GET /api/work-orders?status=qc_pending`<br>`POST /api/work-orders/{id}/qc` | Artisan piece inspection & pass/rework |
| `ReceiverWork.jsx` | `/job-orders/receive` | `GET /api/work-orders?status=ready`<br>`POST /api/work-orders/{id}/receive`<br>`POST /api/work-orders/{id}/post-inventory` | Receive finished items & assign barcode tags |
| `ClientList.jsx` | `/clients` | `GET /api/clients`<br>`POST /api/clients`<br>`POST /api/clients/{id}/metal-deposit` | Customer records, gold balance, pure gold deposit |
| `BillingDashboard.jsx` | `/clients/billing` | `GET /api/clients/billing-summary`<br>`GET /api/invoices` | Outstanding receivables & client aging |
| `PurchaseEntry.jsx` | `/purchase/entry` | `GET /api/suppliers`<br>`GET /api/raw-materials`<br>`GET /api/stamps`<br>`POST /api/purchase-entries` | Bullion & diamond parcel purchases |
| `StockManagement.jsx` | `/stock` | `GET /api/raw-materials`<br>`POST /api/raw-materials/opening-stock` | Vault inventory balances & stone counts |
| `SalesModule.jsx` | `/sales` | `GET /api/sales/available-pieces`<br>`GET /api/clients`<br>`POST /api/sales`<br>`POST /api/sales/{id}/payments` | Counter sales, old gold exchange, invoicing |
| `KarigarManagement.jsx` | `/karigars` | `GET /api/karigars`<br>`POST /api/karigars`<br>`POST /api/karigars/{id}/materials` | Karigar ledger, daily issues, weight reconciliation |
| `ReportModule.jsx` | `/reports` | `GET /api/reports/sales`<br>`GET /api/reports/stock`<br>`GET /api/reports/karigar-ledger`<br>`GET /api/reports/gstr1` | Business analytics & statutory GST reports |
| `CompanyInfoMaster.jsx` | `/masters/company-info` | `GET /api/company-info`<br>`POST /api/company-info` | Legal company details, GSTIN, invoice header |
| `BankAccounts.jsx` | `/masters/bank-accounts`| `GET /api/bank-accounts`<br>`POST /api/bank-accounts` | Bank master for invoice payment QR codes |

---

### 3. Error Handling and Resilience
- Axios interceptor automatically traps `401 Unauthorized` responses and redirects to `/login`.
- Validation errors (`422 Unprocessable Entity`) are normalized and surfaced via `showToast(msg, 'error')`.
- Empty database responses (`[]` or `null`) render descriptive empty states rather than throwing runtime exceptions.
