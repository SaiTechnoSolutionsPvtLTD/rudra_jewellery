<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Karigar;
use App\Models\Client;
use App\Models\Category;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use App\Models\InventoryMovement;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\RefreshDatabase;

class IndividualPieceLifecycleTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $manager;
    protected $unauthorizedUser;
    protected $karigar;
    protected $client;
    protected $category;
    protected $productMaster1;
    protected $productMaster2;

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

        $this->manager = User::firstOrCreate(
            ['email' => 'manager@rudhra.test'],
            [
                'name' => 'Production Manager',
                'password' => bcrypt('password123'),
                'role' => 'manager',
                'status' => 'active',
            ]
        );

        $this->unauthorizedUser = User::firstOrCreate(
            ['email' => 'viewer@rudhra.test'],
            [
                'name' => 'Restricted Viewer',
                'password' => bcrypt('password123'),
                'role' => 'viewer',
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
            ['name' => 'Bridal Jewellery'],
            ['code' => 'BRD-01', 'status' => 'active']
        );

        $this->productMaster1 = Product::firstOrCreate(
            ['design_no' => 'DES-NCK-001'],
            [
                'name' => 'Royal Temple Choker',
                'product_code' => 'DES-NCK-001',
                'category_id' => $this->category->id,
                'metal_type' => 'gold',
                'karat' => '22K',
                'stamp' => '916',
                'current_stock_qty' => 0,
                'opening_stock_weight' => 0.000,
                'opening_fine_weight' => 0.000,
                'attributes' => [
                    'stamp' => '916',
                    'dia_wt_ct' => 0.50,
                    'diamond_count' => 4,
                ],
            ]
        );

        $this->productMaster2 = Product::firstOrCreate(
            ['design_no' => 'DES-BGL-002'],
            [
                'name' => 'Heritage Peacock Bangle',
                'product_code' => 'DES-BGL-002',
                'category_id' => $this->category->id,
                'metal_type' => 'gold',
                'karat' => '22K',
                'stamp' => '916',
                'current_stock_qty' => 0,
                'opening_stock_weight' => 0.000,
                'opening_fine_weight' => 0.000,
                'attributes' => [
                    'stamp' => '916',
                    'stone_weight' => 1.20,
                    'stone_count' => 6,
                ],
            ]
        );
    }

    /**
     * SCENARIO A: One piece through the entire individual lifecycle
     */
    public function test_scenario_a_one_piece_through_entire_lifecycle()
    {
        $order = WorkOrder::create([
            'work_order_number' => 'WO-SCENARIO-A',
            'product_name' => 'Royal Temple Choker',
            'design_code' => 'DES-NCK-001',
            'product_id' => $this->productMaster1->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'allotted_weight' => 15.000,
            'required_qty' => 1,
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

        $item = WorkOrderItem::create([
            'work_order_id' => $order->id,
            'item_code' => 'JOB-NCK-1',
            'design_no' => 'DES-NCK-001',
            'product_id' => $this->productMaster1->id,
            'product_name' => 'Royal Temple Choker',
            'required_qty' => 1,
            'completed_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'allotted_weight' => 15.000,
        ]);

        // 1. Manager records production update for piece 1
        $wipRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/wip-update", [
            'completed_now' => 1,
            'actual_weight' => 14.850,
            'gold_weight' => 14.850,
            'remarks' => 'Completed hand-carving piece 1',
        ]);
        $wipRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals(1, $order->completed_qty);
        $this->assertEquals(1, $order->qc_pending_qty);

        // 2. Submit piece to QC with detailed measurements snapshot
        $piece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->first();
        $this->assertNotNull($piece, 'Piece record must be created in WIP/QC tracking');

        // 3. QC approves the piece -> moves to Ready
        $qcRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 1,
            'piece_id' => $piece->id,
            'remarks' => 'Purity verified 91.6%, no surface flaws',
        ]);
        $qcRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals(1, $order->ready_qty);
        $this->assertEquals(0, $order->qc_pending_qty);

        // 4. Opening Receive Work Order API fetches authoritative prefill data without creating a record
        $piecesCountBefore = WorkOrderReceivedPiece::where('work_order_id', $order->id)->whereNotNull('received_at')->count();
        $this->assertEquals(0, $piecesCountBefore, 'No received record must exist before physical receiving');

        $recvDataRes = $this->actingAs($this->admin, 'sanctum')->getJson("/api/work-orders/{$order->id}/receiving-data?piece_id={$piece->id}");
        $recvDataRes->assertStatus(200);
        $prefilled = $recvDataRes->json('data.prefilled');

        $this->assertNotNull($prefilled);
        $this->assertEquals('DES-NCK-001', $prefilled['design_no']);
        $this->assertEquals($order->id, $prefilled['work_order_id']);
        $this->assertEquals(15.000, (float)$prefilled['allotted_weight']);
        $this->assertEquals(14.850, (float)$prefilled['gross_weight']);
        $this->assertFalse($prefilled['is_already_received']);

        // Check that finished stock is still 0
        $this->productMaster1->refresh();
        $this->assertEquals(0, (int)$this->productMaster1->current_stock_qty);

        // 5. Physical receiving: receives piece 1 with confirmed measurements
        $recvRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'piece_id' => $piece->id,
            'work_order_item_id' => $item->id,
            'gross_weight' => 14.850,
            'old_weight' => 0.500,
            'diamond_weight' => 0.50, // 0.100g
            'color_stone_weight' => 0.000,
            'purity' => 91.60,
            'gold_karat' => '22K',
            'making_charge_type' => 'per_gram',
            'making_charge_per_gram' => 500,
            'description' => 'Received Piece #1 Choker',
        ]);
        $recvRes->assertStatus(200);

        // Verify physical receiving does NOT increase finished-goods inventory
        $this->productMaster1->refresh();
        $this->assertEquals(0, (int)$this->productMaster1->current_stock_qty, 'Physical receiving must NOT inflate finished goods stock');

        $order->refresh();
        $this->assertEquals(1, $order->received_qty);

        // 6. Certification: Complete certification
        $certRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/certification-action", [
            'action' => 'add',
            'certification_no' => 'CERT-GIA-1001',
            'agency' => 'GIA India',
        ]);
        $certRes->assertStatus(200);

        // 7. Hallmarking: Complete hallmarking with HUID
        $hallRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/hallmarking-action", [
            'action' => 'add',
            'huid' => 'HUID-TN-916-001',
            'center_name' => 'Chennai Hallmark Center',
        ]);
        $hallRes->assertStatus(200);

        // 8. Final inventory posting
        $postRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/finalize-inventory");
        $postRes->assertStatus(200);

        // Product stock incremented exactly once by 1 unit
        $this->productMaster1->refresh();
        $this->assertEquals(1, (int)$this->productMaster1->current_stock_qty);
        $this->assertEquals(14.850, (float)$this->productMaster1->opening_stock_weight);

        // Parent Work Order completed only now
        $order->refresh();
        $this->assertEquals('completed', $order->status);
        $this->assertEquals(1, $order->finalized_qty);
    }

    /**
     * SCENARIO B: Three pieces completed out of ten
     */
    public function test_scenario_b_three_pieces_completed_out_of_ten()
    {
        $order = WorkOrder::create([
            'work_order_number' => 'WO-SCENARIO-B',
            'product_name' => 'Heritage Peacock Bangle',
            'design_code' => 'DES-BGL-002',
            'product_id' => $this->productMaster2->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'allotted_weight' => 100.000,
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

        $item = WorkOrderItem::create([
            'work_order_id' => $order->id,
            'item_code' => 'JOB-BGL-1',
            'design_no' => 'DES-BGL-002',
            'product_id' => $this->productMaster2->id,
            'product_name' => 'Heritage Peacock Bangle',
            'required_qty' => 10,
            'completed_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'allotted_weight' => 100.000,
        ]);

        // 1. Manager produces exactly 3 pieces (pieces 1, 2, 3)
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/wip-update", [
            'completed_now' => 3,
            'actual_weight' => 29.700,
            'remarks' => 'Batch of 3 pieces finished',
        ])->assertStatus(200);

        $order->refresh();
        $this->assertEquals(3, $order->completed_qty);
        $this->assertEquals(3, $order->qc_pending_qty);

        // 2. Only pieces 1-3 can be submitted to QC
        $pieces = WorkOrderReceivedPiece::where('work_order_id', $order->id)->get();
        $this->assertCount(3, $pieces, 'Only 3 piece records must exist for 3 completed units');

        // 3. QC Approves piece 1 and piece 2, but NOT all pieces automatically
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 2,
            'remarks' => 'Approved first 2 pieces',
        ])->assertStatus(200);

        $order->refresh();
        $this->assertEquals(2, $order->ready_qty);
        $this->assertEquals(1, $order->qc_pending_qty);

        // 4. Ready page displays only the 2 approved pieces
        $readyRes = $this->actingAs($this->admin, 'sanctum')->getJson('/api/work-orders/ready-pieces');
        $readyRes->assertStatus(200);
        $readyPiecesForOrder = collect($readyRes->json('data'))->where('work_order_id', $order->id);
        $this->assertCount(2, $readyPiecesForOrder, 'Ready page must show exactly the 2 approved pieces');

        // 5. Physically receive piece 1
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'work_order_item_id' => $item->id,
            'gross_weight' => 9.900,
            'purity' => 91.60,
            'gold_karat' => '22K',
            'making_charge_type' => 'per_gram',
            'making_charge_per_gram' => 450,
        ])->assertStatus(200);

        $order->refresh();
        $this->assertEquals(1, $order->received_qty);

        // Receiving piece 1 removes only piece 1 from Ready page
        $readyRes2 = $this->actingAs($this->admin, 'sanctum')->getJson('/api/work-orders/ready-pieces');
        $readyPiecesAfter = collect($readyRes2->json('data'))->where('work_order_id', $order->id);
        $this->assertCount(1, $readyPiecesAfter, 'Ready page must now show exactly the 1 remaining unreceived piece');

        // Approve the 3rd piece now
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 1,
        ])->assertStatus(200);

        // Receive remaining 2 approved pieces (piece 2 & piece 3)
        for ($i = 2; $i <= 3; $i++) {
            $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
                'work_order_item_id' => $item->id,
                'gross_weight' => 9.900,
                'purity' => 91.60,
                'gold_karat' => '22K',
                'making_charge_type' => 'per_gram',
                'making_charge_per_gram' => 450,
            ])->assertStatus(200);
        }

        $order->refresh();
        $this->assertEquals(3, $order->received_qty);

        // Skip certification and complete hallmarking for these 3 pieces
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/certification-action", [
            'action' => 'skip',
            'reason' => 'Direct BIS Hallmarking required',
        ])->assertStatus(200);

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/hallmarking-action", [
            'action' => 'add',
            'huid' => 'HUID-BATCH3-01',
        ])->assertStatus(200);

        // Post to inventory
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/finalize-inventory")->assertStatus(200);

        // Finished stock must increase by exactly 3
        $this->productMaster2->refresh();
        $this->assertEquals(3, (int)$this->productMaster2->current_stock_qty, 'Stock quantity must increase by exactly 3');
        $this->assertEquals(29.700, (float)$this->productMaster2->opening_stock_weight);

        // 7 pieces remain unfinished; Parent Work Order MUST REMAIN ACTIVE
        $order->refresh();
        $this->assertNotEquals('completed', $order->status, 'Parent Work Order must NOT be completed when 7 pieces are unfinished');
        $this->assertEquals(3, $order->finalized_qty);
        $this->assertEquals(7, $order->pending_production_qty);
    }

    public function test_selected_piece_qc_receiving_and_product_tag_remain_individual()
    {
        $productResponse = $this->actingAs($this->admin, 'sanctum')->postJson('/api/products', [
            'category_id' => $this->category->id,
            'name' => 'Piece Lifecycle Ring Master',
            'product_code' => 'RING-MASTER-PIECE-01',
            'status' => 'active',
            'attributes' => ['gross_wt' => 9.900, 'net_wt' => 9.500],
        ]);
        $productResponse->assertCreated();
        $product = Product::findOrFail($productResponse->json('product.id'));
        $this->assertSame($product->product_code, $product->master_tag_number);
        $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/inventory/products/{$product->id}")
            ->assertOk()
            ->assertJsonPath('product.master_tag_number', 'RING-MASTER-PIECE-01');

        $order = WorkOrder::create([
            'work_order_number' => 'WO-INDIVIDUAL-TAG-01',
            'product_name' => $product->name,
            'design_code' => $product->design_no ?: $product->product_code,
            'product_id' => $product->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'allotted_weight' => 29.700,
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
        $item = WorkOrderItem::create([
            'work_order_id' => $order->id,
            'item_code' => 'ITEM-INDIVIDUAL-TAG-01',
            'design_no' => $product->product_code,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'required_qty' => 10,
            'completed_qty' => 0,
            'ready_qty' => 0,
            'received_qty' => 0,
            'allotted_weight' => 29.700,
        ]);

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/wip-update", [
            'completed_now' => 3,
            'work_order_item_id' => $item->id,
            'actual_weight' => 29.700,
        ])->assertOk();
        $pieces = WorkOrderReceivedPiece::where('work_order_id', $order->id)->orderBy('piece_number')->get();
        $this->assertCount(3, $pieces);

        $selectedPiece = $pieces[1];
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/qc-action", [
            'action' => 'pass',
            'quantity' => 1,
            'piece_id' => $selectedPiece->id,
            'work_order_item_id' => $item->id,
            'notes' => 'Piece checked individually',
        ])->assertOk();

        $this->assertSame('passed', $selectedPiece->fresh()->qc_status);
        $this->assertSame('pending', $pieces[0]->fresh()->qc_status);
        $this->assertSame('pending', $pieces[2]->fresh()->qc_status);

        $ready = $this->actingAs($this->admin, 'sanctum')->getJson('/api/work-orders/ready-pieces')->assertOk();
        $readyForOrder = collect($ready->json('data'))->where('work_order_id', $order->id)->values();
        $this->assertCount(1, $readyForOrder);
        $this->assertSame($selectedPiece->id, $readyForOrder[0]['piece_id']);

        $prefill = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/work-orders/{$order->id}/receiving-data?piece_id={$selectedPiece->id}")
            ->assertOk();
        $this->assertSame($selectedPiece->id, $prefill->json('data.prefilled.piece_id'));
        $this->assertSame($item->id, $prefill->json('data.prefilled.work_order_item_id'));
        $this->assertEquals(9.900, (float)$prefill->json('data.prefilled.gross_weight'));
        $this->assertEquals(2.970, (float)$prefill->json('data.prefilled.allotted_weight'));
        $this->assertEquals(29.700, (float)$prefill->json('data.prefilled.job_allotted_weight'));
        $this->assertSame(10, $prefill->json('data.prefilled.job_required_qty'));
        $this->assertSame($product->id, $prefill->json('data.prefilled.product_id'));
        $this->assertSame($order->allotted_date->toDateString(), $prefill->json('data.prefilled.ordered_date'));
        $this->assertSame($order->delivery_date->toDateString(), $prefill->json('data.prefilled.delivery_date'));

        $receivePayload = [
            'piece_id' => $selectedPiece->id,
            'work_order_item_id' => $item->id,
            'gross_weight' => 9.900,
            'net_gold_weight' => 9.500,
            'purity' => 91.60,
            'gold_karat' => '22K',
        ];
        $received = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/receive-piece", $receivePayload)
            ->assertOk();
        $tagNumber = $received->json('tag_number');
        $this->assertNotEmpty($tagNumber);
        $this->assertNotNull($selectedPiece->fresh()->received_at);
        $this->assertNull($pieces[0]->fresh()->received_at);
        $this->assertNull($pieces[2]->fresh()->received_at);
        $this->assertFalse($selectedPiece->fresh()->is_inventory_posted);
        $this->assertSame(0, (int)$product->fresh()->current_stock_qty);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/received-pieces/{$selectedPiece->id}/update-certification", [
                'action' => 'skip',
                'details' => 'Not required for this item',
            ])->assertOk();
        $this->assertFalse($selectedPiece->fresh()->is_inventory_posted);

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/received-pieces/{$selectedPiece->id}/update-hallmarking", [
                'action' => 'skip',
            ])->assertOk();
        $this->assertTrue($selectedPiece->fresh()->is_inventory_posted);
        $this->assertFalse($pieces[0]->fresh()->is_inventory_posted);
        $this->assertFalse($pieces[2]->fresh()->is_inventory_posted);
        $this->assertSame(1, (int)$product->fresh()->current_stock_qty);
        $this->assertSame(1, InventoryMovement::where('product_id', $product->id)->where('movement_type', 'receipt')->count());
        $this->assertNotSame('completed', $order->fresh()->status);

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/finalize-inventory")->assertOk();
        $this->assertSame(1, InventoryMovement::where('product_id', $product->id)->where('movement_type', 'receipt')->count());

        $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/work-orders/{$order->id}/receive-piece", $receivePayload)
            ->assertUnprocessable();

        $productTags = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/inventory/products/{$product->id}/tags")
            ->assertOk();
        $this->assertCount(1, $productTags->json('data'));
        $this->assertSame($tagNumber, $productTags->json('data.0.tag_number'));
        $this->assertSame($selectedPiece->id, $productTags->json('data.0.id'));
        $this->assertSame(1, WorkOrderReceivedPiece::where('tag_number', $tagNumber)->count());
        $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/inventory/products/{$product->id}/tags")
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_ready_status_piece_is_listed_even_if_legacy_qc_flag_is_not_passed()
    {
        $order = WorkOrder::create([
            'work_order_number' => 'WO-READY-STATUS-LEGACY',
            'product_name' => $this->productMaster1->name,
            'design_code' => $this->productMaster1->design_no,
            'product_id' => $this->productMaster1->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 8.000,
            'required_qty' => 1,
            'completed_qty' => 1,
            'qc_approved_qty' => 1,
            'ready_qty' => 1,
            'received_qty' => 0,
            'status' => 'ready',
            'current_stage' => 'ready',
        ]);
        $item = WorkOrderItem::create([
            'work_order_id' => $order->id,
            'item_code' => 'ITEM-LEGACY-READY',
            'product_id' => $this->productMaster1->id,
            'product_name' => $this->productMaster1->name,
            'design_no' => $this->productMaster1->design_no,
            'required_qty' => 1,
            'completed_qty' => 1,
            'ready_qty' => 1,
            'allotted_weight' => 8.000,
        ]);
        $piece = WorkOrderReceivedPiece::create([
            'work_order_id' => $order->id,
            'work_order_item_id' => $item->id,
            'piece_number' => 1,
            'design_no' => $this->productMaster1->design_no,
            'product_id' => $this->productMaster1->id,
            'product_name' => $this->productMaster1->name,
            'status' => 'ready',
            'qc_status' => 'pending',
            'gross_weight' => 8.000,
        ]);

        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/work-orders/ready-pieces')->assertOk();
        $matching = collect($response->json('data'))->firstWhere('piece_id', $piece->id);
        $this->assertNotNull($matching);
        $this->assertSame('ready', $matching['status']);
        $this->assertSame('pending', $matching['qc_status']);
    }

    public function test_receiving_prefill_uses_saved_qc_measurements_over_zero_default_columns()
    {
        $order = WorkOrder::create([
            'work_order_number' => 'WO-QC-SNAPSHOT-PREFILL',
            'product_name' => $this->productMaster1->name,
            'design_code' => $this->productMaster1->design_no,
            'product_id' => $this->productMaster1->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(4)->toDateString(),
            'allotted_weight' => 12.000,
            'required_qty' => 1,
            'completed_qty' => 1,
            'qc_approved_qty' => 1,
            'ready_qty' => 1,
            'received_qty' => 0,
            'status' => 'ready',
            'current_stage' => 'ready',
        ]);
        $item = WorkOrderItem::create([
            'work_order_id' => $order->id,
            'item_code' => 'ITEM-QC-SNAPSHOT-PREFILL',
            'product_id' => $this->productMaster1->id,
            'product_name' => $this->productMaster1->name,
            'design_no' => $this->productMaster1->design_no,
            'required_qty' => 1,
            'completed_qty' => 1,
            'qc_approved_qty' => 1,
            'ready_qty' => 1,
            'allotted_weight' => 12.000,
        ]);
        $piece = WorkOrderReceivedPiece::create([
            'work_order_id' => $order->id,
            'work_order_item_id' => $item->id,
            'piece_number' => 1,
            'design_no' => $item->design_no,
            'product_id' => $item->product_id,
            'product_name' => $item->product_name,
            'gross_weight' => 0,
            'net_gold_weight' => 0,
            'diamond_weight' => 0,
            'diamond_count' => 0,
            'color_stone_weight' => 0,
            'color_stone_count' => 0,
            'silver_weight' => 0,
            'status' => 'ready',
            'qc_status' => 'passed',
            'qc_submission_data' => [
                'gross_weight' => 12.345,
                'completed_weight' => 12.345,
                'net_gold_weight' => 11.900,
                'old_weight' => 0.120,
                'diamond_weight' => 0,
                'diamond_count' => 0,
                'color_stone_weight' => 0.250,
                'color_stone_count' => 3,
                'silver_weight' => 0.200,
                'purity' => 90.50,
                'gold_karat' => '21K',
            ],
        ]);

        $prefill = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/work-orders/{$order->id}/receiving-data?piece_id={$piece->id}")
            ->assertOk()
            ->json('data.prefilled');

        $this->assertSame($piece->id, $prefill['piece_id']);
        $this->assertEquals(12.345, (float)$prefill['gross_weight']);
        $this->assertEquals(11.900, (float)$prefill['net_gold_weight']);
        $this->assertEquals(0.120, (float)$prefill['old_weight']);
        $this->assertEquals(0.250, (float)$prefill['color_stone_weight']);
        $this->assertSame(3, $prefill['color_stone_count']);
        $this->assertEquals(0.200, (float)$prefill['silver_weight']);
        $this->assertSame(0, $prefill['diamond_count']);
        $this->assertEquals(0, (float)$prefill['diamond_weight']);
        $this->assertEquals(90.50, (float)$prefill['purity']);
        $this->assertSame('21K', $prefill['gold_karat']);
    }

    public function test_aggregate_ready_count_reconciles_two_missing_ready_piece_rows()
    {
        $order = WorkOrder::create([
            'work_order_number' => 'WO-READY-COUNTER-RECONCILE',
            'product_name' => $this->productMaster1->name,
            'design_code' => $this->productMaster1->design_no,
            'product_id' => $this->productMaster1->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 144.000,
            'required_qty' => 18,
            'completed_qty' => 10,
            'qc_approved_qty' => 10,
            'ready_qty' => 10,
            'received_qty' => 8,
            'status' => 'partially_received',
            'current_stage' => 'ready',
        ]);
        $item = WorkOrderItem::create([
            'work_order_id' => $order->id,
            'item_code' => 'ITEM-READY-COUNTER-RECONCILE',
            'product_id' => $this->productMaster1->id,
            'product_name' => $this->productMaster1->name,
            'design_no' => $this->productMaster1->design_no,
            'required_qty' => 18,
            'completed_qty' => 10,
            'qc_approved_qty' => 10,
            'ready_qty' => 10,
            'received_qty' => 8,
            'allotted_weight' => 144.000,
        ]);

        foreach (range(1, 18) as $pieceNumber) {
            $received = $pieceNumber <= 8;
            $readyByCounter = $pieceNumber <= 10;
            WorkOrderReceivedPiece::create([
                'work_order_id' => $order->id,
                'work_order_item_id' => $item->id,
                'piece_number' => $pieceNumber,
                'design_no' => $item->design_no,
                'product_id' => $item->product_id,
                'product_name' => $item->product_name,
                'gross_weight' => 8.000,
                'net_gold_weight' => 8.000,
                'qc_status' => $received ? 'passed' : 'pending',
                'status' => $received ? 'received' : ($readyByCounter ? 'qc_pending' : 'in_progress'),
                'received_at' => $received ? now()->subDays(9 - $pieceNumber) : null,
            ]);
        }

        $response = $this->actingAs($this->admin, 'sanctum')->getJson('/api/work-orders/ready-pieces')->assertOk();
        $readyPieces = collect($response->json('data'))->where('work_order_id', $order->id)->values();
        $this->assertCount(2, $readyPieces);
        $this->assertSame([9, 10], $readyPieces->pluck('piece_number')->all());

        $this->assertSame('passed', WorkOrderReceivedPiece::where('work_order_id', $order->id)->where('piece_number', 9)->value('qc_status'));
        $this->assertSame('passed', WorkOrderReceivedPiece::where('work_order_id', $order->id)->where('piece_number', 10)->value('qc_status'));
        $this->assertSame('pending', WorkOrderReceivedPiece::where('work_order_id', $order->id)->where('piece_number', 11)->value('qc_status'));
    }

    /**
     * SCENARIO C: QC rejection and rework
     */
    public function test_scenario_c_qc_rejection_and_rework()
    {
        $order = WorkOrder::create([
            'work_order_number' => 'WO-SCENARIO-C-REWORK',
            'product_name' => 'Royal Temple Choker',
            'design_code' => 'DES-NCK-001',
            'product_id' => $this->productMaster1->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'allotted_weight' => 20.000,
            'required_qty' => 2,
            'completed_qty' => 2,
            'qc_pending_qty' => 2,
            'ready_qty' => 0,
            'rework_qty' => 0,
            'received_qty' => 0,
            'status' => 'submitted',
            'current_stage' => 'quality_check',
        ]);

        // QC approves piece 1, rejects piece 2 for rework
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 1,
            'remarks' => 'Piece 1 passed',
        ])->assertStatus(200);

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/qc-action", [
            'qc_action' => 'rework',
            'quantity' => 1,
            'remarks' => 'Piece 2 porosity on bezel setting',
        ])->assertStatus(200);

        $order->refresh();
        $this->assertEquals(1, $order->ready_qty);
        $this->assertEquals(1, $order->rework_qty);
        $this->assertEquals(1, $order->return_count);

        // Attempting to receive when only 1 is ready: receiving 1 succeeds, receiving a 2nd fails
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'gross_weight' => 10.000,
            'purity' => 91.60,
        ])->assertStatus(200);

        // 2nd piece is in rework, so cannot be received
        $failedReceive = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'gross_weight' => 10.000,
            'purity' => 91.60,
        ]);
        $failedReceive->assertStatus(422);

        // Karigar reworks and manager resubmits via WIP
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/wip-update", [
            'completed_now' => 1,
            'remarks' => 'Bezel repolished and porosity fixed',
        ])->assertStatus(200);

        $order->refresh();
        $this->assertEquals(1, $order->qc_pending_qty);

        // QC approves the reworked piece
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 1,
            'remarks' => 'Rework inspected and passed',
        ])->assertStatus(200);

        $order->refresh();
        $this->assertEquals(2, $order->ready_qty);
        $this->assertEquals(0, $order->rework_qty);

        // Now the reworked piece can be received
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'gross_weight' => 9.950,
            'purity' => 91.60,
        ])->assertStatus(200);

        $order->refresh();
        $this->assertEquals(2, $order->received_qty);
    }

    /**
     * SCENARIO D: Mixed stages across pieces
     */
    public function test_scenario_d_mixed_stages_across_pieces()
    {
        $order = WorkOrder::create([
            'work_order_number' => 'WO-SCENARIO-D-MIXED',
            'product_name' => 'Royal Temple Choker',
            'design_code' => 'DES-NCK-001',
            'product_id' => $this->productMaster1->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 50.000,
            'required_qty' => 5,
            'completed_qty' => 0,
            'status' => 'assigned',
            'current_stage' => 'work_started',
        ]);

        // 1 piece in WIP (pending production: 5)
        // Produce 4 pieces
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/wip-update", [
            'completed_now' => 4,
            'actual_weight' => 39.600,
        ])->assertStatus(200);

        // Approve 3 pieces at QC (1 remains in QC pending)
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 3,
        ])->assertStatus(200);

        // Receive 2 pieces (1 remains in Ready)
        for ($i = 1; $i <= 2; $i++) {
            $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
                'gross_weight' => 9.900,
                'purity' => 91.60,
            ])->assertStatus(200);
        }

        $order->refresh();
        $this->assertEquals(1, $order->pending_production_qty, '1 piece still in WIP');
        $this->assertEquals(1, $order->qc_pending_qty, '1 piece in QC');
        $this->assertEquals(1, $order->pending_receive_qty, '1 piece in Ready');
        $this->assertEquals(2, $order->received_qty, '2 pieces physically received');

        // Verify Ready page displays only the 1 unreceived piece
        $readyRes = $this->actingAs($this->admin, 'sanctum')->getJson('/api/work-orders/ready-pieces');
        $readyOrderPieces = collect($readyRes->json('data'))->where('work_order_id', $order->id);
        $this->assertCount(1, $readyOrderPieces);
    }

    /**
     * SCENARIO E: Multi-job Work Order with distinct product masters
     */
    public function test_scenario_e_multi_job_work_order()
    {
        $order = WorkOrder::create([
            'work_order_number' => 'WO-SCENARIO-E-MULTIJOB',
            'product_name' => 'Royal Bridal Set',
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 30.000,
            'required_qty' => 2,
            'status' => 'assigned',
            'current_stage' => 'work_started',
        ]);

        $itemA = WorkOrderItem::create([
            'work_order_id' => $order->id,
            'item_code' => 'JOB-A-NCK',
            'design_no' => 'DES-NCK-001',
            'product_id' => $this->productMaster1->id,
            'product_name' => 'Royal Temple Choker',
            'required_qty' => 1,
            'allotted_weight' => 15.000,
        ]);

        $itemB = WorkOrderItem::create([
            'work_order_id' => $order->id,
            'item_code' => 'JOB-B-BGL',
            'design_no' => 'DES-BGL-002',
            'product_id' => $this->productMaster2->id,
            'product_name' => 'Heritage Peacock Bangle',
            'required_qty' => 1,
            'allotted_weight' => 15.000,
        ]);

        // Complete both jobs
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/wip-update", [
            'completed_now' => 2,
            'actual_weight' => 29.500,
        ])->assertStatus(200);

        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/qc-action", [
            'qc_action' => 'approve',
            'quantity' => 2,
        ])->assertStatus(200);

        // Receive Piece A for Item A
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'work_order_item_id' => $itemA->id,
            'gross_weight' => 14.800,
            'purity' => 91.60,
        ])->assertStatus(200);

        // Receive Piece B for Item B
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'work_order_item_id' => $itemB->id,
            'gross_weight' => 14.700,
            'purity' => 91.60,
        ])->assertStatus(200);

        // Skip cert and hallmark
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/certification-action", ['action' => 'skip'])->assertStatus(200);
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/hallmarking-action", ['action' => 'skip'])->assertStatus(200);

        // Finalize inventory
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/finalize-inventory")->assertStatus(200);

        // Verify each piece posted to its OWN exact Product Master!
        $this->productMaster1->refresh();
        $this->productMaster2->refresh();

        $this->assertEquals(1, (int)$this->productMaster1->current_stock_qty, 'Product 1 stock must increment by 1');
        $this->assertEquals(14.800, (float)$this->productMaster1->opening_stock_weight);

        $this->assertEquals(1, (int)$this->productMaster2->current_stock_qty, 'Product 2 stock must increment by 1');
        $this->assertEquals(14.700, (float)$this->productMaster2->opening_stock_weight);
    }

    /**
     * SCENARIO F: Duplicate and concurrent requests idempotency
     */
    public function test_scenario_f_duplicate_requests_idempotency()
    {
        $order = WorkOrder::create([
            'work_order_number' => 'WO-SCENARIO-F-IDEMP',
            'product_name' => 'Royal Temple Choker',
            'design_code' => 'DES-NCK-001',
            'product_id' => $this->productMaster1->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 15.000,
            'required_qty' => 1,
            'completed_qty' => 1,
            'qc_pending_qty' => 0,
            'qc_approved_qty' => 1,
            'ready_qty' => 1,
            'received_qty' => 0,
            'status' => 'ready',
            'current_stage' => 'ready',
        ]);

        // Receive piece once
        $res1 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'gross_weight' => 14.800,
            'purity' => 91.60,
        ]);
        $res1->assertStatus(200);

        // Immediate retry of receiving must fail gracefully because ready pieces are exhausted
        $res2 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'gross_weight' => 14.800,
            'purity' => 91.60,
        ]);
        $res2->assertStatus(422);

        // Skip cert and hallmark
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/certification-action", ['action' => 'skip'])->assertStatus(200);
        $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/hallmarking-action", ['action' => 'skip'])->assertStatus(200);

        // Finalize inventory
        $fin1 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/finalize-inventory");
        $fin1->assertStatus(200);

        $this->productMaster1->refresh();
        $this->assertEquals(1, (int)$this->productMaster1->current_stock_qty);

        // Repeated finalize inventory request must be idempotent and NOT increment stock again
        $fin2 = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/finalize-inventory");
        $fin2->assertStatus(200);

        $this->productMaster1->refresh();
        $this->assertEquals(1, (int)$this->productMaster1->current_stock_qty, 'Repeated inventory posting must NOT increment stock twice');
    }

    /**
     * SCENARIO G: Jewellery weight reconciliation and accurate math
     */
    public function test_scenario_g_jewellery_weight_reconciliation()
    {
        $order = WorkOrder::create([
            'work_order_number' => 'WO-SCENARIO-G-CALC',
            'product_name' => 'Royal Temple Choker',
            'design_code' => 'DES-NCK-001',
            'product_id' => $this->productMaster1->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 20.000,
            'required_qty' => 1,
            'completed_qty' => 1,
            'ready_qty' => 1,
            'received_qty' => 0,
            'status' => 'ready',
        ]);

        // Realistic jewellery inputs:
        // Total Gross = 16.500g
        // Diamond = 1.00 ct -> 0.200g
        // Color stone = 2.50 ct -> 0.500g
        // Old gold = 1.800g
        // Expected Net Gold = 16.500 - 0.200 - 0.500 - 1.800 = 14.000g
        // Touch = 91.60% -> Pure 24K = 14.000 * 0.916 = 12.824g
        // MC Rate = 450 per gram -> Total MC = 450 * 14.000 = 6300.00
        $recvRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'gross_weight' => 16.500,
            'old_weight' => 1.800,
            'diamond_weight' => 1.00,
            'diamond_count' => 5,
            'diamond_stamp' => '+8',
            'color_stone_weight' => 2.50,
            'color_stone_count' => 4,
            'purity' => 91.60,
            'gold_karat' => '22K',
            'making_charge_type' => 'per_gram',
            'making_charge_per_gram' => 450,
        ]);
        $recvRes->assertStatus(200);

        $piece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->first();
        $this->assertEquals(16.500, (float)$piece->gross_weight);
        $this->assertEquals(14.000, (float)$piece->net_gold_weight);
        $this->assertEquals(12.824, (float)$piece->pure_24k_weight);
        $this->assertEquals(6300.00, (float)$piece->total_making_charge);
        $this->assertEquals('Dia-1/+8/5', $piece->diamond_details);
    }

    /**
     * SCENARIO H: Authorization and failure recovery
     */
    public function test_scenario_h_authorization_and_failure_recovery()
    {
        $order = WorkOrder::create([
            'work_order_number' => 'WO-SCENARIO-H-AUTH',
            'product_name' => 'Royal Temple Choker',
            'design_code' => 'DES-NCK-001',
            'product_id' => $this->productMaster1->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 10.000,
            'required_qty' => 1,
            'status' => 'assigned',
        ]);

        // Unauthorized viewer cannot record production
        $unauthRes = $this->actingAs($this->unauthorizedUser, 'sanctum')->postJson("/api/work-orders/{$order->id}/wip-update", [
            'completed_now' => 1,
            'actual_weight' => 9.800,
        ]);
        $unauthRes->assertStatus(403);

        // Receiving with invalid weights fails validation
        $invalidRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'gross_weight' => -5.000,
        ]);
        $invalidRes->assertStatus(422);

        // Verify database integrity: no received pieces created
        $this->assertEquals(0, WorkOrderReceivedPiece::where('work_order_id', $order->id)->count());
    }
}
