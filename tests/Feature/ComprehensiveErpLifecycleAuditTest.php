<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Karigar;
use App\Models\Client;
use App\Models\Category;
use App\Models\Subcategory;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use App\Models\Invoice;
use App\Models\InventoryMovement;
use App\Models\GoldRate;
use App\Services\MetalRateService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

class ComprehensiveErpLifecycleAuditTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Karigar $karigarA;
    protected Karigar $karigarB;
    protected Client $client1;
    protected Client $client2;
    protected Category $category;
    protected Subcategory $subcategory;
    protected Product $ringProduct;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::firstOrCreate(
            ['email' => 'admin@rudhra.test'],
            [
                'name' => 'Super Administrator',
                'password' => bcrypt('password123'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );

        $this->karigarA = Karigar::create([
            'karigar_code' => 'KRG-AAA-01',
            'name' => 'Karigar Anand A',
            'primary_phone' => '9876543211',
            'status' => 'active',
            'current_gold_balance_grams' => 0.0,
        ]);

        $this->karigarB = Karigar::create([
            'karigar_code' => 'KRG-BBB-02',
            'name' => 'Karigar Balan B',
            'primary_phone' => '9876543222',
            'status' => 'active',
            'current_gold_balance_grams' => 0.0,
        ]);

        $this->client1 = Client::create([
            'client_code' => 'CL-ROYAL-77',
            'full_name' => 'Royal Jewellers Chennai',
            'primary_phone' => '9888877771',
            'membership_tier' => 'gold',
            'status' => 'active',
        ]);

        $this->client2 = Client::create([
            'client_code' => 'CL-MEENA-88',
            'full_name' => 'Meenakshi Gems & Gold',
            'primary_phone' => '9888877772',
            'membership_tier' => 'platinum',
            'status' => 'active',
        ]);

        $this->category = Category::create([
            'name' => 'Finger Rings',
            'code' => 'RNG-CAT',
            'status' => 'active',
        ]);

        $this->subcategory = Subcategory::create([
            'category_id' => $this->category->id,
            'name' => 'Diamond Solitaire Rings',
            'code' => 'SOL-RNG',
            'status' => 'active',
        ]);

        $this->ringProduct = Product::create([
            'name' => 'Classic Solitaire Ring RING-101',
            'product_code' => 'RING-101',
            'design_no' => 'RING-101',
            'category_id' => $this->category->id,
            'subcategory_id' => $this->subcategory->id,
            'metal_type' => 'gold',
            'karat' => '22K',
            'stamp' => '916',
            'current_stock_qty' => 0,
            'opening_stock_weight' => 0.000,
            'opening_fine_weight' => 0.000,
            'attributes' => [
                'design_no' => 'RING-101',
                'gross_wt' => 5.500,
                'net_wt' => 5.200,
                'karat' => '22K',
                'stamp' => '916',
                'diamond_count' => 1,
                'diamond_weight' => 0.30,
            ],
            'status' => 'active',
        ]);
    }

    /**
     * SECTION 1: Product Master & Raw Material Stock Isolation
     */
    public function test_inventory_product_master_and_raw_material_isolation(): void
    {
        // 1. Raw material purchase: verify it updates raw material stock WITHOUT creating finished products
        $rawMaterial = RawMaterial::updateOrCreate(
            ['material_type' => 'gold'],
            [
                'name' => '24K Pure Gold Granules',
                'unit' => 'g',
                'opening_weight' => 100.000,
                'purchased_weight' => 0.000,
                'allocated_weight' => 0.000,
                'current_balance' => 100.000,
            ]
        );

        $initialBalance = (float)$rawMaterial->current_balance;
        $prodCountBefore = Product::count();

        // Perform raw material quick stock add
        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/raw-materials/quick-stock-add', [
            'material_type' => 'gold',
            'weight' => 50.000,
            'unit' => 'g',
            'notes' => 'Bullion addition to vault',
        ]);
        $res->assertOk();

        $rawMaterial->refresh();
        $this->assertEquals($initialBalance + 50.000, (float)$rawMaterial->current_balance);

        // Finished products count MUST NOT increase from raw material purchase
        $this->assertEquals($prodCountBefore, Product::count());

        // 2. Product creation validation: missing name or category rejected
        $invalidRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/products', [
            'name' => '',
            'product_code' => '',
        ]);
        $invalidRes->assertStatus(422);

        // 3. Duplicate product_code check
        $dupRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/products', [
            'name' => 'Duplicate Ring',
            'product_code' => 'RING-101',
            'design_no' => 'RING-101',
            'category_id' => $this->category->id,
        ]);
        $dupRes->assertStatus(422);
    }

    /**
     * SECTION 2, 3, 4: Two Karigars, Same Design, 20 Distinct Pieces, Piece-Level Tracking & Tags
     */
    public function test_two_karigars_same_design_twenty_distinct_pieces_lifecycle(): void
    {
        // Work Order A: 10 pieces to Karigar A
        $orderA = WorkOrder::create([
            'work_order_number' => 'WO-RING-A',
            'product_name' => 'Classic Solitaire Ring RING-101',
            'design_code' => 'RING-101',
            'product_id' => $this->ringProduct->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client1->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(10)->toDateString(),
            'allotted_weight' => 55.000,
            'required_qty' => 10,
            'completed_qty' => 0,
            'qc_pending_qty' => 0,
            'qc_approved_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'finalized_qty' => 0,
            'status' => 'assigned',
            'current_stage' => 'work_started',
            'karat' => '22K',
            'purity' => 91.60,
        ]);

        $itemA = WorkOrderItem::create([
            'work_order_id' => $orderA->id,
            'item_code' => 'ITEM-WO-A-1',
            'design_no' => 'RING-101',
            'product_id' => $this->ringProduct->id,
            'product_name' => 'Classic Solitaire Ring RING-101',
            'required_qty' => 10,
            'completed_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'allotted_weight' => 55.000,
        ]);

        // Work Order B: 10 pieces to Karigar B
        $orderB = WorkOrder::create([
            'work_order_number' => 'WO-RING-B',
            'product_name' => 'Classic Solitaire Ring RING-101',
            'design_code' => 'RING-101',
            'product_id' => $this->ringProduct->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client2->id,
            'karigar_id' => $this->karigarB->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(10)->toDateString(),
            'allotted_weight' => 55.000,
            'required_qty' => 10,
            'completed_qty' => 0,
            'qc_pending_qty' => 0,
            'qc_approved_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'finalized_qty' => 0,
            'status' => 'assigned',
            'current_stage' => 'work_started',
            'karat' => '22K',
            'purity' => 91.60,
        ]);

        $itemB = WorkOrderItem::create([
            'work_order_id' => $orderB->id,
            'item_code' => 'ITEM-WO-B-1',
            'design_no' => 'RING-101',
            'product_id' => $this->ringProduct->id,
            'product_name' => 'Classic Solitaire Ring RING-101',
            'required_qty' => 10,
            'completed_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'allotted_weight' => 55.000,
        ]);

        // Progress Order A: 10 pieces produced -> QC approved
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$orderA->id}/wip-update", [
            'completed_now' => 10,
            'actual_weight' => 54.800,
            'work_order_item_id' => $itemA->id,
        ])->assertOk();

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$orderA->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 10,
        ])->assertOk();

        // Progress Order B: 10 pieces produced -> QC approved
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$orderB->id}/wip-update", [
            'completed_now' => 10,
            'actual_weight' => 54.900,
            'work_order_item_id' => $itemB->id,
        ])->assertOk();

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$orderB->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 10,
        ])->assertOk();

        // Prior to physical receiving, saleable inventory MUST BE ZERO
        $this->ringProduct->refresh();
        $this->assertEquals(0, $this->ringProduct->current_stock_qty);

        // Receive all 10 pieces for Order A
        for ($i = 1; $i <= 10; $i++) {
            $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$orderA->id}/receive-piece", [
                'work_order_item_id' => $itemA->id,
                'gross_weight' => 5.480,
                'net_gold_weight' => 5.200,
                'diamond_weight' => 0.30,
                'diamond_count' => 1,
                'purity' => 91.60,
                'gold_karat' => '22K',
                'description' => "Order A Piece {$i}",
            ])->assertOk();
        }

        // Receive all 10 pieces for Order B
        for ($i = 1; $i <= 10; $i++) {
            $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$orderB->id}/receive-piece", [
                'work_order_item_id' => $itemB->id,
                'gross_weight' => 5.490,
                'net_gold_weight' => 5.210,
                'diamond_weight' => 0.30,
                'diamond_count' => 1,
                'purity' => 91.60,
                'gold_karat' => '22K',
                'description' => "Order B Piece {$i}",
            ])->assertOk();
        }

        // Complete certification and hallmarking for both orders
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$orderA->id}/certification-action", [
            'action' => 'add', 'certification_no' => 'CERT-WOA-01',
        ])->assertOk();
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$orderA->id}/hallmarking-action", [
            'action' => 'add', 'huid' => 'HUID-WOA-01',
        ])->assertOk();

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$orderB->id}/certification-action", [
            'action' => 'skip', 'reason' => 'BIS Hallmarked only',
        ])->assertOk();
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$orderB->id}/hallmarking-action", [
            'action' => 'add', 'huid' => 'HUID-WOB-01',
        ])->assertOk();

        // Post both orders to inventory
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$orderA->id}/finalize-inventory")->assertOk();
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$orderB->id}/finalize-inventory")->assertOk();

        // 1. System tracks EXACTLY 20 distinct physical pieces
        $allPieces = WorkOrderReceivedPiece::where('design_no', 'RING-101')->get();
        $this->assertCount(20, $allPieces);

        // 2. Each piece has a UNIQUE tag number
        $tags = $allPieces->pluck('tag_number')->filter()->all();
        $this->assertCount(20, array_unique($tags), 'All 20 physical pieces must have completely unique tag numbers');

        // 3. 10 pieces belong to Karigar A / Work Order A, 10 belong to Karigar B / Work Order B
        $piecesA = $allPieces->where('work_order_id', $orderA->id);
        $piecesB = $allPieces->where('work_order_id', $orderB->id);
        $this->assertCount(10, $piecesA);
        $this->assertCount(10, $piecesB);
        $this->assertEquals(10, $piecesA->where('karigar_id', $this->karigarA->id)->count());
        $this->assertEquals(10, $piecesB->where('karigar_id', $this->karigarB->id)->count());

        // 4. Total finished inventory is exactly 20
        $this->ringProduct->refresh();
        $this->assertEquals(20, $this->ringProduct->current_stock_qty);

        // 5. Query available pieces for sale: exactly 20 available pieces returned
        $availRes = $this->actingAs($this->admin, 'sanctum')->getJson('/api/sales/available-pieces?design_no=RING-101');
        $availRes->assertOk();
        $availList = $availRes->json('data');
        $this->assertCount(20, $availList);
    }

    /**
     * SECTION 5: Sales, Exact Tag Selection, Inventory Integrity, and Isolation
     */
    public function test_sales_piece_level_selection_and_inventory_deduction(): void
    {
        // First run setup of 20 pieces
        $this->test_two_karigars_same_design_twenty_distinct_pieces_lifecycle();

        $piecesA = WorkOrderReceivedPiece::where('work_order_id', WorkOrder::where('work_order_number', 'WO-RING-A')->value('id'))
            ->orderBy('id', 'asc')
            ->get();
        $piecesB = WorkOrderReceivedPiece::where('work_order_id', WorkOrder::where('work_order_number', 'WO-RING-B')->value('id'))
            ->orderBy('id', 'asc')
            ->get();

        $selectedPiece1 = $piecesA[0];
        $selectedPiece2 = $piecesA[1];

        // Client 1 purchases 2 specifically selected pieces from Work Order A
        $saleRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/sales', [
            'client_id' => $this->client1->id,
            'gst_rate' => 3.0,
            'paid_amount' => 50000,
            'payment_method' => 'bank_transfer',
            'items' => [
                [
                    'product_id' => $this->ringProduct->id,
                    'product_name' => 'Classic Solitaire Ring RING-101',
                    'product_code' => 'RING-101',
                    'quantity' => 2,
                    'rate' => 7500,
                    'gross_weight' => 5.480,
                    'net_weight' => 5.200,
                    'piece_ids' => [$selectedPiece1->id, $selectedPiece2->id],
                    'tag_numbers' => [$selectedPiece1->tag_number, $selectedPiece2->tag_number],
                ]
            ],
        ]);
        $saleRes->assertCreated();
        $invoiceId = $saleRes->json('data.id');

        // Confirm the two exact tags are linked to that client and invoice
        $selectedPiece1->refresh();
        $selectedPiece2->refresh();
        $this->assertEquals('sold', $selectedPiece1->status);
        $this->assertEquals('sold', $selectedPiece2->status);
        $this->assertEquals($invoiceId, $selectedPiece1->invoice_id);
        $this->assertEquals($invoiceId, $selectedPiece2->invoice_id);
        $this->assertEquals($this->client1->id, $selectedPiece1->client_id);
        $this->assertEquals($this->client1->id, $selectedPiece2->client_id);

        // Confirm Work Order A has 8 available pieces remaining and Work Order B still has 10
        $availPiecesA = WorkOrderReceivedPiece::where('work_order_id', $piecesA[0]->work_order_id)
            ->where(fn($q) => $q->whereNull('status')->orWhere('status', '!=', 'sold'))
            ->whereNull('invoice_id')
            ->count();
        $availPiecesB = WorkOrderReceivedPiece::where('work_order_id', $piecesB[0]->work_order_id)
            ->where(fn($q) => $q->whereNull('status')->orWhere('status', '!=', 'sold'))
            ->whereNull('invoice_id')
            ->count();

        $this->assertEquals(8, $availPiecesA, 'Work Order A must have exactly 8 available unsold pieces remaining');
        $this->assertEquals(10, $availPiecesB, 'Work Order B must still have all 10 available unsold pieces remaining');

        // Confirm total available inventory decreases from 20 to 18
        $this->ringProduct->refresh();
        $this->assertEquals(18, $this->ringProduct->current_stock_qty);

        // Confirm available pieces API returns 18 and does NOT contain the 2 sold tags
        $availAfter = $this->actingAs($this->admin, 'sanctum')->getJson('/api/sales/available-pieces?design_no=RING-101')->json('data');
        $this->assertCount(18, $availAfter);
        $availTagNumbers = collect($availAfter)->pluck('tag_number')->all();
        $this->assertNotContains($selectedPiece1->tag_number, $availTagNumbers);
        $this->assertNotContains($selectedPiece2->tag_number, $availTagNumbers);

        // SCENARIO EXTENSION: Repeat with pieces selected from BOTH Work Order A and Work Order B
        $selectedPieceA3 = $piecesA[2];
        $selectedPieceB1 = $piecesB[0];
        $selectedPieceB2 = $piecesB[1];

        $sale2Res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/sales', [
            'client_id' => $this->client2->id,
            'gst_rate' => 3.0,
            'paid_amount' => 75000,
            'payment_method' => 'cash',
            'items' => [
                [
                    'product_id' => $this->ringProduct->id,
                    'product_name' => 'Classic Solitaire Ring RING-101',
                    'product_code' => 'RING-101',
                    'quantity' => 1,
                    'rate' => 7500,
                    'gross_weight' => 5.480,
                    'piece_ids' => [$selectedPieceA3->id],
                    'tag_numbers' => [$selectedPieceA3->tag_number],
                ],
                [
                    'product_id' => $this->ringProduct->id,
                    'product_name' => 'Classic Solitaire Ring RING-101',
                    'product_code' => 'RING-101',
                    'quantity' => 2,
                    'rate' => 7500,
                    'gross_weight' => 5.490,
                    'piece_ids' => [$selectedPieceB1->id, $selectedPieceB2->id],
                    'tag_numbers' => [$selectedPieceB1->tag_number, $selectedPieceB2->tag_number],
                ]
            ],
        ]);
        $sale2Res->assertCreated();

        // Remaining counts: Work Order A has 7 (10 - 3), Work Order B has 8 (10 - 2)
        $availPiecesA2 = WorkOrderReceivedPiece::where('work_order_id', $piecesA[0]->work_order_id)
            ->where(fn($q) => $q->whereNull('status')->orWhere('status', '!=', 'sold'))
            ->whereNull('invoice_id')
            ->count();
        $availPiecesB2 = WorkOrderReceivedPiece::where('work_order_id', $piecesB[0]->work_order_id)
            ->where(fn($q) => $q->whereNull('status')->orWhere('status', '!=', 'sold'))
            ->whereNull('invoice_id')
            ->count();

        $this->assertEquals(7, $availPiecesA2);
        $this->assertEquals(8, $availPiecesB2);

        // Total inventory decreased from 18 to 15
        $this->ringProduct->refresh();
        $this->assertEquals(15, $this->ringProduct->current_stock_qty);
    }

    /**
     * SECTION 6: Draft vs Finalized Invoice, Concurrency, and Cancellation/Stock Reversal
     */
    public function test_draft_invoice_concurrency_and_cancellation(): void
    {
        $this->test_two_karigars_same_design_twenty_distinct_pieces_lifecycle();

        $piecesA = WorkOrderReceivedPiece::where('work_order_id', WorkOrder::where('work_order_number', 'WO-RING-A')->value('id'))
            ->orderBy('id', 'asc')
            ->get();

        $draftPiece = $piecesA[4];

        // 1. Create a DRAFT invoice
        $draftRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/sales', [
            'client_id' => $this->client1->id,
            'is_draft' => true,
            'items' => [
                [
                    'product_id' => $this->ringProduct->id,
                    'quantity' => 1,
                    'rate' => 7500,
                    'piece_ids' => [$draftPiece->id],
                    'tag_numbers' => [$draftPiece->tag_number],
                ]
            ]
        ]);
        $draftRes->assertCreated();
        $draftInvoiceId = $draftRes->json('data.id');

        // Draft DOES NOT mark product as sold and DOES NOT deduct stock
        $draftPiece->refresh();
        $this->assertNotEquals('sold', $draftPiece->status);
        $this->ringProduct->refresh();
        $this->assertEquals(20, $this->ringProduct->current_stock_qty);

        // 2. Finalize the invoice
        $finRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/sales/{$draftInvoiceId}/finalize");
        $finRes->assertOk();

        // Now piece is sold and stock deducted
        $draftPiece->refresh();
        $this->assertEquals('sold', $draftPiece->status);
        $this->assertEquals($draftInvoiceId, $draftPiece->invoice_id);
        $this->ringProduct->refresh();
        $this->assertEquals(19, $this->ringProduct->current_stock_qty);

        // 3. Concurrency check: attempting to sell the same piece again FAILS
        $dupSaleRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/sales', [
            'client_id' => $this->client2->id,
            'items' => [
                [
                    'product_id' => $this->ringProduct->id,
                    'quantity' => 1,
                    'rate' => 7500,
                    'piece_ids' => [$draftPiece->id],
                    'tag_numbers' => [$draftPiece->tag_number],
                ]
            ]
        ]);
        $dupSaleRes->assertStatus(422);

        // 4. Cancel the invoice -> verify physical piece is restored and inventory stock restored
        $cancelRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/sales/{$draftInvoiceId}/cancel", [
            'reason' => 'Customer requested cancellation',
        ]);
        $cancelRes->assertOk();

        $draftPiece->refresh();
        $this->assertEquals('in_stock', $draftPiece->status);
        $this->assertNull($draftPiece->invoice_id);
        $this->assertNull($draftPiece->client_id);

        $this->ringProduct->refresh();
        $this->assertEquals(20, $this->ringProduct->current_stock_qty, 'Inventory stock must be fully restored upon invoice cancellation');

        // Check InventoryMovement recorded a sales_return
        $returnMovement = InventoryMovement::where('invoice_id', $draftInvoiceId)->where('movement_type', 'sales_return')->first();
        $this->assertNotNull($returnMovement, 'A sales_return inventory movement must be recorded');
        $this->assertEquals(1, $returnMovement->quantity);
    }

    /**
     * SECTION 7: Metal Rates Precedence & Daily Stored Rates
     */
    public function test_metal_rates_manual_precedence_and_persistence(): void
    {
        $today = Carbon::today()->toDateString();

        // 1. Persist automatic rate
        GoldRate::updateOrCreate(
            ['rate_date' => $today],
            [
                'gold_24k_10g' => 85000,
                'gold_24k_1g' => 8500,
                'gold_22k_10g' => 78000,
                'gold_22k_1g' => 7800,
                'gold_18k_1g' => 6400,
                'silver_1kg' => 100000,
                'silver_1g' => 100.0,
                'source' => 'automatic',
            ]
        );

        $ratesAuto = MetalRateService::getCurrentRates();
        $this->assertEquals(8500, $ratesAuto['raw24k']);
        $this->assertFalse($ratesAuto['isManual']);

        // 2. Set manual rate for today -> manual rate MUST take precedence
        $saveRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/metal-rates', [
            'gold24k' => 8950,
            'gold22k' => 8205,
            'gold18k' => 6712,
            'gold14k' => 5220,
            'silverGram' => 105.0,
        ]);
        $saveRes->assertOk();

        $ratesManual = MetalRateService::getCurrentRates();
        $this->assertEquals(8950, $ratesManual['raw24k']);
        $this->assertEquals(8205, $ratesManual['raw22k']);
        $this->assertTrue($ratesManual['isManual']);
        $this->assertStringContainsString('Manual', $ratesManual['source']);
    }

    /**
     * SECTION 8: Dashboard Delivery Status Rules
     */
    public function test_work_order_not_marked_delivered_until_fully_billed(): void
    {
        $order = WorkOrder::create([
            'work_order_number' => 'WO-DASH-TEST',
            'product_name' => 'Royal Heritage Pendant',
            'category_id' => $this->category->id,
            'client_id' => $this->client1->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(5)->toDateString(),
            'allotted_weight' => 10.000,
            'required_qty' => 1,
            'completed_qty' => 1,
            'received_qty' => 1,
            'finalized_qty' => 1,
            'status' => 'completed',
            'current_stage' => 'completed',
        ]);

        $piece = WorkOrderReceivedPiece::create([
            'work_order_id' => $order->id,
            'piece_number' => 1,
            'tag_number' => 'TAG-DASH-01',
            'design_no' => 'DES-DASH-01',
            'product_name' => 'Royal Heritage Pendant',
            'client_id' => $this->client1->id,
            'karigar_id' => $this->karigarA->id,
            'gross_weight' => 10.000,
            'received_at' => now(),
            'is_inventory_posted' => true,
            'certification_status' => 'completed',
            'hallmarking_status' => 'completed',
            'status' => 'in_stock',
        ]);

        // Even though production, receiving, and inventory posting are 100% complete,
        // it is NOT marked Delivered! It is 'Awaiting Billing'
        $statusInfo = $order->getDeliveryStatusInfo();
        $this->assertEquals('Awaiting Billing', $statusInfo['label']);
        $this->assertFalse($order->isFullyDelivered());

        // Now sell the piece to that client on an active invoice
        $invoice = Invoice::create([
            'invoice_no' => 'INV-DASH-101',
            'client_id' => $this->client1->id,
            'client_name' => $this->client1->full_name,
            'invoice_date' => now()->toDateString(),
            'amount' => 85000,
            'gst_rate' => 0,
            'gst_amount' => 0,
            'total_amount' => 85000,
            'paid_amount' => 85000,
            'due_amount' => 0,
            'status' => 'paid',
            'sale_status' => 'completed',
        ]);

        $piece->status = 'sold';
        $piece->invoice_id = $invoice->id;
        $piece->save();

        $order->invoice_id = $invoice->id;
        $order->status = 'delivered';
        $order->save();

        // Now that the piece is invoiced and sold to the client, it is Delivered
        $this->assertTrue($order->fresh()->isFullyDelivered());
        $this->assertEquals('Delivered', $order->fresh()->getDeliveryStatusInfo()['label']);
    }
}
