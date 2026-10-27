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
        // 1. Add invoice_id to work_order_received_pieces
        if (Schema::hasTable('work_order_received_pieces')) {
            Schema::table('work_order_received_pieces', function (Blueprint $table) {
                if (!Schema::hasColumn('work_order_received_pieces', 'invoice_id')) {
                    $table->foreignId('invoice_id')->nullable()->after('product_id')->constrained('invoices')->nullOnDelete();
                }
            });
        }

        // 2. Add invoice_id to work_orders
        if (Schema::hasTable('work_orders')) {
            Schema::table('work_orders', function (Blueprint $table) {
                if (!Schema::hasColumn('work_orders', 'invoice_id')) {
                    $table->foreignId('invoice_id')->nullable()->after('client_id')->constrained('invoices')->nullOnDelete();
                }
            });
        }

        // 3. Ensure gold_rates table has gold_18k_1g, source, and notes
        if (Schema::hasTable('gold_rates')) {
            Schema::table('gold_rates', function (Blueprint $table) {
                if (!Schema::hasColumn('gold_rates', 'gold_18k_1g')) {
                    $table->decimal('gold_18k_1g', 10, 2)->nullable()->after('gold_22k_1g');
                }
                if (!Schema::hasColumn('gold_rates', 'source')) {
                    $table->string('source', 50)->default('automatic')->after('silver_1g');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('work_order_received_pieces')) {
            Schema::table('work_order_received_pieces', function (Blueprint $table) {
                if (Schema::hasColumn('work_order_received_pieces', 'invoice_id')) {
                    $table->dropForeign(['invoice_id']);
                    $table->dropColumn('invoice_id');
                }
            });
        }

        if (Schema::hasTable('work_orders')) {
            Schema::table('work_orders', function (Blueprint $table) {
                if (Schema::hasColumn('work_orders', 'invoice_id')) {
                    $table->dropForeign(['invoice_id']);
                    $table->dropColumn('invoice_id');
                }
            });
        }
    }
};
