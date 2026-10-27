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
        if (Schema::hasTable('work_order_received_pieces') && Schema::hasColumn('work_order_received_pieces', 'work_order_id')) {
            try {
                DB::statement("ALTER TABLE `work_order_received_pieces` MODIFY `work_order_id` BIGINT(20) UNSIGNED NULL;");
            } catch (\Throwable $e) {
                // Fallback for database engines supporting change()
                Schema::table('work_order_received_pieces', function (Blueprint $table) {
                    $table->unsignedBigInteger('work_order_id')->nullable()->change();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('work_order_received_pieces') && Schema::hasColumn('work_order_received_pieces', 'work_order_id')) {
            try {
                DB::statement("ALTER TABLE `work_order_received_pieces` MODIFY `work_order_id` BIGINT(20) UNSIGNED NOT NULL;");
            } catch (\Throwable $e) {}
        }
    }
};
