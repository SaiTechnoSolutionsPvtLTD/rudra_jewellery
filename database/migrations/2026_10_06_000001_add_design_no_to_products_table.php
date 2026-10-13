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
        if (Schema::hasTable('products') && !Schema::hasColumn('products', 'design_no')) {
            Schema::table('products', function (Blueprint $table) {
                $table->string('design_no')->nullable()->index()->after('product_code');
            });

            // Backfill existing design_no from attributes JSON if present
            try {
                DB::statement("UPDATE products SET design_no = JSON_UNQUOTE(JSON_EXTRACT(attributes, '$.design_no')) WHERE JSON_EXTRACT(attributes, '$.design_no') IS NOT NULL AND JSON_UNQUOTE(JSON_EXTRACT(attributes, '$.design_no')) != '' AND JSON_UNQUOTE(JSON_EXTRACT(attributes, '$.design_no')) != 'null'");
            } catch (\Throwable $e) {
                // Ignore if JSON extract fails on older MySQL versions
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('products') && Schema::hasColumn('products', 'design_no')) {
            Schema::table('products', function (Blueprint $table) {
                $table->dropColumn('design_no');
            });
        }
    }
};
