<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            if (!Schema::hasColumn('suppliers', 'gold_balance_grams')) {
                $table->decimal('gold_balance_grams', 12, 3)->default(0.000)->after('notes');
            }
            if (!Schema::hasColumn('suppliers', 'silver_balance_grams')) {
                $table->decimal('silver_balance_grams', 12, 3)->default(0.000)->after('gold_balance_grams');
            }
            if (!Schema::hasColumn('suppliers', 'current_balance')) {
                $table->decimal('current_balance', 14, 2)->default(0.00)->after('silver_balance_grams');
            }
        });
    }

    public function down(): void
    {
        Schema::table('suppliers', function (Blueprint $table) {
            if (Schema::hasColumn('suppliers', 'current_balance')) {
                $table->dropColumn('current_balance');
            }
            if (Schema::hasColumn('suppliers', 'silver_balance_grams')) {
                $table->dropColumn('silver_balance_grams');
            }
            if (Schema::hasColumn('suppliers', 'gold_balance_grams')) {
                $table->dropColumn('gold_balance_grams');
            }
        });
    }
};
