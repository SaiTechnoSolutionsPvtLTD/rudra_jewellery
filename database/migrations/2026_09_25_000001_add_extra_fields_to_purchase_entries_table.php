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
        Schema::table('purchase_entries', function (Blueprint $table) {
            if (!Schema::hasColumn('purchase_entries', 'image')) {
                $table->string('image')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('purchase_entries', 'item_name')) {
                $table->string('item_name')->nullable()->after('metal_type');
            }
            if (!Schema::hasColumn('purchase_entries', 'category_id')) {
                $table->unsignedBigInteger('category_id')->nullable()->after('product_id');
            }
            if (!Schema::hasColumn('purchase_entries', 'less_weight')) {
                $table->decimal('less_weight', 10, 3)->default(0.000)->after('weight');
            }
            if (!Schema::hasColumn('purchase_entries', 'net_weight')) {
                $table->decimal('net_weight', 10, 3)->default(0.000)->after('less_weight');
            }
            if (!Schema::hasColumn('purchase_entries', 'making_charge')) {
                $table->decimal('making_charge', 12, 2)->default(0.00)->after('rate');
            }
            if (!Schema::hasColumn('purchase_entries', 'stone_weight')) {
                $table->decimal('stone_weight', 10, 3)->default(0.000)->after('net_weight');
            }
            if (!Schema::hasColumn('purchase_entries', 'stone_cost')) {
                $table->decimal('stone_cost', 12, 2)->default(0.00)->after('making_charge');
            }
            if (!Schema::hasColumn('purchase_entries', 'purity')) {
                $table->string('purity', 50)->nullable()->after('metal_type');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_entries', function (Blueprint $table) {
            $table->dropColumn([
                'image', 'item_name', 'category_id', 'less_weight', 
                'net_weight', 'making_charge', 'stone_weight', 'stone_cost', 'purity'
            ]);
        });
    }
};
