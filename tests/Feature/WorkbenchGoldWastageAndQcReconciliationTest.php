<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use App\Models\Karigar;
use App\Models\Category;
use App\Models\Stamp;
use App\Models\KarigarMaterialTransaction;
use App\Services\WorkOrderGoldReconciliationService;
use App\Helpers\GoldConversionHelper;

class WorkbenchGoldWastageAndQcReconciliationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Karigar $karigar;
    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->karigar = Karigar::create([
            'name' => 'Govind Goldsmith',
            'karigar_code' => 'KAR-777',
            'primary_phone' => '9876543210',
            'specialization' => 'Goldsmith & Stone Setter',
            'status' => 'active',
        ]);

        $this->category = Category::create([
            'name' => 'Bangles',
            'code' => 'BNG',
            'status' => 'active',
        ]);
    }

    /**
     * Helper to create a standard 22K work order
     */
    protected function createStandardWorkOrder(float $allottedWeight = 30.0, int $qty = 1): WorkOrder
    {
        $order = WorkOrder::create([
            'work_order_number' => 'WO-2026-TEST-' . rand(1000, 9999),
            'job_number' => 'JO-2026-TEST-' . rand(1000, 9999),
            'product_name' => '22K Traditional Kada',
            'design_code' => 'KADA-01',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigar->id,
            'karigar_name' => $this->karigar->name,
            'allotted_date' => '2026-10-01',
            'delivery_date' => '2026-10-25',
            'allotted_weight' => $allottedWeight,
            'completed_weight' => 0.000,
            'required_qty' => $qty,
            'completed_qty' => 0,
            'qc_pending_qty' => 0,
            'qc_approved_qty' => 0,
            'rework_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'status' => 'in_progress',
            'current_stage' => 'work_in_progress',
            'material_type' => '22K Yellow Gold',
            'pricing_details' => [
                'purity' => '22K',
                'touch' => 91.6667,
            ],
        ]);

        $item = WorkOrderItem::create([
            'work_order_id' => $order->id,
            'design_no' => 'KADA-01',
            'product_name' => '22K Traditional Kada',
            'required_qty' => $qty,
            'completed_qty' => 0,
            'allotted_weight' => $allottedWeight,
            'completed_weight' => 0.000,
            'status' => 'in_progress',
            'pricing_details' => [
                'purity' => '22K',
            ],
        ]);

        return $order->fresh(['items']);
    }

    /**
     * Test 1: Workbench displays and saves wastage
     */
    public function test_workbench_saves_and_persists_gold_wastage(): void
    {
        $order = $this->createStandardWorkOrder(30.0, 1);
        $item = $order->items->first();

        $payload = [
            'work_order_item_id' => $item->id,
            'completed_now' => 1,
            'completed_weight' => 28.500,
            'actual_weight' => 28.500,
            'gold_wastage' => 0.500,
            'purity' => '91.6% (22K)',
            'remarks' => 'First piece completed with 0.500g recorded wastage',
        ];

        $response = $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/wip-update", $payload);

        $response->assertStatus(200);

        // Verify persisted value on work order
        $order->refresh();
        $this->assertEquals(0.500, (float)$order->wastage_weight);
        $this->assertEquals(0.500, (float)($order->pricing_details['wastage_weight'] ?? 0));

        // Verify persisted value on work order item
        $item->refresh();
        $this->assertEquals(0.500, (float)($item->pricing_details['wastage_weight'] ?? 0));

        // Verify piece created and queued for QC contains wastage in qc_submission_data
        $piece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->first();
        $this->assertNotNull($piece);
        $this->assertEquals(0.500, (float)($piece->qc_submission_data['wastage_weight'] ?? 0));
    }

    /**
     * Test 2: Saved wastage appears in the correct QC Inspect Summary
     */
    public function test_saved_wastage_appears_in_qc_inspect_summary_and_reconciliation(): void
    {
        $order = $this->createStandardWorkOrder(30.0, 1);
        $item = $order->items->first();

        // Save WIP with wastage
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/wip-update", [
                'work_order_item_id' => $item->id,
                'completed_now' => 1,
                'completed_weight' => 28.000,
                'actual_weight' => 28.000,
                'gold_wastage' => 0.500,
            ])
            ->assertStatus(200);

        // Fetch QC order details
        $qcRes = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/work-orders/{$order->id}");

        $qcRes->assertStatus(200);
        $data = $qcRes->json('data');

        $this->assertArrayHasKey('gold_reconciliation', $data);
        $recon = $data['gold_reconciliation'];

        $this->assertEquals(0.500, (float)$recon['recorded_wastage_weight']);
        $this->assertGreaterThan(0, (float)$recon['allocated_fine_gold']);
        $this->assertGreaterThan(0, (float)$recon['finished_product_fine_gold']);
    }

    /**
     * Test 3: Reopening the Workbench restores the saved value
     */
    public function test_reopening_workbench_restores_saved_wastage_value(): void
    {
        $order = $this->createStandardWorkOrder(30.0, 1);
        $item = $order->items->first();

        // 1. Initial save of progress with wastage
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/wip-update", [
                'work_order_item_id' => $item->id,
                'completed_now' => 0, // progress update only
                'completed_weight' => 15.000,
                'gold_wastage' => 0.350,
            ])
            ->assertStatus(200);

        // 2. Simulate reopening by fetching order
        $fetched = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/work-orders/{$order->id}")
            ->json('data');

        $this->assertEquals(0.350, (float)$fetched['wastage_weight']);
        $this->assertEquals(0.350, (float)($fetched['pricing_details']['wastage_weight'] ?? 0));
        $this->assertEquals(0.350, (float)($fetched['items'][0]['pricing_details']['wastage_weight'] ?? 0));
    }

    /**
     * Test 4: Updating wastage refreshes the QC summary correctly
     */
    public function test_updating_wastage_refreshes_qc_summary_correctly(): void
    {
        $order = $this->createStandardWorkOrder(30.0, 1);
        $item = $order->items->first();

        // Save initial wastage of 0.400
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/wip-update", [
                'work_order_item_id' => $item->id,
                'completed_now' => 1,
                'completed_weight' => 28.000,
                'gold_wastage' => 0.400,
            ])
            ->assertStatus(200);

        // Verify initial
        $recon1 = WorkOrderGoldReconciliationService::calculateForWorkOrder($order->fresh());
        $this->assertEquals(0.400, (float)$recon1['recorded_wastage_weight']);

        // Supervisor revises wastage to 0.550
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/wip-update", [
                'work_order_item_id' => $item->id,
                'completed_now' => 0,
                'completed_weight' => 28.000,
                'gold_wastage' => 0.550,
            ])
            ->assertStatus(200);

        // Verify updated in reconciliation
        $recon2 = WorkOrderGoldReconciliationService::calculateForWorkOrder($order->fresh());
        $this->assertEquals(0.550, (float)$recon2['recorded_wastage_weight']);
    }

    /**
     * Test 5: Gold wastage uses the correct 24K fine-gold equivalent
     */
    public function test_gold_wastage_uses_correct_24k_fine_gold_equivalent(): void
    {
        // 22K gold has touch of 22/24 (approx 91.6667%)
        $order22 = $this->createStandardWorkOrder(30.0, 1);
        $order22->wastage_weight = 0.500;
        $order22->save();

        $recon22 = WorkOrderGoldReconciliationService::calculateForWorkOrder($order22);
        // 0.500g of 22K gold in 24K pure gold = 0.500 * (22/24) = 0.458g
        $expectedFine = round(0.500 * (22.0 / 24.0), 3);
        $this->assertEquals($expectedFine, (float)$recon22['recorded_wastage_fine_gold']);

        // 24K pure gold: 0.500g is exactly 0.500g pure
        $order24 = $this->createStandardWorkOrder(30.0, 1);
        $order24->material_type = '24K Gold';
        $order24->pricing_details = ['purity' => '24K', 'touch' => 100.0];
        $order24->wastage_weight = 0.500;
        $order24->save();

        $recon24 = WorkOrderGoldReconciliationService::calculateForWorkOrder($order24);
        $this->assertEquals(0.500, (float)$recon24['recorded_wastage_fine_gold']);
    }

    /**
     * Test 6: Purity conversion is not applied twice
     */
    public function test_purity_conversion_is_not_applied_twice(): void
    {
        $weight = 10.0;
        $fineOnce = GoldConversionHelper::convertTo24kPureWeight($weight, '22K');
        $this->assertEquals(9.167, $fineOnce);

        // If weight is already pure 24K, converting it should remain identical
        $fineTwice = GoldConversionHelper::convertTo24kPureWeight($fineOnce, '24K');
        $this->assertEquals($fineOnce, $fineTwice);
    }

    /**
     * Test 7: Finished jewellery, wastage, unused bench material, and physical vault returns reconcile correctly
     * Equation: Allocated fine gold = Finished-product fine gold + Approved wastage + Unused fine gold + Returned fine gold
     */
    public function test_reconciliation_equation_balances_with_unused_material_and_vault_returns(): void
    {
        // Create an allocation of 30.000g of 24K pure gold
        $order = $this->createStandardWorkOrder(30.0, 1);
        $order->material_type = '24K Gold';
        $order->pricing_details = ['purity' => '24K', 'touch' => 100.0];
        $order->completed_weight = 28.000;
        $order->wastage_weight = 0.500;
        $order->save();

        // 1. Initial State:
        // Allocated: 30.000g
        // Finished: 28.000g
        // Wastage: 0.500g
        // Vault return: 0.000g
        // Expected Unused Bench: 1.500g
        $recon1 = WorkOrderGoldReconciliationService::calculateForWorkOrder($order);

        $this->assertEquals(30.000, (float)$recon1['allocated_fine_gold']);
        $this->assertEquals(28.000, (float)$recon1['finished_product_fine_gold']);
        $this->assertEquals(0.500, (float)$recon1['recorded_wastage_fine_gold']);
        $this->assertEquals(0.000, (float)$recon1['returned_fine_gold']);
        $this->assertEquals(1.500, (float)$recon1['unused_fine_gold']);
        $this->assertEquals(0.000, (float)$recon1['reconciliation_difference']);
        $this->assertTrue($recon1['is_reconciled']);

        // 2. Physical Return of 1.000g to company vault
        KarigarMaterialTransaction::create([
            'karigar_id' => $this->karigar->id,
            'work_order_id' => $order->id,
            'transaction_type' => 'vault_return',
            'material_type' => 'gold',
            'unit' => 'g',
            'gross_weight' => 1.000,
            'net_weight' => 1.000,
            'fine_weight' => 1.000,
            'company_gold_weight' => 1.000,
            'karigar_gold_weight' => 0,
            'signed_change' => -1.000,
            'transaction_date' => now(),
            'weight' => 1.000,
            'reason' => 'Physical return to company vault',
            'created_by' => $this->user->id,
        ]);

        // After 1.000g returned to vault, remaining bench balance becomes 0.500g
        $recon2 = WorkOrderGoldReconciliationService::calculateForWorkOrder($order->fresh());

        $this->assertEquals(30.000, (float)$recon2['allocated_fine_gold']);
        $this->assertEquals(28.000, (float)$recon2['finished_product_fine_gold']);
        $this->assertEquals(0.500, (float)$recon2['recorded_wastage_fine_gold']);
        $this->assertEquals(1.000, (float)$recon2['returned_fine_gold']);
        $this->assertEquals(0.500, (float)$recon2['unused_fine_gold']);
        $this->assertEquals(0.000, (float)$recon2['reconciliation_difference']);
        $this->assertTrue($recon2['is_reconciled']);
    }

    /**
     * Test 8: Repeated submissions do not duplicate wastage or stock movements
     */
    public function test_repeated_submissions_do_not_duplicate_wastage(): void
    {
        $order = $this->createStandardWorkOrder(30.0, 1);
        $item = $order->items->first();

        // First WIP submission
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/wip-update", [
                'work_order_item_id' => $item->id,
                'completed_now' => 1,
                'completed_weight' => 28.000,
                'gold_wastage' => 0.500,
            ])
            ->assertStatus(200);

        $piecesCount1 = WorkOrderReceivedPiece::where('work_order_id', $order->id)->count();
        $this->assertEquals(1, $piecesCount1);

        // Second duplicate/retry WIP submission
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/wip-update", [
                'work_order_item_id' => $item->id,
                'completed_now' => 0, // save progress again
                'completed_weight' => 28.000,
                'gold_wastage' => 0.500,
            ])
            ->assertStatus(200);

        $order->refresh();
        $this->assertEquals(0.500, (float)$order->wastage_weight);

        // QC approves the piece so it moves to ready state
        $piece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->first();
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/qc-action", [
                'work_order_item_id' => $item->id,
                'piece_id' => $piece->id,
                'action' => 'pass',
                'quantity' => 1,
            ])
            ->assertStatus(200);

        // Receiving the piece should create approved_wastage at most once
        $receivePayload = [
            'gross_weight' => 28.000,
            'net_gold_weight' => 28.000,
            'gold_karat' => '22K',
            'wastage_weight' => 0.500,
            'piece_id' => $piece->id,
        ];

        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/receive-piece", $receivePayload)
            ->assertStatus(200);

        // Repeat receive call
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/receive-piece", $receivePayload);

        $approvedTxsCount = KarigarMaterialTransaction::where('work_order_id', $order->id)
            ->where('transaction_type', 'approved_wastage')
            ->count();

        $this->assertLessThanOrEqual(1, $approvedTxsCount);
    }

    /**
     * Test 9: Diamond stamp balances and other Work Orders remain unaffected
     */
    public function test_diamond_stamp_balances_and_other_work_orders_remain_unaffected(): void
    {
        // 1. Create diamond stamp allocation for Karigar
        $stamp = Stamp::create(['name' => '+2 Sieve', 'code' => '+2']);
        KarigarMaterialTransaction::create([
            'karigar_id' => $this->karigar->id,
            'transaction_type' => 'allocation',
            'material_type' => 'diamond',
            'stamp' => '+2',
            'stamp_id' => $stamp->id,
            'weight' => 3.500,
            'pieces' => 10,
            'unit' => 'ct',
            'transaction_date' => now(),
            'created_by' => $this->user->id,
        ]);

        $orderA = $this->createStandardWorkOrder(30.0, 1);
        $orderB = $this->createStandardWorkOrder(40.0, 1);

        // Update Order A with gold wastage
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$orderA->id}/wip-update", [
                'work_order_item_id' => $orderA->items->first()->id,
                'completed_now' => 1,
                'completed_weight' => 28.000,
                'gold_wastage' => 0.500,
            ])
            ->assertStatus(200);

        // Verify Order B is completely untouched
        $orderB->refresh();
        $this->assertEquals(0.000, (float)$orderB->wastage_weight);

        // Verify diamond transactions remain completely unaffected
        $diaTx = KarigarMaterialTransaction::where('karigar_id', $this->karigar->id)
            ->where('material_type', 'diamond')
            ->first();

        $this->assertNotNull($diaTx);
        $this->assertEquals(3.500, (float)$diaTx->weight);
        $this->assertEquals(10, (int)$diaTx->pieces);
    }

    /**
     * Test 10: Distinguishes recorded wastage from approved wastage until QC approval
     */
    public function test_distinguishes_recorded_wastage_from_approved_wastage_until_qc_approval(): void
    {
        $order = $this->createStandardWorkOrder(30.0, 1);
        $item = $order->items->first();

        // 1. Submit from workbench with 0.500g wastage
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/wip-update", [
                'work_order_item_id' => $item->id,
                'completed_now' => 1,
                'completed_weight' => 28.000,
                'gold_wastage' => 0.500,
            ])
            ->assertStatus(200);

        // 2. Before QC approval: recorded wastage is 0.500, approved wastage is 0.000
        $reconPending = WorkOrderGoldReconciliationService::calculateForWorkOrder($order->fresh());
        $this->assertEquals(0.500, (float)$reconPending['recorded_wastage_weight']);
        $this->assertEquals(0.000, (float)$reconPending['approved_wastage_fine_gold']);
        $this->assertFalse($reconPending['is_wastage_approved']);

        // 3. QC approves the piece
        $piece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->first();
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/qc-action", [
                'work_order_item_id' => $item->id,
                'piece_id' => $piece->id,
                'action' => 'pass',
                'quantity' => 1,
            ])
            ->assertStatus(200);

        // 4. After QC approval: approved wastage is recognized
        $reconApproved = WorkOrderGoldReconciliationService::calculateForWorkOrder($order->fresh(), $piece->fresh());
        $this->assertTrue($reconApproved['is_wastage_approved']);
        $this->assertGreaterThan(0, (float)$reconApproved['approved_wastage_fine_gold']);
    }

    /**
     * Test 11: Rework piece resubmission does not double completed weight
     */
    public function test_rework_piece_resubmission_does_not_double_completed_weight(): void
    {
        $order = $this->createStandardWorkOrder(60.0, 2);
        $item = $order->items->first();

        // 1. Submit piece 1 for QC with weight 31.000g
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/wip-update", [
                'work_order_item_id' => $item->id,
                'completed_now' => 1,
                'completed_weight' => 31.000,
            ])
            ->assertStatus(200);

        $order->refresh();
        $item->refresh();
        $this->assertEquals(1, (int)$item->completed_qty);
        $this->assertEquals(31.000, (float)$item->completed_weight);
        $this->assertEquals(31.000, (float)$order->completed_weight);

        // 2. Return piece 1 for rework in QC
        $piece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->first();
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/qc-action", [
                'work_order_item_id' => $item->id,
                'piece_id' => $piece->id,
                'action' => 'rework',
                'quantity' => 1,
                'reason' => 'Finishing touchup needed',
            ])
            ->assertStatus(200);

        // 3. Karigar reworks and re-sends piece 1 for QC with weight 31.000g
        $this->actingAs($this->user, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/wip-update", [
                'work_order_item_id' => $item->id,
                'completed_now' => 1,
                'completed_weight' => 31.000,
                'actual_weight' => 31.000,
            ])
            ->assertStatus(200);

        $order->refresh();
        $item->refresh();

        // Must still be 1 piece done and exactly 31.000g, NOT doubled to 62.000g!
        $this->assertEquals(1, (int)$item->completed_qty);
        $this->assertEquals(1, (int)$item->qc_pending_qty);
        $this->assertEquals(0, (int)$item->rework_qty);
        $this->assertEquals(31.000, (float)$item->completed_weight);
        $this->assertEquals(31.000, (float)$order->completed_weight);

        // 4. Checking via show API returns the synchronized correct weight
        $showRes = $this->actingAs($this->user, 'sanctum')
            ->getJson("/api/work-orders/{$order->id}")
            ->assertStatus(200);

        $showItem = collect($showRes->json('data.items'))->firstWhere('id', $item->id);
        $this->assertEquals(31.000, (float)$showItem['completed_weight']);
    }
}
