<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Supplier;
use App\Models\Karigar;
use App\Models\RawMaterial;
use App\Models\Stamp;
use App\Models\Product;
use App\Models\Category;
use App\Models\Client;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use App\Models\KarigarMaterialTransaction;
use App\Models\KarigarPayment;
use App\Models\PurchaseEntry;
use App\Models\Invoice;
use Illuminate\Foundation\Testing\RefreshDatabase;

class FinalClientReviewControlledScenarioTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Supplier $supplier;
    protected Karigar $karigar;
    protected Client $client;
    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);

        $this->supplier = Supplier::create([
            'supplier_code' => 'SUP-AUDIT-01',
            'name' => 'Royal Bullion & Gems Corp',
            'supplier_type' => 'Bullion & Diamond Merchant',
            'status' => 'active',
            'current_balance' => 0.00,
            'gold_balance_grams' => 0.000,
            'silver_balance_grams' => 0.000,
        ]);

        $this->karigar = Karigar::create([
            'karigar_code' => 'KAR-AUDIT-01',
            'name' => 'Mahesh Master Craftsman',
            'primary_phone' => '9840123456',
            'status' => 'active',
            'specialization' => 'Diamond Jewellery & Setting',
            'workshop_name' => 'Artisan Studio 1',
        ]);

        $this->client = Client::create([
            'client_code' => 'CL-AUDIT-01',
            'name' => 'Meera Singhania',
            'full_name' => 'Meera Singhania',
            'primary_phone' => '9876543210',
            'status' => 'active',
            'current_balance' => 0.00,
            'gold_balance_grams' => 0.000,
        ]);

        $this->category = Category::create([
            'name' => 'Bridal Necklaces',
            'code' => 'BNK-01',
            'status' => 'active',
        ]);

        // Authoritative Raw Material Vaults
        RawMaterial::updateOrCreate(
            ['material_type' => 'gold'],
            [
                'name' => '24K Pure Gold Bullion',
                'unit' => 'g',
                'current_balance' => 0.000,
                'opening_weight' => 0.000,
                'purchased_weight' => 0.000,
                'allocated_weight' => 0.000,
            ]
        );

        RawMaterial::updateOrCreate(
            ['material_type' => 'diamond'],
            [
                'name' => 'Loose Cut Diamonds',
                'unit' => 'ct',
                'current_balance' => 0.000,
                'current_count' => 0,
                'opening_weight' => 0.000,
                'opening_count' => 0,
                'purchased_weight' => 0.000,
                'purchased_count' => 0,
                'allocated_weight' => 0.000,
                'allocated_count' => 0,
            ]
        );
    }

    /**
     * Complete 16-step controlled end-to-end audit scenario.
     */
    public function test_complete_controlled_16_step_audit_scenario(): void
    {
        // -------------------------------------------------------------------------
        // STEP 1: Create or identify diamond stamps in Masters
        // -------------------------------------------------------------------------
        $stampPlus5 = Stamp::create(['name' => '+5 Sieve', 'code' => 'STAMP-P5', 'type' => 'diamond', 'status' => 'active']);
        $stampPlus4 = Stamp::create(['name' => '+4 Sieve', 'code' => 'STAMP-P4', 'type' => 'diamond', 'status' => 'active']);
        $this->assertDatabaseHas('stamps', ['name' => '+5 Sieve']);
        $this->assertDatabaseHas('stamps', ['name' => '+4 Sieve']);

        // -------------------------------------------------------------------------
        // STEP 2: Purchase diamonds under two different stamps with independent counts, carats, rates
        // -------------------------------------------------------------------------
        $diaPurchasePayload = [
            'supplier_id' => $this->supplier->id,
            'purchase_type' => 'raw_material',
            'metal_type' => 'diamond',
            'unit' => 'ct',
            'weight' => 5.500,
            'count_qty' => 25,
            'total_amount' => 245000.00,
            'paid_amount' => 0.00,
            'purchase_date' => now()->toDateString(),
            'components' => [
                [
                    'stamp' => '+5 Sieve',
                    'sieve_size' => '+5 Sieve',
                    'diamond_type' => 'Round Brilliant',
                    'stones_count' => 10,
                    'weight_carats' => 2.500,
                    'rate_per_carat' => 50000.00,
                    'row_value' => 125000.00,
                    'notes' => 'Stamp +5 lot',
                ],
                [
                    'stamp' => '+4 Sieve',
                    'sieve_size' => '+4 Sieve',
                    'diamond_type' => 'Round Brilliant',
                    'stones_count' => 15,
                    'weight_carats' => 3.000,
                    'rate_per_carat' => 40000.00,
                    'row_value' => 120000.00,
                    'notes' => 'Stamp +4 lot',
                ],
            ],
        ];

        $diaPurchaseRes = $this->actingAs($this->admin)->postJson('/api/purchase-entries', $diaPurchasePayload);
        $diaPurchaseRes->assertStatus(201);
        $diaPurchaseEntryId = $diaPurchaseRes->json('purchase_entry.id');

        // -------------------------------------------------------------------------
        // STEP 3: Verify purchase history, loose-diamond stock, stamp-wise balances, supplier ledger
        // -------------------------------------------------------------------------
        $diaHistoryRes = $this->actingAs($this->admin)->getJson("/api/purchase-entries/{$diaPurchaseEntryId}");
        $diaHistoryRes->assertStatus(200);
        $this->assertEquals(5.500, (float)$diaHistoryRes->json('purchase_entry.weight'));
        $this->assertEquals(25, (int)$diaHistoryRes->json('purchase_entry.count_qty'));
        $this->assertCount(2, $diaHistoryRes->json('purchase_entry.components'));

        $diaVault = RawMaterial::where('material_type', 'diamond')->first();
        $this->assertEquals(5.500, (float)$diaVault->current_balance);
        $this->assertEquals(25, (int)$diaVault->current_count);

        $unifiedStockRes = $this->actingAs($this->admin)->getJson('/api/raw-materials/unified-stock');
        $unifiedStockRes->assertStatus(200);
        $byStamp = collect($unifiedStockRes->json('diamond_by_stamp'));

        $p5Stock = $byStamp->firstWhere('stamp', '+5 Sieve');
        $this->assertNotNull($p5Stock);
        $this->assertEquals(2.500, (float)$p5Stock['available_carats']);
        $this->assertEquals(10, (int)$p5Stock['available_count']);

        $p4Stock = $byStamp->firstWhere('stamp', '+4 Sieve');
        $this->assertNotNull($p4Stock);
        $this->assertEquals(3.000, (float)$p4Stock['available_carats']);
        $this->assertEquals(15, (int)$p4Stock['available_count']);

        // Supplier monetary ledger shows liability of ₹2,45,000
        $this->supplier->refresh();
        $this->assertEquals(-245000.00, (float)$this->supplier->current_balance);

        // -------------------------------------------------------------------------
        // STEP 4: Purchase gold at specified purity (60g 22K => 55g fine gold), verify physical, fine, payable
        // -------------------------------------------------------------------------
        $goldPurchasePayload = [
            'supplier_id' => $this->supplier->id,
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'purity' => '22K',
            'weight' => 62.000,
            'less_weight' => 2.000,
            'net_weight' => 60.000,
            'touch' => 91.6,
            'rate' => 7000.00,
            'total_amount' => 420000.00,
            'paid_amount' => 0.00,
            'purchase_date' => now()->toDateString(),
        ];

        $goldPurchaseRes = $this->actingAs($this->admin)->postJson('/api/purchase-entries', $goldPurchasePayload);
        $goldPurchaseRes->assertStatus(201);
        $goldEntry = $goldPurchaseRes->json('purchase_entry');
        $this->assertEquals(60.000, (float)$goldEntry['net_weight']);
        $this->assertEquals(55.000, (float)$goldEntry['fine_weight']);

        $goldVault = RawMaterial::where('material_type', 'gold')->first();
        $this->assertEquals(55.000, (float)$goldVault->current_balance);

        $this->supplier->refresh();
        $this->assertEquals(-665000.00, (float)$this->supplier->current_balance); // 245,000 + 420,000

        // -------------------------------------------------------------------------
        // STEP 5: Create a parent product & work order containing gold and multiple diamond types
        // -------------------------------------------------------------------------
        $parentProduct = Product::create([
            'name' => 'Imperial Peacock Choker',
            'product_code' => 'CH-IMP-001',
            'design_no' => 'DES-IMP-001',
            'category_id' => $this->category->id,
            'current_stock_qty' => 0,
            'status' => 'active',
        ]);

        $woPayload = [
            'work_order_number' => 'WO-2026-AUDIT',
            'customer_name' => $this->client->name,
            'client_id' => $this->client->id,
            'product_id' => $parentProduct->id,
            'product_name' => $parentProduct->name,
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(14)->toDateString(),
            'allotted_weight' => 30.000,
            'priority' => 'High',
            'material_type' => '22K Gold',
            'items' => [
                [
                    'product_id' => $parentProduct->id,
                    'variant' => 'Imperial Peacock Choker',
                    'design_no' => 'DES-IMP-001',
                    'gold_weight' => 30.000,
                    'need_pcs' => 1,
                    'total_gross_wt' => 30.000,
                    'diamond_weight' => 1.500,
                    'no_of_diamonds' => 7,
                    'total_dia_cts' => 1.500,
                    'stamp_and_no' => '+5 Sieve-3, +4 Sieve-4',
                ],
            ],
        ];

        $createWoRes = $this->actingAs($this->admin)->postJson('/api/work-orders', $woPayload);
        $createWoRes->assertSuccessful();
        $createdWo = WorkOrder::where('work_order_number', 'WO-2026-AUDIT')->first();
        $this->assertNotNull($createdWo);

        // -------------------------------------------------------------------------
        // STEP 6: Confirm that NO unintended material allocation occurs during work-order creation
        // -------------------------------------------------------------------------
        $goldVault->refresh();
        $diaVault->refresh();
        $this->assertEquals(55.000, (float)$goldVault->current_balance, 'Gold vault stock must NOT decrease during work order creation');
        $this->assertEquals(5.500, (float)$diaVault->current_balance, 'Diamond vault stock must NOT decrease during work order creation');
        $this->assertEquals(25, (int)$diaVault->current_count, 'Diamond piece count must NOT change during work order creation');

        $karigarLedgerRes = $this->actingAs($this->admin)->getJson("/api/karigars/{$this->karigar->id}/material-ledger");
        $karigarLedgerRes->assertStatus(200);
        $this->assertEquals(0, (float)$karigarLedgerRes->json('data.summary.total_issued_gross'), 'Karigar material ledger issued gross must be 0 prior to explicit allocation');

        // -------------------------------------------------------------------------
        // STEP 7: Allocate materials through Karigar Management and verify vault deductions
        // -------------------------------------------------------------------------
        $allocationPayload = [
            'work_order_id' => $createdWo->id,
            'allocation_date' => now()->toDateString(),
            'notes' => 'Allocating materials for WO-2026-AUDIT',
            'materials' => [
                [
                    'material_type' => 'gold',
                    'purity' => '22K',
                    'touch' => 91.6,
                    'unit' => 'g',
                    'gross_weight' => 30.000,
                    'net_weight' => 30.000,
                    'fine_weight' => 27.480,
                ],
                [
                    'material_type' => 'diamond',
                    'stamp' => '+5 Sieve',
                    'unit' => 'ct',
                    'pieces' => 3,
                    'gross_weight' => 0.700,
                    'net_weight' => 0.700,
                ],
                [
                    'material_type' => 'diamond',
                    'stamp' => '+4 Sieve',
                    'unit' => 'ct',
                    'pieces' => 4,
                    'gross_weight' => 0.800,
                    'net_weight' => 0.800,
                ],
            ],
        ];

        $allocRes = $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigar->id}/allocate-materials", $allocationPayload);
        $allocRes->assertStatus(200);

        // Vault deductions:
        $goldVault->refresh();
        $diaVault->refresh();
        $this->assertEquals(27.520, (float)$goldVault->current_balance); // 55.000 - 27.480 = 27.520g
        $this->assertEquals(4.000, (float)$diaVault->current_balance);   // 5.500 - (0.700 + 0.800) = 4.000ct
        $this->assertEquals(18, (int)$diaVault->current_count);           // 25 - 7 = 18 pcs

        // Verify stamp isolation in unified stock
        $unifiedStockAfterAlloc = $this->actingAs($this->admin)->getJson('/api/raw-materials/unified-stock');
        $stampsStockAfterAlloc = collect($unifiedStockAfterAlloc->json('diamond_by_stamp'));
        $p5AfterAlloc = $stampsStockAfterAlloc->firstWhere('stamp', '+5 Sieve');
        $p4AfterAlloc = $stampsStockAfterAlloc->firstWhere('stamp', '+4 Sieve');

        $this->assertEquals(1.800, (float)$p5AfterAlloc['available_carats']); // 2.500 - 0.700 = 1.800 ct
        $this->assertEquals(7, (int)$p5AfterAlloc['available_count']);        // 10 - 3 = 7 pcs
        $this->assertEquals(2.200, (float)$p4AfterAlloc['available_carats']); // 3.000 - 0.800 = 2.200 ct
        $this->assertEquals(11, (int)$p4AfterAlloc['available_count']);       // 15 - 4 = 11 pcs

        // -------------------------------------------------------------------------
        // STEP 8: Process work order through WIP and QC stages
        // -------------------------------------------------------------------------
        $item = $createdWo->items()->first();

        // Submit to QC
        $wipRes = $this->actingAs($this->admin)->postJson("/api/work-orders/{$createdWo->id}/wip-update", [
            'work_order_item_id' => $item->id,
            'action' => 'submit_to_qc',
            'quantity' => 1,
            'completed_weight' => 28.500,
            'actual_weight' => 28.500,
            'karigar_notes' => 'Choker finished ready for QC inspection',
        ]);
        $wipRes->assertStatus(200);

        // Pass QC
        $qcRes = $this->actingAs($this->admin)->postJson("/api/work-orders/{$createdWo->id}/qc-action", [
            'work_order_item_id' => $item->id,
            'action' => 'pass',
            'quantity' => 1,
            'notes' => 'QC Passed: dimensions and setting flawless',
        ]);
        $qcRes->assertStatus(200);

        // -------------------------------------------------------------------------
        // STEP 9: Receive piece with actual piece measurements, diamond sieves, making charges
        // -------------------------------------------------------------------------
        $receivePayload = [
            'work_order_item_id' => $item->id,
            'gross_weight' => 28.500,
            'net_gold_weight' => 28.240, // 28.500 - (1.300 * 0.2) = 28.240g
            'purity' => 91.6,
            'gold_karat' => '22K',
            'diamond_weight' => 1.300,
            'diamond_count' => 6,
            'diamond_stamp' => '+5 Sieve & +4 Sieve',
            'diamond_sieves' => [
                [
                    'stamp' => '+5 Sieve',
                    'count' => 2,
                    'weight' => 0.500,
                    'rate' => 50000.00,
                    'value' => 25000.00,
                ],
                [
                    'stamp' => '+4 Sieve',
                    'count' => 4,
                    'weight' => 0.800,
                    'rate' => 40000.00,
                    'value' => 32000.00,
                ],
            ],
            'making_charge_type' => 'per_gram',
            'making_charge_per_gram' => 400.00,
            'wastage_weight' => 0.760, // 30.000 allocated - 28.240 net gold in piece - 1.000 returned = 0.760g wastage
            'returned_gold_weight' => 1.000,
            'remarks' => 'Piece received in prime quality',
        ];

        $receiveRes = $this->actingAs($this->admin)->postJson("/api/work-orders/{$createdWo->id}/receive-piece", $receivePayload);
        $receiveRes->assertStatus(200);
        $receivedTag = $receiveRes->json('data.tag_number');
        $this->assertNotEmpty($receivedTag);

        // Process Unused Diamond Return from Karigar (Artisan returned 1 unused +5 Sieve diamond of 0.200ct)
        $diaReturnRes = $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigar->id}/material-action", [
            'action_type' => 'unused_returned',
            'material_type' => 'diamond',
            'stamp' => '+5 Sieve',
            'pieces' => 1,
            'weight' => 0.200,
            'unit' => 'ct',
            'work_order_id' => $createdWo->id,
            'reason' => 'Unused 1 diamond of +5 Sieve returned by artisan',
        ]);
        $diaReturnRes->assertStatus(200);

        // Check vault stock after return:
        $diaVault->refresh();
        $this->assertEquals(4.200, (float)$diaVault->current_balance); // 4.000 + 0.200 ct returned = 4.200 ct
        $this->assertEquals(19, (int)$diaVault->current_count);        // 18 + 1 pc returned = 19 pcs

        // Complete gates and finalize inventory
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$createdWo->id}/certification-action", ['action' => 'skip']);
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$createdWo->id}/hallmarking-action", ['action' => 'skip']);
        $finalizeRes = $this->actingAs($this->admin)->postJson("/api/work-orders/{$createdWo->id}/finalize-inventory");
        $finalizeRes->assertStatus(200);

        // -------------------------------------------------------------------------
        // STEP 10: Verify Karigar balances, making charges payable, and financial settlement
        // -------------------------------------------------------------------------
        $financialRes = $this->actingAs($this->admin)->getJson("/api/karigars/{$this->karigar->id}/financial-ledger");
        $financialRes->assertStatus(200);
        $this->assertEquals(11296.00, (float)$financialRes->json('data.summary.total_payable')); // 28.240g * 400 = 11,296.00

        // Settle making charge in cash
        $cashSettleRes = $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigar->id}/settle-cash", [
            'amount' => 11296.00,
            'payment_method' => 'Cash',
            'notes' => 'Settlement for WO-2026-AUDIT making charge',
        ]);
        $cashSettleRes->assertStatus(200);

        $finAfterSettle = $this->actingAs($this->admin)->getJson("/api/karigars/{$this->karigar->id}/financial-ledger");
        $this->assertEquals(0.00, (float)$finAfterSettle->json('data.summary.balance_due'), 'Making charge payable must reconcile to ₹0.00 after full cash settlement');

        // Verify Karigar Material Reconciliation:
        $ledgerAfter = $this->actingAs($this->admin)->getJson("/api/karigars/{$this->karigar->id}/material-ledger");
        $matSummary = $ledgerAfter->json('data.summary');
        // Allotted 30g = 28.5g piece + 1.0g returned + 0.5g wastage => Bench balance = 0g
        $this->assertEquals(0.000, (float)$matSummary['material_on_bench']);
        $this->assertEquals(0.000, (float)$matSummary['diamond_on_bench']);
        $this->assertEquals(0, (int)$matSummary['diamond_count_on_bench']);

        // -------------------------------------------------------------------------
        // STEP 11 & 12: Confirm received piece appears under parent product with its own tag
        // -------------------------------------------------------------------------
        $parentProduct->refresh();
        $this->assertEquals(1, (int)$parentProduct->current_stock_qty, 'Parent product stock count must increase to 1');

        $piece = WorkOrderReceivedPiece::where('tag_number', $receivedTag)->first();
        $this->assertNotNull($piece);
        $this->assertEquals($parentProduct->id, $piece->product_id);
        $this->assertEquals(28.500, (float)$piece->gross_weight);
        $this->assertEquals(1.300, (float)$piece->diamond_weight);
        $this->assertEquals(6, (int)$piece->diamond_count);
        $this->assertTrue($piece->is_inventory_posted);

        // Verify tag view API
        $tagViewRes = $this->actingAs($this->admin)->getJson("/api/inventory/jewellery-tags/{$receivedTag}");
        $tagViewRes->assertStatus(200);
        $this->assertEquals($parentProduct->name, $tagViewRes->json('data.product_name'));
        $this->assertEquals(28.500, (float)$tagViewRes->json('data.gross_weight'));

        // -------------------------------------------------------------------------
        // STEP 13: Sell exact piece by tag and verify only that piece is sold
        // -------------------------------------------------------------------------
        $salePayload = [
            'client_id' => $this->client->id,
            'invoice_date' => now()->toDateString(),
            'payment_status' => 'paid',
            'payment_mode' => 'bank_transfer',
            'items' => [
                [
                    'piece_id' => $piece->id,
                    'tag_number' => $receivedTag,
                    'product_id' => $parentProduct->id,
                    'item_name' => $parentProduct->name,
                    'huid' => $piece->huid,
                    'gross_weight' => 28.500,
                    'net_weight' => 28.240,
                    'diamond_weight' => 1.300,
                    'diamond_count' => 6,
                    'rate' => 7500.00,
                    'making_charges' => 15000.00,
                    'taxable_amount' => 226800.00,
                    'total_amount' => 233604.00, // +3% GST
                ],
            ],
            'paid_amount' => 233604.00,
        ];

        $saleRes = $this->actingAs($this->admin)->postJson('/api/sales', $salePayload);
        $saleRes->assertSuccessful();

        // Piece tag status becomes sold
        $piece->refresh();
        $this->assertEquals('sold', $piece->status);

        // Parent product active available stock drops from 1 to 0
        $parentProduct->refresh();
        $this->assertEquals(0, (int)$parentProduct->current_stock_qty);

        // -------------------------------------------------------------------------
        // STEP 14 & 15: Reports & Ledger Reconciliation:
        // Opening Balance + Period Transactions = Closing Balance
        // -------------------------------------------------------------------------
        // Supplier Ledger: Opening 0 - 245,000 (Dia) - 420,000 (Gold) = -665,000
        $supplierLedgerRes = $this->actingAs($this->admin)->getJson("/api/suppliers/{$this->supplier->id}/ledger");
        $supplierLedgerRes->assertStatus(200);
        $this->assertEquals(-665000.00, (float)$supplierLedgerRes->json('data.summary.current_balance'));

        // Sales Invoice exists and billed
        $this->assertEquals(1, Invoice::where('client_id', $this->client->id)->count());

        // -------------------------------------------------------------------------
        // STEP 16: Repeat applicable submissions to test duplicate-posting protection
        // -------------------------------------------------------------------------
        $dupFinalizeRes = $this->actingAs($this->admin)->postJson("/api/work-orders/{$createdWo->id}/finalize-inventory");
        $this->assertEquals(200, $dupFinalizeRes->status());
        // Verify stock did NOT duplicate:
        $parentProduct->refresh();
        $this->assertEquals(0, (int)$parentProduct->current_stock_qty, 'Re-finalizing work order must NOT increment stock or duplicate records');
        $this->assertEquals(1, WorkOrderReceivedPiece::where('work_order_id', $createdWo->id)->count(), 'Piece rows must remain exactly 1');
    }
}
