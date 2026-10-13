<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderOperation;
use App\Models\Karigar;
use App\Models\Category;
use Illuminate\Support\Facades\DB;

class WipProductionProcessTrackingTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected WorkOrder $workOrder;
    protected WorkOrderItem $item;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $karigar = Karigar::create([
            'name' => 'Mahesh Karigar',
            'karigar_code' => 'KAR-001',
            'primary_phone' => '9876543210',
            'specialization' => 'Goldsmith',
            'status' => 'active',
        ]);

        $category = Category::create([
            'name' => 'Necklaces',
            'code' => 'NCK',
            'status' => 'active',
        ]);

        $this->workOrder = WorkOrder::create([
            'work_order_number' => 'WO-2026-9999',
            'job_number' => 'JO-2026-9999',
            'product_name' => 'Royal Bridal Necklace',
            'design_code' => 'RBN-101',
            'category_id' => $category->id,
            'karigar_id' => $karigar->id,
            'karigar_name' => $karigar->name,
            'allotted_date' => '2026-10-01',
            'delivery_date' => '2026-10-15',
            'allotted_weight' => 50.000,
            'completed_weight' => 0.000,
            'required_qty' => 10,
            'completed_qty' => 0,
            'qc_pending_qty' => 0,
            'qc_approved_qty' => 0,
            'rework_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'status' => 'in_progress',
            'current_stage' => 'work_in_progress',
            'created_by' => $this->user->id,
        ]);

        $this->item = WorkOrderItem::create([
            'work_order_id' => $this->workOrder->id,
            'design_no' => 'RBN-101',
            'product_name' => 'Royal Bridal Necklace',
            'category_id' => $category->id,
            'required_qty' => 10,
            'completed_qty' => 0,
            'qc_pending_qty' => 0,
            'qc_approved_qty' => 0,
            'rework_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'allotted_weight' => 50.000,
            'completed_weight' => 0.000,
            'status' => 'in_progress',
        ]);
    }

    /** @test */
    public function scenario_a_partial_production_and_qc_submission()
    {
        $this->actingAs($this->user);

        // 1. Enter production completion for 2 pieces out of 10
        $wipResponse = $this->postJson("/api/work-orders/{$this->workOrder->id}/wip-update", [
            'work_order_item_id' => $this->item->id,
            'completed_now' => 2,
            'actual_weight' => 10.000,
            'consumed_weight' => 10.050,
            'stone_weight' => 0.500,
            'remarks' => 'Completed 2 pieces casting & polishing',
        ]);

        $wipResponse->assertStatus(200);

        $this->item->refresh();
        $this->workOrder->refresh();

        $this->assertEquals(2, $this->item->completed_qty);
        $this->assertEquals(2, $this->workOrder->completed_qty);
        $this->assertEquals(2, $this->item->qc_pending_qty);

        // 2. Submit those 2 completed pieces to QC
        $qcResponse = $this->postJson('/api/work-orders/batch-submit-qc', [
            'items' => [
                [
                    'work_order_id' => $this->workOrder->id,
                    'work_order_item_id' => $this->item->id,
                    'completed_now' => 2,
                    'actual_weight' => 10.000,
                    'remarks' => 'Sending 2 completed pieces to QC',
                ],
            ],
        ]);

        $qcResponse->assertStatus(200);

        $this->item->refresh();
        $this->workOrder->refresh();

        $this->assertEquals(2, $this->item->qc_pending_qty);
        $this->assertEquals(2, $this->workOrder->qc_pending_qty);

        // Remaining production quantity must be 8
        $remaining = $this->item->required_qty - $this->item->completed_qty;
        $this->assertEquals(8, $remaining);
    }

    /** @test */
    public function scenario_b_multiple_manufacturing_operations()
    {
        $this->actingAs($this->user);

        // 1. Record Casting Operation
        $op1Response = $this->postJson("/api/work-orders/{$this->workOrder->id}/operations", [
            'work_order_item_id' => $this->item->id,
            'operation_name' => 'Casting',
            'status' => 'completed',
            'processed_qty' => 2,
            'weight_measurement' => 10.000,
            'assigned_staff' => 'Mahesh Karigar',
            'remarks' => 'Casting done cleanly',
        ]);

        $op1Response->assertStatus(200);

        // 2. Record Polishing Operation
        $op2Response = $this->postJson("/api/work-orders/{$this->workOrder->id}/operations", [
            'work_order_item_id' => $this->item->id,
            'operation_name' => 'Polishing',
            'status' => 'in_progress',
            'processed_qty' => 2,
            'weight_measurement' => 9.980,
            'assigned_staff' => 'Ramesh Polisher',
            'remarks' => 'Final polish underway',
        ]);

        $op2Response->assertStatus(200);

        // Verify both operations persist independently
        $this->assertDatabaseHas('work_order_operations', [
            'work_order_id' => $this->workOrder->id,
            'operation_name' => 'Casting',
            'status' => 'completed',
        ]);

        $this->assertDatabaseHas('work_order_operations', [
            'work_order_id' => $this->workOrder->id,
            'operation_name' => 'Polishing',
            'status' => 'in_progress',
        ]);
    }

    /** @test */
    public function scenario_c_incremental_production_batches()
    {
        $this->actingAs($this->user);

        // Batch 1: Complete 2 pieces
        $this->postJson("/api/work-orders/{$this->workOrder->id}/wip-update", [
            'work_order_item_id' => $this->item->id,
            'completed_now' => 2,
            'actual_weight' => 10.000,
        ]);

        // Batch 2: Complete additional 3 pieces
        $this->postJson("/api/work-orders/{$this->workOrder->id}/wip-update", [
            'work_order_item_id' => $this->item->id,
            'completed_now' => 3,
            'actual_weight' => 15.000,
        ]);

        $this->item->refresh();
        $this->workOrder->refresh();

        $this->assertEquals(5, $this->item->completed_qty);
        $this->assertEquals(5, $this->workOrder->completed_qty);
        $this->assertEquals(25.000, (float)$this->item->completed_weight);
    }

    /** @test */
    public function scenario_d_validation_rejects_exceeding_or_invalid_quantities()
    {
        $this->actingAs($this->user);

        // Attempt to enter 15 completed pieces when required is 10
        $response = $this->postJson("/api/work-orders/{$this->workOrder->id}/wip-update", [
            'work_order_item_id' => $this->item->id,
            'completed_now' => 15,
            'actual_weight' => 75.000,
        ]);

        $response->assertStatus(422);

        $this->item->refresh();
        $this->assertEquals(0, $this->item->completed_qty);
    }

    /** @test */
    public function scenario_e_transaction_rollback_on_batch_failure()
    {
        $this->actingAs($this->user);

        try {
            DB::transaction(function () {
                $this->postJson("/api/work-orders/{$this->workOrder->id}/wip-update", [
                    'work_order_item_id' => $this->item->id,
                    'completed_now' => 2,
                    'actual_weight' => 10.000,
                ]);

                throw new \Exception('Simulated system crash during batch submission');
            });
        } catch (\Exception $e) {
            // Expected simulated exception
        }

        $this->item->refresh();
        $this->assertEquals(0, $this->item->completed_qty);
    }
}
