<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Category;
use App\Models\Product;
use App\Models\Client;
use App\Models\ClientPriceList;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use App\Models\Invoice;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Services\SaleService;
use App\Services\PricingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;

class ClientSalesPriceListIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $category;
    protected $saleService;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::firstOrCreate(
            ['email' => 'admin@rudhra.test'],
            [
                'name' => 'Admin Manager',
                'password' => bcrypt('password123'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );

        $this->category = Category::firstOrCreate(
            ['name' => 'Bangles'],
            ['code' => 'BGL-01', 'status' => 'active']
        );

        $this->saleService = app(SaleService::class);
    }

    /**
     * Test 1: Customer registration, persistence, editing, retrieval & duplicate prevention
     */
    public function test_customer_registration_persistence_retrieval_and_duplicate_prevention()
    {
        // Register customer
        $registerData = [
            'full_name' => 'Ananya Sharma',
            'primary_phone' => '9840123456',
            'secondary_phone' => '9840999888',
            'email' => 'ananya@example.com',
            'pan_number' => 'ABCDE1234F',
            'city' => 'Coimbatore',
            'membership_tier' => 'gold',
            'status' => 'active',
        ];

        $res = $this->actingAs($this->admin, 'sanctum')->postJson('/api/clients', $registerData);
        $res->assertStatus(201);
        $clientId = $res->json('client.id');
        $clientCode = $res->json('client.client_code');
        $this->assertNotEmpty($clientCode);

        // Verify retrieval
        $getRes = $this->actingAs($this->admin, 'sanctum')->getJson("/api/clients/{$clientId}");
        $getRes->assertStatus(200);
        $this->assertEquals('Ananya Sharma', $getRes->json('full_name'));
        $this->assertEquals('9840123456', $getRes->json('primary_phone'));

        // Verify duplicate prevention on primary phone
        $dupRes = $this->actingAs($this->admin, 'sanctum')->postJson('/api/clients', [
            'full_name' => 'Ananya Sharma Duplicate',
            'primary_phone' => '9840123456',
        ]);
        $dupRes->assertStatus(422);
        $this->assertStringContainsString('already exists', $dupRes->json('message'));

        // Verify update
        $updateRes = $this->actingAs($this->admin, 'sanctum')->putJson("/api/clients/{$clientId}", [
            'full_name' => 'Ananya Sharma Updated',
            'primary_phone' => '9840123456',
            'membership_tier' => 'platinum',
        ]);
        $updateRes->assertStatus(200);
        $this->assertEquals('Ananya Sharma Updated', $updateRes->json('client.full_name'));
        $this->assertEquals('platinum', $updateRes->json('client.membership_tier'));
    }

    /**
     * Test 2: Customer-Specific Price Lists, Versioning & Two Customers Receiving Different Rates
     */
    public function test_customer_specific_price_lists_versioning_and_rate_isolation()
    {
        $clientA = Client::create([
            'client_code' => 'CL-CUST-A',
            'full_name' => 'VIP Customer A',
            'primary_phone' => '9111122222',
            'status' => 'active',
        ]);

        $clientB = Client::create([
            'client_code' => 'CL-CUST-B',
            'full_name' => 'Retail Customer B',
            'primary_phone' => '9333344444',
            'status' => 'active',
        ]);

        $product = Product::create([
            'name' => 'Traditional Gold Bangle',
            'product_code' => 'BGL-GLD-101',
            'design_no' => 'DES-BGL-01',
            'category_id' => $this->category->id,
            'current_stock_qty' => 5,
            'opening_stock_weight' => 20.000,
            'opening_stock_rate' => 7000.00,
            'attributes' => ['purity' => '22K', 'rate' => 7000.00, 'gross_wt' => 20.000],
        ]);

        // Customer A: Price list v01 with 22K rate = 6800
        $plA = ClientPriceList::create([
            'client_id' => $clientA->id,
            'version' => '01',
            'status' => 'active',
            'effective_from' => now()->toDateString(),
            'gold_rates' => [
                'rate_24k' => 7400,
                'rate_22k' => 6800,
                'rate_18k' => 5500,
            ],
            'making_charges' => [
                ['type_design' => '22KT', 'labour_charge' => '400', 'wastage_percent' => '5%']
            ],
        ]);

        // Customer B: Price list v01 with 22K rate = 7200
        $plB = ClientPriceList::create([
            'client_id' => $clientB->id,
            'version' => '01',
            'status' => 'active',
            'effective_from' => now()->toDateString(),
            'gold_rates' => [
                'rate_24k' => 7800,
                'rate_22k' => 7200,
                'rate_18k' => 5900,
            ],
            'making_charges' => [
                ['type_design' => '22KT', 'labour_charge' => '550', 'wastage_percent' => '6%']
            ],
        ]);

        // Calculate prices via PricingService
        $priceA = PricingService::calculateItemPrice($product, $clientA, 1.0, 20.000);
        $priceB = PricingService::calculateItemPrice($product, $clientB, 1.0, 20.000);

        // Verify Customer A gets 6800/g and Customer B gets 7200/g for the exact same product
        $this->assertEquals(6800.00, $priceA['rate_per_gram']);
        $this->assertEquals(7200.00, $priceB['rate_per_gram']);
        $this->assertEquals('01', $priceA['price_list_version']);
        $this->assertEquals('01', $priceB['price_list_version']);
        $this->assertNotEquals($priceA['rate_per_gram'], $priceB['rate_per_gram']);

        // Issue historical invoice to Customer A using Version 01
        $invoiceA = $this->saleService->create([
            'client_id' => $clientA->id,
            'invoice_no' => 'INV-2026-HIST-01',
            'items' => [
                [
                    'product_id' => $product->id,
                    'product_name' => $product->name,
                    'quantity' => 1,
                    'gross_weight' => 20.000,
                    'net_weight' => 20.000,
                    'rate' => 6800.00,
                    'purity' => '22K',
                    'line_total' => 136000.00,
                ]
            ],
            'paid_amount' => 136000.00,
        ], $this->admin->id);

        $this->assertEquals('01', $invoiceA->price_list_version);

        // Now activate a new Version 02 for Customer A with 22K rate = 7500
        $activateRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/clients/{$clientA->id}/price-list", [
            'version' => '02',
            'status' => 'active',
            'gold_rates' => [
                'rate_24k' => 8100,
                'rate_22k' => 7500,
            ],
        ]);
        $activateRes->assertStatus(200);

        // Verify Version 01 was archived automatically
        $plA->refresh();
        $this->assertEquals('archived', $plA->status);

        // Verify future price calculations for Customer A automatically use Version 02 (7500/g)
        $newPriceA = PricingService::calculateItemPrice($product, $clientA, 1.0, 20.000);
        $this->assertEquals(7500.00, $newPriceA['rate_per_gram']);
        $this->assertEquals('02', $newPriceA['price_list_version']);

        // Verify historical invoice A permanently preserved its original Version 01 and original totals
        $invoiceA->refresh();
        $this->assertEquals('01', $invoiceA->price_list_version);
        $this->assertEquals(136000.00, (float) $invoiceA->amount);
        $this->assertEquals(6800.00, (float) $invoiceA->itemsRelation->first()->rate);
    }

    /**
     * Test 3: Parent-only sale vs child piece tag sale, exact weights, and double-selling prevention
     */
    public function test_parent_and_child_piece_inventory_rules_and_exact_weights()
    {
        $parent = Product::create([
            'name' => 'Diamond Studded Kada',
            'product_code' => 'KAD-DIA-001',
            'design_no' => 'DES-KAD-01',
            'category_id' => $this->category->id,
            'current_stock_qty' => 1,
            'opening_stock_weight' => 25.400,
            'purchase_rate' => 7000.00,
            'attributes' => ['purity' => '22K', 'rate' => 7000.00],
        ]);

        $childPiece = WorkOrderReceivedPiece::create([
            'product_id' => $parent->id,
            'tag_number' => 'TAG-KAD-901',
            'design_no' => 'DES-KAD-901',
            'piece_number' => 1,
            'gross_weight' => 25.400,
            'net_gold_weight' => 24.100,
            'pure_24k_weight' => 22.075,
            'diamond_weight' => 1.300,
            'diamond_count' => 14,
            'diamond_details' => 'VS-GH / 14 pcs / 1.30ct',
            'purity' => '91.60',
            'gold_karat' => '22K',
            'status' => 'in_stock',
            'is_inventory_posted' => true,
            'received_at' => now(),
        ]);

        $client = Client::create([
            'client_code' => 'CL-CUST-C',
            'full_name' => 'Meera Patel',
            'primary_phone' => '9777788888',
            'status' => 'active',
        ]);

        // 3a. Attempting to sell the parent directly without piece tag when an unsold child piece exists must be rejected
        try {
            $this->saleService->create([
                'client_id' => $client->id,
                'items' => [
                    [
                        'product_id' => $parent->id,
                        'product_name' => $parent->name,
                        'quantity' => 1,
                        'rate' => 7000.00,
                    ]
                ]
            ], $this->admin->id);
            $this->fail('Expected ValidationException when selling parent product while child piece tags exist');
        } catch (ValidationException $e) {
            $this->assertStringContainsString('individual child piece/tag rather than selling the parent product directly', $e->getMessage());
        }

        // 3b. Sell via the valid child piece tag
        $sale = $this->saleService->create([
            'client_id' => $client->id,
            'items' => [
                [
                    'product_id' => $parent->id,
                    'piece_id' => $childPiece->id,
                    'tag_number' => 'TAG-KAD-901',
                    'quantity' => 1,
                    'gross_weight' => 25.400,
                    'net_weight' => 24.100,
                    'stone_weight' => 1.300,
                    'rate' => 7000.00,
                    'purity' => '22K',
                    'line_total' => 178000.00,
                ]
            ],
            'paid_amount' => 178000.00,
        ], $this->admin->id);

        $this->assertNotNull($sale);

        // Verify child piece is sold and linked
        $childPiece->refresh();
        $this->assertEquals('sold', $childPiece->status);
        $this->assertEquals($sale->id, $childPiece->invoice_id);

        // Verify parent stock was decremented to 0
        $parent->refresh();
        $this->assertEquals(0, $parent->current_stock_qty);

        // Verify exact snapshot weights in SaleItem and details
        $saleItem = $sale->itemsRelation->first();
        $this->assertEquals(25.400, (float) $saleItem->gross_weight);
        $this->assertEquals(24.100, (float) $saleItem->net_weight);
        $this->assertEquals(1.300, (float) $saleItem->stone_weight);
        $this->assertEquals(22.076, (float) $saleItem->details['fine_gold_weight']);
        $this->assertEquals(1.300, (float) $saleItem->details['diamond_weight']);
        $this->assertEquals('TAG-KAD-901', $saleItem->details['tag_numbers'][0]);

        // 3c. Double-selling prevention: Attempting to sell the child piece again must throw ValidationException
        try {
            $this->saleService->create([
                'client_id' => $client->id,
                'items' => [
                    [
                        'product_id' => $parent->id,
                        'piece_id' => $childPiece->id,
                        'tag_number' => 'TAG-KAD-901',
                        'quantity' => 1,
                        'rate' => 7000.00,
                    ]
                ]
            ], $this->admin->id);
            $this->fail('Expected ValidationException on already sold piece');
        } catch (ValidationException $e) {
            $this->assertStringContainsString('already been sold', $e->getMessage());
        }

        // 3d. Standalone parent product sale when NO child pieces exist
        $standaloneParent = Product::create([
            'name' => 'Plain Gold Bullion Bar 50g',
            'product_code' => 'BAR-GLD-050',
            'design_no' => 'DES-BAR-50',
            'category_id' => $this->category->id,
            'current_stock_qty' => 3,
            'opening_stock_weight' => 50.000,
            'opening_stock_rate' => 7500.00,
            'attributes' => ['purity' => '24K', 'rate' => 7500.00],
        ]);

        $standaloneSale = $this->saleService->create([
            'client_id' => $client->id,
            'items' => [
                [
                    'product_id' => $standaloneParent->id,
                    'product_name' => $standaloneParent->name,
                    'quantity' => 1,
                    'gross_weight' => 50.000,
                    'net_weight' => 50.000,
                    'rate' => 7500.00,
                    'purity' => '24K',
                    'line_total' => 375000.00,
                ]
            ],
            'paid_amount' => 375000.00,
        ], $this->admin->id);

        $this->assertNotNull($standaloneSale);
        $standaloneParent->refresh();
        $this->assertEquals(2, $standaloneParent->current_stock_qty);
    }

    /**
     * Test 4: Credit sales, payment edits, and customer outstanding ledger calculations
     */
    public function test_credit_sales_payment_corrections_and_customer_ledger()
    {
        $client = Client::create([
            'client_code' => 'CL-CUST-LEDGER',
            'full_name' => 'Rajesh Sundaram',
            'primary_phone' => '9444455555',
            'opening_balance' => 10000.00, // Debit opening balance of ₹10,000
            'balance_type' => 'debit',
            'status' => 'active',
        ]);

        // Sale 1: Total ₹100,000. Customer pays ₹30,000 partial payment (Credit due: ₹70,000)
        $sale1 = $this->saleService->create([
            'client_id' => $client->id,
            'invoice_no' => 'INV-LEDGER-001',
            'items' => [
                [
                    'product_name' => 'Gold Chain 22K',
                    'quantity' => 1,
                    'gross_weight' => 15.000,
                    'net_weight' => 15.000,
                    'rate' => 6666.67,
                    'line_total' => 100000.00,
                ]
            ],
            'paid_amount' => 30000.00,
            'payment_method' => 'cash',
        ], $this->admin->id);

        $this->assertEquals(103000.00, (float) $sale1->total_amount); // 100k + 3% GST = 103,000
        $this->assertEquals(30000.00, (float) $sale1->paid_amount);
        $this->assertEquals(73000.00, (float) $sale1->due_amount);
        $this->assertEquals('partial', $sale1->status);

        // Fetch customer ledger via GET /api/sales/customers/{client}
        $ledgerRes1 = $this->actingAs($this->admin, 'sanctum')->getJson("/api/sales/customers/{$client->id}");
        $ledgerRes1->assertStatus(200);
        $stats1 = $ledgerRes1->json('stats');
        $this->assertEquals(103000.00, (float) $stats1['total_billed']);
        $this->assertEquals(30000.00, (float) $stats1['total_paid']);
        $this->assertEquals(73000.00, (float) $stats1['total_outstanding']);
        // Total customer outstanding = 73,000 invoice due + 10,000 opening balance = 83,000
        $this->assertEquals(83000.00, (float) $stats1['total_customer_outstanding']);
        $this->assertEquals(1, $stats1['partially_paid_invoices_count']);
        $this->assertEquals(0, $stats1['unpaid_invoices_count']);

        // Record a subsequent payment of ₹20,000 against Sale 1
        $paymentRecord = $sale1->payments()->first();
        $this->assertNotNull($paymentRecord);

        $subsequentPayRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/sales/{$sale1->id}/payments", [
            'amount' => 20000.00,
            'payment_method' => 'upi',
            'reference' => 'UPI-TXN-12345',
        ]);
        $subsequentPayRes->assertStatus(200);

        $sale1->refresh();
        $this->assertEquals(50000.00, (float) $sale1->paid_amount);
        $this->assertEquals(53000.00, (float) $sale1->due_amount);

        // Correct / Edit the payment record: change from ₹20,000 to ₹25,000
        $secondPayment = $sale1->payments()->latest('id')->first();
        $editRes = $this->actingAs($this->admin, 'sanctum')->putJson("/api/sales/{$sale1->id}/payments/{$secondPayment->id}", [
            'amount' => 25000.00,
            'payment_method' => 'bank_transfer',
            'reference' => 'IMPS-CORRECTED-99',
        ]);
        $editRes->assertStatus(200);

        $sale1->refresh();
        $this->assertEquals(55000.00, (float) $sale1->paid_amount);
        $this->assertEquals(48000.00, (float) $sale1->due_amount);

        // Sale 2: Customer returns later to buy another item (Zero down / Credit sale)
        $sale2 = $this->saleService->create([
            'client_id' => $client->id,
            'invoice_no' => 'INV-LEDGER-002',
            'items' => [
                [
                    'product_name' => 'Diamond Ring',
                    'quantity' => 1,
                    'gross_weight' => 5.000,
                    'net_weight' => 4.500,
                    'stone_weight' => 0.500,
                    'rate' => 7000.00,
                    'line_total' => 50000.00,
                ]
            ],
            'paid_amount' => 0.00, // zero-down credit sale
            'payment_method' => 'credit',
        ], $this->admin->id);

        $this->assertEquals(51500.00, (float) $sale2->total_amount); // 50k + 3% GST = 51,500
        $this->assertEquals(0.00, (float) $sale2->paid_amount);
        $this->assertEquals(51500.00, (float) $sale2->due_amount);
        $this->assertEquals('pending', $sale2->status);

        // Verify customer ledger across multiple purchases
        $ledgerRes2 = $this->actingAs($this->admin, 'sanctum')->getJson("/api/sales/customers/{$client->id}");
        $ledgerRes2->assertStatus(200);
        $stats2 = $ledgerRes2->json('stats');
        // Total billed: 103,000 + 51,500 = 154,500
        $this->assertEquals(154500.00, (float) $stats2['total_billed']);
        // Total paid: 55,000
        $this->assertEquals(55000.00, (float) $stats2['total_paid']);
        // Total invoice dues: 48,000 (sale 1) + 51,500 (sale 2) = 99,500
        $this->assertEquals(99500.00, (float) $stats2['total_outstanding']);
        // Total customer outstanding: 99,500 + 10,000 opening = 109,500
        $this->assertEquals(109500.00, (float) $stats2['total_customer_outstanding']);
        $this->assertEquals(2, $stats2['total_invoices']);
        $this->assertEquals(1, $stats2['unpaid_invoices_count']);
        $this->assertEquals(1, $stats2['partially_paid_invoices_count']);
        $this->assertEquals(0, $stats2['paid_invoices_count']);
    }
}
