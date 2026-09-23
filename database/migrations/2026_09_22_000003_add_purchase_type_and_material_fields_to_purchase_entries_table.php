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
        Schema::table('purchase_entries', function (Blueprint $table) {
            if (!Schema::hasColumn('purchase_entries', 'purchase_type')) {
                $table->string('purchase_type', 50)->default('finished_product')->after('purchase_no');
            }
            if (!Schema::hasColumn('purchase_entries', 'metal_type')) {
                $table->string('metal_type', 50)->nullable()->after('purchase_type');
            }
        });

        // Make product_id nullable for raw material purchases
        Schema::table('purchase_entries', function (Blueprint $table) {
            $table->unsignedBigInteger('product_id')->nullable()->change();
        });

        // Safe Backfill strategy for existing database records:
        // Existing purchase records with a non-null product_id are classified as finished_product.
        // Existing purchase records with a null product_id are classified as raw_material.
        DB::table('purchase_entries')
            ->whereNotNull('product_id')
            ->where(function ($q) {
                $q->whereNull('purchase_type')
                  ->orWhere('purchase_type', '');
            })
            ->update(['purchase_type' => 'finished_product']);

        DB::table('purchase_entries')
            ->whereNull('product_id')
            ->where(function ($q) {
                $q->whereNull('purchase_type')
                  ->orWhere('purchase_type', '');
            })
            ->update(['purchase_type' => 'raw_material']);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_entries', function (Blueprint $table) {
            if (Schema::hasColumn('purchase_entries', 'purchase_type')) {
                $table->dropColumn('purchase_type');
            }
            if (Schema::hasColumn('purchase_entries', 'metal_type')) {
                $table->dropColumn('metal_type');
            }
        });
    }
};
