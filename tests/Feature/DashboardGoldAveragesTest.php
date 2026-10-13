<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\PurchaseEntry;
use App\Models\SaleItem;
use App\Models\Supplier;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class DashboardGoldAveragesTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Supplier $supplier;
    protected Category $goldCategory;
    protected Product $goldProduct;
    protected Client $client;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['role' => 'Super Admin']);
        Sanctum::actingAs($this->user);

        $this->supplier = Supplier::create([
            'supplier_code' => 'SUP-TEST-01',
            'name' => 'Royal Bullion Supplier',
            'phone' => '9888877771',
            'status' => 'active',
        ]);

        $this->goldCategory = Category::create([
            'name' => 'Gold Jewellery',
            'code' => 'GJ01',
        ]);

        $this->goldProduct = Product::create([
            'category_id' => $this->goldCategory->id,
            'name' => '22K Gold Bangle',
            'product_code' => 'GB-TEST-01',
            'status' => 'active',
            'attributes' => ['metal_type' => 'gold', 'purity' => '22K'],
        ]);

        $this->client = Client::create([
            'client_code' => 'CL-TEST-GOLD',
            'full_name' => 'Gold Buyer Client',
            'primary_phone' => '9999911111',
            'membership_tier' => 'gold',
            'status' => 'active',
        ]);
    }

    /**
     * Case 1: Empty transactions safely returns zero and N/A without using live API rates.
     */
    public function test_empty_transactions_safely_returns_zero_and_na_without_live_api_rates(): void
    {
        $response = $this->getJson('/api/dashboard?period=today&refresh=1');
        $response->assertOk();

        $todayGold = $response->json('summary.currentGoldAverage');
        $this->assertNotNull($todayGold);

        // Buying should be 0 and N/A when there are no transactions
        $this->assertSame('0', (string)$todayGold['buyingVal']);
        $this->assertSame('N/A', $todayGold['buyingChange']);
        $this->assertSame('N/A', $todayGold['prevBuyingVal']);
        $this->assertSame('N/A', $todayGold['buyingDiff']);
        $this->assertFalse($todayGold['hasBuyingData']);

        // Selling should be 0 and N/A when there are no transactions
        $this->assertSame('0', (string)$todayGold['sellingVal']);
        $this->assertSame('N/A', $todayGold['sellingChange']);
        $this->assertSame('N/A', $todayGold['prevSellingVal']);
        $this->assertSame('N/A', $todayGold['sellingDiff']);
        $this->assertFalse($todayGold['hasSellingData']);

        // Must NOT match external market rate defaults (78800, 142690, 130800)
        $this->assertNotEquals('142,690', $todayGold['buyingVal']);
        $this->assertNotEquals('130,800', $todayGold['sellingVal']);
    }

    /**
     * Case 2: Weighted averages, percentage changes, and comparisons across two periods.
     */
    public function test_two_period_gold_buying_and_selling_averages_and_percentage_changes(): void
    {
        $now = Carbon::now();
        $prevWeekDate = $now->copy()->subWeek()->startOfWeek()->addDays(2);
        $currWeekDate = $now->copy()->startOfWeek()->addDays(1);

        // --- Period 1 (Previous Week):
        // Purchase: 10g at ₹7,000/g = ₹70,000
        PurchaseEntry::create([
            'purchase_no' => 'PUR-TEST-PREV',
            'supplier_id' => $this->supplier->id,
            'product_id' => $this->goldProduct->id,
            'category_id' => $this->goldCategory->id,
            'metal_type' => 'gold',
            'purity' => '22K',
            'qty' => 1,
            'weight' => 10.0,
            'net_weight' => 10.0,
            'rate' => 7000.0,
            'total_amount' => 70000.0,
            'purchase_date' => $prevWeekDate->toDateString(),
            'created_at' => $prevWeekDate,
        ]);

        // Sale: 5g at ₹7,500/g = ₹37,500
        $prevInvoice = Invoice::create([
            'invoice_no' => 'INV-TEST-PREV',
            'client_id' => $this->client->id,
            'client_name' => $this->client->full_name,
            'invoice_date' => $prevWeekDate->toDateString(),
            'amount' => 37500.0,
            'gst_amount' => 0.0,
            'gst_rate' => 0.0,
            'total_amount' => 37500.0,
            'status' => 'paid',
            'created_at' => $prevWeekDate,
        ]);
        SaleItem::create([
            'invoice_id' => $prevInvoice->id,
            'product_id' => $this->goldProduct->id,
            'product_name' => '22K Gold Bangle',
            'quantity' => 1,
            'gross_weight' => 5.0,
            'net_weight' => 5.0,
            'rate' => 7500.0,
            'line_total' => 37500.0,
            'created_at' => $prevWeekDate,
        ]);

        // --- Period 2 (Current Week):
        // Purchase: 20g at ₹7,400/g = ₹148,000
        PurchaseEntry::create([
            'purchase_no' => 'PUR-TEST-CURR',
            'supplier_id' => $this->supplier->id,
            'product_id' => $this->goldProduct->id,
            'category_id' => $this->goldCategory->id,
            'metal_type' => 'gold',
            'purity' => '22K',
            'qty' => 1,
            'weight' => 20.0,
            'net_weight' => 20.0,
            'rate' => 7400.0,
            'total_amount' => 148000.0,
            'purchase_date' => $currWeekDate->toDateString(),
            'created_at' => $currWeekDate,
        ]);

        // Sale: 10g at ₹8,100/g = ₹81,000
        $currInvoice = Invoice::create([
            'invoice_no' => 'INV-TEST-CURR',
            'client_id' => $this->client->id,
            'client_name' => $this->client->full_name,
            'invoice_date' => $currWeekDate->toDateString(),
            'amount' => 81000.0,
            'gst_amount' => 0.0,
            'gst_rate' => 0.0,
            'total_amount' => 81000.0,
            'status' => 'paid',
            'created_at' => $currWeekDate,
        ]);
        SaleItem::create([
            'invoice_id' => $currInvoice->id,
            'product_id' => $this->goldProduct->id,
            'product_name' => '22K Gold Bangle',
            'quantity' => 1,
            'gross_weight' => 10.0,
            'net_weight' => 10.0,
            'rate' => 8100.0,
            'line_total' => 81000.0,
            'created_at' => $currWeekDate,
        ]);

        $response = $this->getJson('/api/dashboard?period=week&refresh=1');
        $response->assertOk();

        $weekGold = $response->json('summary.currentGoldAverage');

        // Verification for Buying:
        // Current: ₹7,400.00 / g, Previous: ₹7,000.00 / g
        // Diff: +₹400, Change: +5.7% ( (7400-7000)/7000 * 100 = 5.714% )
        $this->assertEquals(7400.0, (float)$weekGold['buyingValRaw']);
        $this->assertStringContainsString('7,400', $weekGold['buyingVal']);
        $this->assertStringContainsString('7,000', $weekGold['prevBuyingVal']);
        $this->assertStringContainsString('+₹400', $weekGold['buyingDiff']);
        $this->assertSame('+5.7%', $weekGold['buyingChange']);
        $this->assertTrue($weekGold['buyingIsIncrease']);
        $this->assertSame('up', $weekGold['buyingDirection']);
        $this->assertSame('vs Last Week', $weekGold['buyingVs']);

        // Verification for Selling:
        // Current: ₹8,100.00 / g, Previous: ₹7,500.00 / g
        // Diff: +₹600, Change: +8.0% ( (8100-7500)/7500 * 100 = 8.0% )
        $this->assertEquals(8100.0, (float)$weekGold['sellingValRaw']);
        $this->assertStringContainsString('8,100', $weekGold['sellingVal']);
        $this->assertStringContainsString('7,500', $weekGold['prevSellingVal']);
        $this->assertStringContainsString('+₹600', $weekGold['sellingDiff']);
        $this->assertSame('+8.0%', $weekGold['sellingChange']);
        $this->assertTrue($weekGold['sellingIsIncrease']);
        $this->assertSame('up', $weekGold['sellingDirection']);
        $this->assertSame('vs Last Week', $weekGold['sellingVs']);
    }

    /**
     * Case 3: Price decrease correctly displays negative percentage and down direction.
     */
    public function test_price_decrease_displays_negative_percentage_and_down_direction(): void
    {
        $now = Carbon::now();
        $prevDate = $now->copy()->subMonth()->startOfMonth()->addDays(5);
        $currDate = $now->copy()->startOfMonth()->addDays(3);

        // Previous: ₹8,000/g
        PurchaseEntry::create([
            'purchase_no' => 'PUR-DEC-PREV',
            'supplier_id' => $this->supplier->id,
            'metal_type' => 'gold',
            'weight' => 10.0,
            'net_weight' => 10.0,
            'rate' => 8000.0,
            'total_amount' => 80000.0,
            'purchase_date' => $prevDate->toDateString(),
            'created_at' => $prevDate,
        ]);

        // Current: ₹7,200/g (-10.0%)
        PurchaseEntry::create([
            'purchase_no' => 'PUR-DEC-CURR',
            'supplier_id' => $this->supplier->id,
            'metal_type' => 'gold',
            'weight' => 10.0,
            'net_weight' => 10.0,
            'rate' => 7200.0,
            'total_amount' => 72000.0,
            'purchase_date' => $currDate->toDateString(),
            'created_at' => $currDate,
        ]);

        $response = $this->getJson('/api/dashboard?period=month&refresh=1');
        $response->assertOk();

        $monthGold = $response->json('summary.currentGoldAverage');
        $this->assertEquals(7200.0, (float)$monthGold['buyingValRaw']);
        $this->assertStringContainsString('8,000', $monthGold['prevBuyingVal']);
        $this->assertStringContainsString('-₹800', $monthGold['buyingDiff']);
        $this->assertSame('-10.0%', $monthGold['buyingChange']);
        $this->assertFalse($monthGold['buyingIsIncrease']);
        $this->assertSame('down', $monthGold['buyingDirection']);
    }

    /**
     * Case 4: Cancelled or reversed transactions are excluded.
     */
    public function test_cancelled_or_reversed_transactions_are_excluded(): void
    {
        $now = Carbon::now();
        $currDate = $now->copy()->startOfWeek()->addDays(1);

        // Valid purchase: 10g at ₹7,000 = ₹70,000
        PurchaseEntry::create([
            'purchase_no' => 'PUR-VALID',
            'supplier_id' => $this->supplier->id,
            'metal_type' => 'gold',
            'weight' => 10.0,
            'net_weight' => 10.0,
            'rate' => 7000.0,
            'total_amount' => 70000.0,
            'purchase_date' => $currDate->toDateString(),
            'created_at' => $currDate,
        ]);

        // Cancelled purchase: 100g at ₹9,000 = ₹900,000 (should be excluded by [CANCELLED] notes)
        PurchaseEntry::create([
            'purchase_no' => 'PUR-CANCELLED',
            'supplier_id' => $this->supplier->id,
            'metal_type' => 'gold',
            'weight' => 100.0,
            'net_weight' => 100.0,
            'rate' => 9000.0,
            'total_amount' => 900000.0,
            'notes' => '[CANCELLED] Supplier returned',
            'purchase_date' => $currDate->toDateString(),
            'created_at' => $currDate,
        ]);

        // Valid sale: 5g at ₹8,000 = ₹40,000
        $validInv = Invoice::create([
            'invoice_no' => 'INV-VALID',
            'client_id' => $this->client->id,
            'client_name' => $this->client->full_name,
            'invoice_date' => $currDate->toDateString(),
            'amount' => 40000.0,
            'gst_amount' => 0.0,
            'gst_rate' => 0.0,
            'total_amount' => 40000.0,
            'status' => 'paid',
            'created_at' => $currDate,
        ]);
        SaleItem::create([
            'invoice_id' => $validInv->id,
            'product_name' => '22K Ring',
            'quantity' => 1,
            'net_weight' => 5.0,
            'rate' => 8000.0,
            'line_total' => 40000.0,
            'created_at' => $currDate,
        ]);

        // Cancelled invoice sale: 50g at ₹15,000 (should be excluded)
        $cancelledInv = Invoice::create([
            'invoice_no' => 'INV-CANCELLED',
            'client_id' => $this->client->id,
            'client_name' => $this->client->full_name,
            'invoice_date' => $currDate->toDateString(),
            'amount' => 750000.0,
            'gst_amount' => 0.0,
            'gst_rate' => 0.0,
            'total_amount' => 750000.0,
            'status' => 'paid',
            'sale_status' => 'cancelled',
            'created_at' => $currDate,
        ]);
        SaleItem::create([
            'invoice_id' => $cancelledInv->id,
            'product_name' => '22K Ring',
            'quantity' => 1,
            'net_weight' => 50.0,
            'rate' => 15000.0,
            'line_total' => 750000.0,
            'created_at' => $currDate,
        ]);

        $response = $this->getJson('/api/dashboard?period=week&refresh=1');
        $response->assertOk();

        $weekGold = $response->json('summary.currentGoldAverage');
        // Buying rate must be 7000 (from 10g/70k), NOT distorted by the 100g cancelled purchase
        $this->assertEquals(7000.0, (float)$weekGold['buyingValRaw']);

        // Selling rate must be 8000 (from 5g/40k), NOT distorted by the 50g cancelled sale
        $this->assertEquals(8000.0, (float)$weekGold['sellingValRaw']);
    }

    /**
     * Case 5: Changing dashboard date filter dynamically updates calculations.
     */
    public function test_date_filtering_dynamically_isolates_transactions_by_period(): void
    {
        $today = Carbon::today();
        $currMonthEarlier = Carbon::now()->startOfMonth()->addDays(1);
        if ($currMonthEarlier->isSameDay($today)) {
            $currMonthEarlier = $today->copy()->subHours(5);
        }

        // Transaction 1: Today at ₹7,200/g (10g)
        PurchaseEntry::create([
            'purchase_no' => 'PUR-TODAY',
            'supplier_id' => $this->supplier->id,
            'metal_type' => 'gold',
            'weight' => 10.0,
            'net_weight' => 10.0,
            'rate' => 7200.0,
            'total_amount' => 72000.0,
            'purchase_date' => $today->toDateString(),
            'created_at' => $today,
        ]);

        // Transaction 2: Earlier in current month at ₹6,000/g (20g)
        PurchaseEntry::create([
            'purchase_no' => 'PUR-EARLIER-MONTH',
            'supplier_id' => $this->supplier->id,
            'metal_type' => 'gold',
            'weight' => 20.0,
            'net_weight' => 20.0,
            'rate' => 6000.0,
            'total_amount' => 120000.0,
            'purchase_date' => $currMonthEarlier->toDateString(),
            'created_at' => $currMonthEarlier,
        ]);

        // Query Today: only the 7,200 transaction should be included
        $resToday = $this->getJson('/api/dashboard?period=today&refresh=1');
        $resToday->assertOk();
        $todayGold = $resToday->json('summary.currentGoldAverage');
        $this->assertEquals(7200.0, (float)$todayGold['buyingValRaw']);

        // Query Month: both transactions (within month) should be included:
        // (72,000 + 120,000) / (10 + 20) = 192,000 / 30 = 6,400/g
        $resMonth = $this->getJson('/api/dashboard?period=month&refresh=1');
        $resMonth->assertOk();
        $monthGold = $resMonth->json('summary.currentGoldAverage');
        $this->assertEquals(6400.0, (float)$monthGold['buyingValRaw']);
    }
}
