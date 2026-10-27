<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (!Schema::hasColumn('clients', 'gold_balance_grams')) {
                $table->decimal('gold_balance_grams', 12, 3)->default(0.000)->after('total_purchases');
            }
            if (!Schema::hasColumn('clients', 'silver_balance_grams')) {
                $table->decimal('silver_balance_grams', 12, 3)->default(0.000)->after('gold_balance_grams');
            }
        });
    }

    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (Schema::hasColumn('clients', 'silver_balance_grams')) {
                $table->dropColumn('silver_balance_grams');
            }
            if (Schema::hasColumn('clients', 'gold_balance_grams')) {
                $table->dropColumn('gold_balance_grams');
            }
        });
    }
};
