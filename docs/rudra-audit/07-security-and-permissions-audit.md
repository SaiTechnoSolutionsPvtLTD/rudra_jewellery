# Rudra Jewellery ERP — Master Technical Audit
## Document 07: Security and Permissions Audit

### 1. Authentication Framework
- **Mechanism**: Laravel Sanctum Personal Access Tokens (`Bearer <token>`).
- **Session Security**: SPA session cookies with CSRF protection enabled for stateful web routes and Bearer tokens for pure API endpoints.
- **Password Hashing**: `bcrypt` / `Hash::make()` with standard work factor 12.

---

### 2. Role-Based Access Control (RBAC) Matrix

| Module | Super Admin | Operational Admin | Store Manager | Counter Staff |
|---|:---:|:---:|:---:|:---:|
| **Dashboard View** | Full | Full | Full | Restricted |
| **User & Role Admin** | Full | View / Edit | No Access | No Access |
| **System Permissions** | Full | View Only | No Access | No Access |
| **Inventory & Vault** | Full | Full | View / Edit | View Only |
| **Work Orders & WIP** | Full | Full | Full | Create / View |
| **Karigar Ledger** | Full | Full | View Only | No Access |
| **Client Management** | Full | Full | Full | View / Register |
| **Sales & Billing** | Full | Full | Full | Create Invoice |
| **Company Info Master**| Full | Edit | No Access | No Access |
| **Financial Reports** | Full | Full | View Only | No Access |

---

### 3. Route Guard Verification
- All critical business routes in `routes/api.php` are wrapped in `middleware(['auth:sanctum'])`.
- Role verification middleware (`EnsureRole` / `CheckPermission`) protects administrative endpoints (`/users`, `/roles`, `/permissions`).
- Unauthenticated requests are rejected with `401 Unauthorized` without data leaks.

---

### 4. Security Findings & Recommendations
1. **Default Passwords**: Test seed accounts (`admin.test@rudrajewellers.com`, `manager.test@rudrajewellers.com`) in `RoleAndUserSeeder` use sample password `admin123`.
   - *Status*: Appropriate for development/staging; in production, `APP_ENV=production` must enforce unique admin credentials generated via artisan or initial setup wizard.
2. **CORS & Domain White-listing**: `config/cors.php` configured for local IP and domain bindings (`localhost`, `127.0.0.1`, LAN IPs).
3. **Sensitive Data Protection**: Passwords and remember tokens are hidden via `$hidden` arrays on `User.php`.
