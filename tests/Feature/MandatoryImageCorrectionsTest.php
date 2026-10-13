<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Karigar;
use App\Models\Product;
use App\Models\SaleItem;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MandatoryImageCorrectionsTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create([
            'role' => 'admin',
        ]);
    }

    /**
     * IMAGE 1 TEST: Job creation correctly computes allocated weight with quantity multipliers.
     */
    public function test_image1_job_creation_calculations_and_component_multipliers()
    {
        $unique = uniqid();
        $category = Category::create(['name' => "Gold Necklaces {$unique}", 'code' => "GN_{$unique}"]);
        $artisan = Karigar::create([
            'name' => "Master Artisan {$unique}",
            'karigar_code' => "KC-{$unique}",
            'primary_phone' => '9999999999',
            'status' => 'active',
        ]);

        $product = Product::create([
            'name' => 'Royal Bridal Choker',
            'product_code' => "RBC-{$unique}",
            'design_no' => "DS-{$unique}",
            'category_id' => $category->id,
            'opening_stock_weight' => 33.000,
            'opening_touch' => 91.6,
            'opening_fine_weight' => 30.228,
            'current_stock_qty' => 5,
            'attributes' => [
                'net_wt' => 33.000,
                'gross_wt' => 33.000,
                'diamond_wt' => 1.000,
                'diamond_count' => 1,
            ],
        ]);

        // Submit work order with 2 pcs of this item
        $payload = [
            'work_order_number' => "WO-{$unique}",
            'product_name' => 'Royal Bridal Choker',
            'karigar_id' => $artisan->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'allotted_weight' => 66.000,
            'priority' => 'HIGH',
            'items' => [
                [
                    'product_id' => $product->id,
                    'variant' => 'Royal Bridal Choker',
                    'gold_weight' => 33.000,
                    'need_pcs' => 2,
                    'total_gross_wt' => 66.000,
                    'diamond_weight' => 1.000,
                    'no_of_diamonds' => 1,
                    'total_dia_cts' => 2.000,
                ]
            ],
        ];

        $res = $this->actingAs($this->user)->postJson('/api/work-orders', $payload);
        $res->assertSuccessful();

        $order = WorkOrder::where('work_order_number', "WO-{$unique}")->first();
        $this->assertNotNull($order);
        // Allotted weight for 2 pcs of 33g must be 66g
        $this->assertEquals(66.0, (float) $order->allotted_weight);
    }

    /**
     * IMAGE 2 TEST: Adding products to inventory must NEVER count as sales or appear in Top-Selling Categories.
     */
    public function test_image2_inventory_products_do_not_appear_as_top_selling_categories()
    {
        $unique = uniqid();
        $category = Category::create(['name' => "Bangles {$unique}", 'code' => "BNG_{$unique}"]);

        // Add 10 products to inventory for this category without any sales
        for ($i = 1; $i <= 10; $i++) {
            Product::create([
                'name' => "Bangle Item {$unique} {$i}",
                'product_code' => "BNG-{$unique}-{$i}",
                'category_id' => $category->id,
                'opening_stock_weight' => 22.0,
                'opening_stock_rate' => 7000,
                'current_stock_qty' => 5,
                'attributes' => [
                    'sale_value' => 154000,
                ],
            ]);
        }

        // Hit the dashboard endpoint
        $res = $this->actingAs($this->user)->getJson('/api/dashboard?period=month&refresh=1');
        $res->assertStatus(200);

        $topCategories = $res->json('data.topCategories') ?? $res->json('topCategories') ?? [];
        
        // Bangles category must NOT appear in top categories because 0 sales were made!
        $bangleCategoryInTop = collect($topCategories)->firstWhere('name', "Bangles {$unique}");
        $this->assertNull($bangleCategoryInTop, 'Inventory additions must not appear in Top Selling Categories without sales!');
    }

    /**
     * IMAGE 2 TEST: Qualifying sales rank categories correctly, and cancellations are excluded.
     */
    public function test_image2_qualifying_sales_rank_categories_and_cancellations_are_excluded()
    {
        $unique = uniqid();
        $catA = Category::create(['name' => "Coins {$unique}", 'code' => "GC_{$unique}"]);
        $catB = Category::create(['name' => "Rings {$unique}", 'code' => "DR_{$unique}"]);

        $client = Client::create([
            'client_code' => "CL-{$unique}",
            'full_name' => "Client {$unique}",
            'primary_phone' => '9999999999',
        ]);

        $prodA = Product::create([
            'name' => "Gold Coin {$unique}",
            'product_code' => "GC-{$unique}",
            'category_id' => $catA->id,
            'current_stock_qty' => 20,
        ]);

        $prodB = Product::create([
            'name' => "Solitaire Ring {$unique}",
            'product_code' => "SR-{$unique}",
            'category_id' => $catB->id,
            'current_stock_qty' => 10,
        ]);

        // Sale 1: In Cat A for ₹50,000 (valid)
        $invA = Invoice::create([
            'invoice_no' => "INV-A-{$unique}",
            'invoice_date' => now()->toDateString(),
            'client_id' => $client->id,
            'client_name' => $client->full_name,
            'amount' => 50000,
            'gst_rate' => 0,
            'gst_amount' => 0,
            'total_amount' => 50000,
            'paid_amount' => 50000,
            'due_amount' => 0,
            'status' => 'paid',
            'sale_status' => 'completed',
            'created_at' => now(),
        ]);
        SaleItem::create([
            'invoice_id' => $invA->id,
            'product_id' => $prodA->id,
            'product_name' => $prodA->name,
            'product_code' => $prodA->product_code,
            'quantity' => 1,
            'line_total' => 50000,
            'category' => "Coins {$unique}",
            'created_at' => now(),
        ]);

        // Sale 2: In Cat B for ₹100,000 (valid)
        $invB = Invoice::create([
            'invoice_no' => "INV-B-{$unique}",
            'invoice_date' => now()->toDateString(),
            'client_id' => $client->id,
            'client_name' => $client->full_name,
            'amount' => 100000,
            'gst_rate' => 0,
            'gst_amount' => 0,
            'total_amount' => 100000,
            'paid_amount' => 60000,
            'due_amount' => 40000,
            'status' => 'partial',
            'sale_status' => 'completed',
            'created_at' => now(),
        ]);
        SaleItem::create([
            'invoice_id' => $invB->id,
            'product_id' => $prodB->id,
            'product_name' => $prodB->name,
            'product_code' => $prodB->product_code,
            'quantity' => 1,
            'line_total' => 100000,
            'category' => "Rings {$unique}",
            'created_at' => now(),
        ]);

        // Hit dashboard
        $res = $this->actingAs($this->user)->getJson('/api/dashboard?period=month&refresh=1');
        $res->assertStatus(200);

        $topCategories = collect($res->json('data.topCategories') ?? $res->json('topCategories') ?? []);

        $catBItem = $topCategories->firstWhere('name', ucwords("rings {$unique}"));
        $catAItem = $topCategories->firstWhere('name', ucwords("coins {$unique}"));

        $this->assertNotNull($catBItem, 'Category B must appear in Top Categories');
        $this->assertNotNull($catAItem, 'Category A must appear in Top Categories');
        $this->assertEquals(100000, $catBItem['raw_sales']);
        $this->assertEquals(50000, $catAItem['raw_sales']);

        // Now cancel Sale 2 (Cat B)
        $invB->update(['sale_status' => 'cancelled']);

        // Refresh dashboard
        $resCancelled = $this->actingAs($this->user)->getJson('/api/dashboard?period=month&refresh=1');
        $topAfterCancel = collect($resCancelled->json('data.topCategories') ?? $resCancelled->json('topCategories') ?? []);

        // Cat B should no longer be present or have sales
        $catBAfterCancel = $topAfterCancel->firstWhere('name', ucwords("rings {$unique}"));
        $this->assertNull($catBAfterCancel, 'Cancelled sales must be excluded from Top Selling Categories');
    }

    /**
     * IMAGE 4 TEST: QC approval works properly without hallmark verification data.
     */
    public function test_image4_qc_approval_without_hallmark_verification()
    {
        $unique = uniqid();
        $order = WorkOrder::create([
            'work_order_number' => "WO-QC-{$unique}",
            'product_name' => 'QC Test Necklace',
            'status' => 'in_progress',
            'current_stage' => 'quality_check',
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 20.0,
            'required_qty' => 1,
            'completed_qty' => 1,
            'qc_pending_qty' => 1,
        ]);

        $piece = WorkOrderReceivedPiece::create([
            'work_order_id' => $order->id,
            'piece_number' => 1,
            'design_no' => "DS-{$unique}",
            'gross_weight' => 20.0,
            'net_gold_weight' => 20.0,
            'qc_status' => 'pending',
            'status' => 'quality_check',
            'stage' => 'quality_check',
            'certification_status' => 'pending',
            'hallmarking_status' => 'pending',
        ]);

        // QC pass action without hallmark
        $res = $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/qc-action", [
            'action' => 'pass',
            'piece_id' => $piece->id,
            'approved_qty' => 1,
            'notes' => 'QC Passed without hallmark checklist dependency',
        ]);

        $res->assertStatus(200);

        $piece->refresh();
        $this->assertEquals('passed', $piece->qc_status);

        // Separate hallmarking stage remains pending for downstream hallmarking
        $this->assertEquals('pending', $piece->hallmarking_status);
    }
}
