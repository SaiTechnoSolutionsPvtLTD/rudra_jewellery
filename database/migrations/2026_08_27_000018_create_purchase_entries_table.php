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
        Schema::create('purchase_entries', function (Blueprint $table) {
            $table->id();
            $table->string('purchase_no')->unique();
            $table->foreignId('supplier_id')->constrained('suppliers')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            $table->integer('qty')->default(1);
            $table->decimal('weight', 10, 3)->default(0.000);
            $table->decimal('touch', 5, 2)->default(100.00);
            $table->decimal('fine_weight', 10, 3)->default(0.000);
            $table->decimal('rate', 12, 2)->default(0.00);
            $table->decimal('total_amount', 14, 2)->default(0.00);
            $table->date('purchase_date');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_entries');
    }
};
