<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Client;
use App\Models\Karigar;
use App\Models\Product;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WipColorStoneAndReceiveFlowTest extends TestCase
{
    use RefreshDatabase;

    protected $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::firstOrCreate(
            ['email' => 'admin@rudhra.test'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('password123'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );
    }

    public function test_wip_update_persists_color_stone_ct_and_count_and_flows_to_receiving(): void
    {
        $client = Client::firstOrCreate(
            ['client_code' => 'CL-WIP-01'],
            ['name' => 'Royal Jewellers', 'full_name' => 'Royal Jewellers Pvt Ltd', 'primary_phone' => '9988776655', 'status' => 'active']
        );
        $karigar = Karigar::firstOrCreate(
            ['karigar_code' => 'KRG-WIP-01'],
            ['name' => 'Suresh Goldsmith', 'primary_phone' => '9876543210', 'status' => 'active']
        );
        $category = Category::firstOrCreate(
            ['code' => 'CAT-EAR-01'],
            ['name' => 'Earrings', 'status' => 'active']
        );
        $product = Product::create([
            'name' => 'Ruby Emerald Drop Earring',
            'product_code' => 'RED-001',
            'category' => 'Earrings',
            'category_id' => $category->id,
            'gold_purity' => '91.60',
            'metal_type' => 'Gold (92)',
            'gross_weight' => 12.000,
            'attributes' => [
                'stamp' => '0.85',
                'diamond_count' => 10,
                'dia_wt_ct' => 0.500,
                'stone_weight' => 2.500,
                'stone_count' => 8,
            ],
        ]);

        $order = WorkOrder::create([
            'work_order_number' => 'WO-WIP-CS-101',
            'client_id' => $client->id,
            'karigar_id' => $karigar->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'required_qty' => 1,
            'completed_qty' => 0,
            'allotted_weight' => 10.000,
            'completed_weight' => 0,
            'allotted_date' => now()->toDateString(),
            'current_stage' => 'work_in_progress',
            'status' => 'in_progress',
        ]);

        $item = WorkOrderItem::create([
            'work_order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'design_no' => 'DES-RUBY-01',
            'required_qty' => 1,
            'completed_qty' => 0,
            'allotted_weight' => 10.000,
            'status' => 'in_progress',
        ]);

        // 1. Manager / Supervisor submits WIP completion with Color Stones (ct) and Count (pcs)
        $wipPayload = [
            'work_order_item_id' => $item->id,
            'completed_now' => 1,
            'actual_weight' => 10.000,
            'completed_weight' => 10.000,
            'purity' => 91.60,
            'color_stone_weight' => 2.500, // 2.500 Carats (= 0.500 gm)
            'color_stone_count' => 8,      // 8 pieces of colour stones
            'diamond_weight' => 1.000,     // 1.000 Carat (= 0.200 gm)
            'diamond_count' => 12,         // 12 diamonds
            'silver_weight' => 0.300,      // 0.300 gm silver
            'old_weight' => 0.000,
            'remarks' => 'Setting of rubies completed, moved to QC',
        ];

        $wipRes = $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/wip-update", $wipPayload);
        $wipRes->assertStatus(200);

        // Verify the piece was created/updated in QC pending state with exact colour stone ct and count
        $piece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->first();
        $this->assertNotNull($piece);
        $this->assertEquals(2.500, (float)$piece->color_stone_weight);
        $this->assertEquals(8, (int)$piece->color_stone_count);
        $this->assertEquals(1.000, (float)$piece->diamond_weight);
        $this->assertEquals(12, (int)$piece->diamond_count);
        $this->assertEquals(0.300, (float)$piece->silver_weight);

        // Net gold weight should be: 10.000 - (1.000 * 0.2) - (2.500 * 0.2) - 0.300 = 10.000 - 0.200 - 0.500 - 0.300 = 9.000 gm
        $this->assertEquals(9.000, (float)$piece->net_gold_weight);

        // Verify qc_submission_data snapshot
        $this->assertEquals(2.500, (float)$piece->qc_submission_data['color_stone_weight']);
        $this->assertEquals(8, (int)$piece->qc_submission_data['color_stone_count']);

        // 2. QC inspects and approves the piece
        $qcRes = $this->actingAs($this->user)->postJson("/api/work-orders/{$order->id}/qc-action", [
            'action' => 'pass',
            'piece_id' => $piece->id,
            'work_order_item_id' => $item->id,
            'approved_qty' => 1,
            'notes' => 'QC Passed: stone setting and finish inspected',
        ]);
        $qcRes->assertStatus(200);

        $piece->refresh();
        $this->assertEquals('passed', $piece->qc_status);
        $this->assertEquals('ready', $piece->status);

        // 3. Receive Work Order loads prefill data
        $recvDataRes = $this->actingAs($this->user)->getJson("/api/work-orders/{$order->id}/receiving-data?piece_id={$piece->id}");
        $recvDataRes->assertStatus(200);

        $prefilled = $recvDataRes->json('data.prefilled');
        $this->assertNotNull($prefilled);
        $this->assertEquals(2.500, (float)$prefilled['color_stone_weight']);
        $this->assertEquals(8, (int)$prefilled['color_stone_count']);
        $this->assertEquals(1.000, (float)$prefilled['diamond_weight']);
        $this->assertEquals(12, (int)$prefilled['diamond_count']);
        $this->assertEquals(9.000, (float)$prefilled['net_gold_weight']);

        // 4. Also verify ready-pieces API list includes color_stone_weight and color_stone_count
        $readyRes = $this->actingAs($this->user)->getJson("/api/work-orders/ready-pieces?work_order_id={$order->id}");
        $readyRes->assertStatus(200);
        $readyPieceItem = collect($readyRes->json('data'))->firstWhere('id', $piece->id);
        $this->assertNotNull($readyPieceItem);
        $this->assertEquals(2.500, (float)$readyPieceItem['color_stone_weight']);
        $this->assertEquals(8, (int)$readyPieceItem['color_stone_count']);
    }
}
