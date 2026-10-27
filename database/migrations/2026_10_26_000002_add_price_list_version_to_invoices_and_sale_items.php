<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (!Schema::hasColumn('invoices', 'price_list_version')) {
                $table->string('price_list_version', 50)->nullable()->after('payment_method');
            }
        });

        Schema::table('sale_items', function (Blueprint $table) {
            if (!Schema::hasColumn('sale_items', 'price_list_version')) {
                $table->string('price_list_version', 50)->nullable()->after('details');
            }
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (Schema::hasColumn('invoices', 'price_list_version')) {
                $table->dropColumn('price_list_version');
            }
        });

        Schema::table('sale_items', function (Blueprint $table) {
            if (Schema::hasColumn('sale_items', 'price_list_version')) {
                $table->dropColumn('price_list_version');
            }
        });
    }
};
