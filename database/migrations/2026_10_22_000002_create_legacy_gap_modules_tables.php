<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Old Gold Exchange against Sales Invoices
        if (!Schema::hasTable('invoice_old_golds')) {
            Schema::create('invoice_old_golds', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('invoice_id');
                $table->string('item_description')->default('Old Gold Jewellery');
                $table->decimal('gross_weight', 12, 3)->default(0.000);
                $table->decimal('melting_loss', 12, 3)->default(0.000);
                $table->decimal('net_weight', 12, 3)->default(0.000);
                $table->decimal('purity_touch', 6, 2)->default(0.00); // e.g. 75.00, 91.60
                $table->decimal('fine_weight', 12, 3)->default(0.000);
                $table->decimal('rate_per_gram', 12, 2)->default(0.00);
                $table->decimal('total_credit', 12, 2)->default(0.00);
                $table->string('notes')->nullable();
                $table->timestamps();

                $table->foreign('invoice_id')->references('id')->on('invoices')->onDelete('cascade');
                $table->index('invoice_id');
            });
        }

        // Add old_gold_amount to invoices if not present
        if (Schema::hasTable('invoices') && !Schema::hasColumn('invoices', 'old_gold_amount')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->decimal('old_gold_amount', 12, 2)->default(0.00)->after('paid_amount');
            });
        }

        // 2. Customer Approval / Jangad Memos
        if (!Schema::hasTable('approval_memos')) {
            Schema::create('approval_memos', function (Blueprint $table) {
                $table->id();
                $table->string('memo_number')->unique();
                $table->unsignedBigInteger('client_id');
                $table->string('client_name');
                $table->date('memo_date');
                $table->date('due_date')->nullable();
                $table->string('status')->default('pending'); // pending, returned, converted_to_sale, partial
                $table->integer('total_pieces')->default(0);
                $table->decimal('total_weight', 12, 3)->default(0.000);
                $table->decimal('estimated_value', 12, 2)->default(0.00);
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('client_id')->references('id')->on('clients')->onDelete('cascade');
                $table->index('client_id');
                $table->index('status');
            });
        }

        if (!Schema::hasTable('approval_memo_items')) {
            Schema::create('approval_memo_items', function (Blueprint $table) {
                $table->id();
                $table->unsignedBigInteger('approval_memo_id');
                $table->unsignedBigInteger('piece_id');
                $table->string('tag_number');
                $table->unsignedBigInteger('product_id')->nullable();
                $table->string('product_name');
                $table->decimal('gross_weight', 12, 3)->default(0.000);
                $table->decimal('net_weight', 12, 3)->default(0.000);
                $table->decimal('estimated_price', 12, 2)->default(0.00);
                $table->string('status')->default('pending'); // pending, returned, sold
                $table->dateTime('returned_at')->nullable();
                $table->dateTime('sold_at')->nullable();
                $table->unsignedBigInteger('invoice_id')->nullable();
                $table->timestamps();

                $table->foreign('approval_memo_id')->references('id')->on('approval_memos')->onDelete('cascade');
                $table->foreign('piece_id')->references('id')->on('work_order_received_pieces')->onDelete('cascade');
                $table->index('approval_memo_id');
                $table->index('piece_id');
                $table->index('status');
            });
        }

        // 3. Customer Jewellery Repair Management
        if (!Schema::hasTable('repairs')) {
            Schema::create('repairs', function (Blueprint $table) {
                $table->id();
                $table->string('repair_number')->unique();
                $table->unsignedBigInteger('client_id');
                $table->string('client_name');
                $table->date('intake_date');
                $table->date('promised_date')->nullable();
                $table->string('item_description');
                $table->decimal('intake_weight', 12, 3)->default(0.000);
                $table->string('status')->default('received'); // received, assigned, in_progress, ready, delivered
                $table->unsignedBigInteger('karigar_id')->nullable();
                $table->string('karigar_name')->nullable();
                $table->decimal('added_metal_weight', 12, 3)->default(0.000);
                $table->decimal('added_metal_cost', 12, 2)->default(0.00);
                $table->decimal('labour_charges', 12, 2)->default(0.00);
                $table->decimal('stone_charges', 12, 2)->default(0.00);
                $table->decimal('total_charges', 12, 2)->default(0.00);
                $table->decimal('advance_paid', 12, 2)->default(0.00);
                $table->decimal('balance_due', 12, 2)->default(0.00);
                $table->text('notes')->nullable();
                $table->timestamps();

                $table->foreign('client_id')->references('id')->on('clients')->onDelete('cascade');
                $table->index('client_id');
                $table->index('status');
                $table->index('karigar_id');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('repairs');
        Schema::dropIfExists('approval_memo_items');
        Schema::dropIfExists('approval_memos');
        if (Schema::hasTable('invoices') && Schema::hasColumn('invoices', 'old_gold_amount')) {
            Schema::table('invoices', function (Blueprint $table) {
                $table->dropColumn('old_gold_amount');
            });
        }
        Schema::dropIfExists('invoice_old_golds');
    }
};
