# Rudra Jewellery ERP — Master Technical Audit
## Document 08: Seeded and Hardcoded Data Inventory

This inventory documents all seeded data, mock arrays, static constants, and sample values identified across backend seeders, controllers, models, and React frontend components, classified according to the audit rubric (A–G).

---

### Classification Rubric
- **A**: Demo or dummy business data (fabricated customers, sample invoices, artificial work orders)
- **B**: Hardcoded business data (production dropdown values, fixed rates in components)
- **C**: Legitimate system configuration (application defaults, status constants, rounding rules)
- **D**: Required reference / master data (product categories, purities, roles, permissions)
- **E**: Test-only data (factories, automated test fixtures)
- **F**: Security-sensitive defaults (default passwords, sample secrets)
- **G**: Uncertain findings (values whose ownership cannot be established confidently)

---

### Detailed Findings Catalog

| ID | File / Table | Value / Artifact | Class | Current Usage | Business Impact if Removed | Recommended Action | Verification |
|---|---|---|:---:|---|---|---|---|
| **H-01** | `SampleDataSeeder.php` | Fabricated clients (Malabar Gold, Kalyan, Senco), fake work orders (`WO-2026-0001` to `0015`), fake products (`PROD-CHK-001`) | **A** | Seeder file for demo environment | Breaks demo population; no impact on production | **Retain disabled in seeder (`// SampleDataSeeder::class`)**; never execute against live business DB | Confirmed disabled in `DatabaseSeeder.php` |
| **H-02** | `JobOrdersList.jsx` (L264, 471), `JobCreationDashboard.jsx` (L13) | `'/images/samples/peacock_choker.jpg'` | **B** | Fallback image when job order has no image | Replaces missing work order photo with sample choker photo | **Replace with neutral placeholder SVG or `/images/placeholder-jewelry.png`** | Verify job orders without image render neutral icon |
| **H-03** | `Header.jsx` (L277, 596) | `'/images/samples/arvind_profile.jpg'` | **B** | Fallback avatar for user when user has no avatar | Displays photo of sample profile "Arvind" | **Replace with neutral user initial badge or standard avatar SVG** | Verify header displays initials/SVG |
| **H-04** | `Dashboard.jsx` (L11) | `'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f...'` | **B** | Fallback unsplash image when approval item has no image | External network request for missing images | **Replace with local neutral placeholder icon** | Verify offline rendering |
| **H-05** | `EnsureCoreMastersSeeder.php` | Categories (Gold, Diamond, Silver, Ornaments), Subcategories, Karats (24K, 22K, 18K), Raw Materials | **D** | Seed core reference masters required for ERP operation | App cannot create products or job orders without categories & purities | **Retain as required reference master data** | Live DB currently has 6 categories and 24 subcategories |
| **H-06** | `RoleAndUserSeeder.php` | Roles (Super Admin, Admin, Manager, Staff), Permissions (11 modules) | **D** | Seed RBAC system roles and permission catalog | Required for user authentication and authorization | **Retain as required system data** | Verified 4 roles and 11 permissions in DB |
| **H-07** | `RoleAndUserSeeder.php` | Default password `'admin123'` for seeded test users | **F** | Initial login credentials for seeded accounts | Insecure if used on public internet | **Retain in dev; require admin password change on production onboarding** | Document in security guide |
| **H-08** | `SalesModule.jsx` (L12, 99, 100) | `defaultSampleClients = []`, `sampleRichItems = []`, `masterDemoSalesList = []` | **C** | Empty default state initializers | None; ensures zero-state fallback without dummy items | **Retain as legitimate empty state initializers** | Verified sales list renders empty state when DB empty |
| **H-09** | `work_orders` (IDs 10, 15, 18) in live MySQL | Orders `JO-2026-0001`, `0002`, `0003` created by user `Pugal Gokul` with Karigar `Pugal A` | **G** | Real user testing records created during active system setup | User's actual test data; deleting would break their ongoing verification | **Preserve untouched (Legitimate user testing records)** | User explicit instruction: do not blindly delete |
| **H-10** | `purchase_entries` (IDs 6, 7) in live MySQL | Purchases `PUR-1001`, `PUR-1007` created on 2026-10-22 by user | **G** | Real user testing purchases for diamond DI12 | User's active test purchases | **Preserve untouched** | Verified in database |
