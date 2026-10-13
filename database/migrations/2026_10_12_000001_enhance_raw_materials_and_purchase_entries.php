<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Enhance raw_materials table with count tracking
        if (Schema::hasTable('raw_materials')) {
            Schema::table('raw_materials', function (Blueprint $table) {
                if (!Schema::hasColumn('raw_materials', 'purchased_count')) {
                    $table->decimal('purchased_count', 12, 3)->default(0)->after('purchased_weight');
                }
                if (!Schema::hasColumn('raw_materials', 'allocated_count')) {
                    $table->decimal('allocated_count', 12, 3)->default(0)->after('allocated_weight');
                }
                if (!Schema::hasColumn('raw_materials', 'current_count')) {
                    $table->decimal('current_count', 12, 3)->default(0)->after('current_balance');
                }
            });
        }

        // 2. Enhance purchase_entries table with raw_material_id, count_qty, and unit
        if (Schema::hasTable('purchase_entries')) {
            Schema::table('purchase_entries', function (Blueprint $table) {
                if (!Schema::hasColumn('purchase_entries', 'raw_material_id')) {
                    $table->unsignedBigInteger('raw_material_id')->nullable()->after('supplier_id')->index();
                }
                if (!Schema::hasColumn('purchase_entries', 'count_qty')) {
                    $table->decimal('count_qty', 12, 3)->nullable()->after('qty');
                }
                if (!Schema::hasColumn('purchase_entries', 'unit')) {
                    $table->string('unit', 50)->nullable()->after('net_weight');
                }
            });
        }

        // 3. Enhance inventory_movements table for raw materials and purchase links
        if (Schema::hasTable('inventory_movements')) {
            Schema::table('inventory_movements', function (Blueprint $table) {
                if (!Schema::hasColumn('inventory_movements', 'raw_material_id')) {
                    $table->unsignedBigInteger('raw_material_id')->nullable()->after('product_id')->index();
                }
                if (!Schema::hasColumn('inventory_movements', 'purchase_entry_id')) {
                    $table->unsignedBigInteger('purchase_entry_id')->nullable()->after('invoice_id')->index();
                }
            });

            // Make product_id nullable on inventory_movements
            try {
                \Illuminate\Support\Facades\DB::statement("ALTER TABLE inventory_movements MODIFY product_id BIGINT UNSIGNED NULL");
            } catch (\Exception $e) {
                // If already nullable or DB driver differs
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('inventory_movements')) {
            Schema::table('inventory_movements', function (Blueprint $table) {
                if (Schema::hasColumn('inventory_movements', 'purchase_entry_id')) {
                    $table->dropColumn('purchase_entry_id');
                }
                if (Schema::hasColumn('inventory_movements', 'raw_material_id')) {
                    $table->dropColumn('raw_material_id');
                }
            });
        }

        if (Schema::hasTable('purchase_entries')) {
            Schema::table('purchase_entries', function (Blueprint $table) {
                if (Schema::hasColumn('purchase_entries', 'unit')) {
                    $table->dropColumn('unit');
                }
                if (Schema::hasColumn('purchase_entries', 'count_qty')) {
                    $table->dropColumn('count_qty');
                }
                if (Schema::hasColumn('purchase_entries', 'raw_material_id')) {
                    $table->dropColumn('raw_material_id');
                }
            });
        }

        if (Schema::hasTable('raw_materials')) {
            Schema::table('raw_materials', function (Blueprint $table) {
                if (Schema::hasColumn('raw_materials', 'current_count')) {
                    $table->dropColumn('current_count');
                }
                if (Schema::hasColumn('raw_materials', 'allocated_count')) {
                    $table->dropColumn('allocated_count');
                }
                if (Schema::hasColumn('raw_materials', 'purchased_count')) {
                    $table->dropColumn('purchased_count');
                }
            });
        }
    }
};
