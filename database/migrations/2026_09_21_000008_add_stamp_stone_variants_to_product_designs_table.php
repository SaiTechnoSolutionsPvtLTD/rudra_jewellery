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
        Schema::table('product_designs', function (Blueprint $table) {
            $table->string('stamp')->nullable()->after('setting_style');
            $table->string('stone_size')->nullable()->after('stamp');
            $table->string('stone_color')->nullable()->after('stone_size');
            $table->json('variants')->nullable()->after('stone_color');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_designs', function (Blueprint $table) {
            $table->dropColumn(['stamp', 'stone_size', 'stone_color', 'variants']);
        });
    }
};
