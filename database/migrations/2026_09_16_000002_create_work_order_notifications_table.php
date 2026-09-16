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
        if (!Schema::hasTable('work_order_notifications')) {
            Schema::create('work_order_notifications', function (Blueprint $table) {
                $table->id();
                $table->foreignId('work_order_id')->nullable()->constrained('work_orders')->cascadeOnDelete();
                $table->foreignId('karigar_id')->nullable()->constrained('karigars')->nullOnDelete();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('type', 60); // submitted, rework_resubmitted, returned, approved, assigned, update
                $table->string('title');
                $table->text('message');
                $table->json('data')->nullable();
                $table->boolean('is_read')->default(false);
                $table->timestamp('read_at')->nullable();
                $table->timestamps();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_order_notifications');
    }
};
