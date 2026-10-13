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
        // 1. Create parent job_orders table
        if (!Schema::hasTable('job_orders')) {
            Schema::create('job_orders', function (Blueprint $table) {
                $table->id();
                $table->string('job_order_number', 50)->unique();
                $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
                $table->string('customer_name')->nullable();
                $table->date('order_date');
                $table->date('delivery_date')->nullable();
                $table->string('status', 50)->default('ongoing'); // ongoing, in_progress, pending_qc, partially_completed, rework, completed, cancelled
                $table->integer('total_jobs_count')->default(0);
                $table->decimal('total_allotted_weight', 10, 3)->default(0);
                $table->decimal('total_completed_weight', 10, 3)->default(0);
                $table->decimal('total_pending_weight', 10, 3)->default(0);
                $table->decimal('total_making_charges', 12, 2)->default(0);
                $table->decimal('total_price', 12, 2)->default(0);
                $table->text('notes')->nullable();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
                $table->softDeletes();
            });
        }

        // 2. Add job_order_id and job_number to work_orders table
        Schema::table('work_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('work_orders', 'job_order_id')) {
                $table->foreignId('job_order_id')->nullable()->after('id')->constrained('job_orders')->nullOnDelete();
            }
            if (!Schema::hasColumn('work_orders', 'job_number')) {
                $table->string('job_number', 50)->nullable()->after('work_order_number');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('work_orders', function (Blueprint $table) {
            if (Schema::hasColumn('work_orders', 'job_order_id')) {
                $table->dropForeign(['job_order_id']);
                $table->dropColumn('job_order_id');
            }
            if (Schema::hasColumn('work_orders', 'job_number')) {
                $table->dropColumn('job_number');
            }
        });

        Schema::dropIfExists('job_orders');
    }
};
