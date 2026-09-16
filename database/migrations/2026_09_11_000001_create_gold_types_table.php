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
        Schema::create('gold_types', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('purity')->nullable();
            $table->integer('sort_order')->default(0);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // Seed initial standard gold types
        $defaultTypes = ['14 Carat', '18 Carat', '22 Carat', '24 Carat'];
        foreach ($defaultTypes as $idx => $name) {
            DB::table('gold_types')->insertOrIgnore([
                'name' => $name,
                'sort_order' => $idx + 1,
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
        Schema::dropIfExists('gold_types');
    }
};
