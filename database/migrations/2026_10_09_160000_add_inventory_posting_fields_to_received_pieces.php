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
        // 1. Add finalization tracking fields to work_order_received_pieces
        Schema::table('work_order_received_pieces', function (Blueprint $table) {
            if (!Schema::hasColumn('work_order_received_pieces', 'is_inventory_posted')) {
                $table->boolean('is_inventory_posted')->default(false)->after('image_path');
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'posted_at')) {
                $table->timestamp('posted_at')->nullable()->after('is_inventory_posted');
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'posted_by')) {
                $table->foreignId('posted_by')->nullable()->after('posted_at')->constrained('users')->nullOnDelete();
            }
        });

        // 2. Add finalized_qty to work_orders and work_order_items
        Schema::table('work_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('work_orders', 'finalized_qty')) {
                $table->integer('finalized_qty')->default(0)->after('received_qty');
            }
        });

        Schema::table('work_order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('work_order_items', 'finalized_qty')) {
                $table->integer('finalized_qty')->default(0)->after('received_qty');
            }
        });

        // 3. Mark existing received pieces as posted so legacy data remains intact
        try {
            DB::table('work_order_received_pieces')
                ->where('is_inventory_posted', false)
                ->update([
                    'is_inventory_posted' => true,
                    'posted_at' => DB::raw('created_at'),
                ]);

            $workOrders = DB::table('work_orders')->get();
            foreach ($workOrders as $wo) {
                $count = DB::table('work_order_received_pieces')
                    ->where('work_order_id', $wo->id)
                    ->where('is_inventory_posted', true)
                    ->count();

                if ($count > 0 || in_array($wo->status, ['completed', 'final_received'])) {
                    $finQty = max($count, $wo->received_qty);
                    DB::table('work_orders')->where('id', $wo->id)->update(['finalized_qty' => $finQty]);
                    DB::table('work_order_items')->where('work_order_id', $wo->id)->update(['finalized_qty' => $finQty]);
                }
            }
        } catch (\Throwable $e) {
            logger()->warning('Received pieces posting migration backfill notice: ' . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_order_received_pieces', function (Blueprint $table) {
            $table->dropForeign(['posted_by']);
            $table->dropColumn(['is_inventory_posted', 'posted_at', 'posted_by']);
        });

        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropColumn('finalized_qty');
        });

        Schema::table('work_order_items', function (Blueprint $table) {
            $table->dropColumn('finalized_qty');
        });
    }
};
