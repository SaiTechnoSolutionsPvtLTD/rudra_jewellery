<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('work_order_operations')) {
            Schema::create('work_order_operations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('work_order_id')->constrained('work_orders')->cascadeOnDelete();
                $table->foreignId('work_order_item_id')->nullable()->constrained('work_order_items')->cascadeOnDelete();
                $table->string('operation_name', 100);
                $table->string('status', 50)->default('pending');
                $table->integer('processed_qty')->default(0);
                $table->decimal('weight_measurement', 10, 3)->nullable()->default(0);
                $table->string('assigned_staff', 255)->nullable();
                $table->text('remarks')->nullable();
                $table->timestamp('started_at')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('work_order_operations');
    }
};
