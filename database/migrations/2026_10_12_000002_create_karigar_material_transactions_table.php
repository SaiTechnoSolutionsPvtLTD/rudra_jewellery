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
        // 1. Add tracking columns to karigars table
        if (Schema::hasTable('karigars')) {
            Schema::table('karigars', function (Blueprint $table) {
                if (!Schema::hasColumn('karigars', 'karigar_gold_balance_grams')) {
                    $table->decimal('karigar_gold_balance_grams', 12, 3)->default(0)->after('current_gold_balance_grams');
                }
                if (!Schema::hasColumn('karigars', 'settlement_balance_grams')) {
                    $table->decimal('settlement_balance_grams', 12, 3)->default(0)->after('karigar_gold_balance_grams');
                }
            });
        }

        // 2. Add tracking columns to work_orders table
        if (Schema::hasTable('work_orders')) {
            Schema::table('work_orders', function (Blueprint $table) {
                if (!Schema::hasColumn('work_orders', 'karigar_gold_weight')) {
                    $table->decimal('karigar_gold_weight', 12, 3)->default(0)->after('allotted_weight');
                }
                if (!Schema::hasColumn('work_orders', 'additional_allocated_weight')) {
                    $table->decimal('additional_allocated_weight', 12, 3)->default(0)->after('karigar_gold_weight');
                }
            });
        }

        // 3. Create karigar_material_transactions audit ledger table
        if (!Schema::hasTable('karigar_material_transactions')) {
            Schema::create('karigar_material_transactions', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('karigar_id')->index();
                $table->unsignedBigInteger('work_order_id')->nullable()->index();
                $table->string('transaction_type', 50)->index(); // company_allocation, additional_allocation, karigar_contribution, finished_received, unused_returned, approved_wastage, adjustment, settlement
                $table->dateTime('transaction_date');
                $table->decimal('weight', 12, 3);
                $table->decimal('company_gold_weight', 12, 3)->default(0);
                $table->decimal('karigar_gold_weight', 12, 3)->default(0);
                $table->decimal('signed_change', 12, 3)->default(0);
                $table->decimal('settlement_balance_after', 12, 3)->default(0);
                $table->decimal('bench_balance_after', 12, 3)->default(0);
                $table->text('reason')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->string('action_by_name')->nullable();
                $table->timestamps();

                $table->foreign('karigar_id')->references('id')->on('karigars')->onDelete('cascade');
                $table->foreign('work_order_id')->references('id')->on('work_orders')->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('karigar_material_transactions');

        if (Schema::hasTable('work_orders')) {
            Schema::table('work_orders', function (Blueprint $table) {
                if (Schema::hasColumn('work_orders', 'karigar_gold_weight')) {
                    $table->dropColumn('karigar_gold_weight');
                }
                if (Schema::hasColumn('work_orders', 'additional_allocated_weight')) {
                    $table->dropColumn('additional_allocated_weight');
                }
            });
        }

        if (Schema::hasTable('karigars')) {
            Schema::table('karigars', function (Blueprint $table) {
                if (Schema::hasColumn('karigars', 'karigar_gold_balance_grams')) {
                    $table->dropColumn('karigar_gold_balance_grams');
                }
                if (Schema::hasColumn('karigars', 'settlement_balance_grams')) {
                    $table->dropColumn('settlement_balance_grams');
                }
            });
        }
    }
};
