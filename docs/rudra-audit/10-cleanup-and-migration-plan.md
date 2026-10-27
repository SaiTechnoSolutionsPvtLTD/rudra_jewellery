# Rudra Jewellery ERP — Master Technical Audit
## Document 10: Cleanup and Migration Plan

### 1. Cleanup Objectives
1. **Remove Inappropriate Image Fallbacks**: Replace hardcoded demo photograph paths (`/images/samples/peacock_choker.jpg`, `/images/samples/arvind_profile.jpg`, and external Unsplash photo URLs) with clean, neutral UI placeholder graphics / SVGs.
2. **Preserve Legitimate Business Records**: Do not truncate or delete the user's active testing work orders (`JO-2026-0001` to `0003`), purchase entries (`PUR-1001`, `PUR-1007`), categories, stamps, or raw material balances.
3. **Verify Database Seeder Safety**: Confirm `SampleDataSeeder` remains disabled in `DatabaseSeeder.php` so production migrations never inject fake Malabar/Kalyan demo orders.
4. **Build & Automated Verification**: Re-run the comprehensive automated test suite and Vite production build.

---

### 2. Prioritized Action Items

| Priority | Component | Action Description | Target File | Verification Method |
|---|---|---|---|---|
| **P1** | Frontend Fallback | Replace `peacock_choker.jpg` fallback with neutral jewellery icon | `JobOrdersList.jsx`, `JobCreationDashboard.jsx` | Browser DOM & inspect element |
| **P1** | Frontend Fallback | Replace `arvind_profile.jpg` fallback with neutral user avatar SVG | `Header.jsx` | User profile menu rendering |
| **P1** | Frontend Fallback | Replace external Unsplash image with neutral SVG | `Dashboard.jsx` | Offline network test |
| **P2** | Seeder Safety | Confirm `SampleDataSeeder` commented out | `DatabaseSeeder.php` | Code review |
| **P2** | Database Safety | Export recoverable backup before any modifications | `scratch/backup_rudra.sql` | `mysqldump` execution |
| **P3** | Test Suite | Execute full PHP test suite across all 125+ feature tests | `tests/Feature/*` | `php artisan test` |
| **P3** | Frontend Build | Execute Vite production build | `vite.config.js` | `npm run build` |
