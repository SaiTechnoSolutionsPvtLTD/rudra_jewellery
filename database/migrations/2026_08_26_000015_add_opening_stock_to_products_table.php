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
            $table->integer('opening_stock_qty')->default(0)->after('description');
            $table->decimal('opening_stock_weight', 10, 3)->default(0.000)->after('opening_stock_qty');
            $table->decimal('opening_stock_rate', 12, 2)->default(0.00)->after('opening_stock_weight');
            $table->date('opening_stock_date')->nullable()->after('opening_stock_rate');
            $table->integer('current_stock_qty')->default(0)->after('opening_stock_date');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn([
                'opening_stock_qty',
                'opening_stock_weight',
                'opening_stock_rate',
                'opening_stock_date',
                'current_stock_qty'
            ]);
        });
    }
};
