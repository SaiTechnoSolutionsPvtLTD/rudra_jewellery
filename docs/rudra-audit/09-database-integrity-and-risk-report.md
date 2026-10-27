# Rudra Jewellery ERP — Master Technical Audit
## Document 09: Database Integrity and Risk Report

### 1. Database Integrity Audit Findings

| Area | Status | Evidence / Analysis | Risk Rating |
|---|:---:|---|:---:|
| **Orphaned Child Records** | **Clean** | No orphaned `work_order_items`, `sale_items`, or `inventory_movements` found. All rows reference valid parent keys. | Low |
| **Duplicate Stock Counting** | **Protected** | `work_order_received_pieces.is_inventory_posted` boolean prevents repeated inventory posting calls from duplicating stock. | Low |
| **Unit Contamination** | **Resolved** | Diamond carats and gold grams are strictly segregated in `InventoryController` and `WorkOrderController`. The 31.8 cts bug is completely eliminated. | Low |
| **NOT NULL Constraints** | **Enforced** | `work_order_received_pieces.design_no` and `work_orders.allotted_date` strictly enforced across models and test fixtures. | Low |
| **Metal Ledger Integrity** | **Active** | Decimal(12,4) precision on `clients.gold_balance_grams` ensures exact bullion milligrams without floating-point truncation. | Low |
| **Concurrency & Deadlocks** | **Protected** | `DB::transaction()` with pessimistic row locks (`lockForUpdate()`) applied in stock movements and invoice payment settlement. | Low |

---

### 2. Confirmed Risks vs Potential Vulnerabilities
1. **Fallback Image Artifacts (Moderate Risk)**:
   - Several frontend files referenced `/images/samples/peacock_choker.jpg` and `/images/samples/arvind_profile.jpg` as image fallbacks. If an artisan or manager creates an order without a photo, it showed a specific peacock choker rather than a neutral placeholder.
   - *Resolution*: Replace fallback paths with neutral UI placeholder icons / SVGs.
2. **Database Engine Availability (Operational Risk)**:
   - MariaDB/MySQL is running via standalone process on port 3306. A Windows system service (`mysqld`) should be registered for automatic startup upon machine boot.
3. **Database Backups (Data Protection Risk)**:
   - An automated daily `mysqldump` backup schedule is recommended for production deployment.
