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
        if (Schema::hasTable('material_opening_stocks')) {
            Schema::table('material_opening_stocks', function (Blueprint $table) {
                $table->decimal('weight', 12, 3)->default(0)->nullable()->change();
                $table->decimal('carat_weight', 12, 3)->default(0)->nullable()->change();
                $table->decimal('quantity', 12, 3)->default(0)->nullable()->change();
                $table->decimal('rate', 14, 2)->default(0)->nullable()->change();
                $table->decimal('total_value', 16, 2)->default(0)->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('material_opening_stocks')) {
            Schema::table('material_opening_stocks', function (Blueprint $table) {
                $table->decimal('weight', 12, 3)->default(0)->change();
                $table->decimal('carat_weight', 12, 3)->default(0)->change();
                $table->decimal('quantity', 12, 3)->default(0)->change();
                $table->decimal('rate', 14, 2)->default(0)->change();
                $table->decimal('total_value', 16, 2)->default(0)->change();
            });
        }
    }
};
