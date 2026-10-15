<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use Laravel\Sanctum\Sanctum;
use Illuminate\Foundation\Testing\RefreshDatabase;

class FormValidationTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['role' => 'Super Admin']);
        Sanctum::actingAs($this->user);
    }

    /**
     * Test Client Validation Rules
     */
    public function test_client_validation_rejects_invalid_inputs_and_accepts_valid()
    {
        // 1. Invalid mobile (less than 10 digits or contains letters)
        $res = $this->postJson('/api/clients', [
            'full_name' => 'John Doe',
            'primary_phone' => '12345',
            'client_type' => 'Retail',
        ]);
        $res->assertStatus(422)
            ->assertJsonValidationErrors(['primary_phone']);

        // 2. Invalid mobile (does not start with 6-9)
        $res = $this->postJson('/api/clients', [
            'full_name' => 'John Doe',
            'primary_phone' => '5876543210',
            'client_type' => 'Retail',
        ]);
        $res->assertStatus(422)
            ->assertJsonValidationErrors(['primary_phone']);

        // 3. Invalid person name (contains numbers/symbols)
        $res = $this->postJson('/api/clients', [
            'full_name' => 'John123 Doe!',
            'primary_phone' => '9876543210',
            'client_type' => 'Retail',
        ]);
        $res->assertStatus(422)
            ->assertJsonValidationErrors(['full_name']);

        // 4. Invalid PIN code (not 6 digits or starts with 0)
        $res = $this->postJson('/api/clients', [
            'full_name' => 'John Doe',
            'primary_phone' => '9876543210',
            'zip_code' => '012345',
            'client_type' => 'Retail',
        ]);
        $res->assertStatus(422)
            ->assertJsonValidationErrors(['zip_code']);

        // 5. Valid Client creation with phone starting with 9
        $res = $this->postJson('/api/clients', [
            'full_name' => 'Ramesh Kumar',
            'primary_phone' => '9876543210',
            'zip_code' => '600001',
            'client_type' => 'Retail',
            'pan_number' => 'ABCDE1234F',
            'email' => 'ramesh.test@example.com',
        ]);
        $res->assertStatus(201);

        // 6. Valid Client creation with phone starting with 7 (and +91 prefix)
        $res7 = $this->postJson('/api/clients', [
            'full_name' => 'Senthil Nathan',
            'primary_phone' => '+91 7876543210',
            'secondary_phone' => '7234567890',
            'zip_code' => '600002',
            'client_type' => 'Retail',
            'email' => 'senthil.test@example.com',
        ]);
        $res7->assertStatus(201);
        $this->assertEquals('7876543210', $res7->json('data.primary_phone'));
        $this->assertEquals('7234567890', $res7->json('data.secondary_phone'));

        // 7. Valid Client creation with phone starting with 6 and 8
        $res68 = $this->postJson('/api/clients', [
            'full_name' => 'Arun Prakash',
            'primary_phone' => '6987654321',
            'secondary_phone' => '8987654321',
            'zip_code' => '600003',
            'client_type' => 'Retail',
            'email' => 'arun.test@example.com',
        ]);
        $res68->assertStatus(201);
    }

    /**
     * Test Karigar Validation Rules
     */
    public function test_karigar_validation_rejects_invalid_inputs_and_accepts_valid()
    {
        // 1. Invalid phone & Invalid name
        $res = $this->postJson('/api/karigars', [
            'karigar_code' => 'KG-001',
            'name' => 'Karigar 1234',
            'primary_phone' => 'abcd123456',
            'specialization' => 'Gold',
        ]);
        $res->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'primary_phone']);

        // 2. Invalid IFSC code & Aadhar number
        $res = $this->postJson('/api/karigars', [
            'karigar_code' => 'KG-002',
            'name' => 'Suresh Goldsmith',
            'primary_phone' => '9123456789',
            'specialization' => 'Gold',
            'ifsc_code' => 'INVALID_IFSC',
            'aadhar_number' => '1234',
        ]);
        $res->assertStatus(422)
            ->assertJsonValidationErrors(['ifsc_code', 'aadhar_number']);

        // 3. Invalid ZIP / Pincode (letters or wrong length)
        $res = $this->postJson('/api/karigars', [
            'karigar_code' => 'KG-002B',
            'name' => 'Suresh Goldsmith',
            'primary_phone' => '9123456789',
            'specialization' => 'Gold',
            'zip_code' => 'SYUAF768976GY',
        ]);
        $res->assertStatus(422)
            ->assertJsonValidationErrors(['zip_code']);

        // 4. Valid Karigar
        $res = $this->postJson('/api/karigars', [
            'karigar_code' => 'KG-003',
            'name' => 'Suresh Goldsmith',
            'primary_phone' => '9123456789',
            'specialization' => 'Gold',
            'zip_code' => '600079',
            'ifsc_code' => 'SBIN0001234',
            'aadhar_number' => '123456789012',
            'pan_number' => 'ABCDE1234F',
            'bank_account_number' => '123456789012',
        ]);
        $res->assertStatus(201);
    }

    /**
     * Test Supplier Validation Rules
     */
    public function test_supplier_validation_rejects_invalid_inputs_and_accepts_valid()
    {
        // 1. Invalid GSTIN, Phone, and Pincode
        $res = $this->postJson('/api/suppliers', [
            'supplier_code' => 'SUP-001',
            'supplier_type' => 'Bullion',
            'status' => 'active',
            'name' => 'Shree Bullion Traders',
            'phone' => '12345',
            'gstin' => 'INVALIDGST',
            'pincode' => 'SYUAF768976GY',
        ]);
        $res->assertStatus(422)
            ->assertJsonValidationErrors(['phone', 'gstin', 'pincode']);

        // 2. Valid Supplier
        $res = $this->postJson('/api/suppliers', [
            'supplier_code' => 'SUP-002',
            'supplier_type' => 'Bullion',
            'status' => 'active',
            'name' => 'Shree Bullion Traders',
            'phone' => '9876543210',
            'gstin' => '33ABCDE1234F1Z5',
            'pan' => 'ABCDE1234F',
            'ifsc_code' => 'HDFC0001234',
            'bank_account_no' => '12345678901234',
            'pincode' => '641001',
        ]);
        $res->assertStatus(201);
    }

    /**
     * Test User Validation Rules
     */
    public function test_user_validation_rejects_invalid_inputs_and_accepts_valid()
    {
        // 1. Invalid mobile & invalid name
        $res = $this->postJson('/api/users', [
            'name' => 'User123',
            'email' => 'valid.unique.' . time() . '@example.com',
            'mobile_number' => '12345',
            'role' => 'Staff',
            'password' => 'secret123',
        ]);
        $res->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'mobile_number']);

        // 2. Valid User
        $res = $this->postJson('/api/users', [
            'name' => 'Priya Sharma',
            'email' => 'priya.test.' . time() . '@example.com',
            'mobile_number' => '9876543210',
            'role' => 'Staff',
            'password' => 'secret123',
        ]);
        $res->assertStatus(201);
    }

    /**
     * Test Bank Account Validation Rules
     */
    public function test_bank_account_validation_rejects_invalid_inputs_and_accepts_valid()
    {
        // 1. Invalid IFSC & Account Number
        $res = $this->postJson('/api/bank-accounts', [
            'account_name' => 'Current Account',
            'bank_name' => 'State Bank of India',
            'account_number' => '123',
            'ifsc_code' => '12345',
        ]);
        $res->assertStatus(422)
            ->assertJsonValidationErrors(['account_number', 'ifsc_code']);

        // 2. Valid Bank Account
        $res = $this->postJson('/api/bank-accounts', [
            'account_name' => 'Current Account',
            'bank_name' => 'State Bank of India',
            'account_number' => '123456789012',
            'ifsc_code' => 'SBIN0001234',
            'account_type' => 'Current',
            'branch' => 'Main Branch',
        ]);
        $res->assertStatus(201);
    }

    /**
     * Test Company Info Validation Rules
     */
    public function test_company_info_validation_rejects_invalid_inputs_and_accepts_valid()
    {
        // 1. Invalid phone & Invalid Pincode
        $res = $this->postJson('/api/company-info', [
            'company_name' => 'Rudhra Jewellers',
            'phone' => '123',
            'pincode' => '123',
        ]);
        $res->assertStatus(422)
            ->assertJsonValidationErrors(['phone', 'pincode']);

        // 2. Valid Company Info update/create
        $res = $this->postJson('/api/company-info', [
            'company_name' => 'Rudhra Jewellers Pvt Ltd',
            'phone' => '9876543210',
            'pincode' => '600001',
            'gstin' => '33ABCDE1234F1Z5',
            'pan_number' => 'ABCDE1234F',
            'account_number' => '123456789012',
            'ifsc_code' => 'SBIN0001234',
        ]);
        $this->assertTrue(in_array($res->status(), [200, 201]));
    }

    /**
     * Test Purchase Entry with null or omitted stone_weight and charges
     */
    public function test_purchase_entry_saves_with_null_or_omitted_stone_weight_and_charges()
    {
        $supplier = \App\Models\Supplier::create([
            'supplier_code' => 'SUP-PUR-01',
            'supplier_type' => 'Bullion',
            'status' => 'active',
            'name' => 'Apex Bullion',
            'phone' => '9876543210',
        ]);

        $res = $this->postJson('/api/purchase-entries', [
            'supplier_id' => $supplier->id,
            'purchase_type' => 'raw_material',
            'metal_type' => 'gold',
            'purity' => '22K (916)',
            'weight' => 100.5,
            'rate' => 6500,
            'purchase_date' => now()->toDateString(),
            'stone_weight' => null,
            'making_charge' => null,
            'stone_cost' => null,
            'less_weight' => null,
        ]);

        $res->assertStatus(201);
        $this->assertDatabaseHas('purchase_entries', [
            'supplier_id' => $supplier->id,
            'stone_weight' => 0.0,
            'making_charge' => 0.0,
            'stone_cost' => 0.0,
        ]);
    }
}
