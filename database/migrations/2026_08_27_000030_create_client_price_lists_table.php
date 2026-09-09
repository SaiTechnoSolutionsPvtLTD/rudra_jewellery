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
        Schema::create('client_price_lists', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_id')->constrained('clients')->onDelete('cascade');
            $table->string('version')->default('01');
            $table->string('status')->default('active');
            $table->date('effective_from')->nullable();
            $table->string('effective_to')->nullable()->default('Open / Till Updated');
            $table->json('diamond_stone_rates')->nullable();
            $table->json('color_stone_charges')->nullable();
            $table->json('additional_charges')->nullable();
            $table->json('making_charges')->nullable();
            $table->json('stamping_instructions')->nullable();
            $table->json('payment_terms')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('client_price_lists');
    }
};
