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
        Schema::create('diamond_ranges', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique();
            $table->decimal('min_ct', 8, 3)->nullable();
            $table->decimal('max_ct', 8, 3)->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Seed initial diamond weight ranges
        $defaultRanges = [
            [
                'name' => 'Under 1 Carat',
                'code' => 'under_1',
                'min_ct' => 0.000,
                'max_ct' => 1.000,
                'description' => 'Solitaires and diamonds weighing less than 1.00 Carat',
            ],
            [
                'name' => '1 – 2 Carat',
                'code' => '1_to_2',
                'min_ct' => 1.000,
                'max_ct' => 2.000,
                'description' => 'Diamonds weighing between 1.00 and 2.00 Carat',
            ],
            [
                'name' => 'Above 2 Carat',
                'code' => 'above_2',
                'min_ct' => 2.000,
                'max_ct' => null,
                'description' => 'High carat statement diamonds exceeding 2.00 Carat',
            ],
        ];

        foreach ($defaultRanges as $range) {
            DB::table('diamond_ranges')->insertOrIgnore([
                'name' => $range['name'],
                'code' => $range['code'],
                'min_ct' => $range['min_ct'],
                'max_ct' => $range['max_ct'],
                'description' => $range['description'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('diamond_ranges');
    }
};
