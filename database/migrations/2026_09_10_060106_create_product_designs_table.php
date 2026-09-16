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
        Schema::create('product_designs', function (Blueprint $table) {
            $table->id();
            $table->string('design_no')->unique();
            $table->string('image_path');
            $table->string('dia_wt_ct')->nullable();
            $table->decimal('net_wt', 8, 3)->nullable();
            $table->string('status')->default('Uploaded');
            $table->string('category')->nullable();
            $table->string('purity')->nullable();
            $table->string('stone_type')->nullable();
            $table->string('size')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('product_designs');
    }
};
