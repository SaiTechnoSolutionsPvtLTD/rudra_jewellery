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
        try {
            DB::statement('ALTER TABLE products MODIFY COLUMN image LONGTEXT NULL');
            DB::statement('ALTER TABLE products MODIFY COLUMN thumbnail LONGTEXT NULL');
        } catch (\Exception $e) {
            // Fallback for SQLite or other drivers
            Schema::table('products', function (Blueprint $table) {
                $table->longText('image')->nullable()->change();
                $table->longText('thumbnail')->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        try {
            DB::statement('ALTER TABLE products MODIFY COLUMN image VARCHAR(255) NULL');
            DB::statement('ALTER TABLE products MODIFY COLUMN thumbnail VARCHAR(255) NULL');
        } catch (\Exception $e) {
            Schema::table('products', function (Blueprint $table) {
                $table->string('image')->nullable()->change();
                $table->string('thumbnail')->nullable()->change();
            });
        }
    }
};
