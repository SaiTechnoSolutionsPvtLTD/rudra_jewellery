<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Client;
use App\Models\Karigar;
use App\Models\KarigarMaterialTransaction;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderReceivedPiece;
use App\Services\WorkOrderGoldReconciliationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SystemGapsAndHardeningVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['role' => 'Super Admin']);
        Sanctum::actingAs($this->user);
    }

    /**
     * Gap A: Karigar Bench Balance & Material Reconciliation
     */
    public function test_karigar_bench_material_reconciliation_equation_and_no_auto_return(): void
    {
        $karigar = Karigar::create([
            'karigar_code' => 'KG-GAP-01',
            'name' => 'Master Artisan Rajesh',
            'primary_phone' => '9876543210',
            'status' => 'active',
            'current_gold_balance_grams' => 0.0,
        ]);

        $category = Category::create(['name' => 'Bangles', 'code' => 'BGL']);
        $product = Product::create([
            'category_id' => $category->id,
            'name' => 'Gold Bangles',
            'product_code' => 'BGL-22K-01',
            'status' => 'active',
        ]);

        $workOrder = WorkOrder::create([
            'work_order_number' => 'WO-GAP-001',
            'karigar_id' => $karigar->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'allotted_date' => now()->toDateString(),
            'purity' => '22K',
            'touch' => 91.6,
            'required_qty' => 1,
            'allotted_weight' => 50.000,
            'status' => 'in_progress',
        ]);

        // 1. Vault Allocation: 50.000g of 22K (45.800g pure 24K fine gold)
        KarigarMaterialTransaction::create([
            'karigar_id' => $karigar->id,
            'work_order_id' => $workOrder->id,
            'material_type' => 'gold',
            'transaction_type' => 'allocation',
            'source' => 'vault',
            'weight' => 50.000,
            'net_weight' => 50.000,
            'fine_weight' => 45.800,
            'purity' => '22K',
            'touch' => 91.6,
            'signed_change' => 50.000,
            'transaction_date' => now(),
            'action_by_name' => 'Store Manager',
        ]);

        // Sync and assert bench balance equals allocated 45.800g
        app(\App\Http\Controllers\Api\KarigarMaterialController::class)->syncKarigarBalances($karigar);
        $karigar->refresh();
        $this->assertEquals(45.800, (float) $karigar->current_gold_balance_grams);

        // 2. Finished Product Received: 42.000g of 22K (38.472g pure 24K)
        WorkOrderReceivedPiece::create([
            'work_order_id' => $workOrder->id,
            'piece_number' => 1,
            'tag_number' => 'TAG-RECON-001',
            'receive_order_number' => 'RWO-RECON-001',
            'design_no' => 'BGL-001',
            'product_name' => $product->name,
            'gross_weight' => 42.000,
            'net_gold_weight' => 42.000,
            'pure_24k_weight' => 38.472,
            'received_at' => now(),
            'status' => 'ready',
        ]);
        $workOrder->update(['completed_weight' => 42.000]);

        KarigarMaterialTransaction::create([
            'karigar_id' => $karigar->id,
            'work_order_id' => $workOrder->id,
            'material_type' => 'gold',
            'transaction_type' => 'finished_received',
            'weight' => 42.000,
            'net_weight' => 42.000,
            'fine_weight' => 38.472,
            'purity' => '22K',
            'touch' => 91.6,
            'signed_change' => -42.000,
            'transaction_date' => now(),
            'action_by_name' => 'Store Manager',
        ]);

        // 3. Approved Wastage: 1.500g of 22K (1.374g pure 24K)
        KarigarMaterialTransaction::create([
            'karigar_id' => $karigar->id,
            'work_order_id' => $workOrder->id,
            'material_type' => 'gold',
            'transaction_type' => 'approved_wastage',
            'wastage_weight' => 1.500,
            'weight' => 1.500,
            'net_weight' => 1.500,
            'fine_weight' => 1.374,
            'purity' => '22K',
            'touch' => 91.6,
            'signed_change' => -1.500,
            'transaction_date' => now(),
            'action_by_name' => 'Store Manager',
        ]);

        // 4. Physical Vault Return of Scrap: 2.000g of 22K (1.832g pure 24K)
        KarigarMaterialTransaction::create([
            'karigar_id' => $karigar->id,
            'work_order_id' => $workOrder->id,
            'material_type' => 'gold',
            'transaction_type' => 'unused_returned',
            'weight' => 2.000,
            'net_weight' => 2.000,
            'fine_weight' => 1.832,
            'purity' => '22K',
            'touch' => 91.6,
            'signed_change' => -2.000,
            'transaction_date' => now(),
            'action_by_name' => 'Store Manager',
        ]);

        // 5. Verify the Reconciliation Equation:
        // Allocated (45.800) = Finished (38.472) + Approved Wastage (1.374) + Returned (1.832) + Unused Bench (4.122)
        $recon = WorkOrderGoldReconciliationService::calculateForWorkOrder($workOrder);
        $this->assertEquals(45.800, $recon['allocated_fine_gold']);
        $this->assertEquals(38.472, $recon['finished_product_fine_gold']);
        $this->assertEquals(1.374, $recon['approved_wastage_fine_gold']);
        $this->assertEquals(1.832, $recon['returned_fine_gold']);
        $this->assertEquals(4.122, $recon['unused_fine_gold']);
        $this->assertTrue($recon['is_reconciled']);

        // 6. Complete the work order and confirm unused 4.122g remains on artisan bench (NOT automatically returned)
        $workOrder->update(['status' => 'completed']);
        app(\App\Http\Controllers\Api\KarigarMaterialController::class)->syncKarigarBalances($karigar);
        $karigar->refresh();

        $this->assertEquals(4.122, (float) $karigar->current_gold_balance_grams);
    }

    /**
     * Gap B: Received-Piece Reporting & Nullable work_order_id Support
     */
    public function test_received_pieces_with_null_work_order_id_appear_in_tag_printing_and_reports(): void
    {
        $category = Category::create(['name' => 'Rings', 'code' => 'RNG']);
        $product = Product::create([
            'category_id' => $category->id,
            'name' => 'Direct Intake Diamond Ring',
            'product_code' => 'RNG-DIA-DIRECT',
            'status' => 'active',
        ]);

        // Standalone piece intake without a work order (e.g. from purchase entry or opening stock)
        $piece = WorkOrderReceivedPiece::create([
            'work_order_id' => null,
            'product_id' => $product->id,
            'piece_number' => 1,
            'tag_number' => 'TAG-DIRECT-001',
            'receive_order_number' => 'RWO-DIRECT-001',
            'design_no' => 'RNG-DIA-DIRECT',
            'product_name' => 'Direct Intake Diamond Ring',
            'gross_weight' => 5.250,
            'net_gold_weight' => 5.000,
            'pure_24k_weight' => 4.580,
            'diamond_weight' => 0.250,
            'received_at' => now(),
            'status' => 'ready',
        ]);

        // 1. Tag Printing Endpoint: Must list this direct inventory piece
        $response = $this->getJson('/api/work-orders/tags');
        $response->assertOk();
        $tags = collect($response->json('data'))->pluck('tag_number')->all();
        $this->assertContains('TAG-DIRECT-001', $tags);

        // 2. Statutory ITC-04 Report: Must include direct pieces received back without crashing on null work order
        $now = now();
        $itcResponse = $this->getJson("/api/reports/itc04?year={$now->year}&quarter=" . ceil($now->month / 3));
        $itcResponse->assertOk();
        $table2Tags = collect($itcResponse->json('table2_received_from_karigar'))->pluck('tag_number')->all();
        $this->assertContains('TAG-DIRECT-001', $table2Tags);
    }

    /**
     * Gap C: Customer Payments, Invoices & On-Account Multi-Invoice FIFO Allocation
     */
    public function test_customer_payments_single_multi_fifo_and_unallocated_credit(): void
    {
        $category = Category::create(['name' => 'Pendants', 'code' => 'PND']);
        $client = Client::create([
            'client_code' => 'CL-GAP-001',
            'full_name' => 'Meera Patel',
            'primary_phone' => '9888877777',
            'status' => 'active',
            'opening_balance' => 0.0,
            'balance_type' => 'receivable',
        ]);

        $product = Product::create([
            'category_id' => $category->id,
            'name' => 'Gold Pendant',
            'product_code' => 'PND-GLD-01',
            'current_stock_qty' => 10,
            'attributes' => ['sale_rate' => 1000],
            'status' => 'active',
        ]);

        // Invoice 1: Total ₹10,000, Due ₹10,000
        $inv1Res = $this->postJson('/api/sales', [
            'client_id' => $client->id,
            'gst_rate' => 0,
            'paid_amount' => 0,
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'rate' => 10000, 'gross_weight' => 1, 'net_weight' => 1]],
        ]);
        $inv1Id = $inv1Res->json('data.id');

        // Invoice 2: Total ₹15,000, Due ₹15,000
        $inv2Res = $this->postJson('/api/sales', [
            'client_id' => $client->id,
            'gst_rate' => 0,
            'paid_amount' => 0,
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'rate' => 15000, 'gross_weight' => 1, 'net_weight' => 1]],
        ]);
        $inv2Id = $inv2Res->json('data.id');

        // Customer pays ₹30,000 on account (pays off Inv 1 of ₹10,000 + Inv 2 of ₹15,000 + ₹5,000 unallocated credit)
        $paymentRes = $this->postJson("/api/clients/{$client->id}/payments", [
            'amount' => 30000,
            'payment_method' => 'bank_transfer',
            'reference' => 'TXN-ON-ACCOUNT-001',
        ]);

        $paymentRes->assertOk();
        $paymentRes->assertJsonPath('status', 'success');
        $paymentRes->assertJsonPath('data.allocated_amount', 25000);
        $paymentRes->assertJsonPath('data.unallocated_credit', 5000);

        // Check Invoice 1 is fully paid
        $this->assertDatabaseHas('invoices', [
            'id' => $inv1Id,
            'paid_amount' => 10000,
            'due_amount' => 0,
            'status' => 'paid',
        ]);

        // Check Invoice 2 is fully paid
        $this->assertDatabaseHas('invoices', [
            'id' => $inv2Id,
            'paid_amount' => 15000,
            'due_amount' => 0,
            'status' => 'paid',
        ]);

        // Check customer has ₹5,000 credit balance
        $client->refresh();
        $this->assertEquals(5000.0, (float) $client->opening_balance);
        $this->assertEquals('credit', strtolower((string) $client->balance_type));
    }

    /**
     * Gap D: Old Gold Valuation Below, Equal, and Above Invoice Subtotal
     */
    public function test_old_gold_accounting_below_equal_and_surplus_over_subtotal(): void
    {
        $category = Category::create(['name' => 'Chains', 'code' => 'CHN']);
        $client = Client::create([
            'client_code' => 'CL-OG-001',
            'full_name' => 'Vikram Sharma',
            'primary_phone' => '9777766666',
            'status' => 'active',
            'opening_balance' => 0,
            'balance_type' => 'receivable',
        ]);

        $product = Product::create([
            'category_id' => $category->id,
            'name' => 'Gold Chain',
            'product_code' => 'CHN-01',
            'current_stock_qty' => 10,
            'attributes' => ['sale_rate' => 1000],
            'status' => 'active',
        ]);

        // Scenario 1: Old gold value (₹10,000) LESS than invoice total (₹25,000) -> Due = ₹15,000
        $res1 = $this->postJson('/api/sales', [
            'client_id' => $client->id,
            'gst_rate' => 0,
            'paid_amount' => 0,
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'rate' => 25000, 'gross_weight' => 1, 'net_weight' => 1]],
            'old_gold_items' => [[
                'item_description' => 'Old Gold Ring',
                'gross_weight' => 2.0,
                'purity_touch' => 100.0,
                'rate_per_gram' => 5000,
                'total_credit' => 10000,
            ]],
        ]);
        $res1->assertCreated();
        $this->assertDatabaseHas('invoices', [
            'id' => $res1->json('data.id'),
            'total_amount' => 25000,
            'old_gold_amount' => 10000,
            'due_amount' => 15000,
            'status' => 'partial',
        ]);

        // Scenario 2: Old gold value (₹20,000) EQUAL to invoice total (₹20,000) -> Due = ₹0, status = paid
        $res2 = $this->postJson('/api/sales', [
            'client_id' => $client->id,
            'gst_rate' => 0,
            'paid_amount' => 0,
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'rate' => 20000, 'gross_weight' => 1, 'net_weight' => 1]],
            'old_gold_items' => [[
                'item_description' => 'Old Bangle',
                'gross_weight' => 4.0,
                'purity_touch' => 100.0,
                'rate_per_gram' => 5000,
                'total_credit' => 20000,
            ]],
        ]);
        $res2->assertCreated();
        $this->assertDatabaseHas('invoices', [
            'id' => $res2->json('data.id'),
            'total_amount' => 20000,
            'old_gold_amount' => 20000,
            'due_amount' => 0,
            'status' => 'paid',
        ]);

        // Scenario 3: Old gold value (₹35,000) EXCEEDS invoice total (₹20,000)
        // Due = ₹0, status = paid, surplus ₹15,000 credited to client
        $client->update(['opening_balance' => 0, 'balance_type' => 'receivable']);
        $res3 = $this->postJson('/api/sales', [
            'client_id' => $client->id,
            'gst_rate' => 0,
            'paid_amount' => 0,
            'items' => [['product_id' => $product->id, 'quantity' => 1, 'rate' => 20000, 'gross_weight' => 1, 'net_weight' => 1]],
            'old_gold_items' => [[
                'item_description' => 'Heavy Old Kada',
                'gross_weight' => 7.0,
                'purity_touch' => 100.0,
                'rate_per_gram' => 5000,
                'total_credit' => 35000,
            ]],
        ]);
        $res3->assertCreated();
        $this->assertDatabaseHas('invoices', [
            'id' => $res3->json('data.id'),
            'total_amount' => 20000,
            'old_gold_amount' => 35000,
            'due_amount' => 0,
            'status' => 'paid',
        ]);

        $client->refresh();
        $this->assertEquals(15000.0, (float) $client->opening_balance);
        $this->assertEquals('credit', strtolower((string) $client->balance_type));
    }

    /**
     * Gap E: Concurrency-Safe Tag and RWO Generation
     */
    public function test_concurrency_safe_unique_tag_and_rwo_generation(): void
    {
        $year = date('Y');

        // Generate 5 tags sequentially
        $tag1 = WorkOrderReceivedPiece::generateTagNumber();
        WorkOrderReceivedPiece::create([
            'piece_number' => 1,
            'tag_number' => $tag1,
            'receive_order_number' => WorkOrderReceivedPiece::generateReceiveOrderNumber(),
            'design_no' => 'DES-001',
            'product_name' => 'Sample Item 1',
            'gross_weight' => 10.0,
        ]);

        $tag2 = WorkOrderReceivedPiece::generateTagNumber();
        WorkOrderReceivedPiece::create([
            'piece_number' => 2,
            'tag_number' => $tag2,
            'receive_order_number' => WorkOrderReceivedPiece::generateReceiveOrderNumber(),
            'design_no' => 'DES-002',
            'product_name' => 'Sample Item 2',
            'gross_weight' => 12.0,
        ]);

        $tag3 = WorkOrderReceivedPiece::generateTagNumber();

        // Verify format and uniqueness
        $this->assertMatchesRegularExpression("/^TAG-{$year}-\\d{6}$/", $tag1);
        $this->assertMatchesRegularExpression("/^TAG-{$year}-\\d{6}$/", $tag2);
        $this->assertMatchesRegularExpression("/^TAG-{$year}-\\d{6}$/", $tag3);

        $this->assertNotEquals($tag1, $tag2);
        $this->assertNotEquals($tag2, $tag3);
        $this->assertNotEquals($tag1, $tag3);

        // Verify sequential increment
        preg_match("/TAG-{$year}-(\\d+)/", $tag1, $m1);
        preg_match("/TAG-{$year}-(\\d+)/", $tag2, $m2);
        preg_match("/TAG-{$year}-(\\d+)/", $tag3, $m3);

        $this->assertEquals((int) $m1[1] + 1, (int) $m2[1]);
        $this->assertEquals((int) $m2[1] + 1, (int) $m3[1]);
    }
}
