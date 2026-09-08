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
        Schema::table('categories', function (Blueprint $table) {
            $table->json('form_schema')->nullable()->after('status');
        });

        Schema::table('subcategories', function (Blueprint $table) {
            $table->json('form_schema')->nullable()->after('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('form_schema');
        });

        Schema::table('subcategories', function (Blueprint $table) {
            $table->dropColumn('form_schema');
        });
    }
};
