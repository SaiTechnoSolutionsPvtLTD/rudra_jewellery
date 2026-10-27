<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Karigar;
use App\Models\Category;
use App\Models\Product;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use App\Models\Client;
use App\Services\SaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

class ParentProductAndChildPieceInventoryTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $karigar;
    protected $category;
    protected $client;

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
            ['name' => 'Kailash Goldsmith'],
            [
                'karigar_code' => 'KRG-KLSH-01',
                'primary_phone' => '9876500001',
                'specialization' => 'Gold & Diamond',
                'status' => 'active',
            ]
        );

        $this->category = Category::firstOrCreate(
            ['name' => 'Necklaces'],
            ['code' => 'NCK-01', 'status' => 'active']
        );

        $this->client = Client::firstOrCreate(
            ['client_code' => 'CL-TEST-001'],
            [
                'name' => 'Retail Customer A',
                'full_name' => 'Retail Customer A',
                'primary_phone' => '9888877777',
                'status' => 'active',
            ]
        );
    }

    /**
     * Test complete parent-product and child-piece inventory lifecycle:
     * 1. Parent product creation
     * 2. Receive work order with multiple distinct pieces (different weights & diamond sieves)
     * 3. Piece persistence & parent linking
     * 4. Parent stock aggregation & getProductTags
     * 5. Sales piece search by Tag and RWO
     * 6. Sale completion & tag-level stock decrement
     * 7. Duplicate sale prevention
     * 8. Sale reversal/cancellation tag restoration
     */
    public function test_complete_parent_product_and_child_piece_workflow()
    {
        // 1. Create a parent product in inventory
        $parentProduct = Product::create([
            'name' => 'Emerald Solitaire Necklace',
            'product_code' => 'PRD-EMR-001',
            'design_no' => 'DES-EMR-101',
            'category_id' => $this->category->id,
            'metal_type' => 'gold',
            'karat' => '22K',
            'stamp' => '916',
            'current_stock_qty' => 0,
            'opening_stock_weight' => 0.000,
            'opening_fine_weight' => 0.000,
            'purchase_rate' => 6000.00,
            'attributes' => [
                'purity' => '22K',
                'gold_type' => '22K',
                'stamp' => '916',
            ],
        ]);

        $this->assertDatabaseHas('products', ['id' => $parentProduct->id, 'current_stock_qty' => 0]);

        // 2. Create a work order for this parent design
        $workOrder = WorkOrder::create([
            'work_order_number' => 'WO-TEST-2026-001',
            'product_name' => 'Emerald Solitaire Necklace',
            'design_code' => 'DES-EMR-101',
            'product_id' => $parentProduct->id,
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'allotted_weight' => 25.000,
            'required_qty' => 2,
            'ready_qty' => 2,
            'qc_approved_qty' => 2,
            'completed_qty' => 0,
            'received_qty' => 0,
            'status' => 'assigned',
            'current_stage' => 'work_started',
            'karat' => '22K',
            'gold_karat' => '22K',
            'purity' => 91.60,
            'certification_status' => 'not_required',
            'hallmarking_status' => 'not_required',
        ]);

        $woItem = WorkOrderItem::create([
            'work_order_id' => $workOrder->id,
            'product_id' => $parentProduct->id,
            'design_no' => 'DES-EMR-101',
            'quantity' => 2,
            'ready_qty' => 2,
            'received_qty' => 0,
            'target_weight' => 25.000,
        ]);

        // 3. Receive Piece 1: Gross 12.500g, Net 12.000g, 0.50ct diamonds (+0 sieve)
        $receivePayload1 = [
            'piece_number' => 1,
            'tag_number' => 'TAG-TEST-001',
            'receive_order_number' => 'RWO-2026-001',
            'gross_weight' => 12.500,
            'net_gold_weight' => 12.000,
            'pure_24k_weight' => 10.992, // 12.000 * 0.916
            'purity' => 91.60,
            'gold_karat' => '22K',
            'diamond_weight' => 0.500,
            'diamond_count' => 5,
            'diamond_sieves' => [
                [
                    'sieve_size' => '+0',
                    'pieces' => 5,
                    'carat_weight' => 0.500,
                    'purchase_rate' => 25000,
                    'purchase_value' => 12500,
                ],
            ],
            'color_stone_weight' => 0.000,
            'color_stone_count' => 0,
            'silver_weight' => 0.000,
            'total_making_charge' => 1500.00,
            'gold_purchase_rate' => 6000.00,
            'huid' => 'HUID-916-001',
            'certificate_no' => 'CERT-EMR-001',
            'status' => 'in_stock',
            'is_inventory_posted' => true,
        ];

        $res1 = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/work-orders/{$workOrder->id}/receive-piece", $receivePayload1);
        $res1->assertStatus(200);

        // 4. Receive Piece 2: Gross 13.200g, Net 12.800g, 0.40ct diamonds (11-14 sieve), 0.20ct Ruby
        $receivePayload2 = [
            'piece_number' => 2,
            'tag_number' => 'TAG-TEST-002',
            'receive_order_number' => 'RWO-2026-001',
            'gross_weight' => 13.200,
            'net_gold_weight' => 12.800,
            'pure_24k_weight' => 11.725, // 12.800 * 0.916
            'purity' => 91.60,
            'gold_karat' => '22K',
            'diamond_weight' => 0.400,
            'diamond_count' => 4,
            'diamond_sieves' => [
                [
                    'sieve_size' => '11-14',
                    'pieces' => 4,
                    'carat_weight' => 0.400,
                    'purchase_rate' => 22000,
                    'purchase_value' => 8800,
                ],
            ],
            'color_stone_weight' => 0.200,
            'color_stone_count' => 1,
            'silver_weight' => 0.000,
            'total_making_charge' => 1600.00,
            'gold_purchase_rate' => 6000.00,
            'huid' => 'HUID-916-002',
            'certificate_no' => 'CERT-EMR-002',
            'status' => 'in_stock',
            'is_inventory_posted' => true,
        ];

        $res2 = $this->actingAs($this->admin, 'sanctum')
            ->postJson("/api/work-orders/{$workOrder->id}/receive-piece", $receivePayload2);
        $res2->assertStatus(200);

        // 5. Verify pieces are created and linked to parent product
        $piece1 = WorkOrderReceivedPiece::where('tag_number', 'TAG-TEST-001')->first();
        $piece2 = WorkOrderReceivedPiece::where('tag_number', 'TAG-TEST-002')->first();

        $this->assertNotNull($piece1);
        $this->assertNotNull($piece2);
        $this->assertEquals($parentProduct->id, $piece1->product_id);
        $this->assertEquals($parentProduct->id, $piece2->product_id);

        // Verify distinct weights are preserved
        $this->assertEquals(12.500, (float) $piece1->gross_weight);
        $this->assertEquals(13.200, (float) $piece2->gross_weight);
        $this->assertEquals(12.000, (float) $piece1->net_gold_weight);
        $this->assertEquals(12.800, (float) $piece2->net_gold_weight);
        $this->assertNotNull($piece1->purchase_value);
        $this->assertGreaterThan(0, (float) $piece1->purchase_value);

        // 6. Test getProductTags endpoint and parent-level summary
        $tagsRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/inventory/products/{$parentProduct->id}/tags?status=all");
        $tagsRes->assertStatus(200);

        $tagsData = $tagsRes->json('data');
        $summary = $tagsRes->json('summary');

        $this->assertCount(2, $tagsData);
        $this->assertArrayHasKey('days_since_received', $tagsData[0]);
        $this->assertIsInt($tagsData[0]['days_since_received']);
        $this->assertEquals(0, $tagsData[0]['days_since_received']);
        $this->assertEquals(0, $piece1->days_since_received);
        $this->assertFalse($piece1->is_sold);
        $this->assertEquals(2, $summary['available_count']);
        $this->assertEquals(0, $summary['sold_count']);
        $this->assertEquals(25.700, (float) $summary['available_gross_weight']); // 12.5 + 13.2
        $this->assertEquals(24.800, (float) $summary['available_net_weight']); // 12.0 + 12.8
        $this->assertEquals(0.900, (float) $summary['available_diamond_weight']); // 0.5 + 0.4

        // 7. Test Available Pieces in Sales module
        // 7a. Search by Tag Number
        $searchTagRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/sales/available-pieces?search=TAG-TEST-001');
        $searchTagRes->assertStatus(200);
        $tagResults = $searchTagRes->json('data');
        $this->assertCount(1, $tagResults);
        $this->assertEquals('TAG-TEST-001', $tagResults[0]['tag_number']);

        // 7b. Search by Receive Work Order Number (RWO)
        $searchRwoRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/sales/available-pieces?search=RWO-2026-001');
        $searchRwoRes->assertStatus(200);
        $rwoResults = $searchRwoRes->json('data');
        $this->assertCount(2, $rwoResults);

        // 8. Sell Piece 1 via SaleService
        $saleService = app(SaleService::class);
        $invoiceData = [
            'client_id' => $this->client->id,
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'payment_status' => 'paid',
            'payment_method' => 'cash',
            'amount_paid' => 100000.00,
            'items' => [
                [
                    'piece_id' => $piece1->id,
                    'piece_ids' => [$piece1->id],
                    'tag_number' => 'TAG-TEST-001',
                    'tag_numbers' => ['TAG-TEST-001'],
                    'product_id' => $parentProduct->id,
                    'code' => 'TAG-TEST-001',
                    'desc' => 'Emerald Solitaire Necklace Piece 1',
                    'quantity' => 1,
                    'gross_weight' => 12.500,
                    'net_weight' => 12.000,
                    'purity' => '22K',
                    'diamond' => 0.500,
                    'rate' => 7000.00,
                    'unit_price' => 7000.00,
                    'making_charges' => 2000.00,
                    'item_total' => 86000.00,
                ],
            ],
        ];

        $invoice = $saleService->create($invoiceData, $this->admin->id);
        $this->assertNotNull($invoice);

        // 9. Verify Piece 1 is marked as sold and linked to invoice
        $piece1->refresh();
        $piece2->refresh();
        $this->assertEquals('sold', $piece1->status);
        $this->assertEquals($invoice->id, $piece1->invoice_id);
        $this->assertEquals('in_stock', $piece2->status);
        $this->assertNull($piece2->invoice_id);

        // 10. Verify Parent Available Tags query now only returns available pieces (sold piece automatically excluded)
        $availTagsRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/inventory/products/{$parentProduct->id}/tags?status=available");
        $availTagsRes->assertStatus(200);
        $availData = $availTagsRes->json('data');
        $this->assertCount(1, $availData);
        $this->assertEquals('TAG-TEST-002', $availData[0]['tag_number']);

        $this->assertTrue($piece1->is_sold);
        $this->assertFalse($piece2->is_sold);

        // Querying status=sold returns only the sold piece
        $soldTagsRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/inventory/products/{$parentProduct->id}/tags?status=sold");
        $soldTagsRes->assertStatus(200);
        $soldData = $soldTagsRes->json('data');
        $this->assertCount(1, $soldData);
        $this->assertEquals('TAG-TEST-001', $soldData[0]['tag_number']);
        $this->assertTrue($soldData[0]['is_delivered']);

        // Summary reflects 1 available, 1 sold
        $newSummary = $availTagsRes->json('summary');
        $this->assertEquals(1, $newSummary['available_count']);
        $this->assertEquals(1, $newSummary['sold_count']);
        $this->assertEquals(13.200, (float) $newSummary['available_gross_weight']);
        $this->assertEquals(12.800, (float) $newSummary['available_net_weight']);

        // 11. Concurrency / Duplicate Sale Prevention:
        // Attempting to sell TAG-TEST-001 again MUST throw a ValidationException
        $duplicateAttemptData = [
            'client_id' => $this->client->id,
            'invoice_date' => now()->toDateString(),
            'due_date' => now()->addDays(30)->toDateString(),
            'items' => [
                [
                    'piece_id' => $piece1->id,
                    'tag_number' => 'TAG-TEST-001',
                    'quantity' => 1,
                    'rate' => 7000.00,
                ],
            ],
        ];

        try {
            $saleService->create($duplicateAttemptData, $this->admin->id);
            $this->fail('Expected ValidationException when selling already sold piece');
        } catch (ValidationException $e) {
            $this->assertStringContainsString('already been sold or invoiced', $e->getMessage());
        }

        // 12. Sale Cancellation and Tag Restoration
        $saleService->cancel($invoice, 'Customer cancellation test', $this->admin->id);

        $piece1->refresh();
        $this->assertEquals('in_stock', $piece1->status);
        $this->assertNull($piece1->invoice_id);

        // Verify piece is back in available tags
        $restoredRes = $this->actingAs($this->admin, 'sanctum')
            ->getJson("/api/inventory/products/{$parentProduct->id}/tags?status=available");
        $restoredRes->assertStatus(200);
        $this->assertCount(2, $restoredRes->json('data'));
        $this->assertEquals(2, $restoredRes->json('summary.available_count'));
    }
}
