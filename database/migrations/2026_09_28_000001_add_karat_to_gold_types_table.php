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
        if (Schema::hasTable('gold_types') && !Schema::hasColumn('gold_types', 'karat')) {
            Schema::table('gold_types', function (Blueprint $table) {
                $table->string('karat', 50)->nullable()->after('purity');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('gold_types') && Schema::hasColumn('gold_types', 'karat')) {
            Schema::table('gold_types', function (Blueprint $table) {
                $table->dropColumn('karat');
            });
        }
    }
};
