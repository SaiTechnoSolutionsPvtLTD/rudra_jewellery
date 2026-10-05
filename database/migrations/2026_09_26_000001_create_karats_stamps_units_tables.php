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
        if (!Schema::hasTable('karats')) {
            Schema::create('karats', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('code')->nullable();
                $table->integer('sort_order')->default(0);
                $table->text('description')->nullable();
                $table->timestamps();
            });

            // Seed default Karats
            $defaultKarats = [
                ['name' => '24K', 'code' => '24K', 'sort_order' => 1],
                ['name' => '22K', 'code' => '22K', 'sort_order' => 2],
                ['name' => '18K', 'code' => '18K', 'sort_order' => 3],
                ['name' => '14K', 'code' => '14K', 'sort_order' => 4],
                ['name' => '10K', 'code' => '10K', 'sort_order' => 5],
                ['name' => '9K',  'code' => '9K',  'sort_order' => 6],
            ];
            foreach ($defaultKarats as $k) {
                DB::table('karats')->insert(array_merge($k, ['created_at' => now(), 'updated_at' => now()]));
            }
        }

        if (!Schema::hasTable('stamps')) {
            Schema::create('stamps', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('code')->nullable();
                $table->integer('sort_order')->default(0);
                $table->text('description')->nullable();
                $table->timestamps();
            });

            // Seed default Stamps
            $defaultStamps = [
                ['name' => '916', 'code' => '916', 'sort_order' => 1],
                ['name' => '999', 'code' => '999', 'sort_order' => 2],
                ['name' => '750', 'code' => '750', 'sort_order' => 3],
                ['name' => '585', 'code' => '585', 'sort_order' => 4],
                ['name' => '925', 'code' => '925', 'sort_order' => 5],
                ['name' => 'BIS Hallmarked', 'code' => 'HM', 'sort_order' => 6],
            ];
            foreach ($defaultStamps as $s) {
                DB::table('stamps')->insert(array_merge($s, ['created_at' => now(), 'updated_at' => now()]));
            }
        }

        if (!Schema::hasTable('units')) {
            Schema::create('units', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('code')->nullable();
                $table->integer('sort_order')->default(0);
                $table->text('description')->nullable();
                $table->timestamps();
            });

            // Seed default Units
            $defaultUnits = [
                ['name' => 'Grams', 'code' => 'g', 'sort_order' => 1],
                ['name' => 'Carats', 'code' => 'ct', 'sort_order' => 2],
                ['name' => 'Milligrams', 'code' => 'mg', 'sort_order' => 3],
                ['name' => 'Pieces', 'code' => 'pcs', 'sort_order' => 4],
                ['name' => 'Kilograms', 'code' => 'kg', 'sort_order' => 5],
            ];
            foreach ($defaultUnits as $u) {
                DB::table('units')->insert(array_merge($u, ['created_at' => now(), 'updated_at' => now()]));
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('karats');
        Schema::dropIfExists('stamps');
        Schema::dropIfExists('units');
    }
};
