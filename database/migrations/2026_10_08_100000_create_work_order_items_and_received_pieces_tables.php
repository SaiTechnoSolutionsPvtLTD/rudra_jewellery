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
        // 1. Add quantity tracking, certification, hallmarking, and delay columns to work_orders
        Schema::table('work_orders', function (Blueprint $table) {
            if (!Schema::hasColumn('work_orders', 'required_qty')) {
                $table->integer('required_qty')->default(1)->after('priority');
            }
            if (!Schema::hasColumn('work_orders', 'completed_qty')) {
                $table->integer('completed_qty')->default(0)->after('required_qty');
            }
            if (!Schema::hasColumn('work_orders', 'qc_pending_qty')) {
                $table->integer('qc_pending_qty')->default(0)->after('completed_qty');
            }
            if (!Schema::hasColumn('work_orders', 'qc_approved_qty')) {
                $table->integer('qc_approved_qty')->default(0)->after('qc_pending_qty');
            }
            if (!Schema::hasColumn('work_orders', 'rework_qty')) {
                $table->integer('rework_qty')->default(0)->after('qc_approved_qty');
            }
            if (!Schema::hasColumn('work_orders', 'ready_qty')) {
                $table->integer('ready_qty')->default(0)->after('rework_qty');
            }
            if (!Schema::hasColumn('work_orders', 'certified_qty')) {
                $table->integer('certified_qty')->default(0)->after('ready_qty');
            }
            if (!Schema::hasColumn('work_orders', 'hallmarked_qty')) {
                $table->integer('hallmarked_qty')->default(0)->after('certified_qty');
            }
            if (!Schema::hasColumn('work_orders', 'received_qty')) {
                $table->integer('received_qty')->default(0)->after('hallmarked_qty');
            }

            // Certification tracking
            if (!Schema::hasColumn('work_orders', 'certification_status')) {
                $table->string('certification_status', 50)->nullable()->default(null)->after('approved_at');
            }
            if (!Schema::hasColumn('work_orders', 'certification_details')) {
                $table->json('certification_details')->nullable()->after('certification_status');
            }
            if (!Schema::hasColumn('work_orders', 'certification_updated_by')) {
                $table->foreignId('certification_updated_by')->nullable()->after('certification_details')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('work_orders', 'certification_updated_at')) {
                $table->timestamp('certification_updated_at')->nullable()->after('certification_updated_by');
            }

            // Hallmarking tracking
            if (!Schema::hasColumn('work_orders', 'hallmarking_status')) {
                $table->string('hallmarking_status', 50)->nullable()->default(null)->after('certification_updated_at');
            }
            if (!Schema::hasColumn('work_orders', 'hallmarking_details')) {
                $table->json('hallmarking_details')->nullable()->after('hallmarking_status');
            }
            if (!Schema::hasColumn('work_orders', 'hallmarking_updated_by')) {
                $table->foreignId('hallmarking_updated_by')->nullable()->after('hallmarking_details')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('work_orders', 'hallmarking_updated_at')) {
                $table->timestamp('hallmarking_updated_at')->nullable()->after('hallmarking_updated_by');
            }

            // Delay tracking
            if (!Schema::hasColumn('work_orders', 'is_delayed')) {
                $table->boolean('is_delayed')->default(false)->after('hallmarking_updated_at');
            }
            if (!Schema::hasColumn('work_orders', 'delay_days')) {
                $table->integer('delay_days')->nullable()->default(0)->after('is_delayed');
            }
            if (!Schema::hasColumn('work_orders', 'delay_reason')) {
                $table->string('delay_reason', 255)->nullable()->after('delay_days');
            }
            if (!Schema::hasColumn('work_orders', 'delay_remarks')) {
                $table->text('delay_remarks')->nullable()->after('delay_reason');
            }
            if (!Schema::hasColumn('work_orders', 'delay_updated_by')) {
                $table->foreignId('delay_updated_by')->nullable()->after('delay_remarks')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('work_orders', 'delay_updated_at')) {
                $table->timestamp('delay_updated_at')->nullable()->after('delay_updated_by');
            }
        });

        // 2. Create work_order_items table
        if (!Schema::hasTable('work_order_items')) {
            Schema::create('work_order_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('work_order_id')->constrained('work_orders')->cascadeOnDelete();
                $table->foreignId('job_order_id')->nullable()->constrained('job_orders')->nullOnDelete();
                $table->string('design_no', 100);
                $table->string('product_name', 255)->nullable();
                $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
                $table->foreignId('subcategory_id')->nullable()->constrained('subcategories')->nullOnDelete();
                $table->string('item_code', 100)->nullable();
                $table->integer('required_qty')->default(1);
                $table->integer('completed_qty')->default(0);
                $table->integer('qc_pending_qty')->default(0);
                $table->integer('qc_approved_qty')->default(0);
                $table->integer('rework_qty')->default(0);
                $table->integer('ready_qty')->default(0);
                $table->integer('certified_qty')->default(0);
                $table->integer('hallmarked_qty')->default(0);
                $table->integer('received_qty')->default(0);
                $table->decimal('allotted_weight', 10, 3)->default(0);
                $table->decimal('completed_weight', 10, 3)->default(0);
                $table->decimal('making_charge_per_gram', 10, 2)->default(0);
                $table->decimal('total_making_charges', 12, 2)->default(0);
                $table->json('stone_details')->nullable();
                $table->json('pricing_details')->nullable();
                $table->string('status', 50)->default('pending');
                $table->text('remarks')->nullable();
                $table->timestamps();
            });
        }

        // 3. Create work_order_received_pieces table
        if (!Schema::hasTable('work_order_received_pieces')) {
            Schema::create('work_order_received_pieces', function (Blueprint $table) {
                $table->id();
                $table->foreignId('work_order_id')->constrained('work_orders')->cascadeOnDelete();
                $table->foreignId('work_order_item_id')->nullable()->constrained('work_order_items')->cascadeOnDelete();
                $table->string('tag_number', 60)->nullable()->unique()->index();
                $table->integer('piece_number')->default(1);
                $table->string('design_no', 100)->index();
                $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
                $table->string('product_name', 255)->nullable();
                $table->foreignId('client_id')->nullable()->constrained('clients')->nullOnDelete();
                $table->foreignId('karigar_id')->nullable()->constrained('karigars')->nullOnDelete();
                $table->decimal('gross_weight', 10, 3)->default(0);
                $table->decimal('old_weight', 10, 3)->nullable()->default(0);
                $table->decimal('net_gold_weight', 10, 3)->default(0);
                $table->decimal('purity', 6, 2)->default(91.60); // Touch % e.g. 91.60
                $table->decimal('pure_24k_weight', 10, 3)->default(0);
                $table->decimal('silver_weight', 10, 3)->default(0);
                $table->decimal('diamond_weight', 10, 3)->default(0);
                $table->integer('diamond_count')->default(0);
                $table->decimal('color_stone_weight', 10, 3)->default(0);
                $table->decimal('making_charge_per_gram', 10, 2)->default(0);
                $table->decimal('total_making_charge', 12, 2)->default(0);
                $table->decimal('given_metal_qty', 10, 3)->default(0);
                $table->decimal('given_cash', 12, 2)->default(0);
                $table->string('huid', 50)->nullable();
                $table->string('certificate_no', 50)->nullable();
                $table->text('description')->nullable();
                $table->string('image_path', 255)->nullable();
                $table->timestamp('received_at')->nullable();
                $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
                $table->timestamps();
            });
        }

        // 4. Backfill existing work orders into work_order_items and sync initial quantities
        try {
            $existingWorkOrders = DB::table('work_orders')->get();
            foreach ($existingWorkOrders as $wo) {
                // Determine required_qty from pricing_details or need_pcs
                $reqQty = 1;
                if (!empty($wo->pricing_details)) {
                    $pd = json_decode($wo->pricing_details, true);
                    if (is_array($pd) && !empty($pd['need_pcs'])) {
                        $reqQty = max(1, (int)$pd['need_pcs']);
                    }
                }

                $designNo = $wo->design_code ?: 'D-'.str_pad($wo->id, 4, '0', STR_PAD_LEFT);
                $isCompleted = in_array($wo->current_stage, ['completed', 'final_received', 'delivered']) || in_array($wo->status, ['completed', 'final_received']);
                $isReady = in_array($wo->current_stage, ['ready', 'approved', 'certified', 'hallmarked']);
                $isQc = in_array($wo->current_stage, ['quality_check', 'sent_for_approval']);

                $compQty = $isCompleted ? $reqQty : ($isReady ? $reqQty : 0);
                $readyQty = $isReady && !$isCompleted ? $reqQty : 0;
                $qcPendingQty = $isQc ? $reqQty : 0;
                $receivedQty = $isCompleted ? $reqQty : 0;

                DB::table('work_orders')->where('id', $wo->id)->update([
                    'required_qty' => $reqQty,
                    'completed_qty' => $compQty,
                    'qc_pending_qty' => $qcPendingQty,
                    'ready_qty' => $readyQty,
                    'received_qty' => $receivedQty,
                ]);

                // Create default work_order_item if none exists
                $itemExists = DB::table('work_order_items')->where('work_order_id', $wo->id)->exists();
                if (!$itemExists) {
                    DB::table('work_order_items')->insert([
                        'work_order_id' => $wo->id,
                        'job_order_id' => $wo->job_order_id,
                        'design_no' => $designNo,
                        'product_name' => $wo->product_name ?: 'Jewellery Item',
                        'category_id' => $wo->category_id,
                        'subcategory_id' => $wo->subcategory_id,
                        'item_code' => $wo->design_code,
                        'required_qty' => $reqQty,
                        'completed_qty' => $compQty,
                        'qc_pending_qty' => $qcPendingQty,
                        'ready_qty' => $readyQty,
                        'received_qty' => $receivedQty,
                        'allotted_weight' => $wo->allotted_weight ?: 0,
                        'completed_weight' => $wo->completed_weight ?: 0,
                        'making_charge_per_gram' => $wo->making_charge_per_gram ?: 0,
                        'total_making_charges' => $wo->total_making_charges ?: 0,
                        'stone_details' => $wo->stone_details,
                        'pricing_details' => $wo->pricing_details,
                        'status' => $wo->status ?: 'ongoing',
                        'created_at' => $wo->created_at ?: now(),
                        'updated_at' => $wo->updated_at ?: now(),
                    ]);
                }
            }
        } catch (\Throwable $e) {
            // Log but don't halt migration if backfill has edge cases
            logger()->warning('Work orders backfill notice: ' . $e->getMessage());
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('work_order_received_pieces');
        Schema::dropIfExists('work_order_items');

        Schema::table('work_orders', function (Blueprint $table) {
            $table->dropColumn([
                'required_qty',
                'completed_qty',
                'qc_pending_qty',
                'qc_approved_qty',
                'rework_qty',
                'ready_qty',
                'certified_qty',
                'hallmarked_qty',
                'received_qty',
                'certification_status',
                'certification_details',
                'certification_updated_by',
                'certification_updated_at',
                'hallmarking_status',
                'hallmarking_details',
                'hallmarking_updated_by',
                'hallmarking_updated_at',
                'is_delayed',
                'delay_days',
                'delay_reason',
                'delay_remarks',
                'delay_updated_by',
                'delay_updated_at',
            ]);
        });
    }
};
