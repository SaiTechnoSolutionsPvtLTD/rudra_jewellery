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
        // 1. Create karigar_payments table for making charges payables, cash settlements, and advances
        if (!Schema::hasTable('karigar_payments')) {
            Schema::create('karigar_payments', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('karigar_id')->index();
                $table->unsignedBigInteger('work_order_id')->nullable()->index();
                $table->unsignedBigInteger('received_piece_id')->nullable()->index();
                $table->string('transaction_type', 30)->index(); // payable (MC earned), payment (paid to karigar), advance (advance paid), adjustment (correction)
                $table->decimal('amount', 12, 2);
                $table->string('payment_mode', 50)->default('cash'); // cash, bank_transfer, upi, cheque, auto_payable, adjustment
                $table->string('reference_no', 100)->nullable();
                $table->date('transaction_date')->index();
                $table->text('notes')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->string('action_by_name', 100)->nullable();
                $table->timestamps();

                $table->foreign('karigar_id')->references('id')->on('karigars')->onDelete('cascade');
                $table->foreign('work_order_id')->references('id')->on('work_orders')->onDelete('set null');
                $table->foreign('received_piece_id')->references('id')->on('work_order_received_pieces')->onDelete('set null');

                // Prevent duplicate payable entries for the same received piece
                $table->unique(['received_piece_id', 'transaction_type'], 'uq_piece_payable');
            });
        }

        // 2. Enhance karigar_material_transactions to track full item breakdown, purities, sieves, and units
        if (Schema::hasTable('karigar_material_transactions')) {
            Schema::table('karigar_material_transactions', function (Blueprint $table) {
                if (!Schema::hasColumn('karigar_material_transactions', 'material_item')) {
                    $table->string('material_item', 150)->nullable()->after('material_type');
                }
                if (!Schema::hasColumn('karigar_material_transactions', 'purity')) {
                    $table->string('purity', 50)->nullable()->after('material_item');
                }
                if (!Schema::hasColumn('karigar_material_transactions', 'touch')) {
                    $table->decimal('touch', 5, 2)->nullable()->after('purity');
                }
                if (!Schema::hasColumn('karigar_material_transactions', 'sieve_size')) {
                    $table->string('sieve_size', 50)->nullable()->after('stamp');
                }
                if (!Schema::hasColumn('karigar_material_transactions', 'unit')) {
                    $table->string('unit', 20)->default('g')->after('sieve_size');
                }
                if (!Schema::hasColumn('karigar_material_transactions', 'pieces')) {
                    $table->integer('pieces')->default(0)->after('unit');
                }
                if (!Schema::hasColumn('karigar_material_transactions', 'gross_weight')) {
                    $table->decimal('gross_weight', 12, 3)->default(0)->after('weight');
                }
                if (!Schema::hasColumn('karigar_material_transactions', 'net_weight')) {
                    $table->decimal('net_weight', 12, 3)->default(0)->after('gross_weight');
                }
                if (!Schema::hasColumn('karigar_material_transactions', 'fine_weight')) {
                    $table->decimal('fine_weight', 12, 3)->default(0)->after('net_weight');
                }
                if (!Schema::hasColumn('karigar_material_transactions', 'wastage_weight')) {
                    $table->decimal('wastage_weight', 12, 3)->default(0)->after('fine_weight');
                }
                if (!Schema::hasColumn('karigar_material_transactions', 'difference_weight')) {
                    $table->decimal('difference_weight', 12, 3)->default(0)->after('wastage_weight');
                }
                if (!Schema::hasColumn('karigar_material_transactions', 'raw_material_id')) {
                    $table->unsignedBigInteger('raw_material_id')->nullable()->after('work_order_id');
                }
                if (!Schema::hasColumn('karigar_material_transactions', 'parent_transaction_id')) {
                    $table->unsignedBigInteger('parent_transaction_id')->nullable()->after('raw_material_id');
                }
                if (!Schema::hasColumn('karigar_material_transactions', 'is_reversed')) {
                    $table->boolean('is_reversed')->default(false)->after('reason');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('karigar_payments');

        if (Schema::hasTable('karigar_material_transactions')) {
            Schema::table('karigar_material_transactions', function (Blueprint $table) {
                $columns = [
                    'material_item', 'purity', 'touch', 'sieve_size', 'unit',
                    'pieces', 'gross_weight', 'net_weight', 'fine_weight',
                    'wastage_weight', 'difference_weight', 'raw_material_id',
                    'parent_transaction_id', 'is_reversed'
                ];
                foreach ($columns as $col) {
                    if (Schema::hasColumn('karigar_material_transactions', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }
    }
};
