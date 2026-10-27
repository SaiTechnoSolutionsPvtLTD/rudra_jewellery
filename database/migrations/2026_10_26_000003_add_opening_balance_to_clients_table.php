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
        Schema::table('clients', function (Blueprint $table) {
            if (!Schema::hasColumn('clients', 'opening_balance')) {
                $table->decimal('opening_balance', 14, 2)->default(0.00)->after('total_purchases');
            }
            if (!Schema::hasColumn('clients', 'balance_type')) {
                $table->string('balance_type', 20)->default('debit')->after('opening_balance');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (Schema::hasColumn('clients', 'balance_type')) {
                $table->dropColumn('balance_type');
            }
            if (Schema::hasColumn('clients', 'opening_balance')) {
                $table->dropColumn('opening_balance');
            }
        });
    }
};
