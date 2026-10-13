<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Karigar;
use App\Models\Client;
use App\Models\Category;
use App\Models\Product;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use App\Models\InventoryMovement;
use App\Models\PurchaseEntry;
use App\Models\Invoice;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ProductionReadinessAuditTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $karigar;
    protected $client;
    protected $category;
    protected $product;

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
            ['name' => 'Ravi Master Karigar'],
            [
                'karigar_code' => 'KRG-RAVI-01',
                'primary_phone' => '9876543210',
                'specialization' => 'Gold Jewellery',
                'status' => 'active',
            ]
        );

        $this->client = Client::firstOrCreate(
            ['client_code' => 'CL-ROYAL-01'],
            [
                'name' => 'Royal Heritage Jewellers',
                'full_name' => 'Royal Heritage Jewellers Ltd',
                'primary_phone' => '9988776655',
                'status' => 'active',
            ]
        );

        $this->category = Category::firstOrCreate(
            ['name' => 'Temple Jewellery'],
            ['code' => 'TMP-01', 'status' => 'active']
        );

        $this->product = Product::firstOrCreate(
            ['design_no' => 'DES-AUDIT-100'],
            [
                'name' => 'Audit Test Necklace',
                'product_code' => 'DES-AUDIT-100',
                'category_id' => $this->category->id,
                'metal_type' => 'gold',
                'karat' => '22K',
                'stamp' => '916',
                'current_stock_qty' => 0,
                'opening_stock_weight' => 0.000,
                'opening_fine_weight' => 0.000,
                'status' => 'active',
            ]
        );
    }

    /**
     * AREA 1: Prevent Inventory Double-Counting
     * Trace Receive -> Certification -> Hallmarking -> Final Inventory flow.
     * Ensure each piece is credited to inventory exactly once.
     * Repeated requests, retries, duplicate submissions must not increase stock.
     */
    public function test_area_1_prevent_inventory_double_counting_on_retries_and_repeated_calls()
    {
        $order = WorkOrder::create([
            'work_order_number' => 'WO-AUDIT-IDEMP-01',
            'product_name' => 'Audit Test Necklace',
            'design_code' => 'DES-AUDIT-100',
            'product_id' => $this->product->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(5)->toDateString(),
            'allotted_weight' => 15.000,
            'required_qty' => 1,
            'completed_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'finalized_qty' => 0,
            'status' => 'assigned',
            'karat' => '22K',
            'purity' => 91.60,
        ]);

        $item = WorkOrderItem::create([
            'work_order_id' => $order->id,
            'item_code' => 'JOB-IDEMP-1',
            'design_no' => 'DES-AUDIT-100',
            'product_id' => $this->product->id,
            'product_name' => 'Audit Test Necklace',
            'required_qty' => 1,
            'allotted_weight' => 15.000,
        ]);

        // Complete WIP & QC
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/wip-update", [
            'completed_now' => 1,
            'actual_weight' => 14.500,
        ])->assertOk();

        $piece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->first();
        $this->assertNotNull($piece);

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 1,
            'piece_id' => $piece->id,
        ])->assertOk();

        // Physically receive piece
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'piece_id' => $piece->id,
            'work_order_item_id' => $item->id,
            'gross_weight' => 14.500,
            'purity' => 91.60,
        ])->assertOk();

        // Certification & Hallmarking
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/certification-action", [
            'action' => 'add',
            'piece_id' => $piece->id,
            'certification_no' => 'CERT-AUDIT-001',
            'agency' => 'BIS',
        ])->assertOk();

        // Stock is still 0 before hallmarking
        $this->product->refresh();
        $this->assertEquals(0, (int)$this->product->current_stock_qty);

        // Complete Hallmarking (gates satisfied: received + certified + hallmarked)
        // This triggers syncInventoryPosting internally
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/hallmarking-action", [
            'action' => 'add',
            'piece_id' => $piece->id,
            'huid' => 'HUID-AUDIT-001',
        ])->assertOk();

        // Product stock is now credited exactly once (1 unit, 14.500g)
        $this->product->refresh();
        $this->assertEquals(1, (int)$this->product->current_stock_qty, 'Stock must be credited exactly once');
        $this->assertEquals(14.500, (float)$this->product->opening_stock_weight);

        $movementsCount = InventoryMovement::where('product_id', $this->product->id)->count();
        $this->assertEquals(1, $movementsCount, 'Exactly 1 InventoryMovement record must exist');

        // Subsequent explicit Finalize Inventory call (repeated request / retry)
        $postRes1 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/finalize-inventory");
        $postRes1->assertOk();
        $this->assertEquals(0, $postRes1->json('posted_count'), 'Repeated finalize request must not post any pieces again');

        // Stock must strictly remain 1
        $this->product->refresh();
        $this->assertEquals(1, (int)$this->product->current_stock_qty, 'Stock must not be incremented again on retry');
        $this->assertEquals(14.500, (float)$this->product->opening_stock_weight);

        $movementsCountAfter = InventoryMovement::where('product_id', $this->product->id)->count();
        $this->assertEquals(1, $movementsCountAfter, 'No duplicate InventoryMovement rows must be created');

        // Second Finalize Inventory call (repeated retry)
        $postRes2 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/finalize-inventory");
        $postRes2->assertOk();
        $this->assertEquals(0, $postRes2->json('posted_count'));
        $this->product->refresh();
        $this->assertEquals(1, (int)$this->product->current_stock_qty, 'Stock must not be incremented again on retry');
        $this->assertEquals(14.500, (float)$this->product->opening_stock_weight);

        $movementsCountAfter = InventoryMovement::where('product_id', $this->product->id)->count();
        $this->assertEquals(1, $movementsCountAfter, 'No duplicate InventoryMovement rows must be created');

        // Revisiting completed stages: re-submitting certification must not post stock again
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/certification-action", [
            'action' => 'add',
            'piece_id' => $piece->id,
            'certification_no' => 'CERT-AUDIT-001-REV',
            'agency' => 'BIS',
        ])->assertOk();

        $this->product->refresh();
        $this->assertEquals(1, (int)$this->product->current_stock_qty, 'Revisiting certification must not increase stock');
        $this->assertEquals(1, InventoryMovement::where('product_id', $this->product->id)->count());
    }

    /**
     * AREA 2: Separate Gold Rate Valuation from Actual Stock
     * Live gold rate updates affect valuation display only where intended.
     * Never modify physical gold weights, stored purchase costs, historical sales amounts.
     */
    public function test_area_2_separate_gold_rate_valuation_from_actual_stock_and_transactions()
    {
        // 1. Create a product with fixed weight and cost
        $product = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Gold Valuation Test Bangle',
            'design_no' => 'VAL-TEST-01',
            'product_code' => 'VAL-TEST-01',
            'current_stock_qty' => 5,
            'opening_stock_weight' => 50.000,
            'opening_stock_rate' => 7000.00,
            'opening_fine_weight' => 45.800,
            'status' => 'active',
        ]);

        // 2. Create historical purchase entry with fixed transaction values
        $supplier = \App\Models\Supplier::create([
            'name' => 'Gold Bullion Supplier',
            'supplier_code' => 'SUP-AUDIT-001',
        ]);

        $purchase = PurchaseEntry::create([
            'purchase_no' => 'PE-AUDIT-2026-001',
            'supplier_id' => $supplier->id,
            'purchase_date' => '2026-01-15',
            'item_name' => '24K Raw Gold Bar',
            'weight' => 100.000,
            'rate' => 7200.00,
            'total_amount' => 720000.00,
        ]);

        // 3. Create historical invoice with fixed transaction values
        $invoice = Invoice::create([
            'invoice_no' => 'INV-AUDIT-2026-001',
            'invoice_date' => '2026-01-20',
            'client_id' => $this->client->id,
            'client_name' => $this->client->full_name ?: 'Royal Heritage Jewellers',
            'amount' => 350000.00,
            'gst_amount' => 10500.00,
            'total_amount' => 360500.00,
            'status' => 'paid',
            'created_by' => $this->admin->id,
        ]);

        // 4. Update live metal rate to an extreme new rate (e.g. 15,000 per gram)
        $rateUpdateRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/metal-rates', [
            'gold24k' => 15000,
            'gold22k' => 13750,
            'silverGram' => 200,
        ]);
        $rateUpdateRes->assertOk();

        // 5. Query dashboard index to trigger all valuation calculators
        $dashRes = $this->actingAs($this->admin, 'sanctum')->getJson('/api/dashboard?refresh=1');
        $dashRes->assertOk();

        // 6. Assert physical product weights and stock have NOT changed
        $product->refresh();
        $this->assertEquals(5, (int)$product->current_stock_qty, 'Product quantity must not be altered by rate update');
        $this->assertEquals(50.000, (float)$product->opening_stock_weight, 'Product physical weight must not be altered by rate update');
        $this->assertEquals(45.800, (float)$product->opening_fine_weight, 'Product fine weight must not be altered by rate update');
        $this->assertEquals(7000.00, (float)$product->opening_stock_rate, 'Product stored unit cost must not be altered by rate update');

        // 7. Assert stored purchase entry has NOT changed
        $purchase->refresh();
        $this->assertEquals(100.000, (float)$purchase->weight, 'Purchase transaction weight must remain immutable');
        $this->assertEquals(7200.00, (float)$purchase->rate, 'Purchase transaction unit rate must remain immutable');
        $this->assertEquals(720000.00, (float)$purchase->total_amount, 'Purchase transaction total amount must remain immutable');

        // 8. Assert historical sales invoice has NOT changed
        $invoice->refresh();
        $this->assertEquals(360500.00, (float)$invoice->total_amount, 'Historical sales amount must remain immutable');
    }

    /**
     * AREA 3: Verify Partial Work Order Completion (10-piece test scenario)
     * - Work Order with 10 pieces.
     * - Send all 10 pieces through production and QC workflow.
     * - Approve and receive only 4 eligible pieces.
     * - Confirm only those 4 pieces can proceed through Certification & Hallmarking.
     * - Confirm exactly 4 pieces are finalized into inventory, no duplicate stock.
     * - Confirm remaining 6 pieces remain pending at correct individual stages and WO is not marked completed.
     * - Complete the remaining pieces and verify WO closes only when all 10 pieces reach final stage.
     * - Check rework, repeated submissions, and mixed piece statuses.
     */
    public function test_area_3_ten_piece_partial_work_order_completion_workflow()
    {
        $tenPieceProduct = Product::create([
            'category_id' => $this->category->id,
            'name' => 'Temple Bangles 10 Pcs Set',
            'design_no' => 'DES-BGL-10',
            'product_code' => 'DES-BGL-10',
            'current_stock_qty' => 0,
            'opening_stock_weight' => 0.000,
            'opening_fine_weight' => 0.000,
            'status' => 'active',
        ]);

        $order = WorkOrder::create([
            'work_order_number' => 'WO-AUDIT-10PCS',
            'product_name' => 'Temple Bangles 10 Pcs Set',
            'design_code' => 'DES-BGL-10',
            'product_id' => $tenPieceProduct->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(14)->toDateString(),
            'allotted_weight' => 100.000,
            'required_qty' => 10,
            'completed_qty' => 0,
            'qc_pending_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'finalized_qty' => 0,
            'status' => 'assigned',
            'karat' => '22K',
            'purity' => 91.60,
        ]);

        $item = WorkOrderItem::create([
            'work_order_id' => $order->id,
            'item_code' => 'JOB-BGL-10-1',
            'design_no' => 'DES-BGL-10',
            'product_id' => $tenPieceProduct->id,
            'product_name' => 'Temple Bangles 10 Pcs Set',
            'required_qty' => 10,
            'allotted_weight' => 100.000,
        ]);

        // Step 1: Send all 10 pieces through production
        $wipRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/wip-update", [
            'completed_now' => 10,
            'actual_weight' => 99.000,
            'remarks' => 'Completed all 10 bangles',
        ]);
        $wipRes->assertOk();

        $order->refresh();
        $this->assertEquals(10, $order->completed_qty);
        $this->assertEquals(10, $order->qc_pending_qty);

        $pieces = WorkOrderReceivedPiece::where('work_order_id', $order->id)->orderBy('piece_number')->get();
        $this->assertCount(10, $pieces, 'All 10 pieces must be instantiated for tracking');

        // Step 2: Mixed QC decisions:
        // - Pieces 1..4: Approved (pass)
        // - Pieces 5..6: Returned for rework
        // - Pieces 7..10: Pending QC
        for ($i = 0; $i < 4; $i++) {
            $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/qc-action", [
                'qc_action' => 'approve',
                'quantity' => 1,
                'piece_id' => $pieces[$i]->id,
                'remarks' => "Piece #{$pieces[$i]->piece_number} passed QC",
            ])->assertOk();
        }

        for ($i = 4; $i < 6; $i++) {
            $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/qc-action", [
                'qc_action' => 'rework',
                'quantity' => 1,
                'piece_id' => $pieces[$i]->id,
                'return_reason' => 'Minor polish flaw',
            ])->assertOk();
        }

        $order->refresh();
        $this->assertEquals(4, $order->ready_qty);
        $this->assertEquals(2, $order->rework_qty);
        $this->assertEquals(4, $order->qc_pending_qty);

        // Step 3: Attempting to receive piece 5 (rework) must be rejected
        $badRecv = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'piece_id' => $pieces[4]->id,
            'work_order_item_id' => $item->id,
            'gross_weight' => 9.900,
            'purity' => 91.60,
        ]);
        $badRecv->assertStatus(422);

        // Receive ONLY the 4 eligible pieces (pieces 1..4)
        for ($i = 0; $i < 4; $i++) {
            $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
                'piece_id' => $pieces[$i]->id,
                'work_order_item_id' => $item->id,
                'gross_weight' => 9.900,
                'purity' => 91.60,
            ])->assertOk();
        }

        $order->refresh();
        $this->assertEquals(4, $order->received_qty);

        // Confirm repeated receiving of an already received piece is blocked
        $dupRecv = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'piece_id' => $pieces[0]->id,
            'work_order_item_id' => $item->id,
            'gross_weight' => 9.900,
            'purity' => 91.60,
        ]);
        $dupRecv->assertStatus(422);

        // Step 4: Confirm only received pieces can proceed to Certification and Hallmarking
        // Attempting to certify unreceived piece 7 (pending QC) must be rejected
        $badCert = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/certification-action", [
            'action' => 'add',
            'piece_id' => $pieces[6]->id,
            'certification_no' => 'CERT-INVALID',
            'agency' => 'BIS',
        ]);
        $badCert->assertStatus(422);

        // Attempting to hallmark unreceived piece 7 must be rejected
        $badHall = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/hallmarking-action", [
            'action' => 'add',
            'piece_id' => $pieces[6]->id,
            'huid' => 'HUID-INVALID',
        ]);
        $badHall->assertStatus(422);

        // Certify and Hallmark the 4 received pieces
        for ($i = 0; $i < 4; $i++) {
            $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/certification-action", [
                'action' => 'add',
                'piece_id' => $pieces[$i]->id,
                'certification_no' => "CERT-10PCS-00" . ($i + 1),
                'agency' => 'BIS',
            ])->assertOk();

            $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/hallmarking-action", [
                'action' => 'add',
                'piece_id' => $pieces[$i]->id,
                'huid' => "HUID-10PCS-00" . ($i + 1),
            ])->assertOk();
        }

        // Step 5: Finalize inventory check for the 4 pieces
        $finalRes1 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/finalize-inventory");
        $finalRes1->assertOk();

        // Confirm exactly 4 pieces in product stock
        $tenPieceProduct->refresh();
        $this->assertEquals(4, (int)$tenPieceProduct->current_stock_qty);
        $this->assertEquals(round(4 * 9.900, 3), (float)$tenPieceProduct->opening_stock_weight);

        // Confirm Work Order is NOT marked completed (only 4 of 10 done)
        $order->refresh();
        $this->assertEquals(4, $order->finalized_qty);
        $this->assertNotEquals('completed', $order->status);
        $this->assertEquals('partially_received', $order->status);

        // Confirm the remaining 6 pieces remain at their pending stages
        $p5 = WorkOrderReceivedPiece::find($pieces[4]->id);
        $p6 = WorkOrderReceivedPiece::find($pieces[5]->id);
        $this->assertEquals('rejected', $p5->qc_status);
        $this->assertEquals('rejected', $p6->qc_status);
        $this->assertNull($p5->received_at);
        $this->assertNull($p6->received_at);

        for ($i = 6; $i < 10; $i++) {
            $pRemaining = WorkOrderReceivedPiece::find($pieces[$i]->id);
            $this->assertEquals('pending', $pRemaining->qc_status);
            $this->assertNull($pRemaining->received_at);
            $this->assertFalse($pRemaining->is_inventory_posted);
        }

        // Step 6: Complete the remaining 6 pieces:
        // - Resolve rework on pieces 5..6 -> approve QC
        for ($i = 4; $i < 6; $i++) {
            $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/qc-action", [
                'qc_action' => 'approve',
                'quantity' => 1,
                'piece_id' => $pieces[$i]->id,
                'remarks' => "Piece #{$pieces[$i]->piece_number} rework resolved & approved",
            ])->assertOk();
        }

        // - Approve QC on pieces 7..10
        for ($i = 6; $i < 10; $i++) {
            $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/qc-action", [
                'qc_action' => 'approve',
                'quantity' => 1,
                'piece_id' => $pieces[$i]->id,
            ])->assertOk();
        }

        $order->refresh();
        $this->assertEquals(0, $order->qc_pending_qty);
        $this->assertEquals(0, $order->rework_qty);

        // Receive remaining 6 pieces
        for ($i = 4; $i < 10; $i++) {
            $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
                'piece_id' => $pieces[$i]->id,
                'work_order_item_id' => $item->id,
                'gross_weight' => 9.900,
                'purity' => 91.60,
            ])->assertOk();

            $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/certification-action", [
                'action' => 'add',
                'piece_id' => $pieces[$i]->id,
                'certification_no' => "CERT-10PCS-00" . ($i + 1),
                'agency' => 'BIS',
            ])->assertOk();

            $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/hallmarking-action", [
                'action' => 'add',
                'piece_id' => $pieces[$i]->id,
                'huid' => "HUID-10PCS-00" . ($i + 1),
            ])->assertOk();
        }

        $order->refresh();
        $this->assertEquals(10, $order->received_qty);

        // Finalize inventory check for the remaining pieces
        $finalRes2 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/finalize-inventory");
        $finalRes2->assertOk();

        // Confirm total 10 units in stock
        $tenPieceProduct->refresh();
        $this->assertEquals(10, (int)$tenPieceProduct->current_stock_qty);
        $this->assertEquals(round(10 * 9.900, 3), (float)$tenPieceProduct->opening_stock_weight);

        // Confirm Work Order closes ONLY NOW because all 10 pieces are completed
        $order->refresh();
        $this->assertEquals(10, $order->finalized_qty);
        $this->assertEquals('completed', $order->status);
        $this->assertEquals('completed', $order->current_stage);
    }

    /**
     * AREA 4: Verify Historical Dashboard Product Counts
     * - Card must display historical active inventory snapshot at end of period.
     * - Must not substitute period-created counts for historical totals.
     * - Date filters and timezone handling verified.
     */
    public function test_area_4_historical_dashboard_product_counts()
    {
        // Clean product slate for precise count testing
        Product::query()->delete();

        $tz = config('app.timezone', 'Asia/Kolkata');

        // Past period: 2026-01-01 to 2026-01-31
        // Create 5 products created on 2026-01-10
        for ($i = 1; $i <= 5; $i++) {
            $p = new Product([
                'category_id' => $this->category->id,
                'name' => "January Product {$i}",
                'product_code' => "JAN-PROD-{$i}",
                'design_no' => "JAN-{$i}",
                'current_stock_qty' => 1,
                'status' => 'active',
            ]);
            $p->timestamps = false;
            $p->created_at = Carbon::create(2026, 1, 10, 12, 0, 0, $tz);
            $p->updated_at = Carbon::create(2026, 1, 10, 12, 0, 0, $tz);
            $p->save();
        }

        // Current period: 2026-02-01 to 2026-02-28
        // Create 2 new products on 2026-02-15
        for ($i = 1; $i <= 2; $i++) {
            $p = new Product([
                'category_id' => $this->category->id,
                'name' => "February Product {$i}",
                'product_code' => "FEB-PROD-{$i}",
                'design_no' => "FEB-{$i}",
                'current_stock_qty' => 1,
                'status' => 'active',
            ]);
            $p->timestamps = false;
            $p->created_at = Carbon::create(2026, 2, 15, 12, 0, 0, $tz);
            $p->updated_at = Carbon::create(2026, 2, 15, 12, 0, 0, $tz);
            $p->save();
        }

        // Deactivate 1 January product on 2026-02-20
        $janProd = Product::where('product_code', 'JAN-PROD-1')->first();
        $janProd->timestamps = false;
        $janProd->status = 'inactive';
        $janProd->attributes = ['deactivated_at' => Carbon::create(2026, 2, 20, 12, 0, 0, $tz)->toDateTimeString()];
        $janProd->updated_at = Carbon::create(2026, 2, 20, 12, 0, 0, $tz);
        $janProd->save();

        // 1. Query January 2026 snapshot (start: 2026-01-01, end: 2026-01-31)
        $janDash = $this->actingAs($this->admin, 'sanctum')->getJson('/api/dashboard?start_date=2026-01-01&end_date=2026-01-31&refresh=1');
        $janDash->assertOk();

        // At end of January, exactly 5 products existed and were active (the deactivation happened in Feb)
        $this->assertEquals(5, $janDash->json('summary.inventoryProductsCount'));
        $this->assertEquals('5', $janDash->json('summary.inventoryProductsFormatted'));

        // 2. Query February 2026 snapshot (start: 2026-02-01, end: 2026-02-28)
        $febDash = $this->actingAs($this->admin, 'sanctum')->getJson('/api/dashboard?start_date=2026-02-01&end_date=2026-02-28&refresh=1');
        $febDash->assertOk();

        // At end of February, total existing active products:
        // 5 (from Jan) - 1 (deactivated in Feb) + 2 (created in Feb) = 6 products
        // Note: Period-created alone was 2, but historical total must be 6!
        $this->assertEquals(6, $febDash->json('summary.inventoryProductsCount'), 'Must display historical total (6), not just period creations (2)');
        $this->assertEquals('6', $febDash->json('summary.inventoryProductsFormatted'));
        $this->assertEquals(2, $febDash->json('summary.periodCreatedProductsCount'), 'Period created count should be 2');

        // Verify comparison against January snapshot (6 in Feb vs 5 in Jan = +20.0%)
        $metric = $febDash->json('summary.inventory_products_metric');
        $this->assertEquals('+20.0%', $metric['change']);
        $this->assertTrue($metric['is_increase']);

        // CRITICAL CHECK: An unrelated product update in March must NOT alter February historical counts!
        $janProd->timestamps = false;
        $janProd->name = 'Renamed Inactive Jan Prod';
        $janProd->updated_at = Carbon::create(2026, 3, 15, 10, 0, 0, $tz);
        $janProd->save();

        $febDashAfterUpdate = $this->actingAs($this->admin, 'sanctum')->getJson('/api/dashboard?start_date=2026-02-01&end_date=2026-02-28&refresh=1');
        $febDashAfterUpdate->assertOk();
        $this->assertEquals(6, $febDashAfterUpdate->json('summary.inventoryProductsCount'), 'Unrelated updated_at change in March must not alter February historical active count');
    }
}
