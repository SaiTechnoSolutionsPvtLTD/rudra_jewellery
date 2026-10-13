<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;
use App\Models\User;
use App\Models\Category;
use App\Models\Subcategory;
use App\Models\Karigar;
use App\Models\JobOrder;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use App\Models\Product;
use App\Models\InventoryMovement;
use Illuminate\Support\Facades\DB;

class WorkOrderLifecycleRestructureTest extends TestCase
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
            'karigar_code' => 'KAR-TEST-01',
            'name' => 'Master Karigar Senthil',
            'primary_phone' => '9876543210',
            'status' => 'active',
            'current_gold_balance_grams' => 0.0,
        ]);

        $this->category = Category::create([
            'name' => 'Bangles & Chains',
            'code' => 'BC-CAT',
            'status' => 'active',
        ]);
    }

    private function createSampleWorkOrder(int $requiredQty = 10, float $allottedWeight = 50.000): WorkOrder
    {
        $jobOrder = JobOrder::create([
            'job_order_number' => 'JO-2026-TEST-' . rand(1000, 9999),
            'order_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'client_name' => 'Test Jewellery Customer',
            'total_items' => 1,
            'status' => 'in_progress',
        ]);

        $order = WorkOrder::create([
            'work_order_number' => 'WO-2026-TEST-' . rand(1000, 9999),
            'job_order_id' => $jobOrder->id,
            'karigar_id' => $this->karigar->id,
            'karigar_name' => $this->karigar->name,
            'category_id' => $this->category->id,
            'product_name' => '22K Gold Antique Choker',
            'design_code' => 'DES-ANK-999',
            'karat' => '22K',
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'required_qty' => $requiredQty,
            'completed_qty' => 0,
            'qc_pending_qty' => 0,
            'qc_approved_qty' => 0,
            'rework_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'finalized_qty' => 0,
            'allotted_weight' => $allottedWeight,
            'completed_weight' => 0.000,
            'current_stage' => 'work_in_progress',
            'status' => 'in_progress',
            'created_by' => $this->user->id,
        ]);

        WorkOrderItem::create([
            'work_order_id' => $order->id,
            'job_order_id' => $jobOrder->id,
            'design_no' => 'DES-ANK-999',
            'product_name' => '22K Gold Antique Choker',
            'category_id' => $this->category->id,
            'required_qty' => $requiredQty,
            'completed_qty' => 0,
            'qc_pending_qty' => 0,
            'qc_approved_qty' => 0,
            'rework_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'finalized_qty' => 0,
            'allotted_weight' => $allottedWeight,
            'completed_weight' => 0.000,
            'status' => 'in_progress',
        ]);

        return $order->fresh(['items']);
    }

    /**
     * Scenario 1: A product passes QC and becomes visible in Ready and Receive Order.
     */
    public function test_scenario_1_qc_pass_moves_to_ready_and_receive()
    {
        $order = $this->createSampleWorkOrder(2, 20.000);

        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/wip-update", [
            'completed_qty' => 2,
            'completed_weight' => 20.000,
            'submit_to_qc' => true,
        ])->assertStatus(200);

        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/qc-action", [
            'action' => 'approve',
            'approved_qty' => 2,
        ])->assertStatus(200);

        $order->refresh();
        $this->assertEquals(2, $order->ready_qty);
        $this->assertEquals('ready', $order->current_stage);

        // Verify visible in Ready tab query
        $resReady = $this->actingAs($this->user)->getJson('/api/work-orders?tab=ready');
        $resReady->assertStatus(200);
        $this->assertTrue(collect($resReady->json('data'))->contains('id', $order->id));

        // Verify visible in Receive tab query
        $resRec = $this->actingAs($this->user)->getJson('/api/work-orders?tab=receive');
        $resRec->assertStatus(200);
        $this->assertTrue(collect($resRec->json('data'))->contains('id', $order->id));
    }

    /**
     * Scenario 2: A received product becomes eligible for Certification.
     */
    public function test_scenario_2_received_product_eligible_for_certification()
    {
        $order = $this->createSampleWorkOrder(1, 10.000);

        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/wip-update", [
            'completed_qty' => 1,
            'completed_weight' => 10.000,
            'submit_to_qc' => true,
        ]);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/qc-action", [
            'action' => 'approve',
            'approved_qty' => 1,
        ]);

        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'gross_weight' => 10.000,
            'net_gold_weight' => 10.000,
            'purity' => 91.60,
        ])->assertStatus(200);

        $order->refresh();
        $this->assertEquals(1, $order->received_qty);

        // Certification tab list includes this order
        $resCert = $this->actingAs($this->user)->getJson('/api/work-orders?tab=certification');
        $resCert->assertStatus(200);
        $this->assertTrue(collect($resCert->json('data'))->contains('id', $order->id));
    }

    /**
     * Scenario 3: Certification completion allows the eligible quantity to advance to Hallmarking.
     */
    public function test_scenario_3_certification_completion_advances_to_hallmarking()
    {
        $order = $this->createSampleWorkOrder(1, 10.000);

        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/wip-update", ['completed_qty' => 1, 'completed_weight' => 10.0, 'submit_to_qc' => true]);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/qc-action", ['action' => 'approve', 'approved_qty' => 1]);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/receive-piece", ['gross_weight' => 10.0, 'net_gold_weight' => 10.0, 'purity' => 91.60]);

        // Complete Certification
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/update-certification", [
            'action' => 'add',
            'certification_no' => 'GIA-TEST-9911',
            'agency' => 'GIA',
        ])->assertStatus(200);

        $order->refresh();
        $this->assertEquals('completed', $order->certification_status);

        // Hallmarking tab query includes this order
        $resHall = $this->actingAs($this->user)->getJson('/api/work-orders?tab=hallmarking');
        $resHall->assertStatus(200);
        $this->assertTrue(collect($resHall->json('data'))->contains('id', $order->id));
    }

    /**
     * Scenario 4: A permitted certification skip does not bypass mandatory Hallmarking.
     */
    public function test_scenario_4_certification_skip_does_not_bypass_mandatory_hallmarking()
    {
        $order = $this->createSampleWorkOrder(1, 12.000);

        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/wip-update", ['completed_qty' => 1, 'completed_weight' => 12.0, 'submit_to_qc' => true]);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/qc-action", ['action' => 'approve', 'approved_qty' => 1]);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/receive-piece", ['gross_weight' => 12.0, 'net_gold_weight' => 12.0, 'purity' => 91.60]);

        // Explicitly skip certification
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/update-certification", ['action' => 'skip'])->assertStatus(200);

        $order->refresh();
        $this->assertEquals('skipped', $order->certification_status);
        $this->assertNull($order->hallmarking_status); // Hallmarking remains pending!

        // Hallmarking is still required and appears in Hallmarking tab
        $resHall = $this->actingAs($this->user)->getJson('/api/work-orders?tab=hallmarking');
        $resHall->assertStatus(200);
        $this->assertTrue(collect($resHall->json('data'))->contains('id', $order->id));
    }

    /**
     * Scenario 5: A product with pending Hallmarking keeps the parent work order active.
     */
    public function test_scenario_5_pending_hallmarking_keeps_parent_work_order_active()
    {
        $order = $this->createSampleWorkOrder(1, 15.000);

        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/wip-update", ['completed_qty' => 1, 'completed_weight' => 15.0, 'submit_to_qc' => true]);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/qc-action", ['action' => 'approve', 'approved_qty' => 1]);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/update-certification", ['action' => 'skip']);

        // Set hallmarking to pending
        $order->update(['hallmarking_status' => 'pending']);

        // Receive physically
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/receive-piece", ['gross_weight' => 15.0, 'net_gold_weight' => 15.0, 'purity' => 91.60]);

        $order->refresh();
        $this->assertNotEquals('completed', $order->status); // Work Order remains active!
    }

    /**
     * Scenario 6: Hallmarking one item does not complete a work order with other outstanding items.
     */
    public function test_scenario_6_hallmarking_one_item_does_not_complete_work_order_with_outstanding_items()
    {
        $order = $this->createSampleWorkOrder(5, 50.000);

        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/wip-update", ['completed_qty' => 5, 'completed_weight' => 50.0, 'submit_to_qc' => true]);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/qc-action", ['action' => 'approve', 'approved_qty' => 5]);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/update-certification", ['action' => 'skip']);

        // Receive 1 piece out of 5
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/receive-piece", ['gross_weight' => 10.0, 'net_gold_weight' => 10.0, 'purity' => 91.60]);

        // Complete Hallmarking
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/update-hallmarking", ['action' => 'add', 'huid' => 'HUID-111'])->assertStatus(200);

        $order->refresh();
        $this->assertEquals(1, $order->received_qty);
        $this->assertNotEquals('completed', $order->status); // Parent WO remains active!
    }

    /**
     * Scenario 7 & 8: Receiving & finalizing 4 of 10 pieces leaves WO active. Completing the remaining 6 completes WO.
     */
    public function test_scenario_7_and_8_partial_then_full_completion()
    {
        $order = $this->createSampleWorkOrder(10, 100.000);

        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/wip-update", ['completed_qty' => 10, 'completed_weight' => 100.0, 'submit_to_qc' => true]);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/qc-action", ['action' => 'approve', 'approved_qty' => 10]);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/update-certification", ['action' => 'skip']);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/update-hallmarking", ['action' => 'skip']);

        // Receive 4 pieces
        for ($i = 1; $i <= 4; $i++) {
            $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/receive-piece", ['gross_weight' => 10.0, 'net_gold_weight' => 10.0, 'purity' => 91.60]);
        }

        $order->refresh();
        $this->assertEquals(4, $order->received_qty);
        $this->assertEquals(4, $order->finalized_qty);
        $this->assertNotEquals('completed', $order->status); // WO active!

        // Receive remaining 6 pieces
        for ($i = 5; $i <= 10; $i++) {
            $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/receive-piece", ['gross_weight' => 10.0, 'net_gold_weight' => 10.0, 'purity' => 91.60]);
        }

        $order->refresh();
        $this->assertEquals(10, $order->received_qty);
        $this->assertEquals(10, $order->finalized_qty);
        $this->assertEquals('completed', $order->status); // NOW completed!
    }

    /**
     * Scenario 9: Rework and rejected pieces cannot cause premature completion.
     */
    public function test_scenario_9_rework_and_rejected_pieces_prevent_premature_completion()
    {
        $order = $this->createSampleWorkOrder(3, 30.000);

        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/wip-update", ['completed_qty' => 3, 'completed_weight' => 30.0, 'submit_to_qc' => true]);

        // QC: 2 Approved, 1 Rework
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/qc-action", [
            'action' => 'approve',
            'approved_qty' => 2,
            'rework_qty' => 1,
        ]);

        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/update-certification", ['action' => 'skip']);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/update-hallmarking", ['action' => 'skip']);

        // Receive 2 approved pieces
        for ($i = 1; $i <= 2; $i++) {
            $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/receive-piece", ['gross_weight' => 10.0, 'net_gold_weight' => 10.0, 'purity' => 91.60]);
        }

        $order->refresh();
        $this->assertEquals(2, $order->received_qty);
        $this->assertEquals(1, $order->rework_qty);
        $this->assertNotEquals('completed', $order->status); // WO remains active due to rework piece!
    }

    /**
     * Scenario 10: Duplicate and concurrent inventory-posting requests do not duplicate stock.
     */
    public function test_scenario_10_duplicate_posting_requests_do_not_duplicate_stock()
    {
        $order = $this->createSampleWorkOrder(1, 10.000);

        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/wip-update", ['completed_qty' => 1, 'completed_weight' => 10.0, 'submit_to_qc' => true]);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/qc-action", ['action' => 'approve', 'approved_qty' => 1]);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/update-certification", ['action' => 'skip']);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/update-hallmarking", ['action' => 'skip']);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/receive-piece", ['gross_weight' => 10.0, 'net_gold_weight' => 10.0, 'purity' => 91.60]);

        // Explicit finalize request repeated twice
        $res1 = $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/finalize-inventory");
        $res1->assertStatus(200);

        $res2 = $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/finalize-inventory");
        $res2->assertStatus(200);
        $this->assertEquals(0, $res2->json('posted_count')); // 0 newly posted on second call!

        $product = Product::where('design_no', 'DES-ANK-999')->first();
        $this->assertEquals(1, $product->current_stock_qty); // Stock count is exactly 1!
    }

    /**
     * Scenario 11: Legacy work orders remain valid and can complete correctly.
     */
    public function test_scenario_11_legacy_work_orders_remain_valid()
    {
        $order = $this->createSampleWorkOrder(1, 10.000);
        $order->update(['status' => 'ready', 'current_stage' => 'ready', 'ready_qty' => 1]);

        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/update-certification", ['action' => 'skip']);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/update-hallmarking", ['action' => 'skip']);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/receive-piece", ['gross_weight' => 10.0, 'net_gold_weight' => 10.0, 'purity' => 91.60]);

        $order->refresh();
        $this->assertEquals('completed', $order->status);
    }

    /**
     * Scenario 12: Inventory quantities and weights remain accurate through partial receiving and finalization.
     */
    public function test_scenario_12_inventory_quantities_and_weights_accurate()
    {
        $order = $this->createSampleWorkOrder(3, 30.000);

        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/wip-update", ['completed_qty' => 3, 'completed_weight' => 30.0, 'submit_to_qc' => true]);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/qc-action", ['action' => 'approve', 'approved_qty' => 3]);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/update-certification", ['action' => 'skip']);
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/update-hallmarking", ['action' => 'skip']);

        // Receive piece 1 (10.250g)
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/receive-piece", ['gross_weight' => 10.250, 'net_gold_weight' => 10.250, 'purity' => 91.60]);

        // Receive piece 2 (9.850g)
        $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/receive-piece", ['gross_weight' => 9.850, 'net_gold_weight' => 9.850, 'purity' => 91.60]);

        $product = Product::where('design_no', 'DES-ANK-999')->first();
        $this->assertEquals(2, $product->current_stock_qty);
        $this->assertEquals(20.100, (float)$product->opening_stock_weight);
    }
}
