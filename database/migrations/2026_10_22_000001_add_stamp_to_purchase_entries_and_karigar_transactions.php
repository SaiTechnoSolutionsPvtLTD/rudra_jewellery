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
        // 1. Add stamp to purchase_entries if not present
        if (Schema::hasTable('purchase_entries') && !Schema::hasColumn('purchase_entries', 'stamp')) {
            Schema::table('purchase_entries', function (Blueprint $table) {
                $table->string('stamp', 100)->nullable()->after('purity');
            });
        }

        // 2. Add stamp and material_type to karigar_material_transactions if not present
        if (Schema::hasTable('karigar_material_transactions')) {
            Schema::table('karigar_material_transactions', function (Blueprint $table) {
                if (!Schema::hasColumn('karigar_material_transactions', 'stamp')) {
                    $table->string('stamp', 100)->nullable()->after('weight');
                }
                if (!Schema::hasColumn('karigar_material_transactions', 'material_type')) {
                    $table->string('material_type', 50)->nullable()->default('gold')->after('transaction_type');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('purchase_entries') && Schema::hasColumn('purchase_entries', 'stamp')) {
            Schema::table('purchase_entries', function (Blueprint $table) {
                $table->dropColumn('stamp');
            });
        }

        if (Schema::hasTable('karigar_material_transactions')) {
            Schema::table('karigar_material_transactions', function (Blueprint $table) {
                if (Schema::hasColumn('karigar_material_transactions', 'stamp')) {
                    $table->dropColumn('stamp');
                }
                if (Schema::hasColumn('karigar_material_transactions', 'material_type')) {
                    $table->dropColumn('material_type');
                }
            });
        }
    }
};
