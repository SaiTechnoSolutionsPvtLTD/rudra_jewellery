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
        Schema::create('diamond_colors', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->nullable();
            $table->integer('sort_order')->default(0);
            $table->text('description')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();
        });

        Schema::create('diamond_clarities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->nullable();
            $table->integer('sort_order')->default(0);
            $table->text('description')->nullable();
            $table->string('status', 20)->default('active');
            $table->timestamps();
        });

        // Insert initial seed records for Diamond Colors
        DB::table('diamond_colors')->insert([
            ['name' => 'D (Colorless)', 'code' => 'D', 'sort_order' => 1, 'description' => 'Highest color grade, completely colorless.', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'E (Colorless)', 'code' => 'E', 'sort_order' => 2, 'description' => 'Colorless, minute traces of color detected by expert gemologists.', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'F (Colorless)', 'code' => 'F', 'sort_order' => 3, 'description' => 'Colorless grade with slight color evident only to trained eyes.', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'G (Near Colorless)', 'code' => 'G', 'sort_order' => 4, 'description' => 'Near colorless, exceptional value.', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'H (Near Colorless)', 'code' => 'H', 'sort_order' => 5, 'description' => 'Near colorless, slight warm undertone.', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'I (Slight Tint)', 'code' => 'I', 'sort_order' => 6, 'description' => 'Slightly tinted diamond.', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'J (Slight Tint)', 'code' => 'J', 'sort_order' => 7, 'description' => 'Slight yellow or brown tint.', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'Fancy Color', 'code' => 'FC', 'sort_order' => 8, 'description' => 'Vibrant fancy colored diamonds (Yellow, Pink, Blue).', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
        ]);

        // Insert initial seed records for Diamond Clarities
        DB::table('diamond_clarities')->insert([
            ['name' => 'FL / IF (Flawless / Internally Flawless)', 'code' => 'FL/IF', 'sort_order' => 1, 'description' => 'No internal or external inclusions visible under 10x magnification.', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'VVS1 (Very Very Slightly Included 1)', 'code' => 'VVS1', 'sort_order' => 2, 'description' => 'Extremely difficult to see inclusions under 10x magnification.', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'VVS2 (Very Very Slightly Included 2)', 'code' => 'VVS2', 'sort_order' => 3, 'description' => 'Very difficult to see inclusions under 10x magnification.', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'VS (VS1 / VS2)', 'code' => 'VS', 'sort_order' => 4, 'description' => 'Minor inclusions visible with effort under 10x magnification.', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'SI1 (Slightly Included 1)', 'code' => 'SI1', 'sort_order' => 5, 'description' => 'Noticeable inclusions under 10x magnification.', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'SI2 (Slightly Included 2)', 'code' => 'SI2', 'sort_order' => 6, 'description' => 'Easily visible inclusions under 10x magnification.', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
            ['name' => 'I1 / I2 (Included)', 'code' => 'I1/I2', 'sort_order' => 7, 'description' => 'Inclusions obvious under 10x magnification.', 'status' => 'active', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('diamond_clarities');
        Schema::dropIfExists('diamond_colors');
    }
};
