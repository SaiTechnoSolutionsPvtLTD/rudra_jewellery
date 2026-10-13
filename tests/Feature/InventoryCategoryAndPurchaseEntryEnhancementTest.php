<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Category;
use App\Models\Subcategory;
use App\Models\Supplier;
use App\Models\RawMaterial;
use App\Models\PurchaseEntry;
use App\Models\Product;
use App\Models\InventoryMovement;

class InventoryCategoryAndPurchaseEntryEnhancementTest extends TestCase
{
    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::first() ?: User::factory()->create();
    }

    /** @test */
    public function it_loads_only_active_categories_and_their_subcategories_dynamically()
    {
        // Ensure an active and an inactive category exist
        $activeCat = Category::firstOrCreate(
            ['code' => 'TEST_ACT'],
            ['name' => 'Active Test Cat', 'status' => 'active']
        );
        $inactiveCat = Category::firstOrCreate(
            ['code' => 'TEST_INACT'],
            ['name' => 'Inactive Test Cat', 'status' => 'inactive']
        );

        $activeSub = Subcategory::firstOrCreate(
            ['code' => 'SUB_ACT', 'category_id' => $activeCat->id],
            ['name' => 'Active Test Sub', 'status' => 'active']
        );
        $inactiveSub = Subcategory::firstOrCreate(
            ['code' => 'SUB_INACT', 'category_id' => $activeCat->id],
            ['name' => 'Inactive Test Sub', 'status' => 'inactive']
        );

        $response = $this->actingAs($this->user)->getJson('/api/inventory/categories');

        $response->assertStatus(200);
        $data = $response->json();

        // Must include active category
        $catIds = collect($data)->pluck('id')->toArray();
        $this->assertContains($activeCat->id, $catIds);
        // Must NOT include inactive category
        $this->assertNotContains($inactiveCat->id, $catIds);

        // Subcategories for activeCat must only contain active
        $matched = collect($data)->firstWhere('id', $activeCat->id);
        $subIds = collect($matched['subcategories'] ?? [])->pluck('id')->toArray();
        $this->assertContains($activeSub->id, $subIds);
        $this->assertNotContains($inactiveSub->id, $subIds);
    }

    /** @test */
    public function it_rejects_upload_with_zero_or_missing_gross_weight()
    {
        $category = Category::where('status', 'active')->first();

        $payload = [
            'items' => [
                [
                    'category_id' => $category->id,
                    'name' => 'Zero Weight Ring',
                    'gross_wt' => 0,
                ]
            ]
        ];

        $response = $this->actingAs($this->user)->postJson('/api/inventory', $payload);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['gross_wt']);
    }

    /** @test */
    public function it_saves_valid_inventory_product_upload()
    {
        $category = Category::where('status', 'active')->first();
        $subcategory = Subcategory::where('category_id', $category->id)->where('status', 'active')->first();

        $sku = 'TEST-PROD-' . uniqid();
        $payload = [
            'items' => [
                [
                    'category_id' => $category->id,
                    'subcategory_id' => $subcategory ? $subcategory->id : null,
                    'name' => 'Valid Uploaded Bracelet',
                    'product_code' => $sku,
                    'gross_wt' => 15.750,
                    'net_wt' => 15.500,
                    'touch' => 91.6,
                    'karat' => '22K',
                    'stamp' => '916',
                ]
            ]
        ];

        $response = $this->actingAs($this->user)->postJson('/api/inventory', $payload);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', [
            'product_code' => $sku,
            'name' => 'Valid Uploaded Bracelet',
            'category_id' => $category->id,
            'opening_stock_weight' => 15.750,
        ]);
    }

    /** @test */
    public function it_updates_raw_material_stock_weights_and_counts_on_purchase()
    {
        $supplier = Supplier::first() ?: Supplier::create([
            'name' => 'Test Bullion Supplier',
            'supplier_code' => 'SUP-TEST-1',
            'status' => 'active'
        ]);

        $uniqueMatType = 'test_mat_' . uniqid();
        $rawMaterial = RawMaterial::create([
            'material_type' => $uniqueMatType,
            'name' => 'Raw Test Material',
            'purchased_weight' => 100.0,
            'allocated_weight' => 0.0,
            'current_balance' => 100.0,
            'purchased_count' => 10,
            'allocated_count' => 0,
            'current_count' => 10,
            'unit' => 'g'
        ]);

        $initialBalance = floatval($rawMaterial->current_balance);
        $initialCount = floatval($rawMaterial->current_count);

        $purchaseNo = 'PUR-TEST-' . uniqid();
        $payload = [
            'purchase_no' => $purchaseNo,
            'supplier_id' => $supplier->id,
            'purchase_type' => 'raw_material',
            'raw_material_id' => $rawMaterial->id,
            'metal_type' => $uniqueMatType,
            'weight' => 50.000,
            'count_qty' => 5,
            'unit' => 'g',
            'purchase_date' => date('Y-m-d'),
        ];

        $response = $this->actingAs($this->user)->postJson('/api/purchase-entries', $payload);

        $response->assertStatus(201);

        $rawMaterial->refresh();

        $this->assertEquals($initialBalance + 50.0, floatval($rawMaterial->current_balance));
        $this->assertEquals($initialCount + 5, floatval($rawMaterial->current_count));

        // Check InventoryMovement
        $this->assertDatabaseHas('inventory_movements', [
            'raw_material_id' => $rawMaterial->id,
            'movement_type' => 'purchase',
            'weight' => 50.000,
        ]);

        // Reversal on delete
        $entry = PurchaseEntry::where('purchase_no', $purchaseNo)->first();
        $this->assertNotNull($entry);

        $delResponse = $this->actingAs($this->user)->deleteJson("/api/purchase-entries/{$entry->id}");
        $delResponse->assertStatus(200);

        $rawMaterial->refresh();
        $this->assertEquals($initialBalance, floatval($rawMaterial->current_balance));
        $this->assertEquals($initialCount, floatval($rawMaterial->current_count));
    }

    /** @test */
    public function it_accumulates_multiple_purchases_without_overwriting_stock()
    {
        $supplier = Supplier::first() ?: Supplier::create([
            'name' => 'Accumulation Supplier',
            'supplier_code' => 'SUP-ACC-1',
            'status' => 'active'
        ]);

        $uniqueMatType = 'acc_mat_' . uniqid();
        $rawMaterial = RawMaterial::create([
            'material_type' => $uniqueMatType,
            'name' => 'Accumulating Raw Material',
            'purchased_weight' => 200.0,
            'allocated_weight' => 0.0,
            'current_balance' => 200.0,
            'purchased_count' => 10,
            'allocated_count' => 0,
            'current_count' => 10,
            'unit' => 'g'
        ]);

        // Purchase 1: +50g, +5 count
        $payload1 = [
            'purchase_no' => 'PUR-ACC-1-' . uniqid(),
            'supplier_id' => $supplier->id,
            'purchase_type' => 'raw_material',
            'raw_material_id' => $rawMaterial->id,
            'metal_type' => $uniqueMatType,
            'weight' => 50.000,
            'count_qty' => 5,
            'unit' => 'g',
            'purchase_date' => date('Y-m-d'),
        ];
        $this->actingAs($this->user)->postJson('/api/purchase-entries', $payload1)->assertStatus(201);

        $rawMaterial->refresh();
        $this->assertEquals(250.0, floatval($rawMaterial->current_balance));
        $this->assertEquals(15.0, floatval($rawMaterial->current_count));

        // Purchase 2: +25g, +3 count
        $payload2 = [
            'purchase_no' => 'PUR-ACC-2-' . uniqid(),
            'supplier_id' => $supplier->id,
            'purchase_type' => 'raw_material',
            'raw_material_id' => $rawMaterial->id,
            'metal_type' => $uniqueMatType,
            'weight' => 25.000,
            'count_qty' => 3,
            'unit' => 'g',
            'purchase_date' => date('Y-m-d'),
        ];
        $this->actingAs($this->user)->postJson('/api/purchase-entries', $payload2)->assertStatus(201);

        $rawMaterial->refresh();
        $this->assertEquals(275.0, floatval($rawMaterial->current_balance));
        $this->assertEquals(18.0, floatval($rawMaterial->current_count));
    }

    /** @test */
    public function it_reopens_saved_inventory_product_with_persisted_values()
    {
        $category = Category::where('status', 'active')->first();
        $subcategory = Subcategory::where('category_id', $category->id)->where('status', 'active')->first();

        $sku = 'TEST-REOPEN-' . uniqid();
        $payload = [
            'items' => [
                [
                    'category_id' => $category->id,
                    'subcategory_id' => $subcategory ? $subcategory->id : null,
                    'name' => 'Royal Heritage Choker',
                    'product_code' => $sku,
                    'gross_wt' => 45.250,
                    'net_wt' => 43.100,
                    'pure_weight' => 39.480,
                    'touch' => 91.6,
                    'karat' => '22K',
                    'stamp' => '916',
                    'unit' => 'g',
                    'components' => [
                        [
                            'category_name' => 'Gold Component',
                            'gross_wt' => 45.250,
                            'net_wt' => 43.100,
                        ]
                    ]
                ]
            ]
        ];

        $createRes = $this->actingAs($this->user)->postJson('/api/inventory', $payload);
        $createRes->assertStatus(201);
        $created = $createRes->json('products.0');

        $showRes = $this->actingAs($this->user)->getJson("/api/inventory/products/{$created['id']}");
        $showRes->assertStatus(200);

        $productData = $showRes->json('product');
        $this->assertEquals('Royal Heritage Choker', $productData['name']);
        $this->assertEquals($sku, $productData['product_code']);
        $this->assertEquals($category->id, $productData['category_id']);
        $this->assertEquals(45.250, floatval($productData['opening_stock_weight']));
    }
}
