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
        // 1. Add user_id to karigars table if not present
        if (!Schema::hasColumn('karigars', 'user_id')) {
            Schema::table('karigars', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->after('id')->constrained('users')->nullOnDelete();
            });
        }

        // 2. Add return_count, karigar_submitted_at, karigar_notes, karigar_data to work_orders table
        Schema::table('work_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('work_orders', 'return_count')) {
                $table->integer('return_count')->default(0)->after('returned_weight');
            }
            if (!Schema::hasColumn('work_orders', 'karigar_submitted_at')) {
                $table->timestamp('karigar_submitted_at')->nullable()->after('quality_checked_at');
            }
            if (!Schema::hasColumn('work_orders', 'karigar_notes')) {
                $table->text('karigar_notes')->nullable()->after('notes');
            }
            if (!Schema::hasColumn('work_orders', 'karigar_data')) {
                $table->json('karigar_data')->nullable()->after('pricing_details');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            if (Schema::hasColumn('work_orders', 'karigar_data')) {
                $table->dropColumn('karigar_data');
            }
            if (Schema::hasColumn('work_orders', 'karigar_notes')) {
                $table->dropColumn('karigar_notes');
            }
            if (Schema::hasColumn('work_orders', 'karigar_submitted_at')) {
                $table->dropColumn('karigar_submitted_at');
            }
            if (Schema::hasColumn('work_orders', 'return_count')) {
                $table->dropColumn('return_count');
            }
        });

        if (Schema::hasColumn('karigars', 'user_id')) {
            Schema::table('karigars', function (Blueprint $table) {
                $table->dropForeign(['user_id']);
                $table->dropColumn('user_id');
            });
        }
    }
};
