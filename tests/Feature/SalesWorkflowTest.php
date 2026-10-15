<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Client;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SalesWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_sale_creation_updates_inventory_and_payment_can_settle_balance(): void
    {
        $user = User::factory()->create(['role' => 'Super Admin']);
        Sanctum::actingAs($user);
        $category = Category::create(['name' => 'Gold', 'code' => 'GLD']);
        $client = Client::create(['client_code' => 'CL-TEST-01', 'full_name' => 'Test Customer', 'primary_phone' => '9000000001', 'membership_tier' => 'silver', 'status' => 'active']);
        $product = Product::create([
            'category_id' => $category->id,
            'name' => 'Test Necklace',
            'product_code' => 'TEST-NECK-01',
            'attributes' => ['sale_rate' => 1000],
            'status' => 'active',
            'current_stock_qty' => 2,
            'opening_stock_rate' => 600,
        ]);

        $response = $this->postJson('/api/sales', [
            'client_id' => $client->id,
            'gst_rate' => 0,
            'paid_amount' => 500,
            'payment_method' => 'cash',
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 1,
                'rate' => 1000,
                'gross_weight' => 5,
            ]],
        ]);

        $response->assertCreated()->assertJsonPath('data.status', 'partial');
        $invoiceId = $response->json('data.id');
        $this->assertDatabaseHas('invoices', ['id' => $invoiceId, 'paid_amount' => 500, 'due_amount' => 500, 'status' => 'partial']);
        $this->assertDatabaseHas('sale_items', ['invoice_id' => $invoiceId, 'product_id' => $product->id]);
        $this->assertDatabaseHas('sale_payments', ['invoice_id' => $invoiceId, 'amount' => 500]);
        $this->assertDatabaseHas('inventory_movements', ['invoice_id' => $invoiceId, 'product_id' => $product->id, 'movement_type' => 'sale']);
        $this->assertSame(1, Product::find($product->id)->current_stock_qty);

        $payment = $this->postJson("/api/sales/{$invoiceId}/payments", ['amount' => 500, 'payment_method' => 'upi']);
        $payment->assertOk()->assertJsonPath('data.status', 'paid');
        $this->assertDatabaseHas('invoices', ['id' => $invoiceId, 'paid_amount' => 1000, 'due_amount' => 0, 'status' => 'paid']);
        $this->assertDatabaseCount('sale_payments', 2);
    }

    public function test_customer_report_returns_zeroes_when_no_sales_exist(): void
    {
        $user = User::factory()->create(['role' => 'Super Admin']);
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/sales/customer-report');
        $response->assertOk();

        $data = $response->json();
        $this->assertEmpty($data['rows']['data']);
        $this->assertEmpty($data['trend']);
        $this->assertSame(0.0, (float) $data['summary']['sales']);
        $this->assertSame(0.0, (float) $data['summary']['gold_weight']);
        $this->assertSame(0.0, (float) $data['summary']['diamond_weight']);
        $this->assertSame(0.0, (float) $data['summary']['quantity']);
        $this->assertSame(0, (int) $data['summary']['invoices']);
        $this->assertSame(0.0, (float) $data['invoice_summary']['grand_total']);
    }

    public function test_customer_report_accurately_aggregates_sales_and_trend(): void
    {
        $user = User::factory()->create(['role' => 'Super Admin']);
        Sanctum::actingAs($user);

        $category = Category::create(['name' => 'Gold', 'code' => 'GLD2']);
        $client = Client::create(['client_code' => 'CL-TEST-02', 'full_name' => 'Gold Buyer', 'primary_phone' => '9000000002', 'status' => 'active']);
        $product = Product::create([
            'category_id' => $category->id,
            'name' => 'Gold Bangle',
            'product_code' => 'TEST-BAN-01',
            'status' => 'active',
            'current_stock_qty' => 5,
        ]);

        $this->postJson('/api/sales', [
            'client_id' => $client->id,
            'gst_rate' => 3,
            'paid_amount' => 10300,
            'payment_method' => 'bank_transfer',
            'items' => [[
                'product_id' => $product->id,
                'quantity' => 2,
                'rate' => 5000,
                'gross_weight' => 15.5,
                'net_weight' => 15.0,
            ]],
        ])->assertCreated();

        $response = $this->getJson('/api/sales/customer-report');
        $response->assertOk();

        $data = $response->json();
        $this->assertCount(1, $data['rows']['data']);
        $this->assertSame('Gold Buyer', $data['rows']['data'][0]['client_name']);
        $this->assertSame(2.0, (float) $data['rows']['data'][0]['quantity']);
        $this->assertSame(15.5, (float) $data['rows']['data'][0]['gold_weight']);
        $this->assertNotEmpty($data['trend']);
        $this->assertSame(2.0, (float) $data['trend'][0]['quantity']);
        $this->assertSame(15.5, (float) $data['trend'][0]['gold_weight']);
    }
}
