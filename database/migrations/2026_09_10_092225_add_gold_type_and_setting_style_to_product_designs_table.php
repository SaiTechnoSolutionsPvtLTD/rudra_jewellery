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
            $table->string('gold_type')->nullable()->after('net_wt');
            $table->string('setting_style')->nullable()->after('gold_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_designs', function (Blueprint $table) {
            $table->dropColumn(['gold_type', 'setting_style']);
        });
    }
};
