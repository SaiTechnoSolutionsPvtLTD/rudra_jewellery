<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderReceivedPiece;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryAndJobWorkflowEndToEndTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Category $category;

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

        $this->category = Category::create([
            'name' => 'Rings',
            'code' => 'RNG',
            'status' => 'active',
        ]);
    }

    /**
     * Test 1: Inventory upload with gold purchase rate & component purchase rates.
     * Verifies live calculations, component storage, and overall purchase valuation.
     */
    public function test_inventory_gold_and_component_purchase_rates_and_valuation(): void
    {
        $payload = [
            'name' => 'Emerald Solitaire Ring',
            'product_name' => 'Emerald Solitaire Ring',
            'product_code' => 'PRD-ESR-001',
            'sku' => 'ESR-001',
            'design_no' => 'DES-ESR-001',
            'category_id' => $this->category->id,
            'gold_type' => '22K Gold',
            'purity' => 91.6,
            'gold_weight' => 10.000,
            'gross_wt' => 12.500,
            'gross_weight' => 12.500,
            'purchase_rate' => 6000.00, // Rs 6000 / g
            'current_stock_qty' => 5,
            'components' => [
                [
                    'component_type' => 'diamond',
                    'category_name' => 'Diamond',
                    'stamp' => '-2',
                    'pieces' => 4,
                    'stone_weight' => 1.250, // 1.25 ct
                    'unit' => 'ct',
                    'purchase_rate' => 45000.00, // Rs 45000 / ct
                    'purchase_value' => 56250.00,
                ],
                [
                    'component_type' => 'stone',
                    'category_name' => 'Emerald',
                    'stamp' => 'round',
                    'pieces' => 1,
                    'stone_weight' => 1.000, // 1.00 ct
                    'unit' => 'ct',
                    'purchase_rate' => 12000.00, // Rs 12000 / ct
                    'purchase_value' => 12000.00,
                ],
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/inventory', $payload);
        $response->assertStatus(201);

        $product = Product::where('sku', 'ESR-001')->orWhere('product_code', 'PRD-ESR-001')->first();
        $this->assertNotNull($product);

        $attrs = $product->attributes;
        $this->assertEquals(6000.00, (float)($attrs['purchase_rate'] ?? 0));
        // Gold purchase value: 10g * 6000 = 60,000
        $this->assertEquals(60000.00, (float)($attrs['gold_purchase_value'] ?? 0));
        // Dia value: 56,250, Stone value: 12,000
        $this->assertEquals(56250.00, (float)($attrs['diamond_purchase_value'] ?? 0));
        $this->assertEquals(12000.00, (float)($attrs['stone_purchase_value'] ?? 0));
        // Total value = 60000 + 56250 + 12000 = 128,250
        $this->assertEquals(128250.00, (float)($attrs['total_purchase_value'] ?? 0));

        // Components stored separately
        $this->assertCount(2, $attrs['components']);
        $this->assertEquals('Diamond', $attrs['components'][0]['category_name']);
        $this->assertEquals('Emerald', $attrs['components'][1]['category_name']);
        $this->assertEquals(45000.00, (float)$attrs['components'][0]['purchase_rate']);
        $this->assertEquals(12000.00, (float)$attrs['components'][1]['purchase_rate']);
    }

    /**
     * Test 2: Product lookup isolation - diamond weight must NOT leak from gross weight.
     */
    public function test_product_design_lookup_isolates_diamonds_and_calculates_fine_gold(): void
    {
        $product = Product::create([
            'name' => 'Royal Heritage Choker',
            'product_code' => 'PRD-RHC-002',
            'design_no' => 'DES-CHOKER-02',
            'sku' => 'RHC-002',
            'category_id' => $this->category->id,
            'opening_stock_weight' => 25.000,
            'current_stock_qty' => 2,
            'attributes' => [
                'design_no' => 'DES-CHOKER-02',
                'purity' => 91.6,
                'gold_karat' => '22K',
                'gross_wt' => 25.000,
                'net_wt' => 20.000,
                'purchase_rate' => 6200.00,
                'components' => [
                    [
                        'component_type' => 'diamond',
                        'category_name' => 'Diamond',
                        'stamp' => '+2',
                        'pieces' => 10,
                        'stone_weight' => 2.500, // 2.5 ct
                        'unit' => 'ct',
                        'purchase_rate' => 50000.00,
                    ],
                    [
                        'component_type' => 'diamond',
                        'category_name' => 'Diamond',
                        'stamp' => 'star',
                        'pieces' => 20,
                        'stone_weight' => 1.500, // 1.5 ct
                        'unit' => 'ct',
                        'purchase_rate' => 55000.00,
                    ],
                ],
            ],
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->getJson('/api/products/lookup-design?design_no=DES-CHOKER-02');
        $res->assertStatus(200);

        $this->assertEquals('DES-CHOKER-02', $res->json('design_number'));
        $this->assertEquals(25.000, (float)$res->json('gross_weight'));
        $this->assertEquals(20.000, (float)$res->json('net_gold_weight'));
        // Fine gold: 20 * 91.6 / 100 = 18.320
        $this->assertEquals(18.320, (float)$res->json('fine_gold_weight'));
        // Diamond weight must strictly be sum of carat diamond components (2.5 + 1.5 = 4.0 ct), NOT gross weight (25g)!
        $this->assertEquals(4.000, (float)$res->json('diamond_weight'));
        $this->assertEquals(30, (int)$res->json('diamond_count'));

        // Structured diamond components returned for auto-populating dynamic table
        $diamondComps = $res->json('diamond_components');
        $this->assertCount(2, $diamondComps);
        $this->assertEquals('+2', $diamondComps[0]['stamp']);
        $this->assertEquals(2.500, (float)$diamondComps[0]['weight']);
        $this->assertEquals(10, (int)$diamondComps[0]['count']);
        $this->assertEquals(50000.00, (float)$diamondComps[0]['rate']);
    }

    /**
     * Test 3: Main Dashboard Inventory Products card sums total product stock count.
     * E.g. 2 products with 10 units each = 20 total products.
     */
    public function test_dashboard_inventory_products_card_shows_total_stock_units(): void
    {
        Product::create([
            'name' => 'Bangle Alpha',
            'product_code' => 'PRD-BA-01',
            'sku' => 'BA-01',
            'category_id' => $this->category->id,
            'current_stock_qty' => 10,
            'opening_stock_weight' => 50.000,
            'is_active' => true,
        ]);

        Product::create([
            'name' => 'Bangle Beta',
            'product_code' => 'PRD-BB-02',
            'sku' => 'BB-02',
            'category_id' => $this->category->id,
            'current_stock_qty' => 10,
            'opening_stock_weight' => 60.000,
            'is_active' => true,
        ]);

        $res = $this->actingAs($this->admin, 'sanctum')->getJson('/api/dashboard?period=month');
        $res->assertStatus(200);

        // Even though distinct SKU count is 2, total product stock count is 20!
        $this->assertEquals(20, $res->json('summary.totalProducts'));
        $this->assertEquals(20, $res->json('summary.inventoryProductsCount'));
        $this->assertEquals(20, $res->json('summary.allTimeActiveProducts'));
    }

    /**
     * Test 4: Work order receive and inventory posting preserves multi-diamond sieves with rates.
     */
    public function test_receive_work_order_preserves_diamond_sieves_and_inventory_posting(): void
    {
        $wo = WorkOrder::create([
            'work_order_number' => 'WO-TST-999',
            'customer_name' => 'Pugal Gokul',
            'product_name' => 'Diamond Stud Earrings',
            'material_type' => '18K White Gold',
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 5.200,
            'required_qty' => 1,
            'completed_qty' => 0,
            'status' => 'in_progress',
            'current_stage' => 'receiving',
            'pricing_details' => [
                'diamond_sieves' => [
                    [
                        'stamp' => '-2',
                        'count' => 12,
                        'weight' => 0.500,
                        'rate' => 38000.00,
                    ],
                    [
                        'stamp' => '+6',
                        'count' => 2,
                        'weight' => 0.800,
                        'rate' => 45000.00,
                    ],
                ],
            ],
        ]);

        $piece = WorkOrderReceivedPiece::create([
            'work_order_id' => $wo->id,
            'piece_number' => 1,
            'product_name' => 'Diamond Stud Earrings',
            'design_no' => 'DES-DSE-01',
            'gross_weight' => 5.200,
            'net_gold_weight' => 4.940,
            'purity' => 75.0,
            'gold_karat' => '18K',
            'status' => 'ready',
            'qc_status' => 'passed',
        ]);

        // Pre-receive checks via receiving-data API
        $recData = $this->actingAs($this->admin, 'sanctum')->getJson("/api/work-orders/{$wo->id}/receiving-data?piece_id={$piece->id}");
        $recData->assertStatus(200);
        $sieves = $recData->json('prefilled.diamond_sieves') ?: $recData->json('data.prefilled.diamond_sieves');
        $this->assertCount(2, $sieves);
        $this->assertEquals(0.500, (float)$sieves[0]['weight']);
        $this->assertEquals(0.800, (float)$sieves[1]['weight']);

        $wo->ready_qty = 1;
        $wo->save();

        // Receive piece with diamond sieves
        $pieceRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$wo->id}/receive-piece", [
            'piece_id' => $piece->id,
            'gross_weight' => 5.200,
            'net_gold_weight' => 4.940,
            'purity' => 75.0,
            'gold_karat' => '18K',
            'diamond_weight' => 1.300,
            'diamond_count' => 14,
            'diamond_sieves' => [
                [
                    'stamp' => '-2',
                    'count' => 12,
                    'weight' => 0.500,
                    'rate' => 38000.00,
                ],
                [
                    'stamp' => '+6',
                    'count' => 2,
                    'weight' => 0.800,
                    'rate' => 45000.00,
                ],
            ],
        ]);
        $pieceRes->assertStatus(200);

        // Advance to ready and finalize to inventory
        $piece = WorkOrderReceivedPiece::where('work_order_id', $wo->id)->first();
        $piece->certification_status = 'skipped';
        $piece->hallmarking_status = 'skipped';
        $piece->save();

        $finRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/work-orders/{$wo->id}/finalize-inventory");
        $finRes->assertStatus(200);

        $postedProduct = Product::where('name', 'Diamond Stud Earrings')->first();
        $this->assertNotNull($postedProduct);

        // Verify diamond components preserved in product
        $postedAttrs = $postedProduct->attributes;
        $this->assertNotEmpty($postedAttrs['components']);
        $this->assertEquals(1.300, (float)$postedAttrs['dia_wt_ct']);
        $this->assertEquals(14, (int)$postedAttrs['diamond_count']);
        $this->assertEquals(38000.00, (float)$postedAttrs['components'][0]['purchase_rate']);
    }
}
