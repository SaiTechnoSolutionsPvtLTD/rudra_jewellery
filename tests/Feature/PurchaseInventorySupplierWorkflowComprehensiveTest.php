<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Supplier;
use App\Models\RawMaterial;
use App\Models\PurchaseEntry;
use App\Models\Product;
use App\Models\Stamp;
use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;

class PurchaseInventorySupplierWorkflowComprehensiveTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Supplier $supplier;
    protected RawMaterial $goldMat;
    protected RawMaterial $silverMat;
    protected RawMaterial $diamondMat;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['role' => 'admin']);

        $this->supplier = Supplier::create([
            'supplier_code' => 'SUP-TEST-01',
            'name' => 'Royal Bullion & Gems',
            'supplier_type' => 'Bullion Merchant',
            'status' => 'active',
            'current_balance' => 0.00,
            'gold_balance_grams' => 0.000,
            'silver_balance_grams' => 0.000,
        ]);

        $this->goldMat = RawMaterial::updateOrCreate(
            ['material_type' => 'gold'],
            [
                'name' => '24K Pure Gold Granules',
                'unit' => 'g',
                'current_balance' => 100.000,
                'opening_weight' => 100.000,
                'purchased_weight' => 0.000,
                'allocated_weight' => 0.000,
            ]
        );

        $this->silverMat = RawMaterial::updateOrCreate(
            ['material_type' => 'silver'],
            [
                'name' => '999 Fine Silver Grains',
                'unit' => 'g',
                'current_balance' => 500.000,
                'opening_weight' => 500.000,
                'purchased_weight' => 0.000,
                'allocated_weight' => 0.000,
            ]
        );

        $this->diamondMat = RawMaterial::updateOrCreate(
            ['material_type' => 'diamond'],
            [
                'name' => 'Loose Polished Diamonds',
                'unit' => 'ct',
                'current_balance' => 20.000,
                'current_count' => 100,
                'opening_weight' => 20.000,
                'opening_count' => 100,
                'purchased_weight' => 0.000,
                'purchased_count' => 0,
                'allocated_weight' => 0.000,
                'allocated_count' => 0,
            ]
        );
    }

    /** @test */
    public function gold_purchase_calculates_fine_gold_and_updates_supplier_and_vault()
    {
        // 60g @ 22K (91.667% = 55.000g pure 24K) with Gross 62g, Less 2g => Net 60g
        // Rate: 0 (Unpriced => 24K gold payable)
        $res = $this->actingAs($this->user)->postJson('/api/purchase-entries', [
            'supplier_id' => $this->supplier->id,
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'raw_material_id' => $this->goldMat->id,
            'purity' => '22K',
            'weight' => 62.000,
            'less_weight' => 2.000,
            'net_weight' => 60.000,
            'touch' => 91.6,
            'rate' => 0,
            'total_amount' => 0,
            'purchase_date' => now()->toDateString(),
        ]);

        $res->assertStatus(201);
        $entry = $res->json('purchase_entry');
        $this->assertEquals(55.000, (float) $entry['fine_weight']);
        $this->assertEquals(60.000, (float) $entry['net_weight']);

        // Gold vault credited with 24K fine weight
        $this->goldMat->refresh();
        $this->assertEquals(155.000, (float) $this->goldMat->current_balance);

        // Supplier gold liability credited (negative balance = company owes 55g pure gold)
        $this->supplier->refresh();
        $this->assertEquals(-55.000, (float) $this->supplier->gold_balance_grams);
        $this->assertEquals(0.00, (float) $this->supplier->current_balance);
    }

    /** @test */
    public function silver_purchase_updates_silver_stock_without_affecting_gold()
    {
        // 200g Silver at ₹90/g = ₹18,000 monetary payable
        $res = $this->actingAs($this->user)->postJson('/api/purchase-entries', [
            'supplier_id' => $this->supplier->id,
            'purchase_type' => 'raw_material',
            'metal_type' => 'silver',
            'raw_material_id' => $this->silverMat->id,
            'purity' => '999',
            'weight' => 200.000,
            'net_weight' => 200.000,
            'rate' => 90,
            'total_amount' => 18000.00,
            'paid_amount' => 5000.00,
            'purchase_date' => now()->toDateString(),
        ]);

        $res->assertStatus(201);

        // Silver stock increased by 200g
        $this->silverMat->refresh();
        $this->assertEquals(700.000, (float) $this->silverMat->current_balance);

        // Gold stock unchanged
        $this->goldMat->refresh();
        $this->assertEquals(100.000, (float) $this->goldMat->current_balance);

        // Supplier monetary liability: -13,000 (18000 - 5000)
        $this->supplier->refresh();
        $this->assertEquals(-13000.00, (float) $this->supplier->current_balance);
        $this->assertEquals(0.000, (float) $this->supplier->gold_balance_grams);
    }

    /** @test */
    public function diamond_purchase_records_repeatable_components_and_updates_stamp_wise_stock()
    {
        $components = [
            [
                'stamp' => '+5 Sieve',
                'sieve_size' => '+5 Sieve',
                'diamond_type' => 'Round Brilliant',
                'stones_count' => 3,
                'weight_carats' => 0.670,
                'rate_per_carat' => 50000,
                'row_value' => 33500.00,
                'notes' => 'VVS/GH parcel',
            ],
            [
                'stamp' => '+4 Sieve',
                'sieve_size' => '+4 Sieve',
                'diamond_type' => 'Round Brilliant',
                'stones_count' => 5,
                'weight_carats' => 1.200,
                'rate_per_carat' => 45000,
                'row_value' => 54000.00,
                'notes' => 'VS/EF parcel',
            ],
        ];

        $res = $this->actingAs($this->user)->postJson('/api/purchase-entries', [
            'supplier_id' => $this->supplier->id,
            'purchase_type' => 'raw_material',
            'metal_type' => 'diamond',
            'unit' => 'ct',
            'raw_material_id' => $this->diamondMat->id,
            'components' => $components,
            'weight' => 1.870,
            'count_qty' => 8,
            'total_amount' => 87500.00,
            'paid_amount' => 0,
            'purchase_date' => now()->toDateString(),
        ]);

        $res->assertStatus(201);
        $entry = $res->json('purchase_entry');
        $this->assertCount(2, $entry['components']);
        $this->assertEquals(1.870, (float) $entry['weight']);
        $this->assertEquals(8, (int) $entry['count_qty']);
        $this->assertEquals(87500.00, (float) $entry['total_amount']);

        // Both stamps auto-registered in Stamp master
        $this->assertTrue(Stamp::where('name', '+5 Sieve')->exists());
        $this->assertTrue(Stamp::where('name', '+4 Sieve')->exists());

        // Diamond raw material total stock updated
        $this->diamondMat->refresh();
        $this->assertEquals(21.870, (float) $this->diamondMat->current_balance);
        $this->assertEquals(108, (int) $this->diamondMat->current_count);

        // Unified stock endpoint returns correct stamp-wise isolation
        $stockRes = $this->actingAs($this->user)->getJson('/api/raw-materials/unified-stock');
        $stockRes->assertStatus(200);

        $stampsStock = collect($stockRes->json('diamond_by_stamp'));
        $stampPlus5 = $stampsStock->firstWhere('stamp', '+5 Sieve');
        $stampPlus4 = $stampsStock->firstWhere('stamp', '+4 Sieve');

        $this->assertNotNull($stampPlus5);
        $this->assertEquals(0.670, (float) $stampPlus5['available_carats']);
        $this->assertEquals(3, (int) $stampPlus5['available_count']);

        $this->assertNotNull($stampPlus4);
        $this->assertEquals(1.200, (float) $stampPlus4['available_carats']);
        $this->assertEquals(5, (int) $stampPlus4['available_count']);
    }

    /** @test */
    public function finished_jewellery_purchase_creates_product_without_affecting_raw_gold_stock()
    {
        $category = Category::create([
            'name' => 'Necklaces',
            'code' => 'NECK',
            'status' => 'active',
        ]);

        $res = $this->actingAs($this->user)->postJson('/api/purchase-entries', [
            'supplier_id' => $this->supplier->id,
            'purchase_type' => 'finished_product',
            'category_id' => $category->id,
            'item_name' => 'Diamond Solitaire Pendant',
            'product_code' => 'DSP-9988',
            'design_no' => 'DES-9988',
            'gold_karat' => '18K',
            'gold_stamp' => '750',
            'weight' => 15.500, // gross wt
            'less_weight' => 0.500,
            'net_weight' => 15.000,
            'diamond_weight' => 2.500,
            'diamond_count' => 1,
            'diamond_stamp' => 'SI-GH',
            'making_charge' => 5000,
            'rate' => 6000,
            'total_amount' => 95000.00,
            'purchase_date' => now()->toDateString(),
        ]);

        $res->assertStatus(201);
        $product = Product::where('product_code', 'DSP-9988')->first();
        $this->assertNotNull($product);
        $this->assertEquals(15.000, (float) $product->opening_stock_weight);

        // Verify child piece tag auto-created in WorkOrderReceivedPiece for inventory parity
        $piece = \App\Models\WorkOrderReceivedPiece::where('product_id', $product->id)->first();
        $this->assertNotNull($piece);
        $this->assertEquals('in_stock', $piece->status);
        $this->assertTrue((bool)$piece->is_inventory_posted);
        $this->assertEquals(15.500, (float) $piece->gross_weight);
        $this->assertEquals(15.000, (float) $piece->net_gold_weight);
        $this->assertNotEmpty($piece->tag_number);
        $this->assertContains($piece->tag_number, $product->attributes['tags'] ?? []);

        // Raw gold stock untouched (remains 100g)
        $this->goldMat->refresh();
        $this->assertEquals(100.000, (float) $this->goldMat->current_balance);
    }

    /** @test */
    public function supplier_monthly_report_strict_reconciliation()
    {
        // 1. Prior unpriced gold purchase on 2026-09-10 (60g @ 22K = 55.000g fine)
        PurchaseEntry::create([
            'purchase_no' => 'PUR-PRIOR-1',
            'supplier_id' => $this->supplier->id,
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'weight' => 60.000,
            'net_weight' => 60.000,
            'fine_weight' => 55.000,
            'rate' => 0,
            'total_amount' => 0,
            'purchase_date' => '2026-09-10',
        ]);

        // 2. Current period (October 2026):
        // Purchase A: Priced monetary purchase ₹100,000, paid ₹20,000 => ₹80,000 new payable
        PurchaseEntry::create([
            'purchase_no' => 'PUR-OCT-1',
            'supplier_id' => $this->supplier->id,
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'weight' => 20.000,
            'net_weight' => 20.000,
            'fine_weight' => 18.333,
            'rate' => 5000,
            'total_amount' => 100000.00,
            'paid_amount' => 20000.00,
            'purchase_date' => '2026-10-05',
        ]);

        // Purchase B: Unpriced gold purchase (20g @ 24K = 20g fine gold)
        PurchaseEntry::create([
            'purchase_no' => 'PUR-OCT-2',
            'supplier_id' => $this->supplier->id,
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'weight' => 20.000,
            'net_weight' => 20.000,
            'fine_weight' => 20.000,
            'rate' => 0,
            'total_amount' => 0,
            'purchase_date' => '2026-10-12',
        ]);

        // Settlement: Paid ₹30,000 cash to supplier
        \App\Models\SupplierSettlement::create([
            'supplier_id' => $this->supplier->id,
            'settlement_type' => 'cash',
            'amount' => 30000.00,
            'settlement_date' => '2026-10-15',
        ]);

        // Settlement: Delivered 15g 24K pure gold to supplier
        \App\Models\SupplierSettlement::create([
            'supplier_id' => $this->supplier->id,
            'settlement_type' => 'gold',
            'fine_weight' => 15.000,
            'weight' => 15.000,
            'settlement_date' => '2026-10-20',
        ]);

        // Query supplier monthly report for October 2026
        $repRes = $this->actingAs($this->user)->getJson('/api/reports/supplier-monthly?year=2026&month=10&supplier_id=' . $this->supplier->id);
        $repRes->assertStatus(200);

        $reportData = $repRes->json('data.0');
        $this->assertNotNull($reportData);

        // Opening: Cash = 0, Gold = 55.000g
        $this->assertEquals(0.00, (float) $reportData['opening_balance']['cash_payable']);
        $this->assertEquals(55.000, (float) $reportData['opening_balance']['gold_fine_24k']);

        // Period totals:
        // Monetary new payable = 80,000
        // Cash settled = 30,000
        // Unpriced gold purchased = 20.000g
        // Gold settled = 15.000g
        $this->assertEquals(80000.00, (float) $reportData['period_totals']['monetary_new_payable']);
        $this->assertEquals(30000.00, (float) $reportData['period_totals']['cash_settled']);
        $this->assertEquals(20.000, (float) $reportData['period_totals']['unpriced_gold_purchased_24k']);
        $this->assertEquals(15.000, (float) $reportData['period_totals']['gold_settled_24k']);

        // Closing:
        // Cash: 0 + 80,000 - 30,000 = 50,000
        // Gold: 55.000 + 20.000 - 15.000 = 60.000g
        $this->assertEquals(50000.00, (float) $reportData['closing_balance']['cash_payable']);
        $this->assertEquals(60.000, (float) $reportData['closing_balance']['gold_fine_24k']);
        $this->assertTrue($reportData['closing_balance']['reconciled']);
    }
}
