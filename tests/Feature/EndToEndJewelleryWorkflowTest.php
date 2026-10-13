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
use App\Models\RawMaterial;
use App\Models\Stamp;
use Illuminate\Support\Facades\DB;

class EndToEndJewelleryWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Karigar $karigar;
    protected Category $category;
    protected Subcategory $subcategory;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);

        $this->karigar = Karigar::create([
            'karigar_code' => 'KAR-E2E-01',
            'name' => 'Master Karigar Meenakshi',
            'primary_phone' => '9840123456',
            'status' => 'active',
            'current_gold_balance_grams' => 0.0,
        ]);

        $this->category = Category::create([
            'name' => 'Antique Chokers',
            'code' => 'ANT-CHK',
            'status' => 'active',
        ]);

        $this->subcategory = Subcategory::create([
            'category_id' => $this->category->id,
            'name' => 'Royal Heritage',
            'code' => 'RH-01',
            'status' => 'active',
        ]);

        // Seed raw materials vault
        RawMaterial::updateOrCreate(
            ['material_type' => 'gold'],
            ['name' => 'Fine Gold 24K Vault', 'unit' => 'grams', 'current_balance' => 500.000]
        );

        // Seed stamp
        Stamp::create([
            'code' => '916-BIS',
            'name' => '22K 916 BIS Hallmark',
            'category_id' => $this->category->id,
            'status' => 'active',
        ]);
    }

    public function test_complete_end_to_end_workflow()
    {
        // 1. Masters verification
        $catRes = $this->actingAs($this->user)->getJson('/api/categories');
        $catRes->assertStatus(200);
        $this->assertNotEmpty($catRes->json('data') ?: $catRes->json());

        // 2. Inventory: Create a product with category, subcategory, design_no, attributes, weights
        $productPayload = [
            'name' => 'Heritage Royal Choker',
            'product_code' => 'DES-ROYAL-777',
            'design_no' => 'DES-ROYAL-777',
            'category_id' => $this->category->id,
            'subcategory_id' => $this->subcategory->id,
            'opening_stock_qty' => 1,
            'opening_stock_weight' => 25.500,
            'opening_touch' => 91.60,
            'opening_fine_weight' => 23.358,
            'opening_stock_rate' => 0, // Intentionally 0 to verify live metal rate valuation fallback
            'attributes' => [
                'design_no' => 'DES-ROYAL-777',
                'gross_wt' => 25.500,
                'net_wt' => 25.000,
                'karat' => '22K',
                'stamp' => '916-BIS',
                'diamond_count' => 12,
                'diamond_weight' => 0.85,
            ],
            'status' => 'active',
        ];

        $prodCreateRes = $this->actingAs($this->user)->postJson('/api/products', $productPayload);
        $prodCreateRes->assertStatus(201);
        $productId = $prodCreateRes->json('data.id') ?: $prodCreateRes->json('id');
        $this->assertNotNull($productId);

        $initialProductCount = Product::count();

        // 3. Job Creation: Lookup existing inventory product by design_no
        $lookupRes = $this->actingAs($this->user)->getJson('/api/products/lookup-design?design_number=DES-ROYAL-777');
        $lookupRes->assertStatus(200);
        $this->assertTrue($lookupRes->json('found'));
        $this->assertEquals($productId, $lookupRes->json('product_id'));
        $this->assertEquals('Heritage Royal Choker', $lookupRes->json('product_name'));

        // 4. Work Order: Create Work Order containing jobs and assign Karigar
        $woPayload = [
            'work_order_number' => 'WO-E2E-2026-001',
            'karigar_id' => $this->karigar->id,
            'category_id' => $this->category->id,
            'subcategory_id' => $this->subcategory->id,
            'product_name' => 'Heritage Royal Choker',
            'design_code' => 'DES-ROYAL-777',
            'product_id' => $productId,
            'allotted_weight' => 51.000,
            'required_qty' => 2,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'material_type' => 'Gold 22K (916)',
            'items' => [
                [
                    'product_id' => $productId,
                    'product_name' => 'Heritage Royal Choker',
                    'design_number' => 'DES-ROYAL-777',
                    'need_pcs' => 2,
                    'gold_weight' => 25.500,
                    'total_gross_wt' => 51.000,
                    'allotted_weight' => 51.000,
                ]
            ],
        ];

        $woCreateRes = $this->actingAs($this->user)->postJson('/api/work-orders', $woPayload);
        $woCreateRes->assertStatus(201);
        $orderId = $woCreateRes->json('data.id');

        // Check that creating work order from existing design DID NOT create duplicate product
        $this->assertEquals($initialProductCount, Product::count());

        // Verify Karigar bench balance was synced
        $this->karigar->refresh();
        $this->assertEquals(51.000, (float)$this->karigar->current_gold_balance_grams);

        // 5. Production Updates: WIP stages, track progress, partial completion
        // Progress 2 pieces through WIP and submit to QC
        $wipRes = $this->actingAs($this->user)->postJson("/api/work-orders/{$orderId}/wip-update", [
            'completed_qty' => 2,
            'completed_weight' => 51.000,
            'actual_weight' => 51.000,
            'submit_to_qc' => true,
        ]);
        $wipRes->assertStatus(200);

        // Verify piece records exist and no duplicate pieces created
        $pieces = WorkOrderReceivedPiece::where('work_order_id', $orderId)->get();
        $this->assertCount(2, $pieces);

        // 6. QC: 1 Approved, 1 Rework
        $qcRes = $this->actingAs($this->user)->postJson("/api/work-orders/{$orderId}/qc-action", [
            'action' => 'approve',
            'approved_qty' => 1,
            'rework_qty' => 1,
            'remarks' => 'Piece 1 passed, Piece 2 clasp requires realignment',
        ]);
        $qcRes->assertStatus(200);

        $order = WorkOrder::find($orderId);
        $this->assertEquals(1, $order->qc_approved_qty);
        $this->assertEquals(1, $order->rework_qty);

        // Rework piece resubmitted through production: verify piece is reused (NO duplicate created)
        $reworkRes = $this->actingAs($this->user)->postJson("/api/work-orders/{$orderId}/wip-update", [
            'completed_now' => 1,
            'completed_weight' => 25.500,
            'submit_to_qc' => true,
        ]);
        $reworkRes->assertStatus(200);
        $this->assertCount(2, WorkOrderReceivedPiece::where('work_order_id', $orderId)->get());

        // Approve the reworked piece in QC
        $qcPassAllRes = $this->actingAs($this->user)->postJson("/api/work-orders/{$orderId}/qc-action", [
            'action' => 'approve',
            'approved_qty' => 1,
            'rework_qty' => 0,
        ]);
        $qcPassAllRes->assertStatus(200);

        $order->refresh();
        $this->assertEquals(2, $order->ready_qty);
        $this->assertEquals('ready', $order->status);

        // Verify inventory has NOT been credited prematurely!
        $prodBeforeReceive = Product::find($productId);
        $this->assertEquals(1, $prodBeforeReceive->current_stock_qty); // Still initial 1

        // 7. Receive Order: Partial receiving (receive piece 1)
        $recPiece1Res = $this->actingAs($this->user)->postJson("/api/work-orders/{$orderId}/receive-piece", [
            'gross_weight' => 25.500,
            'net_gold_weight' => 25.000,
            'purity' => 91.60,
            'diamond_weight' => 0.85,
            'diamond_count' => 12,
        ]);
        $recPiece1Res->assertStatus(200);
        $tagNumber1 = $recPiece1Res->json('tag_number');
        $this->assertNotEmpty($tagNumber1);

        $order->refresh();
        $this->assertEquals(1, $order->received_qty);
        $this->assertEquals('partially_received', $order->status); // Work Order remains active!

        // 8. Certification & Hallmarking
        $certRes = $this->actingAs($this->user)->postJson("/api/work-orders/{$orderId}/update-certification", [
            'action' => 'add',
            'certification_no' => 'CERT-BIS-99881',
            'agency' => 'BIS Hallmarking Center',
        ]);
        $certRes->assertStatus(200);

        $hallRes = $this->actingAs($this->user)->postJson("/api/work-orders/{$orderId}/update-hallmarking", [
            'action' => 'add',
            'huid' => 'HUID778899',
            'hallmark_center' => 'Chennai Govt Hallmark Center',
        ]);
        $hallRes->assertStatus(200);

        // Receive piece 2
        $recPiece2Res = $this->actingAs($this->user)->postJson("/api/work-orders/{$orderId}/receive-piece", [
            'gross_weight' => 25.500,
            'net_gold_weight' => 25.000,
            'purity' => 91.60,
            'diamond_weight' => 0.85,
            'diamond_count' => 12,
        ]);
        $recPiece2Res->assertStatus(200);
        $tagNumber2 = $recPiece2Res->json('tag_number');
        $this->assertNotEmpty($tagNumber2);

        // 9. Inventory Update: Both pieces received & verified -> Order completes & inventory updates existing product
        $order->refresh();
        $this->assertEquals(2, $order->received_qty);
        $this->assertEquals(2, $order->finalized_qty);
        $this->assertEquals('completed', $order->status);

        $prodFinal = Product::find($productId);
        // Initial stock 1 + 2 completed = 3
        $this->assertEquals(3, $prodFinal->current_stock_qty);
        // Opening weight 25.5 + 25.5 + 25.5 = 76.500
        $this->assertEquals(76.500, (float)$prodFinal->opening_stock_weight);
        // Verify no duplicate product created
        $this->assertEquals($initialProductCount, Product::count());

        // 10. Tag Printing: Verify getProductTags API returns valid generated tags
        $tagRes = $this->actingAs($this->user)->getJson("/api/inventory/products/{$productId}/tags");
        $tagRes->assertStatus(200);
        $tagsData = $tagRes->json('tags') ?: $tagRes->json('data') ?: $tagRes->json();
        $this->assertNotEmpty($tagsData);

        // 11. Main Dashboard: Verify Inventory Products card returns valid count of products
        $dashRes = $this->actingAs($this->user)->getJson('/api/dashboard?period=month');
        $dashRes->assertStatus(200);
        $dashData = $dashRes->json('data') ?: $dashRes->json();
        $this->assertArrayHasKey('inventoryProductsCount', $dashData['summary']);
        $this->assertGreaterThanOrEqual(1, $dashData['summary']['inventoryProductsCount']);
    }
}
