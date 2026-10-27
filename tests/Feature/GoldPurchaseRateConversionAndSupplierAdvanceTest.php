<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Supplier;
use App\Models\RawMaterial;
use App\Models\PurchaseEntry;
use App\Models\SupplierSettlement;
use Laravel\Sanctum\Sanctum;

class GoldPurchaseRateConversionAndSupplierAdvanceTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['role' => 'Super Admin']);
        Sanctum::actingAs($this->user);
    }

    /** @test */
    public function it_can_convert_unpriced_gold_purchase_to_priced_monetary_liability()
    {
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-CONV-01',
            'name' => 'Vaidya Bullion Traders',
            'supplier_type' => 'bullion',
            'status' => 'active',
            'gold_balance_grams' => 0.000,
            'current_balance' => 0.00,
        ]);

        $rawGold = RawMaterial::firstOrCreate(
            ['material_type' => 'gold'],
            ['name' => 'Raw Gold', 'unit' => 'g', 'opening_weight' => 0, 'purchased_weight' => 0, 'allocated_weight' => 0, 'current_balance' => 0]
        );

        // 1. Create an unpriced gold purchase of 50g (Fine weight 46.250g)
        $purchaseRes = $this->postJson('/api/purchase-entries', [
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'supplier_id' => $supplier->id,
            'weight' => 50.000,
            'less_weight' => 0,
            'net_weight' => 50.000,
            'touch' => 92.5,
            'fine_weight' => 46.250,
            'rate' => 0,
            'total_amount' => 0,
            'payment_status' => 'unpaid',
            'paid_amount' => 0,
            'purchase_date' => now()->toDateString(),
        ]);

        $purchaseRes->assertStatus(201);
        $purchaseId = $purchaseRes->json('purchase_entry.id') ?? $purchaseRes->json('data.id');
        $this->assertNotNull($purchaseId);

        // Check supplier gold liability was recorded: -46.250g
        $supplier->refresh();
        $this->assertEquals(-46.250, (float) $supplier->gold_balance_grams);
        $this->assertEquals(0.00, (float) $supplier->current_balance);

        // 2. Convert payment mode to monetary by fixing rate: ₹7,000 / g based on net weight (50g * 7000 = ₹350,000)
        $convertRes = $this->postJson("/api/purchase-entries/{$purchaseId}/convert-payment-mode", [
            'target_mode' => 'priced_money',
            'calculation_basis' => 'net_weight',
            'rate' => 7000,
            'total_amount' => 350000,
            'paid_amount' => 50000,
            'payment_status' => 'partial',
            'remarks' => 'Fixing gold rate with supplier at 7000/g'
        ]);

        $convertRes->assertStatus(200);
        $convertRes->assertJson([
            'status' => 'success',
        ]);

        // Verify purchase updated
        $purchase = PurchaseEntry::find($purchaseId);
        $this->assertEquals(7000, (float) $purchase->rate);
        $this->assertEquals(350000, (float) $purchase->total_amount);
        $this->assertEquals(50000, (float) $purchase->paid_amount);
        $this->assertEquals('partial', $purchase->payment_status);

        // Verify supplier liabilities: Gold liability cleared (0.000), cash liability recorded (-₹300,000 remaining)
        $supplier->refresh();
        $this->assertEquals(0.000, (float) $supplier->gold_balance_grams);
        $this->assertEquals(-300000.00, (float) $supplier->current_balance);

        // Verify audit settlement record was created
        $audit = SupplierSettlement::where('supplier_id', $supplier->id)
            ->where('settlement_type', 'rate_conversion')
            ->first();
        $this->assertNotNull($audit);
        $this->assertEquals(350000.00, (float) $audit->amount);
    }

    /** @test */
    public function it_can_manually_adjust_supplier_balances_and_track_advances()
    {
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-ADJ-01',
            'name' => 'Royal Findings Co',
            'supplier_type' => 'accessories',
            'status' => 'active',
            'gold_balance_grams' => -10.000, // We owed 10g
            'current_balance' => -25000.00, // We owed ₹25,000
        ]);

        // Adjust balance so we have extra money (Advance ₹15,000 in supplier hand) and extra gold (Advance 5g 24K in supplier hand)
        $adjustRes = $this->postJson("/api/suppliers/{$supplier->id}/adjust-balance", [
            'current_balance' => 15000.00,
            'gold_balance_grams' => 5.000,
            'reason' => 'Annual account audit: supplier holds advance deposit from us'
        ]);

        $adjustRes->assertStatus(200);
        $adjustRes->assertJson([
            'status' => 'success',
        ]);

        $supplier->refresh();
        $this->assertEquals(15000.00, (float) $supplier->current_balance);
        $this->assertEquals(5.000, (float) $supplier->gold_balance_grams);

        // Verify audit record
        $adjAudit = SupplierSettlement::where('supplier_id', $supplier->id)
            ->where('settlement_type', 'balance_adjustment')
            ->first();
        $this->assertNotNull($adjAudit);
    }

    /** @test */
    public function supplier_ledger_returns_all_purchases_and_differentiates_owed_vs_advance_money_and_gold()
    {
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-LEDGER-01',
            'name' => 'Shree Ganesh Bullion',
            'supplier_type' => 'bullion',
            'status' => 'active',
            'gold_balance_grams' => 12.500, // Extra gold in supplier's hand (advance deposit)
            'current_balance' => -45000.00, // Money we owe to supplier
        ]);

        // Create a purchase record under this supplier
        PurchaseEntry::create([
            'purchase_no' => 'PUR-TST-001',
            'supplier_id' => $supplier->id,
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'weight' => 20.000,
            'net_weight' => 20.000,
            'touch' => 91.6,
            'fine_weight' => 18.320,
            'rate' => 7100,
            'total_amount' => 142000,
            'paid_amount' => 97000,
            'payment_status' => 'partial',
            'purchase_date' => now()->toDateString(),
        ]);

        $ledgerRes = $this->getJson("/api/suppliers/{$supplier->id}/ledger");
        $ledgerRes->assertStatus(200);

        $purchases = $ledgerRes->json('purchases');
        $this->assertNotEmpty($purchases);
        $this->assertEquals('PUR-TST-001', $purchases[0]['purchase_no']);

        // Check metrics:
        // Outstanding money we owe: 45,000
        $this->assertEquals(45000.00, (float) $ledgerRes->json('summary.outstanding_cash_owed'));
        $this->assertEquals(0.00, (float) $ledgerRes->json('summary.advance_cash_held'));

        // Extra gold in supplier's hand: 12.500g
        $this->assertEquals(12.500, (float) $ledgerRes->json('summary.advance_gold_held_24k'));
        $this->assertEquals(0.000, (float) $ledgerRes->json('summary.outstanding_gold_owed_24k'));

        // Check outstanding hero card values:
        $this->assertEquals(45000.00, (float) $ledgerRes->json('outstanding.money'));
        $this->assertEquals(0.00, (float) $ledgerRes->json('outstanding.advance_money'));
        $this->assertEquals(0.000, (float) $ledgerRes->json('outstanding.gold_24k_grams'));
        $this->assertEquals(12.500, (float) $ledgerRes->json('outstanding.advance_gold_24k'));
        $this->assertTrue($ledgerRes->json('outstanding.has_advance_gold'));
    }

    /** @test */
    public function it_can_settle_monetary_liability_by_delivering_physical_gold_equivalent()
    {
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-CROSS-01',
            'name' => 'Mehta Bullion & Refiners',
            'supplier_type' => 'bullion',
            'status' => 'active',
            'gold_balance_grams' => 0.000,
            'current_balance' => -40000.00, // We owe ₹40,000 cash
        ]);

        $rawGold = RawMaterial::firstOrCreate(
            ['material_type' => 'gold'],
            ['name' => 'Raw Gold', 'unit' => 'g', 'opening_weight' => 100, 'purchased_weight' => 0, 'allocated_weight' => 0, 'current_balance' => 100]
        );
        $initialAllocated = (float) $rawGold->allocated_weight;
        $initialBalance = (float) $rawGold->current_balance;

        // Purchase of ₹50,000 where ₹10,000 was paid, ₹40,000 balance remaining
        $purchase = PurchaseEntry::create([
            'purchase_no' => 'PUR-50K-001',
            'supplier_id' => $supplier->id,
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'weight' => 7.142,
            'net_weight' => 7.142,
            'touch' => 100,
            'fine_weight' => 7.142,
            'rate' => 7000,
            'total_amount' => 50000,
            'paid_amount' => 10000,
            'payment_status' => 'partial',
            'purchase_date' => now()->toDateString(),
        ]);

        // Deliver 5.000g of 24K gold at agreed rate ₹8,000/g = ₹40,000 to extinguish the cash debt
        $settleRes = $this->postJson("/api/suppliers/{$supplier->id}/settle", [
            'settlement_type' => 'gold',
            'weight' => 5.000,
            'purity' => '24K',
            'touch' => 100,
            'fine_weight' => 5.000,
            'apply_to_cash' => true,
            'rate_per_gram' => 8000,
            'purchase_entry_id' => $purchase->id,
            'deduct_vault_inventory' => true,
            'settlement_date' => now()->toDateString(),
            'notes' => 'Settled remaining 40k cash debt by delivering 5g 24K gold'
        ]);

        $settleRes->assertStatus(201);

        // Check supplier: cash liability cleared from -40,000 to 0.00!
        $supplier->refresh();
        $this->assertEquals(0.00, (float) $supplier->current_balance);
        // Gold liability remains 0 (since the gold was given to extinguish cash, not as an unallocated gold deposit)
        $this->assertEquals(0.000, (float) $supplier->gold_balance_grams);

        // Check purchase: paid_amount increased to ₹50,000 and status is now paid!
        $purchase->refresh();
        $this->assertEquals(50000.00, (float) $purchase->paid_amount);
        $this->assertEquals('paid', $purchase->payment_status);

        // Check raw material vault inventory: 5g deducted
        $rawGold->refresh();
        $this->assertEquals($initialAllocated + 5.000, (float) $rawGold->allocated_weight);
        $this->assertEquals($initialBalance - 5.000, (float) $rawGold->current_balance);
    }
}
