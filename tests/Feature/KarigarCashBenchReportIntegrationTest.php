<?php

namespace Tests\Feature;

use App\Helpers\GoldConversionHelper;
use App\Models\Category;
use App\Models\Karigar;
use App\Models\KarigarMaterialTransaction;
use App\Models\KarigarPayment;
use App\Models\Product;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KarigarCashBenchReportIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
        ]);
    }

    /**
     * Test pure 24K gold conversion helper accuracy
     */
    public function test_pure_24k_conversion_helper()
    {
        // 22K: 24.0g at 22K (22/24 = 91.6667%) => 22.0g pure 24K
        $pure22k = GoldConversionHelper::convertTo24kPureWeight(24.0, '22K');
        $this->assertEquals(22.0, round($pure22k, 3));

        // 18K: 24.0g at 18K (18/24 = 75.0%) => 18.0g pure 24K
        $pure18k = GoldConversionHelper::convertTo24kPureWeight(24.0, '18K');
        $this->assertEquals(18.0, round($pure18k, 3));

        // 24K: 24.0g at 24K => 24.0g
        $pure24k = GoldConversionHelper::convertTo24kPureWeight(24.0, '24K');
        $this->assertEquals(24.0, round($pure24k, 3));
    }

    /**
     * Test Dashboard Stats includes fine gold weight, diamond pieces, and artisan cash balance
     */
    public function test_dashboard_stats_endpoint_material_and_cash_balances()
    {
        $unique = uniqid();
        $karigar = Karigar::create([
            'name' => "Master Artisan {$unique}",
            'karigar_code' => "ART-{$unique}",
            'primary_phone' => '9888888888',
            'status' => 'active',
            'current_gold_balance_grams' => 24.0,
        ]);

        $category = Category::create(['name' => "Bangles {$unique}", 'code' => "BNG-{$unique}"]);
        $product = Product::create([
            'name' => "Diamond Gold Bangle {$unique}",
            'product_code' => "PRD-{$unique}",
            'category_id' => $category->id,
            'current_stock_qty' => 5,
        ]);

        // Work Order: 24g 22K gold, with diamond items
        $order = WorkOrder::create([
            'work_order_number' => "WO-{$unique}",
            'product_name' => "Diamond Gold Bangle {$unique}",
            'karigar_id' => $karigar->id,
            'allotted_weight' => 24.000,
            'material_type' => '22K Gold',
            'purity' => '22K',
            'required_qty' => 1,
            'ready_qty' => 1,
            'completed_qty' => 0,
            'status' => 'in_progress',
            'current_stage' => 'in_production',
            'allotted_date' => now()->toDateString(),
        ]);

        WorkOrderItem::create([
            'work_order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => "Diamond Gold Bangle {$unique}",
            'design_no' => "DES-{$unique}",
            'required_qty' => 1,
            'pricing_details' => [
                'diamond_weight' => 1.5,
                'no_of_diamonds' => 12,
                'diamond_stamp' => 'VVS-EF',
            ],
            'stone_details' => [
                'diamond_weight' => 1.5,
                'diamond_count' => 12,
            ],
        ]);

        // Karigar making charges payable: ₹5,000, paid: ₹2,000 => balance ₹3,000 payable
        KarigarPayment::create([
            'karigar_id' => $karigar->id,
            'work_order_id' => $order->id,
            'transaction_type' => 'payable',
            'amount' => 5000.00,
            'transaction_date' => now()->toDateString(),
            'notes' => 'Making charges for bangle',
        ]);
        KarigarPayment::create([
            'karigar_id' => $karigar->id,
            'work_order_id' => $order->id,
            'transaction_type' => 'payment',
            'amount' => 2000.00,
            'transaction_date' => now()->toDateString(),
            'notes' => 'Part payment cash',
        ]);

        $res = $this->actingAs($this->adminUser)->getJson('/api/work-orders/dashboard-stats');
        $res->assertStatus(200);

        $json = $res->json();
        $data = $json['data'] ?? $json;
        $this->assertArrayHasKey('fine_gold_weight', $data);
        $this->assertArrayHasKey('diamond_pieces', $data);
        $this->assertArrayHasKey('total_karigar_cash_balance', $data);

        // 24g 22K gold converted to 24K pure fine gold => 22.0g
        $this->assertEquals(22.0, (float)$data['fine_gold_weight']);
        $this->assertGreaterThanOrEqual(12, $data['diamond_pieces']);
        $this->assertGreaterThanOrEqual(3000.0, (float)$data['total_karigar_cash_balance']);
    }

    /**
     * Test Karigar Monthly and Flexible Period Report endpoint with Weekly, Monthly, Yearly, and Custom periods
     */
    public function test_karigar_report_endpoint_with_period_and_overall_summary()
    {
        $unique = uniqid();
        $karigar = Karigar::create([
            'name' => "Artisan {$unique}",
            'karigar_code' => "ART-{$unique}",
            'primary_phone' => '9777777777',
            'status' => 'active',
        ]);

        // 1. Monthly period request
        $resMonthly = $this->actingAs($this->adminUser)->getJson('/api/reports/karigar-monthly?period_type=monthly&year=' . date('Y') . '&month=' . date('n'));
        $resMonthly->assertStatus(200);
        $resMonthly->assertJsonStructure([
            'status',
            'period' => ['period_type', 'year', 'month', 'start_date', 'end_date'],
            'overall_summary' => [
                'total_karigars',
                'opening_fine_gold',
                'closing_fine_gold',
                'closing_diamond_carats',
                'closing_diamond_pieces',
                'closing_silver_weight',
                'opening_cash_balance',
                'closing_cash_balance',
            ],
            'data',
        ]);

        // 2. Weekly period request
        $resWeekly = $this->actingAs($this->adminUser)->getJson('/api/reports/karigar-monthly?period_type=weekly&week_offset=0');
        $resWeekly->assertStatus(200);
        $this->assertEquals('weekly', $resWeekly->json('period.period_type'));

        // 3. Yearly period request
        $resYearly = $this->actingAs($this->adminUser)->getJson('/api/reports/karigar-monthly?period_type=yearly&year=' . date('Y'));
        $resYearly->assertStatus(200);
        $this->assertEquals('yearly', $resYearly->json('period.period_type'));

        // 4. Custom date range request
        $resCustom = $this->actingAs($this->adminUser)->getJson('/api/reports/karigar-monthly?period_type=custom&start_date=' . date('Y-01-01') . '&end_date=' . date('Y-12-31'));
        $resCustom->assertStatus(200);
        $this->assertEquals('custom', $resCustom->json('period.period_type'));
    }
}
