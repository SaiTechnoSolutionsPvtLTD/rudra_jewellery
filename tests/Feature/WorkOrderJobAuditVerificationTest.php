<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Karigar;
use App\Models\Client;
use App\Models\Product;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use App\Models\InventoryMovement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class WorkOrderJobAuditVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $karigar;
    protected $client;
    protected $existingProduct;
    protected $workOrder;
    protected $jobA;
    protected $jobB;
    protected $jobC;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Audit Admin',
            'email' => 'audit.admin@rudhra.test',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->karigar = Karigar::create([
            'name' => 'Master Karigar',
            'karigar_code' => 'KRG-AUDIT-01',
            'primary_phone' => '9876543210',
            'specialization' => 'Gold Jewellery',
            'status' => 'active',
        ]);

        $this->client = Client::create([
            'client_code' => 'CL-AUDIT-001',
            'full_name' => 'Audit Client Pvt Ltd',
            'primary_phone' => '9988776655',
            'status' => 'active',
        ]);

        $category = \App\Models\Category::firstOrCreate(
            ['name' => 'Gold Jewellery'],
            ['code' => 'GOLD-01', 'status' => 'active']
        );

        // Existing inventory design D001 with 5 pieces in stock
        $this->existingProduct = Product::create([
            'category_id' => $category->id,
            'name' => 'Gold Chain D001',
            'product_code' => 'PROD-D001',
            'design_no' => 'D001',
            'current_stock_qty' => 5,
            'status' => 'active',
        ]);

        // One work order containing 3 jobs
        $this->workOrder = WorkOrder::create([
            'work_order_number' => 'WO-AUDIT-2026',
            'product_name' => 'Gold Chain D001 Collection',
            'category_id' => $category->id,
            'design_code' => 'D001',
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'allotted_weight' => 50.000,
            'required_qty' => 23, // Job A:10 + Job B:5 + Job C:8
            'completed_qty' => 0,
            'qc_pending_qty' => 0,
            'qc_approved_qty' => 0,
            'rework_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'status' => 'assigned',
            'current_stage' => 'work_started',
            'metal_type' => 'gold',
            'purity' => '22K',
        ]);

        // Job A: 10 pieces and 50 g allocated
        $this->jobA = WorkOrderItem::create([
            'work_order_id' => $this->workOrder->id,
            'item_code' => 'WO-AUDIT-2026-A',
            'product_name' => 'Gold Chain D001',
            'design_no' => 'D001',
            'item_seq' => 1,
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

        // Job B: 5 pieces
        $this->jobB = WorkOrderItem::create([
            'work_order_id' => $this->workOrder->id,
            'item_code' => 'WO-AUDIT-2026-B',
            'product_name' => 'Gold Ring B',
            'design_no' => 'D002',
            'item_seq' => 2,
            'required_qty' => 5,
            'completed_qty' => 0,
            'qc_pending_qty' => 0,
            'qc_approved_qty' => 0,
            'rework_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'allotted_weight' => 20.000,
            'completed_weight' => 0.000,
            'status' => 'in_progress',
        ]);

        // Job C: 8 pieces
        $this->jobC = WorkOrderItem::create([
            'work_order_id' => $this->workOrder->id,
            'item_code' => 'WO-AUDIT-2026-C',
            'product_name' => 'Gold Bracelet C',
            'design_no' => 'D003',
            'item_seq' => 3,
            'required_qty' => 8,
            'completed_qty' => 0,
            'qc_pending_qty' => 0,
            'qc_approved_qty' => 0,
            'rework_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'allotted_weight' => 30.000,
            'completed_weight' => 0.000,
            'status' => 'in_progress',
        ]);
    }

    /**
     * Test Scenarios 1 to 10: End-to-End Execution
     */
    public function test_full_workflow_scenarios_1_to_10()
    {
        // 1. Complete 3 pieces of Job A and leave 7 outstanding
        // 2. Submit those 3 pieces for QC
        $response = $this->actingAs($this->admin)->postJson("/api/work-orders/{$this->workOrder->id}/wip-update", [
            'work_order_item_id' => $this->jobA->id,
            'action' => 'submit_to_qc',
            'quantity' => 3,
            'completed_weight' => 15.000,
            'karigar_notes' => '3 pieces completed for Job A',
        ]);

        $response->assertStatus(200);

        $this->jobA->refresh();
        $this->assertEquals(3, $this->jobA->completed_qty, 'Job A completed_qty should be 3');
        $this->assertEquals(3, $this->jobA->qc_pending_qty, 'Job A qc_pending_qty should be 3');
        $this->assertEquals(7, $this->jobA->required_qty - $this->jobA->completed_qty, 'Job A outstanding should be 7');

        // 3. Verify only those 3 pieces can be approved in QC
        $qcPassResponse = $this->actingAs($this->admin)->postJson("/api/work-orders/{$this->workOrder->id}/qc-action", [
            'work_order_item_id' => $this->jobA->id,
            'action' => 'pass',
            'quantity' => 3,
            'quality_notes' => 'Pass 3 pieces',
        ]);

        $qcPassResponse->assertStatus(200);

        $this->jobA->refresh();
        $this->assertEquals(3, $this->jobA->qc_approved_qty, 'Job A qc_approved_qty should be 3');
        $this->assertEquals(0, $this->jobA->qc_pending_qty, 'Job A qc_pending_qty should be 0 after approval');
        $this->assertEquals(3, $this->jobA->ready_qty, 'Job A ready_qty should be 3');

        // 4. Progress them through mandatory stages (ready -> receive)
        // 5. Receive them individually (3 piece receipts)
        $tagNumbers = [];
        for ($i = 1; $i <= 3; $i++) {
            $receiveResponse = $this->actingAs($this->admin)->postJson("/api/work-orders/{$this->workOrder->id}/receive-piece", [
                'work_order_item_id' => $this->jobA->id,
                'weight' => 5.000,
                'remarks' => "Receiving piece #{$i}",
            ]);

            $receiveResponse->assertStatus(200);
            $tagNumbers[] = $receiveResponse->json('data.tag_number');
        }

        // 5b. Complete certification and hallmarking (or mark skip) then finalize inventory
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$this->workOrder->id}/certification-action", [
            'action' => 'skip',
            'remarks' => 'Skipping certification',
        ]);
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$this->workOrder->id}/hallmarking-action", [
            'action' => 'skip',
            'remarks' => 'Skipping hallmarking',
        ]);
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$this->workOrder->id}/finalize-inventory");

        // 6. Confirm D001 stock changes from 5 to 8 (5 + 3) exactly once
        $this->existingProduct->refresh();
        $this->assertEquals(8, $this->existingProduct->current_stock_qty, 'D001 stock should change from 5 to 8');

        // Verify no duplicate catalog design was created
        $d001Count = Product::where('design_no', 'D001')->count();
        $this->assertEquals(1, $d001Count, 'No duplicate catalog product should be created for D001');

        // 7. Confirm the three received pieces have three distinct tags
        $this->assertCount(3, array_unique($tagNumbers), '3 received pieces must have 3 distinct tag numbers');
        $this->assertEquals(3, WorkOrderReceivedPiece::where('work_order_item_id', $this->jobA->id)->count());

        // 8. Retry receiving an already received piece (or tag) and confirm no additional stock movement
        $invalidReceiveResponse = $this->actingAs($this->admin)->postJson("/api/work-orders/{$this->workOrder->id}/receive-piece", [
            'work_order_item_id' => $this->jobA->id,
            'weight' => 5.000,
            'remarks' => 'Extra receive attempt when ready_qty is 0',
        ]);

        $invalidReceiveResponse->assertStatus(422);

        $this->existingProduct->refresh();
        $this->assertEquals(8, $this->existingProduct->current_stock_qty, 'Stock must remain 8 after rejected duplicate receiving');

        // 9. Verify Jobs B and C remain unchanged
        $this->jobB->refresh();
        $this->jobC->refresh();
        $this->assertEquals(0, $this->jobB->completed_qty, 'Job B should remain unchanged');
        $this->assertEquals(5, $this->jobB->required_qty, 'Job B required_qty unchanged');
        $this->assertEquals(0, $this->jobC->completed_qty, 'Job C should remain unchanged');

        // 10. Verify Job A remains incomplete until all required pieces are received
        $this->jobA->refresh();
        $this->assertEquals('in_progress', $this->jobA->status, 'Job A should remain in_progress (3 of 10 received)');
        
        $this->workOrder->refresh();
        $this->assertNotEquals('completed', $this->workOrder->status, 'Parent WorkOrder should remain active (partially received)');
    }

    /**
     * Test Scenario 11: QC Rejection, Rework and Resubmission
     */
    public function test_11_qc_rejection_rework_and_resubmission()
    {
        // 1. Submit 2 pieces for QC
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$this->workOrder->id}/wip-update", [
            'work_order_item_id' => $this->jobA->id,
            'action' => 'submit_to_qc',
            'quantity' => 2,
            'completed_weight' => 10.000,
        ]);

        $this->jobA->refresh();
        $this->assertEquals(2, $this->jobA->qc_pending_qty);

        // 2. Reject in QC and send to rework
        $reworkResponse = $this->actingAs($this->admin)->postJson("/api/work-orders/{$this->workOrder->id}/qc-action", [
            'work_order_item_id' => $this->jobA->id,
            'action' => 'rework',
            'quantity' => 2,
            'rework_reason' => 'Surface polish defect',
        ]);

        $reworkResponse->assertStatus(200);

        $this->jobA->refresh();
        $this->assertEquals(0, $this->jobA->qc_pending_qty, 'QC pending should clear after rework');
        $this->assertEquals(2, $this->jobA->rework_qty, 'Rework qty should be 2');

        // 3. Complete rework and resubmit to QC
        $resubmitResponse = $this->actingAs($this->admin)->postJson("/api/work-orders/{$this->workOrder->id}/wip-update", [
            'work_order_item_id' => $this->jobA->id,
            'action' => 'submit_to_qc',
            'quantity' => 2,
            'completed_weight' => 10.000,
            'karigar_notes' => 'Rework completed, resubmitting',
        ]);

        $resubmitResponse->assertStatus(200);

        $this->jobA->refresh();
        $this->assertEquals(2, $this->jobA->qc_pending_qty, 'QC pending should be 2 after resubmission');
        $this->assertEquals(0, $this->jobA->rework_qty, 'Rework qty cleared after resubmission');
    }

    /**
     * Test Scenario 12: Invalid Quantities and Unauthorized Access
     */
    public function test_12_invalid_quantities_and_unauthorized_access()
    {
        // 1. Submit invalid quantity exceeding required_qty
        $invalidResponse = $this->actingAs($this->admin)->postJson("/api/work-orders/{$this->workOrder->id}/wip-update", [
            'work_order_item_id' => $this->jobA->id,
            'action' => 'submit_to_qc',
            'quantity' => 999,
        ]);

        $invalidResponse->assertStatus(422);

        // 2. Unauthorized request (guest / unauthenticated)
        $this->app['auth']->forgetGuards();
        $unauthResponse = $this->postJson("/api/work-orders/{$this->workOrder->id}/wip-update", [
            'work_order_item_id' => $this->jobA->id,
            'action' => 'submit_to_qc',
            'quantity' => 1,
        ]);

        $unauthResponse->assertStatus(401);
    }

    /**
     * Test Scenario 13: Transaction Rollback on Simulated Failure
     */
    public function test_13_transaction_rollback_on_simulated_failure()
    {
        $initialStock = $this->existingProduct->current_stock_qty;

        // Try receiving with an invalid/non-existent work_order_item_id
        $failResponse = $this->actingAs($this->admin)->postJson("/api/work-orders/{$this->workOrder->id}/receive-piece", [
            'work_order_item_id' => 99999,
            'weight' => 5.000,
        ]);

        $failResponse->assertStatus(422);

        $this->existingProduct->refresh();
        $this->assertEquals($initialStock, $this->existingProduct->current_stock_qty, 'Database transaction must roll back on error');
    }

    /**
     * Test Scenario 14: Certification and Hallmarking API Item Scoping
     */
    public function test_14_certification_and_hallmarking_item_scoping()
    {
        // Certification targeting Job A specifically
        $certResponse = $this->actingAs($this->admin)->postJson("/api/work-orders/{$this->workOrder->id}/certification-action", [
            'work_order_item_id' => $this->jobA->id,
            'action' => 'add',
            'certification_no' => 'CERT-2026-A1',
            'agency' => 'GIA',
        ]);
        $certResponse->assertStatus(200);

        $this->jobA->refresh();
        $this->assertEquals('CERT-2026-A1', $this->jobA->pricing_details['certification_no']);

        // Hallmarking targeting Job A specifically
        $hallmarkResponse = $this->actingAs($this->admin)->postJson("/api/work-orders/{$this->workOrder->id}/hallmarking-action", [
            'work_order_item_id' => $this->jobA->id,
            'action' => 'add',
            'huid' => 'HUID-916-A1',
            'hallmark_center' => 'BIS Mumbai',
        ]);
        $hallmarkResponse->assertStatus(200);

        $this->jobA->refresh();
        $this->assertEquals('HUID-916-A1', $this->jobA->pricing_details['huid']);

        // Verify Job B remains untouched
        $this->jobB->refresh();
        $this->assertEmpty($this->jobB->pricing_details['huid'] ?? null);
    }
}
