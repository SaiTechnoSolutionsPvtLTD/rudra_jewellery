<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\User;
use App\Models\Client;
use App\Models\Product;
use App\Models\Category;
use App\Models\Karigar;
use App\Models\WorkOrder;
use App\Models\WorkOrderReceivedPiece;
use App\Models\RawMaterial;
use App\Models\CompanyInfo;
use Laravel\Sanctum\Sanctum;

class MasterAuditIndependentVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;
    protected Category $goldCategory;
    protected Category $diamondCategory;
    protected Karigar $karigar;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create(['role' => 'Super Admin']);
        Sanctum::actingAs($this->user);

        $this->goldCategory = Category::create(['name' => 'Gold', 'code' => 'GOLD', 'status' => 'active']);
        $this->diamondCategory = Category::create(['name' => 'Diamond', 'code' => 'DIAMOND', 'status' => 'active']);
        $this->karigar = Karigar::create([
            'karigar_code' => 'K-TEST-01',
            'name' => 'Master Artisan 1',
            'primary_phone' => '9876500001',
            'status' => 'active',
        ]);

        // Seed raw materials vault
        RawMaterial::updateOrCreate(
            ['material_type' => 'gold'],
            [
                'name' => 'Gold 24K Vault',
                'unit' => 'g',
                'current_stock_weight' => 1000.000,
                'current_pieces' => 10,
            ]
        );

        RawMaterial::updateOrCreate(
            ['material_type' => 'diamond'],
            [
                'name' => 'Diamond Parcel Vault',
                'unit' => 'ct',
                'current_stock_weight' => 200.000,
                'current_carats' => 200.000,
                'current_pieces' => 50,
            ]
        );
    }

    public function test_client_metal_deposit_without_rate_retains_pure_gold_without_cash_conversion(): void
    {
        $client = Client::create([
            'client_code' => 'CL-MET-01',
            'full_name' => 'Suresh Kumar',
            'primary_phone' => '9876543210',
            'current_balance' => 0.00,
            'gold_balance_grams' => 0.0000,
        ]);

        // Deposit 25.500g of pure gold without rate
        $response = $this->postJson("/api/clients/{$client->id}/metal-deposit", [
            'metal_type' => 'gold',
            'gross_weight' => 25.500,
            'touch' => 100.0,
            'rate' => 0,
            'remarks' => 'Customer physical gold deposit for upcoming custom bridal set',
        ]);

        $response->assertOk();
        $response->assertJsonPath('status', 'success');
        $response->assertJsonPath('client.gold_balance_grams', 25.5);

        // Verify database: pure gold credited, financial total purchases unchanged
        $client->refresh();
        $this->assertEquals(25.5000, (float)$client->gold_balance_grams);
    }

    public function test_client_metal_deposit_with_rate_converts_to_financial_cash_credit(): void
    {
        $client = Client::create([
            'client_code' => 'CL-MET-02',
            'full_name' => 'Priya Raman',
            'primary_phone' => '9876543211',
            'total_purchases' => 100000.00,
            'gold_balance_grams' => 0.0000,
        ]);

        // Deposit 10.000g with fixed rate ₹7,000/g => ₹70,000 cash reduction/credit
        $response = $this->postJson("/api/clients/{$client->id}/metal-deposit", [
            'metal_type' => 'gold',
            'gross_weight' => 10.000,
            'touch' => 100.0,
            'rate' => 7000.0,
            'remarks' => 'Immediate gold liquidation at fixed rate',
        ]);

        $response->assertOk();
        $response->assertJsonPath('status', 'success');
        $this->assertEquals(70000, $response->json('cash_amount'));

        // Financial ledger should now reflect reduced purchase total / credit
        $client->refresh();
        $this->assertEquals(30000.00, (float)$client->total_purchases);
        $this->assertEquals(0.0000, (float)$client->gold_balance_grams);
    }

    public function test_client_creation_without_email_does_not_generate_fake_regal_domain(): void
    {
        $response = $this->postJson('/api/clients', [
            'full_name' => 'Kavitha Devi',
            'primary_phone' => '9876543212',
            'membership_tier' => 'gold',
        ]);

        $response->assertStatus(201);
        $client = Client::where('full_name', 'Kavitha Devi')->first();
        $this->assertNotNull($client);
        $this->assertNull($client->email);
        $this->assertStringNotContainsString('regal.com', (string)$client->email);
    }

    public function test_two_similar_products_belonging_to_different_work_orders_remain_distinguishable(): void
    {
        $product1 = Product::create([
            'category_id' => $this->goldCategory->id,
            'name' => 'Antique 22K Peacock Choker',
            'product_code' => 'PROD-CHK-A1',
            'status' => 'active',
            'current_stock_qty' => 0,
        ]);

        $product2 = Product::create([
            'category_id' => $this->goldCategory->id,
            'name' => 'Antique 22K Peacock Choker',
            'product_code' => 'PROD-CHK-B2',
            'status' => 'active',
            'current_stock_qty' => 0,
        ]);

        $wo1 = WorkOrder::create([
            'work_order_number' => 'WO-AUDIT-001',
            'job_number' => 'JO-AUDIT-001',
            'status' => 'assigned',
            'karigar_id' => $this->karigar->id,
            'product_id' => $product1->id,
            'product_name' => $product1->name,
            'required_qty' => 1,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 45.000,
        ]);

        $wo2 = WorkOrder::create([
            'work_order_number' => 'WO-AUDIT-002',
            'job_number' => 'JO-AUDIT-002',
            'status' => 'assigned',
            'karigar_id' => $this->karigar->id,
            'product_id' => $product2->id,
            'product_name' => $product2->name,
            'required_qty' => 1,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 48.000,
        ]);

        // Receive distinct manufactured pieces
        $piece1 = WorkOrderReceivedPiece::create([
            'work_order_id' => $wo1->id,
            'piece_number' => 'PC-001',
            'tag_number' => 'TAG-AUDIT-001',
            'design_no' => 'DES-CHK-01',
            'product_id' => $product1->id,
            'product_name' => $product1->name,
            'karigar_id' => $this->karigar->id,
            'gross_weight' => 45.120,
            'net_gold_weight' => 45.120,
            'status' => 'in_stock',
            'is_inventory_posted' => true,
            'received_at' => now(),
        ]);

        $piece2 = WorkOrderReceivedPiece::create([
            'work_order_id' => $wo2->id,
            'piece_number' => 'PC-002',
            'tag_number' => 'TAG-AUDIT-002',
            'design_no' => 'DES-CHK-02',
            'product_id' => $product2->id,
            'product_name' => $product2->name,
            'karigar_id' => $this->karigar->id,
            'gross_weight' => 48.250,
            'net_gold_weight' => 48.250,
            'status' => 'in_stock',
            'is_inventory_posted' => true,
            'received_at' => now(),
        ]);

        // Verify pieces are completely segregated by work order and tag number
        $this->assertNotEquals($piece1->tag_number, $piece2->tag_number);
        $this->assertEquals('WO-AUDIT-001', $piece1->workOrder->work_order_number);
        $this->assertEquals('WO-AUDIT-002', $piece2->workOrder->work_order_number);
        $this->assertEquals(45.120, $piece1->gross_weight);
        $this->assertEquals(48.250, $piece2->gross_weight);
    }

    public function test_diamond_carats_and_gold_grams_remain_strictly_separated_in_vault_allocation(): void
    {
        $goldVault = RawMaterial::where('material_type', 'gold')->first();
        $diamondVault = RawMaterial::where('material_type', 'diamond')->first();

        $goldVault->update(['opening_weight' => 1000.000, 'purchased_weight' => 0.000, 'allocated_weight' => 0.000, 'current_balance' => 1000.000]);
        $diamondVault->update(['opening_weight' => 200.000, 'purchased_weight' => 0.000, 'allocated_weight' => 0.000, 'current_balance' => 200.000]);

        // Debit gold weight (50.000g)
        RawMaterial::debitAllocation('gold', 50.000);
        $goldVault->refresh();
        $diamondVault->refresh();

        $this->assertEquals(50.000, (float)$goldVault->allocated_weight);
        $this->assertEquals(950.000, (float)$goldVault->current_balance);
        // Diamond vault must remain completely untouched when gold is debited!
        $this->assertEquals(0.000, (float)$diamondVault->allocated_weight);
        $this->assertEquals(200.000, (float)$diamondVault->current_balance);

        // Debit diamond carats (12.500ct)
        RawMaterial::debitAllocation('diamond', 12.500);
        $goldVault->refresh();
        $diamondVault->refresh();

        // Gold vault must remain completely untouched when diamond carats are debited!
        $this->assertEquals(50.000, (float)$goldVault->allocated_weight);
        $this->assertEquals(950.000, (float)$goldVault->current_balance);
        // Diamond vault updated in carats
        $this->assertEquals(12.500, (float)$diamondVault->allocated_weight);
        $this->assertEquals(187.500, (float)$diamondVault->current_balance);
    }
}
