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
        if (Schema::hasTable('karigar_material_transactions')) {
            Schema::table('karigar_material_transactions', function (Blueprint $table) {
                if (!Schema::hasColumn('karigar_material_transactions', 'stamp_id')) {
                    $table->unsignedBigInteger('stamp_id')->nullable()->index()->after('stamp');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('karigar_material_transactions')) {
            Schema::table('karigar_material_transactions', function (Blueprint $table) {
                if (Schema::hasColumn('karigar_material_transactions', 'stamp_id')) {
                    $table->dropColumn('stamp_id');
                }
            });
        }
    }
};
