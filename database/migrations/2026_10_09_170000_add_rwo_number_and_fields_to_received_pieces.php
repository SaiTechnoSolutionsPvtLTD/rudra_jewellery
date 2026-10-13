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
        Schema::table('work_order_received_pieces', function (Blueprint $table) {
            if (!Schema::hasColumn('work_order_received_pieces', 'receive_order_number')) {
                $table->string('receive_order_number', 60)->nullable()->after('piece_number')->index();
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'gold_karat')) {
                $table->string('gold_karat', 20)->default('22K')->after('purity');
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'color_stone_count')) {
                $table->integer('color_stone_count')->default(0)->after('color_stone_weight');
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'diamond_details')) {
                $table->string('diamond_details', 100)->nullable()->after('diamond_count');
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'making_charge_type')) {
                $table->string('making_charge_type', 30)->default('per_gram')->after('making_charge_per_gram');
            }
        });

        // Backfill existing rows with unique sequential receive_order_number
        try {
            $year = date('Y');
            $existingPieces = DB::table('work_order_received_pieces')
                ->whereNull('receive_order_number')
                ->orderBy('id', 'asc')
                ->get();

            $counter = 1;
            foreach ($existingPieces as $piece) {
                $rwoNumber = "RWO-{$year}-" . str_pad($counter, 6, '0', STR_PAD_LEFT);
                DB::table('work_order_received_pieces')
                    ->where('id', $piece->id)
                    ->update([
                        'receive_order_number' => $rwoNumber,
                        'gold_karat' => '22K',
                        'diamond_details' => $piece->diamond_weight > 0 ? "Dia-{$piece->diamond_weight}/+7/{$piece->diamond_count}" : null,
                    ]);
                $counter++;
            }

            // Once backfilled, make receive_order_number unique if possible
            // We check if unique index doesn't already exist
            $indexes = DB::select("SHOW INDEXES FROM work_order_received_pieces WHERE Key_name = 'work_order_received_pieces_receive_order_number_unique'");
            if (empty($indexes)) {
                Schema::table('work_order_received_pieces', function (Blueprint $table) {
                    $table->unique('receive_order_number');
                });
            }
        } catch (\Throwable $e) {
            logger()->warning('Receive order number backfill warning: ' . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_order_received_pieces', function (Blueprint $table) {
            $table->dropUnique(['receive_order_number']);
            $table->dropColumn([
                'receive_order_number',
                'gold_karat',
                'color_stone_count',
                'diamond_details',
                'making_charge_type',
            ]);
        });
    }
};
