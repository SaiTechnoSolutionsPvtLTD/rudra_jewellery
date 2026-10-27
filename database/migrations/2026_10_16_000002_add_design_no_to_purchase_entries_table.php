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
        if (Schema::hasTable('purchase_entries') && !Schema::hasColumn('purchase_entries', 'design_no')) {
            Schema::table('purchase_entries', function (Blueprint $table) {
                $table->string('design_no', 100)->nullable()->index()->after('item_name');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('purchase_entries') && Schema::hasColumn('purchase_entries', 'design_no')) {
            Schema::table('purchase_entries', function (Blueprint $table) {
                $table->dropColumn('design_no');
            });
        }
    }
};
