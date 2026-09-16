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
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_no')->unique();
            $table->unsignedBigInteger('client_id')->nullable();
            $table->string('client_name');
            $table->string('client_email')->nullable();
            $table->string('client_tier')->default('SILVER');
            $table->string('client_initials')->nullable();
            $table->date('invoice_date');
            $table->decimal('amount', 12, 2);
            $table->decimal('gst_rate', 5, 2)->default(5.00);
            $table->decimal('gst_amount', 12, 2);
            $table->decimal('total_amount', 12, 2);
            $table->enum('status', ['paid', 'pending', 'partial'])->default('paid');
            $table->string('invoice_type')->default('b2b_tax');
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('client_id')->references('id')->on('clients')->onDelete('set null');
        });

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
