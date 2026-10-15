<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use App\Models\User;
use App\Models\Category;
use App\Models\Subcategory;
use App\Models\Karat;
use App\Models\Stamp;
use App\Models\Unit;
use App\Models\Product;
use App\Models\InventoryMovement;
use App\Services\ProductBulkUploadService;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class MultiComponentBulkUploadTest extends TestCase
{
    use RefreshDatabase;

    protected $user;
    protected $goldCategory;
    protected $diamondCategory;
    protected $necklaceSubcategory;
    protected $ringSubcategory;
    protected $bangleSubcategory;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();

        // Seed master tables required for validation
        $this->goldCategory = Category::firstOrCreate(
            ['name' => 'Gold'],
            ['code' => 'GOLD', 'status' => 'active']
        );

        $this->diamondCategory = Category::firstOrCreate(
            ['name' => 'Diamond'],
            ['code' => 'DIAMOND', 'status' => 'active']
        );

        $this->necklaceSubcategory = Subcategory::firstOrCreate(
            ['category_id' => $this->goldCategory->id, 'name' => 'Necklace'],
            ['code' => 'NECK', 'status' => 'active']
        );

        $this->ringSubcategory = Subcategory::firstOrCreate(
            ['category_id' => $this->goldCategory->id, 'name' => 'Rings'],
            ['code' => 'RING', 'status' => 'active']
        );

        $this->bangleSubcategory = Subcategory::firstOrCreate(
            ['category_id' => $this->goldCategory->id, 'name' => 'Bangles'],
            ['code' => 'BANG', 'status' => 'active']
        );

        Karat::firstOrCreate(['name' => '22K'], ['purity' => 91.6, 'purity_percentage' => 91.6, 'status' => 'active']);
        Karat::firstOrCreate(['name' => '18K'], ['purity' => 75.0, 'purity_percentage' => 75.0, 'status' => 'active']);

        Stamp::firstOrCreate(['name' => '916'], ['status' => 'active']);
        Stamp::firstOrCreate(['name' => '750'], ['status' => 'active']);
        Stamp::firstOrCreate(['name' => 'VVS-EF'], ['status' => 'active']);
        Stamp::firstOrCreate(['name' => 'VS-GH'], ['status' => 'active']);

        Unit::firstOrCreate(['code' => 'g'], ['name' => 'Gram', 'symbol' => 'g', 'status' => 'active']);
        Unit::firstOrCreate(['code' => 'ct'], ['name' => 'Carat', 'symbol' => 'ct', 'status' => 'active']);
    }

    /**
     * Helper to create a two-sheet Excel file in memory as an UploadedFile
     */
    protected function createTwoSheetExcel(array $productsRows, array $componentsRows, string $filename = 'test.xlsx'): UploadedFile
    {
        $spreadsheet = new Spreadsheet();

        // Sheet 1: Products
        $pSheet = $spreadsheet->getActiveSheet();
        $pSheet->setTitle('Products');
        if (!empty($productsRows)) {
            $headers = array_keys($productsRows[0]);
            $pSheet->fromArray([$headers], null, 'A1');
            $pSheet->fromArray(array_map('array_values', $productsRows), null, 'A2');
        }

        // Sheet 2: Components
        if (!empty($componentsRows)) {
            $cSheet = $spreadsheet->createSheet();
            $cSheet->setTitle('Components');
            $headers = array_keys($componentsRows[0]);
            $cSheet->fromArray([$headers], null, 'A1');
            $cSheet->fromArray(array_map('array_values', $componentsRows), null, 'A2');
        }

        $tmpPath = tempnam(sys_get_temp_dir(), 'xlsx_test_') . '.xlsx';
        $writer = new Xlsx($spreadsheet);
        $writer->save($tmpPath);

        return new UploadedFile($tmpPath, $filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);
    }

    /**
     * Helper to create a CSV UploadedFile
     */
    protected function createCsvFile(array $rows, string $filename = 'test.csv'): UploadedFile
    {
        $tmpPath = tempnam(sys_get_temp_dir(), 'csv_test_') . '.csv';
        $fp = fopen($tmpPath, 'w');

        if (!empty($rows)) {
            fputcsv($fp, array_keys($rows[0]));
            foreach ($rows as $row) {
                fputcsv($fp, array_values($row));
            }
        }
        fclose($fp);

        return new UploadedFile($tmpPath, $filename, 'text/csv', null, true);
    }

    /**
     * Test 1: One product with gold and three different diamond component rows in two-sheet Excel
     */
    public function test_one_product_with_three_diamond_components_imports_as_one_product()
    {
        $products = [
            [
                'product_code' => 'RJ-CH-1001',
                'product_name' => 'Royal Heritage Chain',
                'category' => 'Gold',
                'subcategory' => 'Necklace',
                'gold_weight' => '50.00',
                'gross_weight' => '50.236',
                'karat' => '22K',
                'gold_stamp' => '916',
                'quantity' => '1',
                'design_no' => 'DES-CHN-01',
            ],
        ];

        $components = [
            [
                'product_code' => 'RJ-CH-1001',
                'component_type' => 'Diamond',
                'item_name' => 'Diamond Size A (Round)',
                'size' => 'Size A (1.2mm)',
                'stamp' => 'VVS-EF',
                'no_of_pieces' => '20',
                'weight' => '0.50',
                'unit' => 'ct',
            ],
            [
                'product_code' => 'RJ-CH-1001',
                'component_type' => 'Diamond',
                'item_name' => 'Diamond Size B (Princess)',
                'size' => 'Size B (1.5mm)',
                'stamp' => 'VVS-EF',
                'no_of_pieces' => '12',
                'weight' => '0.36',
                'unit' => 'ct',
            ],
            [
                'product_code' => 'RJ-CH-1001',
                'component_type' => 'Diamond',
                'item_name' => 'Diamond Size C (Marquise)',
                'size' => 'Size C (1.8mm)',
                'stamp' => 'VS-GH',
                'no_of_pieces' => '8',
                'weight' => '0.32',
                'unit' => 'ct',
            ],
        ];

        $file = $this->createTwoSheetExcel($products, $components);

        // Preview endpoint
        $previewRes = $this->actingAs($this->user)->postJson('/api/inventory/bulk-upload/preview', [
            'file' => $file,
        ]);

        $previewRes->assertStatus(200);
        $previewData = $previewRes->json('preview');
        $this->assertTrue($previewData['is_valid']);
        $this->assertCount(1, $previewData['products']);
        $this->assertEquals(3, $previewData['products'][0]['components_count']);
        $this->assertEquals(40, $previewData['stats']['total_diamond_pieces']);
        $this->assertEquals(1.18, (float)$previewData['stats']['total_diamond_carats']);

        // Final Import
        $importRes = $this->actingAs($this->user)->postJson('/api/inventory/bulk-upload', [
            'file' => $file,
        ]);

        $importRes->assertStatus(201);
        $this->assertEquals(1, Product::count());

        $imported = Product::first();
        $this->assertEquals('RJ-CH-1001', $imported->product_code);
        $this->assertEquals(1, $imported->current_stock_qty);

        // Verify components in JSON attributes
        $attrs = is_array($imported->attributes) ? $imported->attributes : json_decode($imported->attributes, true);
        $this->assertCount(3, $attrs['components']);
        $this->assertEquals(1.18, (float)$attrs['dia_wt_ct']);
        $this->assertEquals(40, (int)$attrs['diamond_count']);
        $this->assertEquals('Size A (1.2mm)', $attrs['components'][0]['size']);
        $this->assertEquals('Size B (1.5mm)', $attrs['components'][1]['size']);
        $this->assertEquals('Size C (1.8mm)', $attrs['components'][2]['size']);

        // Check Inventory Movement recorded once
        $this->assertEquals(1, InventoryMovement::where('product_id', $imported->id)->count());
    }

    /**
     * Test 2: Products with different numbers and types of components (Diamonds + Colour Stones)
     */
    public function test_products_with_different_numbers_and_types_of_components()
    {
        $products = [
            [
                'product_code' => 'RJ-RING-MSTONE',
                'product_name' => 'Royal Emerald & Solitaire Ring',
                'category' => 'Gold',
                'subcategory' => 'Rings',
                'gold_weight' => '8.50',
                'karat' => '18K',
                'gold_stamp' => '750',
                'quantity' => '2',
            ],
        ];

        $components = [
            [
                'product_code' => 'RJ-RING-MSTONE',
                'component_type' => 'Diamond',
                'item_name' => 'Center Diamond Solitaire',
                'size' => '0.75ct Round Brilliant',
                'stamp' => 'VVS-EF',
                'no_of_pieces' => '1',
                'weight' => '0.75',
                'unit' => 'ct',
            ],
            [
                'product_code' => 'RJ-RING-MSTONE',
                'component_type' => 'Colour Stone',
                'item_name' => 'Zambian Emerald Accents',
                'size' => '2.0mm Square Cut',
                'stamp' => 'Natural',
                'no_of_pieces' => '4',
                'weight' => '0.80',
                'unit' => 'g',
            ],
        ];

        $file = $this->createTwoSheetExcel($products, $components);

        $importRes = $this->actingAs($this->user)->postJson('/api/inventory/bulk-upload', [
            'file' => $file,
        ]);

        $importRes->assertStatus(201);
        $imported = Product::first();

        $attrs = is_array($imported->attributes) ? $imported->attributes : json_decode($imported->attributes, true);
        $this->assertCount(2, $attrs['components']);
        $this->assertEquals(0.75, (float)$attrs['dia_wt_ct']);
        $this->assertEquals(1, (int)$attrs['diamond_count']);
        $this->assertEquals(0.80, (float)$attrs['stone_weight']);
        $this->assertEquals(4, (int)$attrs['stone_count']);
    }

    /**
     * Test 3: Product with NO stone components (Plain gold bangle)
     */
    public function test_plain_gold_product_with_no_components_imports_successfully()
    {
        $products = [
            [
                'product_code' => 'RJ-PLAIN-BANGLE',
                'product_name' => 'Classic Heritage Bangle 22K',
                'category' => 'Gold',
                'subcategory' => 'Bangles',
                'gold_weight' => '25.00',
                'gross_weight' => '25.00',
                'karat' => '22K',
                'gold_stamp' => '916',
                'quantity' => '5',
            ],
        ];

        // Empty components
        $file = $this->createTwoSheetExcel($products, []);

        $importRes = $this->actingAs($this->user)->postJson('/api/inventory/bulk-upload', [
            'file' => $file,
        ]);

        $importRes->assertStatus(201);
        $imported = Product::first();

        $this->assertEquals('RJ-PLAIN-BANGLE', $imported->product_code);
        $this->assertEquals(5, $imported->current_stock_qty);
        $attrs = is_array($imported->attributes) ? $imported->attributes : json_decode($imported->attributes, true);
        $this->assertEmpty($attrs['components']);
        $this->assertNull($attrs['dia_wt_ct']);
    }

    /**
     * Test 4: Multiple products imported together without cross-linking components
     */
    public function test_multiple_products_components_remain_isolated_and_unmixed()
    {
        $products = [
            [
                'product_code' => 'RJ-PROD-A',
                'product_name' => 'Product A Diamond Choker',
                'category' => 'Gold',
                'subcategory' => 'Necklace',
                'gold_weight' => '30.00',
                'karat' => '22K',
                'quantity' => '1',
            ],
            [
                'product_code' => 'RJ-PROD-B',
                'product_name' => 'Product B Plain Bangle',
                'category' => 'Gold',
                'subcategory' => 'Bangles',
                'gold_weight' => '20.00',
                'karat' => '22K',
                'quantity' => '2',
            ],
            [
                'product_code' => 'RJ-PROD-C',
                'product_name' => 'Product C Ruby Ring',
                'category' => 'Gold',
                'subcategory' => 'Rings',
                'gold_weight' => '7.00',
                'karat' => '18K',
                'quantity' => '1',
            ],
        ];

        $components = [
            // Prod A gets 2 components
            [
                'product_code' => 'RJ-PROD-A',
                'component_type' => 'Diamond',
                'item_name' => 'Choker Diamond 1',
                'size' => 'Small',
                'weight' => '0.40',
                'no_of_pieces' => '10',
                'unit' => 'ct',
            ],
            [
                'product_code' => 'RJ-PROD-A',
                'component_type' => 'Diamond',
                'item_name' => 'Choker Diamond 2',
                'size' => 'Medium',
                'weight' => '0.60',
                'no_of_pieces' => '5',
                'unit' => 'ct',
            ],
            // Prod B has NO components
            // Prod C gets 1 ruby component
            [
                'product_code' => 'RJ-PROD-C',
                'component_type' => 'Colour Stone',
                'item_name' => 'Burmese Ruby',
                'size' => 'Oval 6x4mm',
                'weight' => '1.50',
                'no_of_pieces' => '1',
                'unit' => 'g',
            ],
        ];

        $file = $this->createTwoSheetExcel($products, $components);

        $importRes = $this->actingAs($this->user)->postJson('/api/inventory/bulk-upload', [
            'file' => $file,
        ]);

        $importRes->assertStatus(201);
        $this->assertEquals(3, Product::count());

        $prodA = Product::where('product_code', 'RJ-PROD-A')->first();
        $prodB = Product::where('product_code', 'RJ-PROD-B')->first();
        $prodC = Product::where('product_code', 'RJ-PROD-C')->first();

        $attrsA = is_array($prodA->attributes) ? $prodA->attributes : json_decode($prodA->attributes, true);
        $attrsB = is_array($prodB->attributes) ? $prodB->attributes : json_decode($prodB->attributes, true);
        $attrsC = is_array($prodC->attributes) ? $prodC->attributes : json_decode($prodC->attributes, true);

        // Prod A has exactly 2 components totaling 1.00 ct
        $this->assertCount(2, $attrsA['components']);
        $this->assertEquals(1.00, (float)$attrsA['dia_wt_ct']);

        // Prod B has 0 components
        $this->assertCount(0, $attrsB['components']);

        // Prod C has exactly 1 component (Ruby, 1.50g)
        $this->assertCount(1, $attrsC['components']);
        $this->assertStringContainsString('Burmese Ruby', $attrsC['components'][0]['item_name']);
        $this->assertEquals(1.50, (float)$attrsC['stone_weight']);
    }

    /**
     * Test 5: Validation errors for unknown masters, orphan components, duplicate SKUs, invalid weights
     */
    public function test_validation_rejects_unknown_category_orphan_components_and_duplicate_skus()
    {
        $products = [
            [
                'product_code' => 'RJ-ERR-1',
                'product_name' => 'Invalid Category Item',
                'category' => 'Platinum NonExistent',
                'subcategory' => 'Necklace',
                'gold_weight' => '10.00',
            ],
            [
                'product_code' => 'RJ-ERR-1', // Duplicate SKU
                'product_name' => 'Duplicate SKU Item',
                'category' => 'Gold',
                'subcategory' => 'Necklace',
                'gold_weight' => '15.00',
            ],
        ];

        $components = [
            [
                'product_code' => 'RJ-ORPHAN-GHOST', // Orphan component (no matching product)
                'component_type' => 'Diamond',
                'item_name' => 'Ghost Diamond',
                'weight' => '0.50',
                'no_of_pieces' => '5',
                'unit' => 'ct',
            ],
        ];

        $file = $this->createTwoSheetExcel($products, $components);

        $previewRes = $this->actingAs($this->user)->postJson('/api/inventory/bulk-upload/preview', [
            'file' => $file,
        ]);

        $previewRes->assertStatus(200);
        $previewData = $previewRes->json('preview');
        $this->assertFalse($previewData['is_valid']);
        $this->assertNotEmpty($previewData['errors']);

        // Verify specific errors were caught
        $errorReasons = collect($previewData['errors'])->pluck('reason')->implode(' | ');
        $this->assertStringContainsString('Platinum NonExistent', $errorReasons);
        $this->assertStringContainsString('Duplicate Product Code', $errorReasons);
        $this->assertStringContainsString('Orphan component', $errorReasons);

        // Ensure Import rejects with 422
        $importRes = $this->actingAs($this->user)->postJson('/api/inventory/bulk-upload', [
            'file' => $file,
        ]);

        $importRes->assertStatus(422);
        $this->assertEquals(0, Product::count());
    }

    /**
     * Test 6: Database transaction rollbacks completely on error (no partial writes)
     */
    public function test_failed_import_rolls_back_all_changes_leaving_zero_partial_records()
    {
        // 1 valid product + 1 invalid subcategory product in same file
        $products = [
            [
                'product_code' => 'RJ-GOOD-01',
                'product_name' => 'Good Product',
                'category' => 'Gold',
                'subcategory' => 'Necklace',
                'gold_weight' => '12.00',
            ],
            [
                'product_code' => 'RJ-BAD-02',
                'product_name' => 'Bad Product With Incompatible Subcategory',
                'category' => 'Gold',
                'subcategory' => 'NonExistentSub',
                'gold_weight' => '10.00',
            ],
        ];

        $file = $this->createTwoSheetExcel($products, []);

        $importRes = $this->actingAs($this->user)->postJson('/api/inventory/bulk-upload', [
            'file' => $file,
        ]);

        $importRes->assertStatus(422);
        // Neither the good nor bad product must exist in the database
        $this->assertEquals(0, Product::count());
        $this->assertEquals(0, InventoryMovement::count());
    }

    /**
     * Test 7: Multi-component CSV import format (Unified repeated rows)
     */
    public function test_unified_csv_import_with_repeated_product_code_groups_components_correctly()
    {
        $csvRows = [
            [
                'product_code' => 'RJ-CSV-01',
                'product_name' => 'Heritage Peacock Necklace',
                'category' => 'Gold',
                'subcategory' => 'Necklace',
                'gold_weight' => '45.00',
                'karat' => '22K',
                'component_type' => 'Diamond',
                'item_name' => 'Diamond Size A',
                'size' => '1.2mm',
                'stamp' => 'VVS-EF',
                'no_of_pieces' => '15',
                'weight' => '0.45',
                'unit' => 'ct',
            ],
            [
                'product_code' => 'RJ-CSV-01',
                'product_name' => '', // Repeated row for same product
                'category' => '',
                'subcategory' => '',
                'gold_weight' => '',
                'karat' => '',
                'component_type' => 'Diamond',
                'item_name' => 'Diamond Size B',
                'size' => '1.5mm',
                'stamp' => 'VVS-EF',
                'no_of_pieces' => '10',
                'weight' => '0.35',
                'unit' => 'ct',
            ],
        ];

        $file = $this->createCsvFile($csvRows);

        $previewRes = $this->actingAs($this->user)->postJson('/api/inventory/bulk-upload/preview', [
            'file' => $file,
        ]);

        $previewRes->assertStatus(200);
        $previewData = $previewRes->json('preview');
        $this->assertTrue($previewData['is_valid']);
        $this->assertCount(1, $previewData['products']);
        $this->assertEquals(2, $previewData['products'][0]['components_count']);

        $importRes = $this->actingAs($this->user)->postJson('/api/inventory/bulk-upload', [
            'file' => $file,
        ]);

        $importRes->assertStatus(201);
        $this->assertEquals(1, Product::count());

        $imported = Product::first();
        $attrs = is_array($imported->attributes) ? $imported->attributes : json_decode($imported->attributes, true);
        $this->assertCount(2, $attrs['components']);
        $this->assertEquals(0.80, (float)$attrs['dia_wt_ct']);
        $this->assertEquals(25, (int)$attrs['diamond_count']);
    }

    /**
     * Test 8: Template downloads return valid files
     */
    public function test_sample_excel_and_sample_csv_downloads_succeed()
    {
        $excelRes = $this->actingAs($this->user)->get('/api/inventory/sample-excel');
        $excelRes->assertStatus(200);
        $excelRes->assertHeader('content-type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        $csvRes = $this->actingAs($this->user)->get('/api/inventory/sample-csv');
        $csvRes->assertStatus(200);
        $csvRes->assertHeader('content-type', 'text/csv; charset=UTF-8');
        $this->assertStringContainsString('product_code', $csvRes->getContent());
        $this->assertStringContainsString('component_type', $csvRes->getContent());
        $this->assertStringContainsString('image_url', $csvRes->getContent());
    }

    /**
     * Test 9: Existing product editing preserves and updates component entries correctly
     */
    public function test_editing_product_with_components_persists_changes_without_losing_components()
    {
        $product = Product::create([
            'category_id' => $this->goldCategory->id,
            'subcategory_id' => $this->necklaceSubcategory->id,
            'name' => 'Original Gold Choker',
            'product_code' => 'RJ-EDIT-01',
            'opening_stock_qty' => 1,
            'current_stock_qty' => 1,
            'opening_stock_weight' => 35.0,
            'status' => 'active',
            'attributes' => [
                'purity' => '22K',
                'gross_wt' => 35.0,
                'net_wt' => 35.0,
                'components' => [
                    [
                        'component_type' => 'Diamond',
                        'item_name' => 'Original Diamond',
                        'size' => '1.0mm',
                        'stamp' => 'VVS-EF',
                        'no_of_pieces' => 10,
                        'stone_weight' => 0.20,
                        'unit' => 'ct',
                    ],
                ],
            ],
        ]);

        // Edit via PUT /inventory/products/{id}
        $updatedComponents = [
            [
                'component_type' => 'Diamond',
                'item_name' => 'Updated Diamond Size A',
                'size' => '1.2mm',
                'stamp' => 'VVS-EF',
                'no_of_pieces' => 15,
                'stone_weight' => 0.35,
                'unit' => 'ct',
            ],
            [
                'component_type' => 'Colour Stone',
                'item_name' => 'Added Ruby Bead',
                'size' => '3mm',
                'stamp' => 'AAA',
                'no_of_pieces' => 2,
                'stone_weight' => 0.80,
                'unit' => 'g',
            ],
        ];

        $updateRes = $this->actingAs($this->user)->putJson("/api/inventory/products/{$product->id}", [
            'name' => 'Updated Gold Choker With Stones',
            'product_code' => 'RJ-EDIT-01',
            'category_id' => $this->goldCategory->id,
            'subcategory_id' => $this->necklaceSubcategory->id,
            'gross_wt' => 36.0,
            'net_wt' => 35.0,
            'components' => $updatedComponents,
        ]);

        $updateRes->assertStatus(200);

        // Fetch detail view
        $viewRes = $this->actingAs($this->user)->getJson("/api/inventory/products/{$product->id}");
        $viewRes->assertStatus(200);
        $viewData = $viewRes->json();

        $this->assertEquals('Updated Gold Choker With Stones', $viewData['product']['name']);
        $this->assertCount(2, $viewData['attributes']['components']);
        $this->assertEquals('Updated Diamond Size A', $viewData['attributes']['components'][0]['item_name']);
        $this->assertEquals('Added Ruby Bead', $viewData['attributes']['components'][1]['item_name']);
    }

    /**
     * Test 10: Sieve stamps (+7, +4, etc.) without size_grade column import cleanly
     */
    public function test_sieve_stamp_numbers_without_size_column_imports_correctly()
    {
        $products = [
            [
                'product_code' => 'RJ-STAMP-01',
                'product_name' => 'Diamond Sieve Ring',
                'category' => 'Gold',
                'subcategory' => 'Rings',
                'gold_weight' => '10.00',
                'gross_weight' => '10.172',
                'karat' => '22K',
                'gold_stamp' => '916',
                'quantity' => '1',
            ],
        ];

        // Notice: NO size or size_grade column! Only stamp with numbers like +7, +4
        $components = [
            [
                'product_code' => 'RJ-STAMP-01',
                'component_type' => 'Diamond',
                'stone_type' => 'Diamond',
                'stamp' => '+7',
                'pieces_count' => '15',
                'weight' => '0.50',
                'unit' => 'ct',
            ],
            [
                'product_code' => 'RJ-STAMP-01',
                'component_type' => 'Diamond',
                'stone_type' => 'Diamond',
                'stamp' => '4', // Raw number 4 gets normalized to +4
                'pieces_count' => '10',
                'weight' => '0.36',
                'unit' => 'ct',
            ],
        ];

        $file = $this->createTwoSheetExcel($products, $components, 'stamp_test.xlsx');

        $importRes = $this->actingAs($this->user)->postJson('/api/inventory/bulk-upload', [
            'file' => $file,
        ]);

        $importRes->assertStatus(201);
        $imported = Product::where('product_code', 'RJ-STAMP-01')->first();
        $this->assertNotNull($imported);

        $attrs = is_array($imported->attributes) ? $imported->attributes : json_decode($imported->attributes, true);
        $this->assertCount(2, $attrs['components']);
        $this->assertEquals('+7', $attrs['components'][0]['stamp']);
        $this->assertEquals('+4', $attrs['components'][1]['stamp']);
        $this->assertEquals('+7', $attrs['diamond_stamp']);
        $this->assertEquals(0.86, (float)$attrs['dia_wt_ct']);
        $this->assertEquals(25, (int)$attrs['diamond_count']);
    }
}

