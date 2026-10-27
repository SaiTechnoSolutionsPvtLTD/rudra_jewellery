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
        Schema::create('supplier_settlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('supplier_id')->constrained('suppliers')->onDelete('cascade');
            $table->foreignId('purchase_entry_id')->nullable()->constrained('purchase_entries')->nullOnDelete();
            $table->string('settlement_type', 20)->default('cash'); // 'cash' or 'gold' or 'silver'
            $table->decimal('amount', 14, 2)->default(0.00); // For cash settlements
            $table->decimal('weight', 12, 3)->default(0.000); // For metal settlements (physical weight)
            $table->string('purity', 50)->nullable(); // e.g. 24K, 22K, 18K
            $table->decimal('touch', 6, 3)->nullable(); // Touch %
            $table->decimal('fine_weight', 12, 3)->default(0.000); // 24K pure gold equivalent weight settled
            $table->string('payment_mode', 50)->nullable(); // cash, bank, cheque, upi, physical_gold, bullion
            $table->string('reference_no', 100)->nullable();
            $table->date('settlement_date');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplier_settlements');
    }
};
