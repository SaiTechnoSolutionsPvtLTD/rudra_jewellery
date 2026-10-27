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
        Schema::table('work_order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('work_order_items', 'return_reason')) {
                $table->text('return_reason')->nullable()->after('rework_qty');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_order_items', function (Blueprint $table) {
            if (Schema::hasColumn('work_order_items', 'return_reason')) {
                $table->dropColumn('return_reason');
            }
        });
    }
};
