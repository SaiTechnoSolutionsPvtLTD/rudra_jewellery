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
        if (Schema::hasTable('gold_rates')) {
            Schema::table('gold_rates', function (Blueprint $table) {
                if (!Schema::hasColumn('gold_rates', 'gold_14k_1g')) {
                    $table->decimal('gold_14k_1g', 10, 2)->nullable()->after('gold_18k_1g');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('gold_rates')) {
            Schema::table('gold_rates', function (Blueprint $table) {
                if (Schema::hasColumn('gold_rates', 'gold_14k_1g')) {
                    $table->dropColumn('gold_14k_1g');
                }
            });
        }
    }
};
