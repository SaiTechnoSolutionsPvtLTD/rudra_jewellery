<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('work_order_items') && !Schema::hasColumn('work_order_items', 'product_id')) {
            Schema::table('work_order_items', function (Blueprint $table) {
                $table->foreignId('product_id')->nullable()->after('design_no')->constrained('products')->nullOnDelete();
            });

            // Safe backfill of product_id by matching design_no or item_code to products table
            try {
                DB::statement("
                    UPDATE work_order_items woi
                    INNER JOIN products p ON (p.design_no = woi.design_no OR p.product_code = woi.design_no)
                    SET woi.product_id = p.id
                    WHERE woi.product_id IS NULL
                ");
            } catch (\Throwable $e) {
                // Ignore if backfill fails in some environments
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('work_order_items') && Schema::hasColumn('work_order_items', 'product_id')) {
            Schema::table('work_order_items', function (Blueprint $table) {
                $table->dropForeign(['product_id']);
                $table->dropColumn('product_id');
            });
        }
    }
};
