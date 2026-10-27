<?php

namespace Tests\Feature;

use App\Models\ApprovalMemo;
use App\Models\ApprovalMemoItem;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\InvoiceOldGold;
use App\Models\Karigar;
use App\Models\KarigarMaterialTransaction;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\Repair;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderReceivedPiece;
use App\Services\SaleService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LegacyGapRemediationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Client $client;
    protected Karigar $karigar;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::first() ?? User::factory()->create();

        $this->client = Client::firstOrCreate(
            ['client_code' => 'CLI-LEG-01'],
            [
                'full_name' => 'Meenakshi Sundaram',
                'primary_phone' => '9876543210',
                'email' => 'meenakshi@example.com',
                'membership_tier' => 'gold',
                'gst_number' => '33AAAAA0000A1Z5',
                'city' => 'Madurai',
                'state' => 'Tamil Nadu',
            ]
        );

        $this->karigar = Karigar::firstOrCreate(
            ['karigar_code' => 'KAR-LEG-01'],
            [
                'name' => 'Kannan Master Artisan',
                'primary_phone' => '9876500001',
                'specialization' => 'Traditional Temple Jewellery',
                'standard_wastage_percent' => 3.50,
                'making_charge_per_gram' => 450.00,
                'current_gold_balance_grams' => 25.000,
                'status' => 'active',
            ]
        );

        $category = \App\Models\Category::firstOrCreate(
            ['name' => 'Bangles'],
            ['slug' => 'bangles', 'code' => 'BAN']
        );

        $this->product = Product::firstOrCreate(
            ['product_code' => 'PRD-LEG-01'],
            [
                'name' => '22K Gold Antique Bangle',
                'category_id' => $category->id,
                'current_stock_qty' => 10,
                'opening_stock_weight' => 20.000,
            ]
        );
    }

    public function test_old_gold_exchange_in_sales_invoice()
    {
        $saleService = app(SaleService::class);

        $payload = [
            'client_id' => $this->client->id,
            'client_name' => $this->client->full_name,
            'invoice_date' => now()->toDateString(),
            'items' => [
                [
                    'product_id' => $this->product->id,
                    'product_name' => $this->product->name,
                    'quantity' => 1,
                    'gross_weight' => 25.000,
                    'net_weight' => 25.000,
                    'rate' => 7500, // 25g * 7500 = 187,500
                    'making_charge' => 5000,
                    'line_total' => 192500,
                ]
            ],
            'gst_rate' => 3.0, // Tax on 192,500 = 5,775 => Total = 198,275
            'old_gold_items' => [
                [
                    'item_description' => 'Customer Old Gold Chain 916',
                    'gross_weight' => 10.000,
                    'melting_loss' => 0.500,
                    'net_weight' => 9.500,
                    'purity_touch' => 91.60,
                    'fine_weight' => 8.702,
                    'rate_per_gram' => 7000,
                    'total_credit' => 60914.00,
                ]
            ],
            'paid_amount' => 50000.00,
            'payment_method' => 'card',
        ];

        $invoice = $saleService->create($payload, $this->user->id);

        $this->assertNotNull($invoice);
        $this->assertEquals(60914.00, (float) $invoice->old_gold_amount);
        $this->assertCount(1, $invoice->oldGoldItems);
        $this->assertEquals('Customer Old Gold Chain 916', $invoice->oldGoldItems->first()->item_description);

        // Due amount should be: Total (198,275) - Paid (50,000) - Old Gold (60,914) = 87,361
        $expectedDue = round(198275 - 50000 - 60914, 2);
        $this->assertEquals($expectedDue, (float) $invoice->due_amount);
    }

    public function test_approval_memo_issuance_and_stock_locking()
    {
        // Create an in-stock received piece
        $wo = WorkOrder::firstOrCreate(
            ['work_order_number' => 'WO-TEST-APPR-1'],
            [
                'status' => 'completed',
                'karigar_id' => $this->karigar->id,
                'product_id' => $this->product->id,
                'product_name' => $this->product->name,
                'required_qty' => 1,
                'allotted_date' => now()->toDateString(),
            ]
        );

        $piece = WorkOrderReceivedPiece::create([
            'work_order_id' => $wo->id,
            'piece_number' => 'P-APPR-999',
            'tag_number' => 'TAG-APPR-999',
            'design_no' => 'DES-APPR-999',
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'karigar_id' => $this->karigar->id,
            'gross_weight' => 15.500,
            'net_gold_weight' => 15.500,
            'status' => 'in_stock',
            'is_inventory_posted' => true,
            'received_at' => now(),
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/approvals', [
            'client_id' => $this->client->id,
            'due_date' => now()->addDays(5)->toDateString(),
            'piece_ids' => [$piece->id],
            'notes' => 'Client selection for wedding function',
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.status', 'pending');
        $response->assertJsonPath('data.total_pieces', 1);

        // Verify piece status transitioned to on_approval
        $piece->refresh();
        $this->assertEquals('on_approval', $piece->status);

        // Verify piece is NOT listed in available retail pieces for sale
        $saleService = app(SaleService::class);
        $available = $saleService->getAvailablePieces();
        $tagNumbers = collect($available)->pluck('tag_number')->all();
        $this->assertNotContains('TAG-APPR-999', $tagNumbers);
    }

    public function test_approval_memo_return_piece_restores_stock()
    {
        $wo = WorkOrder::firstOrCreate(
            ['work_order_number' => 'WO-TEST-APPR-RET'],
            [
                'status' => 'completed',
                'karigar_id' => $this->karigar->id,
                'product_id' => $this->product->id,
                'product_name' => $this->product->name,
                'required_qty' => 1,
                'allotted_date' => now()->toDateString(),
            ]
        );

        $memo = ApprovalMemo::create([
            'memo_number' => 'APPR-RET-01',
            'client_id' => $this->client->id,
            'client_name' => $this->client->full_name,
            'memo_date' => now()->toDateString(),
            'status' => 'pending',
            'total_pieces' => 1,
        ]);

        $piece = WorkOrderReceivedPiece::create([
            'work_order_id' => $wo->id,
            'piece_number' => 'P-RET-01',
            'tag_number' => 'TAG-RET-01',
            'design_no' => 'DES-RET-01',
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'gross_weight' => 12.000,
            'net_gold_weight' => 12.000,
            'status' => 'on_approval',
            'received_at' => now(),
        ]);

        $item = ApprovalMemoItem::create([
            'approval_memo_id' => $memo->id,
            'piece_id' => $piece->id,
            'tag_number' => $piece->tag_number,
            'product_name' => $piece->product_name,
            'gross_weight' => 12.000,
            'net_weight' => 12.000,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/approvals/{$memo->id}/return-piece/{$item->id}");
        $response->assertStatus(200);

        // Verify piece status restored to in_stock
        $piece->refresh();
        $this->assertEquals('in_stock', $piece->status);

        $item->refresh();
        $this->assertEquals('returned', $item->status);
        $this->assertNotNull($item->returned_at);

        $memo->refresh();
        $this->assertEquals('returned', $memo->status);
    }

    public function test_approval_memo_convert_to_sale()
    {
        $wo = WorkOrder::firstOrCreate(
            ['work_order_number' => 'WO-TEST-CONV-SALE'],
            [
                'status' => 'completed',
                'karigar_id' => $this->karigar->id,
                'product_id' => $this->product->id,
                'product_name' => $this->product->name,
                'allotted_date' => now()->toDateString(),
                'required_qty' => 1,
            ]
        );

        $memo = ApprovalMemo::create([
            'memo_number' => 'APPR-SALE-01',
            'client_id' => $this->client->id,
            'client_name' => $this->client->full_name,
            'memo_date' => now()->toDateString(),
            'status' => 'pending',
            'total_pieces' => 1,
        ]);

        $piece = WorkOrderReceivedPiece::create([
            'work_order_id' => $wo->id,
            'piece_number' => 'P-CONV-01',
            'tag_number' => 'TAG-CONV-01',
            'design_no' => 'DES-001',
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'gross_weight' => 20.000,
            'net_gold_weight' => 20.000,
            'total_making_charge' => 3000.00,
            'status' => 'on_approval',
            'received_at' => now(),
        ]);

        $item = ApprovalMemoItem::create([
            'approval_memo_id' => $memo->id,
            'piece_id' => $piece->id,
            'tag_number' => $piece->tag_number,
            'product_id' => $piece->product_id,
            'product_name' => $piece->product_name,
            'gross_weight' => 20.000,
            'net_weight' => 20.000,
            'status' => 'pending',
        ]);

        $response = $this->actingAs($this->user)->postJson("/api/approvals/{$memo->id}/convert-to-sale", [
            'item_ids' => [$item->id],
            'amount_received' => 50000.00,
            'payment_method' => 'card',
            'rate' => 7500,
        ]);

        $response->assertStatus(200);
        $this->assertNotNull($response->json('invoice.id'));

        // Verify piece status transitioned to sold
        $piece->refresh();
        $this->assertEquals('sold', $piece->status);
        $this->assertNotNull($piece->invoice_id);

        $item->refresh();
        $this->assertEquals('sold', $item->status);
        $this->assertEquals($piece->invoice_id, $item->invoice_id);

        $memo->refresh();
        $this->assertEquals('converted_to_sale', $memo->status);
    }

    public function test_customer_repair_order_lifecycle()
    {
        // 1. Intake
        $intakeResponse = $this->actingAs($this->user)->postJson('/api/repairs', [
            'client_id' => $this->client->id,
            'item_description' => '22K Gold Antique Choker - Broken Hook and Polishing',
            'intake_weight' => 45.200,
            'advance_paid' => 1000.00,
            'notes' => 'Customer requested express 3-day turnaround',
        ]);

        $intakeResponse->assertStatus(201);
        $repairId = $intakeResponse->json('data.id');
        $this->assertNotNull($repairId);

        // 2. Progress update (Assign karigar & record charges)
        $updateResponse = $this->actingAs($this->user)->putJson("/api/repairs/{$repairId}", [
            'status' => 'in_progress',
            'karigar_id' => $this->karigar->id,
            'added_metal_weight' => 1.250,
            'added_metal_cost' => 9500.00,
            'labour_charges' => 2500.00,
            'stone_charges' => 800.00,
            'advance_paid' => 1000.00,
        ]);

        $updateResponse->assertStatus(200);
        $totalCharges = 9500 + 2500 + 800; // 12,800
        $balanceDue = 12800 - 1000; // 11,800
        $this->assertEquals($totalCharges, (float) $updateResponse->json('data.total_charges'));
        $this->assertEquals($balanceDue, (float) $updateResponse->json('data.balance_due'));

        // 3. Delivery
        $deliverResponse = $this->actingAs($this->user)->postJson("/api/repairs/{$repairId}/deliver", [
            'payment_received' => 11800.00,
        ]);

        $deliverResponse->assertStatus(200);
        $this->assertEquals('delivered', $deliverResponse->json('data.status'));
        $this->assertEquals(0, (float) $deliverResponse->json('data.balance_due'));
    }

    public function test_karigar_metal_hisab_summary()
    {
        $response = $this->actingAs($this->user)->getJson("/api/karigars/{$this->karigar->id}/hisab-summary");
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'status',
            'karigar' => [
                'id',
                'name',
                'karigar_code',
                'standard_wastage_percent',
                'making_charge_per_gram',
                'current_gold_balance_grams',
            ],
            'summary' => [
                'total_issued_gold_grams',
                'total_returned_gold_grams',
                'total_pieces_produced',
                'total_finished_gross_weight',
                'total_finished_net_gold_grams',
                'total_allowed_wastage_grams',
                'net_gold_balance_grams',
                'total_making_charges_earned',
            ]
        ]);
    }

    public function test_statutory_itc04_and_gstr1_reports()
    {
        $itcResponse = $this->actingAs($this->user)->getJson('/api/reports/itc04');
        $itcResponse->assertStatus(200);
        $itcResponse->assertJsonStructure([
            'status',
            'period',
            'summary' => [
                'total_dispatched_weight_grams',
                'total_dispatched_value',
                'total_received_pieces',
                'total_received_net_gold_grams',
                'total_making_charges_billed',
            ],
            'table1_dispatched_to_karigar',
            'table2_received_from_karigar',
        ]);

        $gstrResponse = $this->actingAs($this->user)->getJson('/api/reports/gstr1');
        $gstrResponse->assertStatus(200);
        $gstrResponse->assertJsonStructure([
            'status',
            'period',
            'summary' => [
                'total_invoices',
                'b2b_invoices_count',
                'b2c_invoices_count',
                'total_taxable_value',
                'total_tax_amount',
                'total_invoice_value',
            ],
            'b2b_supplies',
            'b2c_supplies',
        ]);
    }
}
