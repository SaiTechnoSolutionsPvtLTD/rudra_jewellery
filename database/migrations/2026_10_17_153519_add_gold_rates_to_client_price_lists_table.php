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
        Schema::table('client_price_lists', function (Blueprint $table) {
            $table->json('gold_rates')->nullable()->after('effective_to');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('client_price_lists', function (Blueprint $table) {
            $table->dropColumn('gold_rates');
        });
    }
};
