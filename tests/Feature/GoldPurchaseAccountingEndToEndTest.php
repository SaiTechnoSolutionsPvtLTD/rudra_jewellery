<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Supplier;
use App\Models\RawMaterial;
use App\Models\PurchaseEntry;
use Laravel\Sanctum\Sanctum;

class GoldPurchaseAccountingEndToEndTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['role' => 'Super Admin']);
        Sanctum::actingAs($this->user);

        $rawGold = RawMaterial::firstOrCreate(['material_type' => 'gold'], [
            'name' => 'Raw Gold',
            'unit' => 'g',
            'opening_weight' => 0,
            'purchased_weight' => 0,
            'allocated_weight' => 0,
            'current_balance' => 0,
        ]);
        $rawGold->unit = 'g';
        $rawGold->opening_weight = 0;
        $rawGold->purchased_weight = 0;
        $rawGold->allocated_weight = 0;
        $rawGold->current_balance = 0;
        $rawGold->save();
    }

    /** @test */
    public function gold_purchase_with_rate_records_monetary_payable_and_24k_conversion()
    {
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-MONEY-01',
            'name' => 'MMTC PAMP Bullion',
            'supplier_type' => 'bullion',
            'status' => 'active',
            'gold_balance_grams' => 0.000,
            'current_balance' => 0.00,
        ]);

        $rawGold = RawMaterial::firstOrCreate(
            ['material_type' => 'gold'],
            ['name' => 'Raw Gold', 'unit' => 'g', 'opening_weight' => 0, 'purchased_weight' => 0, 'allocated_weight' => 0, 'current_balance' => 0]
        );
        $initialBalance = (float) $rawGold->current_balance;

        // Purchase 60g of 18K gold @ ₹6,000/g with rate
        // 24K conversion formula: 60 * 18 / 24 = 45.000g pure gold
        $res = $this->postJson('/api/purchase-entries', [
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'supplier_id' => $supplier->id,
            'weight' => 60.000,
            'less_weight' => 0,
            'net_weight' => 60.000,
            'purity' => '18K',
            'touch' => 75.0,
            'rate' => 6000,
            'total_amount' => 360000.00,
            'paid_amount' => 60000.00, // Partial paid upfront: ₹60,000
            'purchase_date' => now()->toDateString(),
        ]);

        $res->assertStatus(201);
        $entryData = $res->json('purchase_entry');

        // Verify original weight & purity are preserved
        $this->assertEquals(60.000, (float) $entryData['weight']);
        $this->assertEquals('18K', $entryData['purity']);
        $this->assertEquals(6000.00, (float) $entryData['rate']);

        // Verify 24K pure gold conversion: 60 * 18 / 24 = 45.000g
        $this->assertEquals(45.000, (float) $entryData['fine_weight']);

        // Verify Monetary Payable recorded (360,000 - 60,000 = 300,000 owed)
        $supplier->refresh();
        $this->assertEquals(-300000.00, (float) $supplier->current_balance);
        // Gold balance should remain 0 (units never mixed!)
        $this->assertEquals(0.000, (float) $supplier->gold_balance_grams);

        // Verify Vault Raw Gold Stock credited with 24K pure gold weight (45.000g)
        $rawGold->refresh();
        $this->assertEquals(round($initialBalance + 45.000, 3), (float) $rawGold->current_balance);
    }

    /** @test */
    public function gold_purchase_without_rate_records_24k_gold_payable_and_preserves_purity()
    {
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-GOLD-02',
            'name' => 'Kalyan Bullion Vaults',
            'supplier_type' => 'bullion',
            'status' => 'active',
            'gold_balance_grams' => 0.000,
            'current_balance' => 0.00,
        ]);

        $rawGold = RawMaterial::firstOrCreate(
            ['material_type' => 'gold'],
            ['name' => 'Raw Gold', 'unit' => 'g', 'opening_weight' => 0, 'purchased_weight' => 0, 'allocated_weight' => 0, 'current_balance' => 0]
        );
        $initialBalance = (float) $rawGold->current_balance;
        $initialPurchased = (float) $rawGold->purchased_weight;

        // Purchase 60g of 22K gold WITHOUT rate (rate = 0, unfixed)
        // 24K conversion formula: 60 * 22 / 24 = 55.000g pure gold
        $res = $this->postJson('/api/purchase-entries', [
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'supplier_id' => $supplier->id,
            'weight' => 60.000,
            'less_weight' => 0,
            'net_weight' => 60.000,
            'purity' => '22K',
            'touch' => 91.6,
            'rate' => 0,
            'total_amount' => 0,
            'paid_amount' => 0,
            'purchase_date' => now()->toDateString(),
        ]);

        $res->assertStatus(201);
        $entryData = $res->json('purchase_entry');

        // Preserves original weight & purity
        $this->assertEquals(60.000, (float) $entryData['weight']);
        $this->assertEquals('22K', $entryData['purity']);
        $this->assertEquals(0, (float) $entryData['rate']);

        // 24K equivalent weight: 60 * 22 / 24 = 55.000g
        $this->assertEquals(55.000, (float) $entryData['fine_weight']);

        // Supplier Gold Payable recorded in 24K pure weight (-55.000g owed)
        $supplier->refresh();
        $this->assertEquals(-55.000, (float) $supplier->gold_balance_grams);
        // Cash balance should remain 0.00 (not mixed!)
        $this->assertEquals(0.00, (float) $supplier->current_balance);

        // Vault credited with 55.000g 24K pure gold
        $rawGold->refresh();
        $this->assertEquals(round($initialPurchased + 55.000, 3), (float) $rawGold->purchased_weight);
    }

    /** @test */
    public function gold_purchase_24k_pure_conversion()
    {
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-24K-03',
            'name' => 'Pure Gold Refineries',
            'supplier_type' => 'bullion',
            'status' => 'active',
            'gold_balance_grams' => 0.000,
            'current_balance' => 0.00,
        ]);

        // Purchase 60g of 24K gold: 60 * 24 / 24 = 60.000g
        $res = $this->postJson('/api/purchase-entries', [
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'supplier_id' => $supplier->id,
            'weight' => 60.000,
            'purity' => '24K',
            'touch' => 100.0,
            'rate' => 0,
            'total_amount' => 0,
            'purchase_date' => now()->toDateString(),
        ]);

        $res->assertStatus(201);
        $entryData = $res->json('purchase_entry');
        $this->assertEquals(60.000, (float) $entryData['fine_weight']);

        $supplier->refresh();
        $this->assertEquals(-60.000, (float) $supplier->gold_balance_grams);
    }

    /** @test */
    public function supplier_ledger_and_settlements_work_independently_for_cash_and_gold()
    {
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-LEDGER-04',
            'name' => 'Shree Ganesh Bullion',
            'supplier_type' => 'bullion',
            'status' => 'active',
            'gold_balance_grams' => 0.000,
            'current_balance' => 0.00,
        ]);

        // 1. Priced purchase: 100g 22K @ ₹7,000/g = ₹7,00,000 (Owed ₹7,00,000)
        $this->postJson('/api/purchase-entries', [
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'supplier_id' => $supplier->id,
            'weight' => 100.000,
            'purity' => '22K',
            'rate' => 7000,
            'total_amount' => 700000.00,
            'purchase_date' => now()->toDateString(),
        ])->assertStatus(201);

        // 2. Unpriced purchase: 60g 22K without rate = 55.000g pure 24K gold owed
        $this->postJson('/api/purchase-entries', [
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'supplier_id' => $supplier->id,
            'weight' => 60.000,
            'purity' => '22K',
            'rate' => 0,
            'total_amount' => 0,
            'purchase_date' => now()->toDateString(),
        ])->assertStatus(201);

        // Check Ledger API endpoint
        $ledgerRes = $this->getJson("/api/suppliers/{$supplier->id}/ledger");
        $ledgerRes->assertStatus(200);

        $data = $ledgerRes->json();
        $this->assertEquals(700000.00, (float) $data['outstanding']['money']);
        $this->assertEquals(55.000, (float) $data['outstanding']['gold_24k_grams']);

        // 3. Partial Cash Settlement: Pay ₹2,00,000
        $cashSettleRes = $this->postJson("/api/suppliers/{$supplier->id}/settle", [
            'settlement_type' => 'cash',
            'amount' => 200000.00,
            'payment_mode' => 'bank_transfer',
            'settlement_date' => now()->toDateString(),
            'notes' => 'NEFT partial payment batch 1',
        ]);
        $cashSettleRes->assertStatus(201);

        // Verify remaining cash owed is ₹5,00,000
        $supplier->refresh();
        $this->assertEquals(-500000.00, (float) $supplier->current_balance);
        $this->assertEquals(-55.000, (float) $supplier->gold_balance_grams); // Gold owed unchanged!

        // 4. Partial Gold Settlement: Settle 20g of 24K pure gold
        $goldSettleRes = $this->postJson("/api/suppliers/{$supplier->id}/settle", [
            'settlement_type' => 'gold',
            'weight' => 20.000,
            'purity' => '24K',
            'touch' => 100.0,
            'settlement_date' => now()->toDateString(),
            'notes' => 'Physical bullion return 20g 24K bar',
        ]);
        $goldSettleRes->assertStatus(201);

        // Verify remaining gold owed is 35.000g (55 - 20 = 35)
        $supplier->refresh();
        $this->assertEquals(-35.000, (float) $supplier->gold_balance_grams);
        $this->assertEquals(-500000.00, (float) $supplier->current_balance); // Cash owed unchanged!

        // Verify updated ledger returns accurate separate balances
        $updatedLedger = $this->getJson("/api/suppliers/{$supplier->id}/ledger")->json();
        $this->assertEquals(500000.00, (float) $updatedLedger['outstanding']['money']);
        $this->assertEquals(35.000, (float) $updatedLedger['outstanding']['gold_24k_grams']);
    }

    /** @test */
    public function purchase_report_displays_24k_pure_weight_and_distinguishes_payables()
    {
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-REPORT-05',
            'name' => 'National Bullion Syndicate',
            'supplier_type' => 'bullion',
            'status' => 'active',
            'gold_balance_grams' => 0.000,
            'current_balance' => 0.00,
        ]);

        // Unpriced 60g 18K gold -> 45g pure 24K
        $this->postJson('/api/purchase-entries', [
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'supplier_id' => $supplier->id,
            'weight' => 60.000,
            'purity' => '18K',
            'rate' => 0,
            'total_amount' => 0,
            'purchase_date' => now()->toDateString(),
        ])->assertStatus(201);

        $repRes = $this->getJson('/api/reports?type=purchase&period=all');
        $repRes->assertStatus(200);

        $purchases = $repRes->json('purchases');
        $this->assertNotEmpty($purchases);
        $entry = $purchases[0];

        $this->assertEquals(45.000, (float) $entry['fine_weight_24k']);
        $this->assertEquals('gold', $entry['payable_type']);
        $this->assertEquals(45.000, (float) $entry['gold_balance']);
        $this->assertStringContainsString('24K Gold', $entry['outstanding_display']);
    }
}
