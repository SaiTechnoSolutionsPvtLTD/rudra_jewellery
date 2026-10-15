<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('raw_materials')) {
            // Drop unique constraint on material_type if exists
            try {
                $indexes = DB::select("SHOW INDEXES FROM raw_materials WHERE Key_name = 'raw_materials_material_type_unique'");
                if (!empty($indexes)) {
                    Schema::table('raw_materials', function (Blueprint $table) {
                        $table->dropUnique('raw_materials_material_type_unique');
                    });
                }
            } catch (\Throwable $e) {}

            Schema::table('raw_materials', function (Blueprint $table) {
                if (!Schema::hasColumn('raw_materials', 'code')) {
                    $table->string('code')->nullable()->after('name');
                }
                if (!Schema::hasColumn('raw_materials', 'karat')) {
                    $table->string('karat')->nullable()->after('code');
                }
                if (!Schema::hasColumn('raw_materials', 'purity')) {
                    $table->string('purity')->nullable()->after('karat');
                }
                if (!Schema::hasColumn('raw_materials', 'description')) {
                    $table->text('description')->nullable()->after('unit');
                }
                if (!Schema::hasColumn('raw_materials', 'is_active')) {
                    $table->boolean('is_active')->default(true)->after('description');
                }
                if (!Schema::hasColumn('raw_materials', 'sort_order')) {
                    $table->integer('sort_order')->default(0)->after('is_active');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('raw_materials')) {
            Schema::table('raw_materials', function (Blueprint $table) {
                if (Schema::hasColumn('raw_materials', 'sort_order')) $table->dropColumn('sort_order');
                if (Schema::hasColumn('raw_materials', 'is_active')) $table->dropColumn('is_active');
                if (Schema::hasColumn('raw_materials', 'description')) $table->dropColumn('description');
                if (Schema::hasColumn('raw_materials', 'purity')) $table->dropColumn('purity');
                if (Schema::hasColumn('raw_materials', 'karat')) $table->dropColumn('karat');
                if (Schema::hasColumn('raw_materials', 'code')) $table->dropColumn('code');
            });
        }
    }
};
