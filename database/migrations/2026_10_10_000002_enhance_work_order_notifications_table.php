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
        Schema::table('work_order_notifications', function (Blueprint $table) {
            if (!Schema::hasColumn('work_order_notifications', 'entity_type')) {
                $table->string('entity_type', 50)->nullable()->after('type');
            }
            if (!Schema::hasColumn('work_order_notifications', 'entity_id')) {
                $table->unsignedBigInteger('entity_id')->nullable()->after('entity_type');
            }
            if (!Schema::hasColumn('work_order_notifications', 'piece_id')) {
                $table->unsignedBigInteger('piece_id')->nullable()->after('work_order_id');
            }
            if (!Schema::hasColumn('work_order_notifications', 'action_url')) {
                $table->string('action_url', 255)->nullable()->after('data');
            }
            if (!Schema::hasColumn('work_order_notifications', 'idempotency_key')) {
                $table->string('idempotency_key', 120)->nullable()->after('action_url');
            }

            $table->index(['user_id', 'is_read'], 'notif_user_read_idx');
            $table->index(['user_id', 'created_at'], 'notif_user_created_idx');
            $table->index(['idempotency_key', 'user_id'], 'notif_idemp_user_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_order_notifications', function (Blueprint $table) {
            $table->dropIndex('notif_user_read_idx');
            $table->dropIndex('notif_user_created_idx');
            $table->dropIndex('notif_idemp_user_idx');
            $table->dropColumn(['entity_type', 'entity_id', 'piece_id', 'action_url', 'idempotency_key']);
        });
    }
};
