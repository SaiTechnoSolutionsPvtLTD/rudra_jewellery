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
        // Modify tag_number to be nullable for pieces awaiting receiving and tag generation
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `work_order_received_pieces` MODIFY `tag_number` VARCHAR(60) NULL;");
        } else {
            Schema::table('work_order_received_pieces', function (Blueprint $table) {
                $table->string('tag_number', 60)->nullable()->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE `work_order_received_pieces` MODIFY `tag_number` VARCHAR(60) NOT NULL;");
        }
    }
};
