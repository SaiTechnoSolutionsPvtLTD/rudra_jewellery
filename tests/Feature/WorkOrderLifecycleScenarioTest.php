<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Karigar;
use App\Models\Client;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Foundation\Testing\RefreshDatabase;

class WorkOrderLifecycleScenarioTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $karigar;
    protected $client;
    protected $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::firstOrCreate(
            ['email' => 'admin@rudhra.test'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('password123'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );

        $this->karigar = Karigar::firstOrCreate(
            ['name' => 'Ravi Goldsmith'],
            [
                'karigar_code' => 'KRG-RAVI-01',
                'primary_phone' => '9876543210',
                'specialization' => 'Gold Jewellery',
                'status' => 'active',
            ]
        );

        $this->client = Client::firstOrCreate(
            ['client_code' => 'CL-TEST-01'],
            [
                'name' => 'ABC Jewellers',
                'full_name' => 'ABC Jewellers Ltd',
                'primary_phone' => '9988776655',
                'status' => 'active',
            ]
        );

        $this->category = \App\Models\Category::firstOrCreate(
            ['name' => 'Gold Jewellery'],
            ['code' => 'GOLD-01', 'status' => 'active']
        );
    }

    /**
     * Test Section 45: Master End-to-End Scenario
     */
    public function test_section_45_master_lifecycle_scenario()
    {
        // 1. Vault setup: Ensure raw material exists with 0 balance to verify negative vault allocation
        $vaultMaterial = RawMaterial::where('material_type', 'gold')->first();
        if (!$vaultMaterial) {
            $vaultMaterial = RawMaterial::create([
                'material_type' => 'gold',
                'name' => '22K Gold Bullion',
                'purchased_weight' => 0.000,
                'allocated_weight' => 0.000,
                'current_balance' => 0.000,
                'unit' => 'grams',
            ]);
        }

        // 2. Create Work Order: WO-TEST-001 with 3 Jobs
        // Job A: D001 (Req Qty: 10), Job B: D002 (Req Qty: 5), Job C: D003 (Req Qty: 3)
        $workOrder = WorkOrder::create([
            'work_order_number' => 'WO-TEST-001',
            'product_name' => 'Bridal Sets Collection',
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_weight' => 50.000,
            'required_qty' => 18,
            'completed_qty' => 0,
            'qc_pending_qty' => 0,
            'qc_approved_qty' => 0,
            'rework_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'status' => 'assigned',
            'current_stage' => 'work_started',
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'metal_type' => 'gold',
            'purity' => '22K',
        ]);

        $jobA = WorkOrderItem::create([
            'work_order_id' => $workOrder->id,
            'item_code' => 'JOB-A',
            'design_no' => 'D001',
            'design_code' => 'D001',
            'product_name' => 'Necklace Piece D001',
            'required_qty' => 10,
            'completed_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
        ]);

        $jobB = WorkOrderItem::create([
            'work_order_id' => $workOrder->id,
            'item_code' => 'JOB-B',
            'design_no' => 'D002',
            'design_code' => 'D002',
            'product_name' => 'Bangle Piece D002',
            'required_qty' => 5,
            'completed_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
        ]);

        $jobC = WorkOrderItem::create([
            'work_order_id' => $workOrder->id,
            'item_code' => 'JOB-C',
            'design_no' => 'D003',
            'design_code' => 'D003',
            'product_name' => 'Earring Piece D003',
            'required_qty' => 3,
            'completed_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
        ]);

        // Verify Vault Allocation with negative balance allowed
        $vaultMaterial->refresh();
        RawMaterial::debitAllocation('gold', 50.000);
        $vaultMaterial->refresh();
        $this->assertLessThan(0, $vaultMaterial->available_weight_grams, 'Vault must allow negative available weight');

        // 3. Manager/Supervisor updates WIP:
        // Job A: complete 2, Job B: complete 5, Job C: complete 0 (Total completed = 7)
        $response = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/wip-update", [
            'completed_now' => 7,
            'actual_weight' => 25.500,
            'gold_weight' => 25.500,
            'remarks' => 'Batch 1 completed by Karigar Ravi',
        ]);
        $response->assertStatus(200);

        $workOrder->refresh();
        $this->assertEquals(7, $workOrder->completed_qty);
        $this->assertEquals(7, $workOrder->qc_pending_qty);
        $this->assertEquals(11, $workOrder->pending_production_qty);
        $this->assertContains($workOrder->current_stage, ['work_in_progress', 'quality_check', 'submitted']);

        // 4. Move to QC and PASS all 7 pieces (2 from Job A, 5 from Job B)
        $qcResponse = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 7,
            'remarks' => 'All 7 pieces passed QC inspection',
        ]);
        $qcResponse->assertStatus(200);

        $workOrder->refresh();
        $this->assertEquals(0, $workOrder->qc_pending_qty);
        $this->assertEquals(7, $workOrder->qc_approved_qty);
        $this->assertEquals(7, $workOrder->ready_qty);
        $this->assertEquals('ready', $workOrder->current_stage);

        // 5. Certification:
        // Job A: Skip certification
        $certResponse = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/certification-action", [
            'action' => 'skip',
            'reason' => 'Client requested in-house hallmark only',
        ]);
        $certResponse->assertStatus(200);
        $workOrder->refresh();
        $this->assertEquals('skipped', $workOrder->certification_status);

        // 6. Hallmarking:
        // Complete Hallmarking
        $hallmarkResponse = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/hallmarking-action", [
            'action' => 'add',
            'center_name' => 'Chennai BIS Hallmarking Centre',
            'huid_number' => 'HUID-916-CH-001',
        ]);
        $hallmarkResponse->assertStatus(200);
        $workOrder->refresh();
        $this->assertContains($workOrder->hallmarking_status, ['completed', 'added']);
        $this->assertContains($workOrder->current_stage, ['ready', 'fully_ready']);

        // 7. Receive Order:
        // Receive 7 pieces individually (Piece 1 to 7)
        $generatedTags = [];
        for ($i = 1; $i <= 7; $i++) {
            $grossWeight = 8.200 + ($i * 0.05); // e.g. 8.25, 8.30...
            $receiveResponse = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/receive-piece", [
                'gross_weight' => $grossWeight,
                'gold_weight' => $grossWeight,
                'touch' => 91.60,
                'pure_24k' => round(($grossWeight * 91.60) / 100, 3),
                'making_charge' => 450,
                'total_making_charge' => round(450 * $grossWeight, 2),
                'description' => "Physical piece #{$i} for {$workOrder->work_order_number}",
            ]);
            $receiveResponse->assertStatus(200);

            $pieceData = $receiveResponse->json('data.received_piece');
            $this->assertNotEmpty($pieceData['tag_number']);
            $this->assertFalse(in_array($pieceData['tag_number'], $generatedTags), 'Tag must be unique');
            $generatedTags[] = $pieceData['tag_number'];
        }

        $workOrder->refresh();
        $this->assertEquals(7, $workOrder->received_qty);
        $this->assertEquals(0, $workOrder->pending_receive_qty);
        $this->assertEquals(11, $workOrder->pending_production_qty);

        // 8. Later Completion:
        // Karigar completes 3 more units of Job A
        // Total completed becomes: 7 + 3 = 10. Remaining production: 8.
        $wip2 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/wip-update", [
            'completed_now' => 3,
            'actual_weight' => 24.600,
            'gold_weight' => 24.600,
            'remarks' => '3 more pieces completed from Job A',
        ]);
        $wip2->assertStatus(200);

        $workOrder->refresh();
        $this->assertEquals(10, $workOrder->completed_qty);
        $this->assertEquals(7, $workOrder->received_qty);
        $this->assertEquals(8, $workOrder->pending_production_qty);

        // Pass these 3 through QC and Ready
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 3,
        ]);
        $workOrder->refresh();
        $this->assertEquals(10, $workOrder->ready_qty);
        $this->assertEquals(3, $workOrder->pending_receive_qty);

        // Receive the 3 pieces individually
        for ($j = 1; $j <= 3; $j++) {
            $receiveResponse = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/receive-piece", [
                'gross_weight' => 8.150,
                'gold_weight' => 8.150,
                'touch' => 91.60,
                'pure_24k' => 7.465,
                'making_charge' => 450,
            ]);
            $receiveResponse->assertStatus(200);
            $generatedTags[] = $receiveResponse->json('data.received_piece.tag_number');
        }

        $workOrder->refresh();
        $this->assertEquals(10, $workOrder->received_qty);
        $this->assertEquals(0, $workOrder->pending_receive_qty);
        $this->assertEquals(8, $workOrder->pending_production_qty);

        // Verify total received pieces count in database is 10
        $this->assertCount(10, $generatedTags);
        $this->assertEquals(10, WorkOrderReceivedPiece::where('work_order_id', $workOrder->id)->count());
    }

    /**
     * Test Section 46: Single Product Master Aggregation with Multiple Individual Physical Tags
     */
    public function test_section_46_single_master_product_aggregation()
    {
        $workOrder = WorkOrder::create([
            'work_order_number' => 'WO-TEST-D001',
            'product_name' => 'Diamond Ring D001',
            'design_code' => 'D-TEST-1001',
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'allotted_weight' => 25.000,
            'required_qty' => 10,
            'completed_qty' => 3,
            'ready_qty' => 3,
            'received_qty' => 0,
            'status' => 'ready',
            'current_stage' => 'fully_ready',
        ]);

        $weights = [8.200, 8.350, 8.100];
        $expectedTotalWeight = array_sum($weights); // 24.650

        foreach ($weights as $w) {
            $res = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/receive-piece", [
                'gross_weight' => $w,
                'gold_weight' => $w,
                'touch' => 91.60,
                'pure_24k' => round(($w * 91.60) / 100, 3),
                'making_charge' => 450,
            ]);
            $res->assertStatus(200);
        }

        // Process certification, hallmarking, and inventory posting
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/certification-action", [
            'action' => 'skip',
            'remarks' => 'Skipping certification',
        ]);
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/hallmarking-action", [
            'action' => 'skip',
            'remarks' => 'Skipping hallmarking',
        ]);
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/finalize-inventory");

        // Verify that there is ONLY ONE Product master record for this design/product
        $products = Product::where('name', 'Diamond Ring D001')->get();
        $this->assertCount(1, $products, 'Must NOT create duplicate product master records for same design');

        $singleMaster = $products->first();
        $this->assertEquals(3, $singleMaster->current_stock_qty, 'Product master stock qty must aggregate to 3');
        $this->assertEquals($expectedTotalWeight, (float)$singleMaster->opening_stock_weight, 'Product master weight must aggregate to 24.650g');

        // Verify that 3 individual tags exist for this product master
        $tags = WorkOrderReceivedPiece::where('product_id', $singleMaster->id)->get();
        $this->assertCount(3, $tags, 'Product master must have 3 individual physical tags attached');
    }

    /**
     * Test Section 47: Rework Flow without Duplicate Work Orders
     */
    public function test_section_47_rework_flow()
    {
        $workOrder = WorkOrder::create([
            'work_order_number' => 'WO-REWORK-TEST',
            'product_name' => 'Royal Kada',
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'allotted_weight' => 20.000,
            'required_qty' => 5,
            'completed_qty' => 2,
            'qc_pending_qty' => 2,
            'ready_qty' => 0,
            'rework_qty' => 0,
            'received_qty' => 0,
            'status' => 'submitted',
            'current_stage' => 'quality_check',
        ]);

        // QC approves 1 piece, sends 1 piece for rework
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 1,
        ]);
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/qc-action", [
            'qc_action' => 'rework',
            'quantity' => 1,
            'remarks' => 'Clasp loose, needs resoldering',
        ]);

        $workOrder->refresh();
        $this->assertEquals(1, $workOrder->ready_qty);
        $this->assertEquals(1, $workOrder->rework_qty);
        $this->assertEquals(1, $workOrder->return_count);

        // Manager updates rework from WIP
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/wip-update", [
            'completed_now' => 1,
            'remarks' => 'Resoldered clasp corrected',
        ]);

        $workOrder->refresh();
        $this->assertEquals(1, $workOrder->qc_pending_qty);

        // QC again passes the reworked piece
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 1,
        ]);

        $workOrder->refresh();
        $this->assertEquals(2, $workOrder->ready_qty);
        $this->assertEquals(0, $workOrder->rework_qty);

        // Ensure NO duplicate work order was created
        $woCount = WorkOrder::where('work_order_number', 'WO-REWORK-TEST')->count();
        $this->assertEquals(1, $woCount, 'No duplicate work orders should be created during rework cycle');
    }

    /**
     * Test Master Prompt: RWO Generation, Accurate Net Weight, Pure 24K, and MC Calculations
     */
    public function test_rwo_generation_and_accurate_jewellery_calculations()
    {
        $workOrder = WorkOrder::create([
            'work_order_number' => 'WO-CALC-TEST',
            'product_name' => 'Royal Choker',
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'allotted_weight' => 20.000,
            'required_qty' => 2,
            'completed_qty' => 2,
            'qc_pending_qty' => 0,
            'qc_approved_qty' => 2,
            'ready_qty' => 2,
            'received_qty' => 0,
            'status' => 'ready',
            'current_stage' => 'ready',
        ]);

        $item = WorkOrderItem::create([
            'work_order_id' => $workOrder->id,
            'design_no' => 'D-CHOKER-01',
            'product_name' => 'Royal Choker',
            'required_qty' => 2,
            'completed_qty' => 2,
            'ready_qty' => 2,
            'received_qty' => 0,
            'allotted_weight' => 20.000,
        ]);

        // Submit physical piece receiving with exact prompt test numbers:
        // Total Weight = 10.000g, Diamond Wt = 0.50 ct (0.100g), Color stone = 1.50 ct (0.300g), Old Wt = 1.000g
        // Expected Net Weight = 10.000 - 0.100 - 0.300 - 1.000 = 8.600g
        // Touch = 91.60% -> Pure 24K = 8.600 * 0.916 = 7.878g
        // MC Rate = 450 per gram -> Total MC = 450 * 8.600 = 3870.00
        $response = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/receive-piece", [
            'work_order_item_id' => $item->id,
            'gross_weight' => 10.000,
            'old_weight' => 1.000,
            'diamond_weight' => 0.50,
            'diamond_count' => 3,
            'diamond_stamp' => '+7',
            'color_stone_weight' => 1.50,
            'color_stone_count' => 2,
            'silver_weight' => 0.000,
            'purity' => 91.60,
            'gold_karat' => '22K',
            'making_charge_type' => 'per_gram',
            'making_charge_per_gram' => 450,
            'given_metal_qty' => 0,
            'given_cash' => 0,
        ]);

        $response->assertStatus(200);
        $data = $response->json();

        $this->assertNotEmpty($data['receive_order_number']);
        $this->assertStringStartsWith('RWO-', $data['receive_order_number']);
        $this->assertNotEmpty($data['tag_number']);
        $this->assertStringStartsWith('TAG-', $data['tag_number']);

        $piece = WorkOrderReceivedPiece::where('tag_number', $data['tag_number'])->first();
        $this->assertNotNull($piece);
        $this->assertEquals(10.000, (float)$piece->gross_weight);
        $this->assertEquals(1.000, (float)$piece->old_weight);
        $this->assertEquals(8.600, (float)$piece->net_gold_weight);
        $this->assertEquals(7.878, (float)$piece->pure_24k_weight);
        $this->assertEquals(3870.00, (float)$piece->total_making_charge);
        $this->assertEquals('22K', $piece->gold_karat);
        $this->assertEquals('Dia-0.5/+7/3', $piece->diamond_details);

        // Test search by RWO number
        $searchRes = $this->actingAs($this->admin, 'sanctum')->getJson("/api/work-orders/tags?search={$piece->receive_order_number}");
        $searchRes->assertStatus(200);
        $this->assertCount(1, $searchRes->json('data'));
        $this->assertEquals($piece->tag_number, $searchRes->json('data.0.tag_number'));

        // Validate that work order received_qty is 1 and ready_qty remains 2
        $workOrder->refresh();
        $this->assertEquals(1, $workOrder->received_qty);
        $this->assertEquals(2, $workOrder->ready_qty);
        $this->assertEquals('partially_received', $workOrder->status);
    }

    /**
     * Test Section 12: 10-Piece Partial-Completion Lifecycle Acceptance Scenario
     */
    public function test_ten_piece_partial_completion_acceptance_scenario()
    {
        // 1. Create a Work Order with 10 pieces required
        $workOrder = WorkOrder::create([
            'work_order_number' => 'WO-SCENARIO-10PCS',
            'product_name' => 'Temple Gold Bangles',
            'design_code' => 'TGB-100',
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'allotted_weight' => 120.000,
            'required_qty' => 10,
            'completed_qty' => 0,
            'qc_pending_qty' => 0,
            'qc_approved_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'finalized_qty' => 0,
            'status' => 'assigned',
            'current_stage' => 'work_started',
        ]);

        $item = WorkOrderItem::create([
            'work_order_id' => $workOrder->id,
            'item_code' => 'JOB-TGB-1',
            'design_no' => 'TGB-100',
            'product_name' => 'Temple Gold Bangles',
            'required_qty' => 10,
            'completed_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'finalized_qty' => 0,
            'status' => 'pending',
        ]);

        // Stage 1: Produce 4 pieces
        $wipRes1 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/wip-update", [
            'completed_now' => 4,
            'actual_weight' => 48.000,
            'remarks' => 'Batch 1: 4 pieces completed',
        ]);
        $wipRes1->assertStatus(200);

        // QC Approve 4 pieces -> moves to Ready
        $qcRes1 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 4,
        ]);
        $qcRes1->assertStatus(200);

        // Physically receive the 4 pieces (RWO & unique TAGs generated)
        for ($i = 1; $i <= 4; $i++) {
            $recvRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/receive-piece", [
                'work_order_item_id' => $item->id,
                'gross_weight' => 12.000,
                'purity' => 91.60,
                'gold_karat' => '22K',
                'making_charge_type' => 'per_gram',
                'making_charge_per_gram' => 500,
            ]);
            $recvRes->assertStatus(200);
        }

        // CRITICAL CHECK: Finished stock must NOT change immediately upon physical receiving
        $initialProduct = Product::where('design_no', 'TGB-100')->first();
        $this->assertEquals(0, (int)($initialProduct?->current_stock_qty ?? 0), 'Finished stock must NOT change at physical receiving');

        // Complete required certification decision for received pieces
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/certification-action", [
            'action' => 'skip',
            'details' => 'In-house certification verified',
        ])->assertStatus(200);

        // Complete required hallmarking for received pieces
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/hallmarking-action", [
            'action' => 'add',
            'huid' => 'HUID-BATCH-1',
            'hallmark_center' => 'BIS Centre A',
        ])->assertStatus(200);

        // Post exactly 4 pieces to final inventory
        $finRes1 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/finalize-inventory");
        $finRes1->assertStatus(200);

        // Inventory must increase by exactly 4 pieces
        $product = Product::where('design_no', 'TGB-100')->first();
        $this->assertNotNull($product);
        $this->assertEquals(4, $product->current_stock_qty, 'Inventory must increase by exactly 4 pieces after Batch 1 posting');
        $this->assertEquals(48.000, (float)$product->opening_stock_weight);

        // Parent Work Order MUST REMAIN ACTIVE because 6 pieces are still outstanding
        $workOrder->refresh();
        $this->assertNotEquals('completed', $workOrder->status, 'Parent Work Order must remain active when 6 pieces are still outstanding');
        $this->assertEquals(4, $workOrder->finalized_qty);
        $this->assertEquals(4, $workOrder->received_qty);

        // Stage 2: Produce remaining 6 pieces
        $wipRes2 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/wip-update", [
            'completed_now' => 6,
            'actual_weight' => 72.000,
            'remarks' => 'Batch 2: Remaining 6 pieces completed',
        ]);
        $wipRes2->assertStatus(200);

        // QC Approve remaining 6 pieces -> moves to Ready
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 6,
        ])->assertStatus(200);

        // Physically receive the remaining 6 pieces (pieces 5 to 10)
        for ($i = 5; $i <= 10; $i++) {
            $recvRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/receive-piece", [
                'work_order_item_id' => $item->id,
                'gross_weight' => 12.000,
                'purity' => 91.60,
                'gold_karat' => '22K',
                'making_charge_type' => 'per_gram',
                'making_charge_per_gram' => 500,
            ]);
            $recvRes->assertStatus(200);
        }

        // CRITICAL CHECK: Finished stock must still be exactly 4 before Batch 2 final posting
        $product->refresh();
        $this->assertEquals(4, $product->current_stock_qty, 'Finished stock must still be 4 before Batch 2 is finalized');

        // Complete required certification decision for Batch 2 received pieces
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/certification-action", [
            'action' => 'skip',
        ])->assertStatus(200);

        // Complete required hallmarking for Batch 2 received pieces
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/hallmarking-action", [
            'action' => 'add',
            'huid' => 'HUID-BATCH-2',
            'hallmark_center' => 'BIS Centre A',
        ])->assertStatus(200);

        // Finalize inventory for Batch 2 (remaining 6 pieces)
        $finRes2 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/finalize-inventory");
        $finRes2->assertStatus(200);

        // Inventory must now increase by 6 more to exactly 10 pieces
        $product->refresh();
        $this->assertEquals(10, $product->current_stock_qty, 'Total stock increase must be exactly 10 pieces');
        $this->assertEquals(120.000, (float)$product->opening_stock_weight);

        // Parent Work Order becomes completed only now!
        $workOrder->refresh();
        $this->assertEquals(10, $workOrder->finalized_qty);
        $this->assertEquals(10, $workOrder->received_qty);
        $this->assertEquals('completed', $workOrder->status, 'Parent Work Order must complete only when all 10 pieces finish entire lifecycle');
    }
}

