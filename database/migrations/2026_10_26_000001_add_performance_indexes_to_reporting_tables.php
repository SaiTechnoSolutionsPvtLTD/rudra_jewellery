<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations to optimize querying speed across reports, dashboard, and manufacturing modules.
     */
    public function up(): void
    {
        // 1. purchase_entries
        if (Schema::hasTable('purchase_entries')) {
            Schema::table('purchase_entries', function (Blueprint $table) {
                $this->addIndexIfMissing('purchase_entries', ['supplier_id', 'purchase_date'], 'pe_supplier_date_idx');
                $this->addIndexIfMissing('purchase_entries', ['purchase_date'], 'pe_purchase_date_idx');
                $this->addIndexIfMissing('purchase_entries', ['payment_status'], 'pe_payment_status_idx');
                $this->addIndexIfMissing('purchase_entries', ['metal_type'], 'pe_metal_type_idx');
            });
        }

        // 2. supplier_settlements
        if (Schema::hasTable('supplier_settlements')) {
            Schema::table('supplier_settlements', function (Blueprint $table) {
                $this->addIndexIfMissing('supplier_settlements', ['supplier_id', 'settlement_date'], 'ss_supplier_date_idx');
                $this->addIndexIfMissing('supplier_settlements', ['settlement_date'], 'ss_settlement_date_idx');
                $this->addIndexIfMissing('supplier_settlements', ['settlement_type'], 'ss_settlement_type_idx');
            });
        }

        // 3. karigar_material_transactions
        if (Schema::hasTable('karigar_material_transactions')) {
            Schema::table('karigar_material_transactions', function (Blueprint $table) {
                $this->addIndexIfMissing('karigar_material_transactions', ['karigar_id', 'transaction_date'], 'kmt_karigar_date_idx');
                $this->addIndexIfMissing('karigar_material_transactions', ['work_order_id', 'transaction_date'], 'kmt_wo_date_idx');
                $this->addIndexIfMissing('karigar_material_transactions', ['transaction_date'], 'kmt_trans_date_idx');
                $this->addIndexIfMissing('karigar_material_transactions', ['material_type'], 'kmt_mat_type_idx');
            });
        }

        // 4. karigar_payments
        if (Schema::hasTable('karigar_payments')) {
            Schema::table('karigar_payments', function (Blueprint $table) {
                $this->addIndexIfMissing('karigar_payments', ['karigar_id', 'transaction_date'], 'kp_karigar_date_idx');
                $this->addIndexIfMissing('karigar_payments', ['work_order_id', 'transaction_date'], 'kp_wo_date_idx');
            });
        }

        // 5. work_orders
        if (Schema::hasTable('work_orders')) {
            Schema::table('work_orders', function (Blueprint $table) {
                $this->addIndexIfMissing('work_orders', ['status'], 'wo_status_idx');
                $this->addIndexIfMissing('work_orders', ['created_at'], 'wo_created_at_idx');
                $this->addIndexIfMissing('work_orders', ['karigar_id', 'status'], 'wo_karigar_status_idx');
            });
        }

        // 6. invoices
        if (Schema::hasTable('invoices')) {
            Schema::table('invoices', function (Blueprint $table) {
                $this->addIndexIfMissing('invoices', ['status'], 'inv_status_idx');
                $this->addIndexIfMissing('invoices', ['created_at'], 'inv_created_at_idx');
            });
        }

        // 7. products
        if (Schema::hasTable('products')) {
            Schema::table('products', function (Blueprint $table) {
                $this->addIndexIfMissing('products', ['status'], 'prod_status_idx');
                $this->addIndexIfMissing('products', ['created_at'], 'prod_created_at_idx');
            });
        }
    }

    private function addIndexIfMissing(string $table, array $columns, string $indexName): void
    {
        try {
            $existing = \DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$indexName]);
            if (empty($existing)) {
                $colList = '`' . implode('`, `', $columns) . '`';
                \DB::statement("ALTER TABLE `{$table}` ADD INDEX `{$indexName}` ({$colList})");
            }
        } catch (\Throwable $e) {
            // Ignore if already exists or table structure variation
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
    }
};
