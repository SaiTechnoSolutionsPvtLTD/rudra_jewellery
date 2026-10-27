<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Client;
use App\Models\Karigar;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TagMultiDiamondVariantsTest extends TestCase
{
    use RefreshDatabase;

    public function test_tag_retrieval_includes_multi_variant_diamonds_and_gold_materials()
    {
        $user = User::firstOrCreate(
            ['email' => 'admin@rudhra.test'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('password123'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );

        $karigar = Karigar::firstOrCreate(
            ['name' => 'Suresh Achari'],
            ['karigar_code' => 'KRG-SUR-01', 'primary_phone' => '9876543210', 'status' => 'active']
        );

        $client = Client::firstOrCreate(
            ['client_code' => 'CL-TAG-01'],
            ['name' => 'Royal Jewellers', 'full_name' => 'Royal Jewellers Pvt Ltd', 'primary_phone' => '9988776655', 'status' => 'active']
        );

        $category = Category::firstOrCreate(
            ['name' => 'Gold Bangles'],
            ['code' => 'BGL-01', 'status' => 'active']
        );

        $workOrder = WorkOrder::create([
            'work_order_number' => 'WO-TEST-MULTI-DIA',
            'product_name' => 'Royal Multi Diamond Ring',
            'category_id' => $category->id,
            'client_id' => $client->id,
            'karigar_id' => $karigar->id,
            'allotted_weight' => 25.0,
            'required_qty' => 1,
            'completed_qty' => 1,
            'qc_approved_qty' => 1,
            'ready_qty' => 1,
            'received_qty' => 0,
            'status' => 'ready',
            'current_stage' => 'ready',
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'metal_type' => 'gold',
            'purity' => '91.60',
            'karat' => '22K',
            'design_code' => 'DES-MULTI-DIA',
        ]);

        $item = WorkOrderItem::create([
            'work_order_id' => $workOrder->id,
            'item_code' => 'ITEM-MULTI-1',
            'design_no' => 'DES-MULTI-DIA',
            'design_code' => 'DES-MULTI-DIA',
            'product_name' => 'Royal Multi Diamond Ring',
            'required_qty' => 1,
            'completed_qty' => 1,
            'ready_qty' => 1,
            'received_qty' => 0,
        ]);

        $sieves = [
            ['stamp' => '+3', 'count' => 4, 'weight' => 0.9],
            ['stamp' => '+5', 'count' => 2, 'weight' => 0.45],
            ['stamp' => '+7', 'count' => 10, 'weight' => 1.1],
            ['stamp' => '+8', 'count' => 1, 'weight' => 0.15],
            ['stamp' => '+10', 'count' => 3, 'weight' => 0.3],
        ];

        // Total diamonds: 4+2+10+1+3 = 20 pcs
        // Total carats: 0.9 + 0.45 + 1.1 + 0.15 + 0.3 = 2.90 ct

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/work-orders/{$workOrder->id}/receive-piece", [
            'work_order_item_id' => $item->id,
            'gross_weight' => 15.500,
            'net_gold_weight' => 14.800,
            'old_weight' => 2.000,
            'purity' => 91.60,
            'gold_karat' => '22K',
            'silver_weight' => 0.120,
            'diamond_weight' => 2.90,
            'diamond_count' => 20,
            'diamond_sieves' => $sieves,
            'wastage_weight' => 0.450,
            'karigar_gold_weight' => 0.300,
            'returned_gold_weight' => 0.700,
            'making_charge_type' => 'per_gram',
            'making_charge_per_gram' => 450,
            'total_making_charge' => 6660,
        ]);

        $response->assertStatus(200);

        $tagsRes = $this->actingAs($user, 'sanctum')->getJson('/api/work-orders/tags');
        $tagsRes->assertStatus(200);

        $data = $tagsRes->json('data');
        $this->assertNotEmpty($data);

        $tag = collect($data)->firstWhere('design_no', 'DES-MULTI-DIA');
        $this->assertNotNull($tag);
        $this->assertCount(5, $tag['diamond_sieves']);
        $this->assertEquals(0.45, (float)$tag['wastage_weight']);
        $this->assertEquals(0.30, (float)$tag['karigar_gold_weight']);
        $this->assertEquals(0.70, (float)$tag['returned_gold_weight']);
        $this->assertEquals(2.9, (float)$tag['diamond_weight']);
        $this->assertEquals(20, (int)$tag['diamond_count']);
    }
}
