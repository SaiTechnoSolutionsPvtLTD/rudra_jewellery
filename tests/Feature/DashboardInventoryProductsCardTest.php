<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardInventoryProductsCardTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['role' => 'Super Admin']);
        Sanctum::actingAs($this->user);

        $this->category = Category::create([
            'name' => 'Bangles',
            'code' => 'BANG01',
        ]);
    }

    /**
     * Test empty data: returns 0 products and safe metric (+0.0%).
     */
    public function test_empty_inventory_returns_zero_count_and_safe_metric()
    {
        $response = $this->getJson('/api/dashboard?period=month&refresh=1');

        $response->assertStatus(200);
        $data = $response->json('data') ?: $response->json();
        $summary = $data['summary'];

        $this->assertEquals(0, $summary['inventoryProductsCount']);
        $this->assertEquals('0', $summary['inventoryProductsFormatted']);
        $this->assertArrayHasKey('inventory_products_metric', $summary);
        $this->assertEquals('+0.0%', $summary['inventory_products_metric']['change']);
        $this->assertTrue($summary['inventory_products_metric']['is_increase']);
        $this->assertFalse(is_nan($summary['inventory_products_metric']['pct']));
        $this->assertFalse(is_infinite($summary['inventory_products_metric']['pct']));
    }

    /**
     * Test date filtering for standard presets (today, week, month, all).
     */
    public function test_date_filtering_counts_products_correctly()
    {
        // 2 products created today
        Product::forceCreate([
            'category_id' => $this->category->id,
            'name' => 'Gold Bangle Today 1',
            'product_code' => 'GB-TODAY-1',
            'status' => 'active',
            'created_at' => Carbon::today()->addHours(2),
        ]);
        Product::forceCreate([
            'category_id' => $this->category->id,
            'name' => 'Gold Bangle Today 2',
            'product_code' => 'GB-TODAY-2',
            'status' => 'active',
            'created_at' => Carbon::today()->addHours(4),
        ]);

        // 1 product created yesterday
        Product::forceCreate([
            'category_id' => $this->category->id,
            'name' => 'Gold Bangle Yesterday',
            'product_code' => 'GB-YEST-1',
            'status' => 'active',
            'created_at' => Carbon::yesterday()->addHours(3),
        ]);

        // 3 products created last month
        for ($i = 1; $i <= 3; $i++) {
            Product::forceCreate([
                'category_id' => $this->category->id,
                'name' => "Gold Bangle LastMonth {$i}",
                'product_code' => "GB-LM-{$i}",
                'status' => 'active',
                'created_at' => Carbon::now()->subMonth()->startOfMonth()->addDays($i),
            ]);
        }

        // Test Today: Historical active snapshot at end of today = 6 (2 today + 1 yesterday + 3 last month)
        // vs Historical active snapshot at end of yesterday = 4 (1 yesterday + 3 last month)
        // => ((6 - 4) / 4) * 100 = +50.0%
        $resToday = $this->getJson('/api/dashboard?period=today&refresh=1');
        $resToday->assertStatus(200);
        $summaryToday = ($resToday->json('data') ?: $resToday->json())['summary'];
        $this->assertEquals(6, $summaryToday['inventoryProductsCount']);
        $this->assertEquals(2, $summaryToday['periodCreatedProductsCount']);
        $this->assertEquals('+50.0%', $summaryToday['inventory_products_metric']['change']);
        $this->assertTrue($summaryToday['inventory_products_metric']['is_increase']);
        $this->assertEquals('vs Yesterday', $summaryToday['inventory_products_metric']['vs_label']);

        // Test All: total 6 products
        $resAll = $this->getJson('/api/dashboard?period=all&refresh=1');
        $resAll->assertStatus(200);
        $summaryAll = ($resAll->json('data') ?: $resAll->json())['summary'];
        $this->assertEquals(6, $summaryAll['inventoryProductsCount']);
        $this->assertEquals('All Time', $summaryAll['inventory_products_metric']['vs_label']);
    }

    /**
     * Test custom date range equal-duration comparison: Oct 1-7 (7 days) vs Sep 24-30 (7 days).
     */
    public function test_custom_date_range_compares_with_equal_duration_preceding_period()
    {
        // 6 products in Oct 1-7
        for ($i = 1; $i <= 6; $i++) {
            Product::forceCreate([
                'category_id' => $this->category->id,
                'name' => "Oct Product {$i}",
                'product_code' => "OCT-P-{$i}",
                'status' => 'active',
                'created_at' => Carbon::parse('2026-10-01 10:00:00')->addDays($i - 1),
            ]);
        }

        // 4 products in Sep 24-30
        for ($i = 1; $i <= 4; $i++) {
            Product::forceCreate([
                'category_id' => $this->category->id,
                'name' => "Sep Product {$i}",
                'product_code' => "SEP-P-{$i}",
                'status' => 'active',
                'created_at' => Carbon::parse('2026-09-24 10:00:00')->addDays($i - 1),
            ]);
        }

        // 3 products in Sep 10 (outside both periods)
        for ($i = 1; $i <= 3; $i++) {
            Product::forceCreate([
                'category_id' => $this->category->id,
                'name' => "Older Product {$i}",
                'product_code' => "OLD-P-{$i}",
                'status' => 'active',
                'created_at' => Carbon::parse('2026-09-10 10:00:00')->addDays($i - 1),
            ]);
        }

        $res = $this->getJson('/api/dashboard?start_date=2026-10-01&end_date=2026-10-07&refresh=1');
        $res->assertStatus(200);
        $summary = ($res->json('data') ?: $res->json())['summary'];

        // Selected period historical inventory snapshot at Oct 07 is 13 (6 + 4 + 3)
        $this->assertEquals(13, $summary['inventoryProductsCount']);
        $this->assertEquals('13', $summary['inventoryProductsFormatted']);
        // Period additions strictly within Oct 01-07
        $this->assertEquals(6, $summary['periodCreatedProductsCount']);

        // Previous period historical inventory snapshot at Sep 30 is 7 (4 + 3)
        // ((13 - 7) / 7) * 100 = +85.7%
        $this->assertEquals('+85.7%', $summary['inventory_products_metric']['change']);
        $this->assertTrue($summary['inventory_products_metric']['is_increase']);
        $this->assertEquals(85.7, $summary['inventory_products_metric']['pct']);
        $this->assertEquals('vs Previous 7 Days', $summary['inventory_products_metric']['vs_label']);
    }

    /**
     * Test percentage decrease calculation when products are deactivated/removed before period end.
     */
    public function test_percentage_decrease_is_calculated_and_marked_correctly()
    {
        // 4 products existed in Sep 24-30
        for ($i = 1; $i <= 4; $i++) {
            $p = Product::forceCreate([
                'category_id' => $this->category->id,
                'name' => "Sep Decr Product {$i}",
                'product_code' => "SEP-DEC-{$i}",
                'status' => 'active',
                'created_at' => Carbon::parse('2026-09-24 10:00:00')->addDays($i - 1),
                'updated_at' => Carbon::parse('2026-09-24 10:00:00')->addDays($i - 1),
            ]);

            // Deactivate 3 of them on Oct 02 (before period end of Oct 07)
            if ($i <= 3) {
                $p->status = 'inactive';
                $p->updated_at = Carbon::parse('2026-10-02 12:00:00');
                $p->save();
            }
        }

        // 1 new product added in Oct 1-7
        Product::forceCreate([
            'category_id' => $this->category->id,
            'name' => "Oct Decr Product New",
            'product_code' => "OCT-DEC-NEW",
            'status' => 'active',
            'created_at' => Carbon::parse('2026-10-03 10:00:00'),
            'updated_at' => Carbon::parse('2026-10-03 10:00:00'),
        ]);

        $res = $this->getJson('/api/dashboard?start_date=2026-10-01&end_date=2026-10-07&refresh=1');
        $res->assertStatus(200);
        $summary = ($res->json('data') ?: $res->json())['summary'];

        // At Oct 07: 1 remaining active from Sep + 1 added in Oct = 2 active products
        // At Sep 30: 4 active products existed
        // ((2 - 4) / 4) * 100 = -50.0%
        $this->assertEquals(2, $summary['inventoryProductsCount']);
        $this->assertEquals('-50.0%', $summary['inventory_products_metric']['change']);
        $this->assertFalse($summary['inventory_products_metric']['is_increase']);
        $this->assertEquals(-50.0, $summary['inventory_products_metric']['pct']);
    }

    /**
     * Test zero previous count handles safely without NaN or Infinity (+100.0%).
     */
    public function test_zero_previous_count_handles_safely()
    {
        // 3 products in current period, 0 in previous period
        for ($i = 1; $i <= 3; $i++) {
            Product::forceCreate([
                'category_id' => $this->category->id,
                'name' => "Oct ZeroPrev Product {$i}",
                'product_code' => "OCT-ZP-{$i}",
                'status' => 'active',
                'created_at' => Carbon::parse('2026-10-01 10:00:00')->addDays($i - 1),
            ]);
        }

        $res = $this->getJson('/api/dashboard?start_date=2026-10-01&end_date=2026-10-07&refresh=1');
        $res->assertStatus(200);
        $summary = ($res->json('data') ?: $res->json())['summary'];

        $this->assertEquals(3, $summary['inventoryProductsCount']);
        $this->assertEquals('+100.0%', $summary['inventory_products_metric']['change']);
        $this->assertTrue($summary['inventory_products_metric']['is_increase']);
        $this->assertFalse(is_nan($summary['inventory_products_metric']['pct']));
        $this->assertFalse(is_infinite($summary['inventory_products_metric']['pct']));
    }

    /**
     * Test inactive products are excluded from valid inventory count.
     */
    public function test_inactive_products_are_excluded()
    {
        // 2 active products
        Product::create([
            'category_id' => $this->category->id,
            'name' => 'Active Product 1',
            'product_code' => 'ACT-1',
            'status' => 'active',
            'created_at' => Carbon::now(),
        ]);
        Product::create([
            'category_id' => $this->category->id,
            'name' => 'Active Product 2',
            'product_code' => 'ACT-2',
            'status' => 'active',
            'created_at' => Carbon::now(),
        ]);

        // 1 inactive product
        Product::create([
            'category_id' => $this->category->id,
            'name' => 'Inactive Product',
            'product_code' => 'INACT-1',
            'status' => 'inactive',
            'created_at' => Carbon::now(),
        ]);

        $res = $this->getJson('/api/dashboard?period=month&refresh=1');
        $res->assertStatus(200);
        $summary = ($res->json('data') ?: $res->json())['summary'];

        $this->assertEquals(2, $summary['inventoryProductsCount']);
        $this->assertEquals(2, $summary['totalProducts']);
    }

    /**
     * Test other dashboard cards and summary fields remain intact.
     */
    public function test_all_other_dashboard_cards_and_fields_are_preserved()
    {
        $res = $this->getJson('/api/dashboard?period=month&refresh=1');
        $res->assertStatus(200);
        $summary = ($res->json('data') ?: $res->json())['summary'];

        $this->assertArrayHasKey('todaysSaleFormatted', $summary);
        $this->assertArrayHasKey('sales_metric', $summary);
        $this->assertArrayHasKey('ordersFormatted', $summary);
        $this->assertArrayHasKey('orders_metric', $summary);
        $this->assertArrayHasKey('customersCount', $summary);
        $this->assertArrayHasKey('customers_metric', $summary);
        $this->assertArrayHasKey('pendingOrdersCount', $summary);
        $this->assertArrayHasKey('goldAverages', $summary);
        $this->assertArrayHasKey('chartPoints', $summary);
        $this->assertArrayHasKey('totalNetProfitFormatted', $summary);
    }
}
