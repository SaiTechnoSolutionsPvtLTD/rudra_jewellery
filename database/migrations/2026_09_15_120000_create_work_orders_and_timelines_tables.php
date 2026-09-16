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
        Schema::create('work_orders', function (Blueprint $table) {
            $table->id();
            $table->string('work_order_number', 50)->unique();
            $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('product_name');
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->foreignId('subcategory_id')->nullable()->constrained('subcategories')->nullOnDelete();
            $table->foreignId('karigar_id')->nullable()->constrained('karigars')->nullOnDelete();
            $table->string('karigar_name')->nullable();
            $table->string('material_type', 100)->default('Gold 22K (916)');
            $table->string('priority', 50)->default('Normal');
            $table->date('allotted_date');
            $table->date('delivery_date')->nullable();
            
            // Weights (decimal 10, 3)
            $table->decimal('allotted_weight', 10, 3)->default(0);
            $table->decimal('completed_weight', 10, 3)->default(0);
            $table->decimal('pending_weight', 10, 3)->default(0);
            $table->decimal('expected_return_weight', 10, 3)->nullable()->default(0);
            $table->decimal('wastage_allowed_percent', 5, 2)->default(0);
            $table->decimal('wastage_weight', 10, 3)->default(0);

            // Financials
            $table->decimal('making_charge_per_gram', 10, 2)->default(0);
            $table->decimal('total_making_charges', 12, 2)->default(0);
            $table->decimal('total_price', 12, 2)->default(0);

            // Stage & Status Progression
            // stages: created, allocated, received_by_artisan, work_started, work_in_progress, work_completed, sent_for_approval, quality_check, approved, ready, delivered, final_received
            $table->string('current_stage', 60)->default('created');
            // status: ongoing, pending_approval, approved, returned, ready, completed, cancelled
            $table->string('status', 50)->default('ongoing');

            // Quality & Approval
            $table->string('quality_status', 50)->nullable()->default('pending');
            $table->text('quality_notes')->nullable();
            $table->foreignId('quality_checked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('quality_checked_at')->nullable();
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('approved_at')->nullable();

            // Return Details
            $table->text('return_reason')->nullable();
            $table->string('returned_by')->nullable();
            $table->date('return_date')->nullable();
            $table->decimal('returned_weight', 10, 3)->nullable()->default(0);

            // JSON Structures for stones, checklist, pricing details
            $table->json('checklist')->nullable();
            $table->json('stone_details')->nullable();
            $table->json('pricing_details')->nullable();

            // Specifications & Metadata
            $table->string('design_code', 100)->nullable();
            $table->longText('image_url')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('work_order_timelines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('work_order_id')->constrained('work_orders')->cascadeOnDelete();
            $table->string('stage', 60);
            $table->string('stage_label', 100);
            $table->decimal('completed_weight_at_step', 10, 3)->nullable();
            $table->decimal('pending_weight_at_step', 10, 3)->nullable();
            $table->string('status', 50)->default('completed');
            $table->text('notes')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('action_by_name')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_order_timelines');
        Schema::dropIfExists('work_orders');
    }
};
