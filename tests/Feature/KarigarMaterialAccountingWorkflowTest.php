<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Karigar;
use App\Models\KarigarMaterialTransaction;
use App\Models\Product;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KarigarMaterialAccountingWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
        ]);
    }

    /**
     * Test 1: Allocate 33g; receive a 32g product; approve 1g wastage; reconcile all material.
     * Material on Bench must be 0g.
     */
    public function test_scenario_1_reconcile_33g_allocated_32g_received_1g_wastage()
    {
        $unique = uniqid();
        $karigar = Karigar::create([
            'name' => "Karigar {$unique}",
            'karigar_code' => "KG-{$unique}",
            'primary_phone' => '9999999999',
            'status' => 'active',
            'gold_balance_grams' => 0.0,
        ]);

        $category = Category::create(['name' => "Chains {$unique}", 'code' => "CH-{$unique}"]);
        $product = Product::create([
            'name' => "Gold Chain {$unique}",
            'product_code' => "PRD-{$unique}",
            'category_id' => $category->id,
            'current_stock_qty' => 5,
        ]);

        $order = WorkOrder::create([
            'work_order_number' => "WO-{$unique}",
            'product_name' => "Gold Chain {$unique}",
            'karigar_id' => $karigar->id,
            'allotted_weight' => 33.000,
            'required_qty' => 1,
            'ready_qty' => 1,
            'completed_qty' => 0,
            'status' => 'in_progress',
            'current_stage' => 'in_production',
            'allotted_date' => now()->toDateString(),
        ]);

        // Karigar initial sync
        app(\App\Http\Controllers\Api\WorkOrderController::class)->syncKarigarGoldBalance($karigar->id);
        $karigar->refresh();
        $this->assertEquals(33.0, (float) $karigar->gold_balance_grams);

        // Receive piece: 32g finished net gold, 1g wastage approved
        $res = $this->actingAs($this->adminUser)->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'gross_weight' => 32.000,
            'net_gold_weight' => 32.000,
            'wastage_weight' => 1.000,
            'karigar_gold_weight' => 0.000,
            'stage' => 'completed',
        ]);

        $res->assertStatus(200);

        $order->refresh();
        $karigar->refresh();

        $this->assertEquals(32.0, (float) $order->completed_weight);
        $this->assertEquals(1.0, (float) $order->wastage_weight);
        $this->assertEquals(0.0, (float) $order->pending_weight);
        // Bench balance must be exactly 0g
        $this->assertEquals(0.0, (float) $karigar->gold_balance_grams);
        $this->assertEquals(0.0, (float) $karigar->settlement_balance_grams);
    }

    /**
     * Test 2: Allocate 33g; receive a 32g product; leave the 1g difference unreconciled.
     * Material on Bench must reflect the outstanding 1g amount until reconciliation.
     */
    public function test_scenario_2_unreconciled_1g_remains_on_bench()
    {
        $unique = uniqid();
        $karigar = Karigar::create([
            'name' => "Karigar {$unique}",
            'karigar_code' => "KG-{$unique}",
            'primary_phone' => '9999999999',
            'status' => 'active',
            'gold_balance_grams' => 0.0,
        ]);

        $order = WorkOrder::create([
            'work_order_number' => "WO-{$unique}",
            'product_name' => "Gold Chain {$unique}",
            'karigar_id' => $karigar->id,
            'allotted_weight' => 33.000,
            'required_qty' => 1,
            'ready_qty' => 1,
            'completed_qty' => 0,
            'status' => 'in_progress',
            'current_stage' => 'in_production',
            'allotted_date' => now()->toDateString(),
        ]);

        app(\App\Http\Controllers\Api\WorkOrderController::class)->syncKarigarGoldBalance($karigar->id);

        // Receive piece: 32g finished net gold, 0g wastage
        $res = $this->actingAs($this->adminUser)->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'gross_weight' => 32.000,
            'net_gold_weight' => 32.000,
            'wastage_weight' => 0.000,
            'stage' => 'received',
        ]);

        $res->assertStatus(200);

        $order->refresh();
        $karigar->refresh();

        $this->assertEquals(32.0, (float) $order->completed_weight);
        $this->assertEquals(0.0, (float) $order->wastage_weight);
        $this->assertEquals(1.0, (float) $order->pending_weight);
        // 1g unreconciled remains on bench
        $this->assertEquals(1.0, (float) $karigar->gold_balance_grams);
        $this->assertEquals(1.0, (float) $karigar->settlement_balance_grams);
    }

    /**
     * Test 3: Allocate 33g; karigar supplies an additional 2g for 35g product.
     * Track the additional 2g as karigar-owned gold and settle ownership correctly.
     */
    public function test_scenario_3_karigar_supplies_own_gold_signed_balance()
    {
        $unique = uniqid();
        $karigar = Karigar::create([
            'name' => "Karigar {$unique}",
            'karigar_code' => "KG-{$unique}",
            'primary_phone' => '9999999999',
            'status' => 'active',
            'gold_balance_grams' => 0.0,
        ]);

        $order = WorkOrder::create([
            'work_order_number' => "WO-{$unique}",
            'product_name' => "Heavy Gold Chain {$unique}",
            'karigar_id' => $karigar->id,
            'allotted_weight' => 33.000,
            'required_qty' => 1,
            'ready_qty' => 1,
            'completed_qty' => 0,
            'status' => 'in_progress',
            'current_stage' => 'in_production',
            'allotted_date' => now()->toDateString(),
        ]);

        // Receive 35g product with 2g contributed by karigar
        $res = $this->actingAs($this->adminUser)->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'gross_weight' => 35.000,
            'net_gold_weight' => 35.000,
            'karigar_gold_weight' => 2.000,
            'stage' => 'completed',
        ]);

        $res->assertStatus(200);

        $order->refresh();
        $karigar->refresh();

        // Company gold completed: 33g, Karigar gold completed: 2g
        $this->assertEquals(35.0, (float) $order->completed_weight);
        $this->assertEquals(2.0, (float) $order->karigar_gold_weight);
        $this->assertEquals(0.0, (float) $order->pending_weight);

        // Bench balance of company gold = 0g
        $this->assertEquals(0.0, (float) $karigar->gold_balance_grams);
        // Karigar gold owned = 2g
        $this->assertEquals(2.0, (float) $karigar->karigar_gold_balance_grams);
        // Settlement balance = Bench (0) - Karigar gold (2) = -2.000g (Company owes karigar 2g)
        $this->assertEquals(-2.0, (float) $karigar->settlement_balance_grams);
    }

    /**
     * Test 4: Allocate additional company gold; verify company balance / karigar bench updates exactly once.
     */
    public function test_scenario_4_additional_company_gold_allocation()
    {
        $unique = uniqid();
        $karigar = Karigar::create([
            'name' => "Karigar {$unique}",
            'karigar_code' => "KG-{$unique}",
            'primary_phone' => '9999999999',
            'status' => 'active',
            'gold_balance_grams' => 0.0,
        ]);

        $order = WorkOrder::create([
            'work_order_number' => "WO-{$unique}",
            'product_name' => "Item {$unique}",
            'karigar_id' => $karigar->id,
            'allotted_weight' => 20.000,
            'required_qty' => 1,
            'ready_qty' => 1,
            'completed_qty' => 0,
            'status' => 'in_progress',
            'current_stage' => 'in_production',
            'allotted_date' => now()->toDateString(),
        ]);

        app(\App\Http\Controllers\Api\WorkOrderController::class)->syncKarigarGoldBalance($karigar->id);
        $karigar->refresh();
        $this->assertEquals(20.0, (float) $karigar->gold_balance_grams);

        // Issue additional 5g company gold
        $res = $this->actingAs($this->adminUser)->postJson("/api/karigars/{$karigar->id}/material-action", [
            'action' => 'additional_allocation',
            'weight' => 5.000,
            'work_order_id' => $order->id,
            'reason' => 'Design requires heavier gauge wire',
        ]);

        $res->assertStatus(200);

        $order->refresh();
        $karigar->refresh();

        $this->assertEquals(5.0, (float) $order->additional_allocated_weight);
        $this->assertEquals(25.0, (float) $karigar->gold_balance_grams);
    }

    /**
     * Test 5: Return unused company gold; verify bench balance decreases and company stock increases.
     */
    public function test_scenario_5_return_unused_company_gold()
    {
        $unique = uniqid();
        $karigar = Karigar::create([
            'name' => "Karigar {$unique}",
            'karigar_code' => "KG-{$unique}",
            'primary_phone' => '9999999999',
            'status' => 'active',
            'gold_balance_grams' => 0.0,
        ]);

        $order = WorkOrder::create([
            'work_order_number' => "WO-{$unique}",
            'product_name' => "Item {$unique}",
            'karigar_id' => $karigar->id,
            'allotted_weight' => 25.000,
            'required_qty' => 1,
            'ready_qty' => 1,
            'completed_qty' => 0,
            'status' => 'in_progress',
            'current_stage' => 'in_production',
            'allotted_date' => now()->toDateString(),
        ]);

        app(\App\Http\Controllers\Api\WorkOrderController::class)->syncKarigarGoldBalance($karigar->id);

        // Return 5g unused metal
        $res = $this->actingAs($this->adminUser)->postJson("/api/karigars/{$karigar->id}/material-action", [
            'action' => 'unused_returned',
            'weight' => 5.000,
            'work_order_id' => $order->id,
            'reason' => 'Returned unused clip pieces',
        ]);

        $res->assertStatus(200);

        $order->refresh();
        $karigar->refresh();

        $this->assertEquals(5.0, (float) $order->returned_weight);
        $this->assertEquals(20.0, (float) $karigar->gold_balance_grams);
    }

    /**
     * Test 6: Image 4 status verification - single and multi-piece completion transitions.
     */
    public function test_scenario_6_live_job_status_transitions()
    {
        $unique = uniqid();
        $karigar = Karigar::create([
            'name' => "Karigar {$unique}",
            'karigar_code' => "KG-{$unique}",
            'primary_phone' => '9999999999',
            'status' => 'active',
        ]);

        $order = WorkOrder::create([
            'work_order_number' => "WO-{$unique}",
            'product_name' => "Item {$unique}",
            'karigar_id' => $karigar->id,
            'allotted_weight' => 20.000,
            'required_qty' => 2,
            'ready_qty' => 2,
            'completed_qty' => 0,
            'received_qty' => 0,
            'status' => 'in_progress',
            'current_stage' => 'in_production',
            'allotted_date' => now()->toDateString(),
        ]);

        // Receive piece 1 of 2 -> should be partially_received
        $res1 = $this->actingAs($this->adminUser)->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'gross_weight' => 10.000,
            'net_gold_weight' => 10.000,
            'stage' => 'certification',
        ]);
        $res1->assertStatus(200);
        $order->refresh();
        $this->assertEquals('partially_received', $order->status);

        // Receive piece 2 of 2 with stage 'certification'
        $res2 = $this->actingAs($this->adminUser)->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'gross_weight' => 10.000,
            'net_gold_weight' => 10.000,
            'stage' => 'certification',
        ]);
        $res2->assertStatus(200);
        $order->refresh();
        // NOT partially_received anymore! It has received all pieces, now at 'received' status awaiting certification/hallmarking
        $this->assertEquals('received', $order->status);
        $this->assertEquals('certification', $order->current_stage);
    }
}
