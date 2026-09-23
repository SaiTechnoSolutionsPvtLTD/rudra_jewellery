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
        Schema::create('raw_materials', function (Blueprint $table) {
            $table->id();
            $table->string('material_type')->unique(); // 'gold', 'silver', 'diamond', 'stone'
            $table->string('name');
            $table->decimal('purchased_weight', 14, 3)->default(0);
            $table->decimal('allocated_weight', 14, 3)->default(0);
            $table->decimal('current_balance', 14, 3)->default(0);
            $table->string('unit')->default('g'); // 'kg', 'g', 'ct', 'units'
            $table->timestamps();
        });

        // Insert initial baseline raw material records
        DB::table('raw_materials')->insert([
            [
                'material_type' => 'gold',
                'name' => 'Raw Gold',
                'purchased_weight' => 15.000,
                'allocated_weight' => 2.600,
                'current_balance' => 12.400, // in kg
                'unit' => 'kg',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'material_type' => 'diamond',
                'name' => 'Raw Diamond',
                'purchased_weight' => 50.000,
                'allocated_weight' => 7.500,
                'current_balance' => 42.500, // in ct
                'unit' => 'ct',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'material_type' => 'stone',
                'name' => 'Raw Precious Stones',
                'purchased_weight' => 1000.000,
                'allocated_weight' => 120.000,
                'current_balance' => 880.000, // in units
                'unit' => 'units',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'material_type' => 'silver',
                'name' => 'Raw Silver',
                'purchased_weight' => 15.000,
                'allocated_weight' => 2.200,
                'current_balance' => 12.800, // in kg
                'unit' => 'kg',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('raw_materials');
    }
};
