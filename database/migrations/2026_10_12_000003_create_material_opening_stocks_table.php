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
        // 1. Add opening_weight and opening_count to raw_materials table if missing
        if (Schema::hasTable('raw_materials')) {
            Schema::table('raw_materials', function (Blueprint $table) {
                if (!Schema::hasColumn('raw_materials', 'opening_weight')) {
                    $table->decimal('opening_weight', 12, 3)->default(0)->after('name');
                }
                if (!Schema::hasColumn('raw_materials', 'opening_count')) {
                    $table->decimal('opening_count', 12, 3)->default(0)->after('opening_weight');
                }
            });
        }

        // 2. Create material_opening_stocks table
        if (!Schema::hasTable('material_opening_stocks')) {
            Schema::create('material_opening_stocks', function (Blueprint $table) {
                $table->id();
                $table->string('stock_number', 50)->unique();
                $table->string('material_type', 50)->index(); // gold, diamond, stone, silver
                $table->unsignedBigInteger('raw_material_id')->nullable()->index();
                $table->string('stamp', 50)->nullable()->index();
                $table->string('karat', 50)->nullable();
                $table->decimal('purity', 8, 2)->nullable();
                $table->string('unit', 20)->default('g');
                $table->decimal('weight', 12, 3)->default(0);
                $table->decimal('carat_weight', 12, 3)->default(0);
                $table->decimal('quantity', 12, 3)->default(0);
                $table->decimal('rate', 14, 2)->default(0);
                $table->decimal('total_value', 16, 2)->default(0);
                $table->date('entry_date');
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('created_by')->nullable()->index();
                $table->timestamps();

                $table->foreign('raw_material_id')->references('id')->on('raw_materials')->onDelete('set null');
            });
        }

        // 3. Add material_opening_stock_id to inventory_movements if missing
        if (Schema::hasTable('inventory_movements')) {
            Schema::table('inventory_movements', function (Blueprint $table) {
                if (!Schema::hasColumn('inventory_movements', 'material_opening_stock_id')) {
                    $table->unsignedBigInteger('material_opening_stock_id')->nullable()->after('purchase_entry_id')->index();
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('inventory_movements')) {
            Schema::table('inventory_movements', function (Blueprint $table) {
                if (Schema::hasColumn('inventory_movements', 'material_opening_stock_id')) {
                    $table->dropColumn('material_opening_stock_id');
                }
            });
        }

        Schema::dropIfExists('material_opening_stocks');

        if (Schema::hasTable('raw_materials')) {
            Schema::table('raw_materials', function (Blueprint $table) {
                if (Schema::hasColumn('raw_materials', 'opening_count')) {
                    $table->dropColumn('opening_count');
                }
                if (Schema::hasColumn('raw_materials', 'opening_weight')) {
                    $table->dropColumn('opening_weight');
                }
            });
        }
    }
};
