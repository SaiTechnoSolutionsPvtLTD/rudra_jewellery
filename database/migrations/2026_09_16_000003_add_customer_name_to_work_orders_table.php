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
        if (Schema::hasTable('work_orders') && !Schema::hasColumn('work_orders', 'customer_name')) {
            Schema::table('work_orders', function (Blueprint $table) {
                $table->string('customer_name')->nullable()->after('client_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('work_orders') && Schema::hasColumn('work_orders', 'customer_name')) {
            Schema::table('work_orders', function (Blueprint $table) {
                $table->dropColumn('customer_name');
            });
        }
    }
};
