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
            if (!Schema::hasColumn('work_order_received_pieces', 'status')) {
                $table->string('status', 40)->default('received')->after('design_no')->index();
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'qc_status')) {
                $table->string('qc_status', 40)->nullable()->after('status')->index();
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'qc_notes')) {
                $table->text('qc_notes')->nullable()->after('qc_status');
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'qc_submission_data')) {
                $table->json('qc_submission_data')->nullable()->after('qc_notes');
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'qc_checked_at')) {
                $table->timestamp('qc_checked_at')->nullable()->after('qc_submission_data');
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'qc_checked_by')) {
                $table->unsignedBigInteger('qc_checked_by')->nullable()->after('qc_checked_at');
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'certification_status')) {
                $table->string('certification_status', 40)->default('pending')->after('certificate_no')->index();
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'certification_agency')) {
                $table->string('certification_agency', 100)->nullable()->after('certification_status');
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'certified_at')) {
                $table->timestamp('certified_at')->nullable()->after('certification_agency');
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'certified_by')) {
                $table->unsignedBigInteger('certified_by')->nullable()->after('certified_at');
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'hallmarking_status')) {
                $table->string('hallmarking_status', 40)->default('pending')->after('huid')->index();
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'hallmarked_at')) {
                $table->timestamp('hallmarked_at')->nullable()->after('hallmarking_status');
            }
            if (!Schema::hasColumn('work_order_received_pieces', 'hallmarked_by')) {
                $table->unsignedBigInteger('hallmarked_by')->nullable()->after('hallmarked_at');
            }
        });

        // Make received_at nullable for pieces prior to physical receiving
        try {
            if (DB::getDriverName() === 'mysql') {
                DB::statement('ALTER TABLE work_order_received_pieces MODIFY received_at TIMESTAMP NULL DEFAULT NULL');
            }
        } catch (\Throwable $e) {
            // Ignore if already nullable or sqlite
        }

        // Backfill existing records
        try {
            DB::table('work_order_received_pieces')
                ->where('is_inventory_posted', true)
                ->update([
                    'status' => 'completed',
                    'qc_status' => 'passed',
                    'certification_status' => 'completed',
                    'hallmarking_status' => 'completed',
                ]);

            DB::table('work_order_received_pieces')
                ->where('is_inventory_posted', false)
                ->whereNotNull('receive_order_number')
                ->update([
                    'status' => 'received',
                    'qc_status' => 'passed',
                    'certification_status' => 'pending',
                    'hallmarking_status' => 'pending',
                ]);
        } catch (\Throwable $e) {
            // Safe fallback
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_order_received_pieces', function (Blueprint $table) {
            $cols = [
                'status', 'qc_status', 'qc_notes', 'qc_submission_data',
                'qc_checked_at', 'qc_checked_by', 'certification_status',
                'certification_agency', 'certified_at', 'certified_by',
                'hallmarking_status', 'hallmarked_at', 'hallmarked_by'
            ];
            foreach ($cols as $col) {
                if (Schema::hasColumn('work_order_received_pieces', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
