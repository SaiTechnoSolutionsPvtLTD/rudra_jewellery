<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Supplier;
use App\Models\RawMaterial;
use App\Models\PurchaseEntry;
use App\Models\Karigar;
use App\Models\Category;
use Laravel\Sanctum\Sanctum;

class SupplierMetalLedgerAndMultiSieveWorkflowTest extends TestCase
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
    public function bullion_purchase_without_rate_credits_pure_gold_to_vault_and_supplier_metal_ledger()
    {
        $supplier = Supplier::create([
            'supplier_code' => 'SUP-TEST-01',
            'name' => 'Kalyan Bullion Merchant',
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

        // Purchase 50g at 92.5% touch without price (rate = 0)
        // Fine weight = 50 * 0.925 = 46.250g pure 24K gold
        $response = $this->postJson('/api/purchase-entries', [
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'supplier_id' => $supplier->id,
            'weight' => 50.000,
            'less_weight' => 0,
            'net_weight' => 50.000,
            'touch' => 92.5,
            'wastage_percent' => 0,
            'fine_weight' => 46.250,
            'rate' => 0,
            'total_amount' => 0,
            'purchase_date' => now()->toDateString(),
        ]);

        $response->assertStatus(201);
        $entryData = $response->json('purchase_entry');
        $this->assertEquals(46.250, (float) $entryData['fine_weight']);
        $this->assertEquals(0, (float) $entryData['total_amount']);

        // Check Supplier Metal Ledger: owed 46.250g in 24K pure gold (negative balance)
        $supplier->refresh();
        $this->assertEquals(-46.250, (float) $supplier->gold_balance_grams);
        $this->assertEquals(0.00, (float) $supplier->current_balance);

        // Check Raw Material Vault: credited 46.250g pure gold
        $rawGold->refresh();
        $this->assertEquals(round($initialBalance + 46.250, 3), (float) $rawGold->current_balance);

        // Test Reversal on Delete
        $delRes = $this->deleteJson('/api/purchase-entries/' . $entryData['id']);
        $delRes->assertStatus(200);

        $supplier->refresh();
        $this->assertEquals(0.000, (float) $supplier->gold_balance_grams);

        $rawGold->refresh();
        $this->assertEquals(round($initialBalance, 3), (float) $rawGold->current_balance);
    }

    /** @test */
    public function karigar_metal_issue_converts_touch_purity_to_24k_pure_gold()
    {
        $karigar = Karigar::create([
            'karigar_code' => 'K-TEST-02',
            'name' => 'Ramesh Goldsmith',
            'phone' => '9876543210',
            'primary_phone' => '9876543210',
            'status' => 'active',
            'current_gold_balance_grams' => 0.000,
        ]);

        // Issue 50g at 90.67% touch
        // Pure gold = 50 * 0.9067 = 45.335g pure 24K
        $res = $this->postJson("/api/karigars/{$karigar->id}/material-action", [
            'action_type' => 'additional_allocation',
            'material_type' => 'gold',
            'weight' => 50.000,
            'purity' => '90.67',
            'reason' => 'Bulk casting issue for Diwali orders',
        ]);

        $res->assertStatus(200);
        $karigar->refresh();
        $this->assertEquals(45.335, (float) $karigar->current_gold_balance_grams);
    }
}
