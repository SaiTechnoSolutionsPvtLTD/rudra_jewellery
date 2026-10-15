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
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `purchase_entries` MODIFY `stone_weight` DECIMAL(10, 3) NULL DEFAULT 0.000;");
            DB::statement("ALTER TABLE `purchase_entries` MODIFY `making_charge` DECIMAL(12, 2) NULL DEFAULT 0.00;");
            DB::statement("ALTER TABLE `purchase_entries` MODIFY `stone_cost` DECIMAL(12, 2) NULL DEFAULT 0.00;");
            DB::statement("ALTER TABLE `purchase_entries` MODIFY `less_weight` DECIMAL(10, 3) NULL DEFAULT 0.000;");
        } else {
            Schema::table('purchase_entries', function (Blueprint $table) {
                $table->decimal('stone_weight', 10, 3)->nullable()->default(0.000)->change();
                $table->decimal('making_charge', 12, 2)->nullable()->default(0.00)->change();
                $table->decimal('stone_cost', 12, 2)->nullable()->default(0.00)->change();
                $table->decimal('less_weight', 10, 3)->nullable()->default(0.000)->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `purchase_entries` MODIFY `stone_weight` DECIMAL(10, 3) NOT NULL DEFAULT 0.000;");
            DB::statement("ALTER TABLE `purchase_entries` MODIFY `making_charge` DECIMAL(12, 2) NOT NULL DEFAULT 0.00;");
            DB::statement("ALTER TABLE `purchase_entries` MODIFY `stone_cost` DECIMAL(12, 2) NOT NULL DEFAULT 0.00;");
            DB::statement("ALTER TABLE `purchase_entries` MODIFY `less_weight` DECIMAL(10, 3) NOT NULL DEFAULT 0.000;");
        }
    }
};
