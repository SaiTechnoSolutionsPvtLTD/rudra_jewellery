<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('karigar_material_transactions')) {
            Schema::table('karigar_material_transactions', function (Blueprint $table) {
                if (!Schema::hasColumn('karigar_material_transactions', 'source')) {
                    $table->string('source', 30)->default('vault')->after('material_item')->index();
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('karigar_material_transactions')) {
            Schema::table('karigar_material_transactions', function (Blueprint $table) {
                if (Schema::hasColumn('karigar_material_transactions', 'source')) {
                    $table->dropColumn('source');
                }
            });
        }
    }
};
