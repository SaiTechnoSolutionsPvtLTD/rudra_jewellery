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
}
