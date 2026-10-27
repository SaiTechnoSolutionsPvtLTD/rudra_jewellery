# Rudra Jewellery ERP — Master Technical Audit
## Document 01: Project Architecture

### 1. Architectural Overview
The **Rudra Jewellery ERP** is an enterprise-grade ERP system built specifically for fine gold, silver, and diamond jewellery manufacturing, trading, retail, and bullion metal accounting.

- **Backend Framework**: Laravel 11.x (PHP 8.2+) running RESTful JSON API endpoints.
- **Frontend Framework**: React 18 SPA (Single Page Application) with React Router DOM v7, Tailwind CSS v4, Lucide Icons, and FontAwesome.
- **Build System**: Vite 7.x with optimized code splitting (`manualChunks` for vendor-react, vendor-xlsx, vendor-axios).
- **Database Engine**: MariaDB 10.4.32 / MySQL 8.0 with InnoDB engine and full relational foreign-key integrity.
- **Authentication**: Laravel Sanctum token-based authentication with role-based access control (RBAC).
- **API Surface**: 283 registered API routes (`/api/*`), 41 API controllers, 46 Eloquent models, and 57 database tables.

```
+---------------------------------------------------------------------------------------+
|                                    REACT 18 SPA                                      |
|  (69 JSX Pages: Dashboard, Masters, Job Orders, Karigar, Inventory, Sales, Reports)   |
+-------------------------------------------+-------------------------------------------+
                                            | HTTP REST / JSON (Axios + Sanctum Auth)
                                            v
+---------------------------------------------------------------------------------------+
|                                  LARAVEL 11 REST API                                  |
|  - Middleware: Authenticate, EnsureRole, CheckPermission, ThrottleRequests             |
|  - 41 Controllers: WorkOrder, Client, Inventory, Sale, Purchase, Karigar, Masters     |
|  - Services: SaleService, InventoryService, JobOrderService, MetalRateService          |
+-------------------------------------------+-------------------------------------------+
                                            | Eloquent ORM / Query Builder
                                            v
+---------------------------------------------------------------------------------------+
|                             MARIADB / MYSQL DATABASE                                  |
|  - 57 Tables: work_orders, products, purchase_entries, raw_materials, clients, stamps |
|  - Dual-vault metal accounting: Pure Gold (grams) vs Diamond Inventory (carats)       |
+---------------------------------------------------------------------------------------+
```

---

### 2. Directory Structure & Technology Stack

| Component | Technology | Path / Location | Purpose |
|---|---|---|---|
| **Entry Point (Web)** | Blade Template | `resources/views/welcome.blade.php` | Mounts the root React DOM node `#app` |
| **Frontend Router** | React Router DOM | `resources/js/app.jsx` | Client-side SPA routing and layout wrapper |
| **API Client** | Axios Instance | `resources/js/services/api.js` | Injects Bearer token and handles 401 unauth |
| **State Management** | Context API | `resources/js/context/*` | AuthContext, ToastContext, NotificationContext |
| **Backend Router** | Laravel Routing | `routes/api.php` | 283 JSON API endpoints grouped with auth |
| **Controllers** | PHP Classes | `app/Http/Controllers/Api/*` | Business controllers (41 API controllers) |
| **Domain Models** | Eloquent Models | `app/Models/*` | 46 Models with relations, scopes, casts |
| **Database Migrations**| Database Migrations | `database/migrations/*` | 84 structured migrations |
| **Print & PDF Layouts**| Blade Templates | `resources/views/pdf/*` | Server-rendered and client-rendered job orders |

---

### 3. Core Architectural Principles
1. **Authoritative Database Source**: All calculations, prices, inventory movements, and customer balances are persisted and validated server-side.
2. **Strict Unit Isolation**:
   - Gold, Silver, Platinum metals are quantified and accounted in **Grams (`g`)** or **Kilograms (`kg`)**.
   - Diamonds and precious stones are quantified and accounted in **Carats (`ct`)** and stone count (`pcs`).
   - Diamond carats are **never multiplied into gold gross grams** or debited from gold vaults.
3. **Dual-Ledger Client Balances**:
   - Financial Ledger: Rupee currency balances (`due_amount`, `paid_amount`, `current_balance`).
   - Metal Ledger: Physical pure gold advances (`gold_balance_grams`) and silver advances (`silver_balance_grams`).
   - When a client deposits gold without fixing a rate, it is retained as physical metal grams without forced cash conversion.
