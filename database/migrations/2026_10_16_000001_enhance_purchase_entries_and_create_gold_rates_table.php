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
        // 1. Enhance purchase_entries with wastage, GST fields, credit due date, and payment status tracking
        if (Schema::hasTable('purchase_entries')) {
            Schema::table('purchase_entries', function (Blueprint $table) {
                if (!Schema::hasColumn('purchase_entries', 'wastage_percent')) {
                    $table->decimal('wastage_percent', 6, 2)->nullable()->default(0)->after('touch');
                }
                if (!Schema::hasColumn('purchase_entries', 'cgst_percent')) {
                    $table->decimal('cgst_percent', 5, 2)->nullable()->default(0)->after('making_charge');
                }
                if (!Schema::hasColumn('purchase_entries', 'cgst_amount')) {
                    $table->decimal('cgst_amount', 12, 2)->nullable()->default(0)->after('cgst_percent');
                }
                if (!Schema::hasColumn('purchase_entries', 'sgst_percent')) {
                    $table->decimal('sgst_percent', 5, 2)->nullable()->default(0)->after('cgst_amount');
                }
                if (!Schema::hasColumn('purchase_entries', 'sgst_amount')) {
                    $table->decimal('sgst_amount', 12, 2)->nullable()->default(0)->after('sgst_percent');
                }
                if (!Schema::hasColumn('purchase_entries', 'igst_percent')) {
                    $table->decimal('igst_percent', 5, 2)->nullable()->default(0)->after('sgst_amount');
                }
                if (!Schema::hasColumn('purchase_entries', 'igst_amount')) {
                    $table->decimal('igst_amount', 12, 2)->nullable()->default(0)->after('igst_percent');
                }
                if (!Schema::hasColumn('purchase_entries', 'total_tax_amount')) {
                    $table->decimal('total_tax_amount', 12, 2)->nullable()->default(0)->after('igst_amount');
                }
                if (!Schema::hasColumn('purchase_entries', 'credit_days')) {
                    $table->integer('credit_days')->nullable()->default(0)->after('purchase_date');
                }
                if (!Schema::hasColumn('purchase_entries', 'due_date')) {
                    $table->date('due_date')->nullable()->after('credit_days');
                }
                if (!Schema::hasColumn('purchase_entries', 'payment_status')) {
                    $table->string('payment_status', 50)->default('unpaid')->after('total_amount');
                }
                if (!Schema::hasColumn('purchase_entries', 'paid_amount')) {
                    $table->decimal('paid_amount', 12, 2)->nullable()->default(0)->after('payment_status');
                }
            });
        }

        // 2. Create gold_rates table for storing daily historical gold rates and periodic report printing
        if (!Schema::hasTable('gold_rates')) {
            Schema::create('gold_rates', function (Blueprint $table) {
                $table->id();
                $table->date('rate_date')->unique();
                $table->decimal('gold_24k_10g', 10, 2);
                $table->decimal('gold_24k_1g', 10, 2);
                $table->decimal('gold_22k_10g', 10, 2);
                $table->decimal('gold_22k_1g', 10, 2);
                $table->decimal('gold_18k_1g', 10, 2)->nullable();
                $table->decimal('silver_1kg', 10, 2)->nullable();
                $table->decimal('silver_1g', 10, 2)->nullable();
                $table->string('source', 50)->default('manual'); // 'manual' or 'api'
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('purchase_entries')) {
            Schema::table('purchase_entries', function (Blueprint $table) {
                $cols = [
                    'wastage_percent',
                    'cgst_percent',
                    'cgst_amount',
                    'sgst_percent',
                    'sgst_amount',
                    'igst_percent',
                    'igst_amount',
                    'total_tax_amount',
                    'credit_days',
                    'due_date',
                    'payment_status',
                    'paid_amount'
                ];
                foreach ($cols as $col) {
                    if (Schema::hasColumn('purchase_entries', $col)) {
                        $table->dropColumn($col);
                    }
                }
            });
        }

        Schema::dropIfExists('gold_rates');
    }
};
