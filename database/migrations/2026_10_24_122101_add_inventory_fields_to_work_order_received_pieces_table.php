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
        Schema::table('work_order_received_pieces', function (Blueprint $table) {
            if (!Schema::hasColumn('work_order_received_pieces', 'purchase_value')) {
                $table->decimal('purchase_value', 14, 2)->nullable()->after('total_making_charge');
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'components')) {
                $table->json('components')->nullable()->after('diamond_details');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_order_received_pieces', function (Blueprint $table) {
            if (Schema::hasColumn('work_order_received_pieces', 'purchase_value')) {
                $table->dropColumn('purchase_value');
            }
            if (Schema::hasColumn('work_order_received_pieces', 'components')) {
                $table->dropColumn('components');
            }
        });
    }
};
