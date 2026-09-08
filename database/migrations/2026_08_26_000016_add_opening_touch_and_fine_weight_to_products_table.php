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
        Schema::table('products', function (Blueprint $table) {
            $table->decimal('opening_touch', 5, 2)->default(100.00)->after('opening_stock_weight');
            $table->decimal('opening_fine_weight', 10, 3)->default(0.000)->after('opening_touch');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'opening_touch',
                'opening_fine_weight'
            ]);
        });
    }
};
