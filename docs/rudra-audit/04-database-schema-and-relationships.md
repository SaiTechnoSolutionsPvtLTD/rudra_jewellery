# Rudra Jewellery ERP — Master Technical Audit
## Document 04: Database Schema and Relationships

### 1. Database Specifications
- **Database Engine**: MariaDB 10.4.32 / MySQL 8.0 InnoDB
- **Charset / Collation**: `utf8mb4_unicode_ci`
- **Total Registered Tables**: 57
- **Total Migrations Applied**: 84

---

### 2. Core Relational Schema Map

| Table Name | Primary Key | Key Foreign Keys | Key Columns | Purpose |
|---|---|---|---|---|
| `users` | `id` | - | `name`, `email`, `role`, `status` | System user accounts |
| `roles` | `id` | - | `role_key`, `display_name`, `permissions` | RBAC roles |
| `permissions`| `id` | - | `module_name`, `actions`, `custom_actions` | Granular permission catalog |
| `categories` | `id` | - | `name`, `code`, `status` | Top-level product categories |
| `subcategories`| `id` | `category_id` | `name`, `code`, `status` | Subcategories |
| `clients` | `id` | - | `client_code`, `full_name`, `gold_balance_grams`, `silver_balance_grams`, `current_balance` | Customer master & dual ledger |
| `suppliers` | `id` | - | `supplier_code`, `name`, `current_balance` | Bullion & gemstone vendors |
| `raw_materials`| `id` | - | `material_type`, `unit`, `current_stock_weight`, `current_carats`, `current_pieces` | Bullion vault inventory |
| `products` | `id` | `category_id`, `subcategory_id` | `product_code`, `name`, `current_stock_qty`, `attributes` | Master product catalog |
| `work_orders`| `id` | `karigar_id`, `product_id`, `client_id` | `work_order_number`, `status`, `quality_status`, `allotted_weight`, `current_stage` | Custom job orders |
| `work_order_items`| `id`| `work_order_id` | `product_name`, `gold_weight`, `diamond_weight`, `gold_stamp`, `diamond_stamp` | Individual items inside work order |
| `work_order_received_pieces`| `id`| `work_order_id`, `product_id`| `tag_number`, `piece_number`, `design_no`, `gross_weight`, `net_gold_weight`, `status` | Manufactured retail piece tags |
| `karigars` | `id` | `user_id` | `karigar_code`, `name`, `current_gold_balance`, `current_silver_balance` | Goldsmith & artisan directory |
| `karigar_material_transactions`| `id`| `karigar_id`, `work_order_id`| `material_type`, `unit`, `weight`, `transaction_type` | Karigar metal ledger |
| `purchase_entries`| `id`| `supplier_id`, `raw_material_id`| `purchase_no`, `purchase_type`, `metal_type`, `weight`, `unit`, `fine_weight`, `touch`, `rate`, `total_amount` | Purchase register |
| `invoices` | `id` | `client_id` | `invoice_number`, `total_amount`, `paid_amount`, `due_amount`, `status` | Sales invoices |
| `sale_items` | `id` | `invoice_id`, `product_id` | `quantity`, `gross_weight`, `rate`, `making_charge`, `total_price` | Invoice line items |
| `sale_payments`| `id`| `invoice_id` | `payment_method`, `amount`, `reference_number` | Payment receipts |
| `stamps` | `id` | - | `name`, `code`, `applicable_for` | Gold hallmarks & diamond sieves |
| `inventory_movements`| `id`| `product_id`, `invoice_id`, `purchase_id`| `movement_type`, `quantity`, `weight`, `notes` | Immutable stock audit log |

---

### 3. Key Integrity Constraints Verified
1. **`work_order_received_pieces.design_no`**: Enforced NOT NULL. All received piece fixtures and workflows include standard design codes.
2. **`work_orders.allotted_date`**: Required field ensuring accurate WIP delay and SLA metrics.
3. **`clients.gold_balance_grams`**: Decimal(12,4) precision preserving exact bullion milligrams.
4. **Idempotent Posting**: `is_inventory_posted` flag on `work_order_received_pieces` prevents duplicate inventory movements on network retry.
