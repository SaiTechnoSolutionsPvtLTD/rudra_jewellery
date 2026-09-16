<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sale_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('product_name');
            $table->string('product_code')->nullable();
            $table->decimal('quantity', 10, 3)->default(1);
            $table->decimal('gross_weight', 12, 3)->default(0);
            $table->decimal('net_weight', 12, 3)->default(0);
            $table->decimal('stone_weight', 12, 3)->default(0);
            $table->decimal('purity', 8, 3)->nullable();
            $table->decimal('rate', 12, 2)->default(0);
            $table->decimal('making_charge', 12, 2)->default(0);
            $table->decimal('labour_charge', 12, 2)->default(0);
            $table->decimal('stone_charge', 12, 2)->default(0);
            $table->decimal('diamond_charge', 12, 2)->default(0);
            $table->decimal('other_charge', 12, 2)->default(0);
            $table->decimal('line_total', 12, 2)->default(0);
            $table->decimal('cost_amount', 12, 2)->default(0);
            $table->json('details')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sale_items');
    }
};
