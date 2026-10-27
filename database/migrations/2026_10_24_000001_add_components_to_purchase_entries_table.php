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
        Schema::table('purchase_entries', function (Blueprint $table) {
            if (!Schema::hasColumn('purchase_entries', 'components')) {
                $table->json('components')->nullable()->after('notes');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_entries', function (Blueprint $table) {
            if (!Schema::hasColumn('purchase_entries', 'components')) {
                $table->dropColumn('components');
            }
        });
    }
};
