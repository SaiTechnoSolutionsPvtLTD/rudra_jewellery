<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\InventoryMovement;
use App\Models\JobOrder;
use App\Models\Karigar;
use App\Models\MaterialOpeningStock;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\Stamp;
use App\Models\User;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ReceiveCompletionImageAndOpeningStockTest extends TestCase
{
    use RefreshDatabase;

    protected User $adminUser;

    protected function setUp(): void
    {
        parent::setUp();

        $this->adminUser = User::factory()->create([
            'role' => 'admin',
        ]);
    }

    /**
     * Test 1: Receive piece accepts completion image and persists image_path on WorkOrderReceivedPiece.
     */
    public function test_receive_piece_persists_completion_image_and_metadata()
    {
        Storage::fake('public');

        $unique = uniqid();
        $karigar = Karigar::create([
            'name' => "Karigar {$unique}",
            'karigar_code' => "KG-{$unique}",
            'primary_phone' => '9999999999',
            'status' => 'active',
        ]);

        $category = Category::create(['name' => "Rings {$unique}", 'code' => "RNG-{$unique}"]);
        $product = Product::create([
            'name' => "Gold Diamond Ring {$unique}",
            'product_code' => "PRD-{$unique}",
            'category_id' => $category->id,
            'current_stock_qty' => 1,
        ]);

        $order = WorkOrder::create([
            'work_order_number' => "WO-{$unique}",
            'product_name' => "Gold Diamond Ring {$unique}",
            'karigar_id' => $karigar->id,
            'allotted_date' => '2026-10-12',
            'allotted_weight' => 20.000,
            'required_qty' => 1,
            'ready_qty' => 1,
            'status' => 'in_progress',
            'current_stage' => 'wip',
        ]);

        $item = WorkOrderItem::create([
            'work_order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'design_no' => 'DES-101',
            'quantity' => 1,
            'allotted_weight' => 20.000,
            'gold_weight' => 18.000,
            'diamond_weight' => 2.000,
            'status' => 'in_progress',
        ]);

        // Upload fake image file
        $file = UploadedFile::fake()->image('completed_product.jpg', 600, 600);

        $response = $this->actingAs($this->adminUser)->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'work_order_item_id' => $item->id,
            'gross_weight' => 19.850,
            'net_gold_weight' => 17.850,
            'diamond_weight' => 2.000,
            'diamond_count' => 4,
            'purity' => 91.6,
            'image' => $file,
        ]);

        $response->assertStatus(200);
        $this->assertTrue($response->json('status') === 'success');

        $piece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->first();
        $this->assertNotNull($piece);
        $this->assertNotNull($piece->image_path);
        $this->assertStringContainsString('work_orders/', $piece->image_path);

        // Verify reopening record via /pieces API includes image_path
        $dataRes = $this->actingAs($this->adminUser)->getJson("/api/work-orders/{$order->id}/pieces");
        $dataRes->assertStatus(200);
        $pieces = $dataRes->json('data') ?? [];
        $this->assertNotEmpty($pieces);
        $this->assertEquals($piece->image_path, $pieces[0]['image_path']);
    }

    /**
     * Test 2: Weight and Stone Summary calculations for Work Order receiving.
     */
    public function test_receiving_weight_and_stone_summary_calculation()
    {
        $unique = uniqid();
        $order = WorkOrder::create([
            'work_order_number' => "WO-{$unique}",
            'product_name' => "Temple Necklace {$unique}",
            'allotted_date' => '2026-10-12',
            'allotted_weight' => 50.000,
            'required_qty' => 2,
            'total_dia_pcs' => 12,
            'total_color_stones_pcs' => 8,
            'status' => 'in_progress',
            'current_stage' => 'wip',
        ]);

        $item = WorkOrderItem::create([
            'work_order_id' => $order->id,
            'product_name' => "Temple Necklace {$unique}",
            'design_no' => 'DES-102',
            'quantity' => 2,
            'allotted_weight' => 50.000,
            'stone_details' => [
                'total_dia_pcs' => 12,
                'total_color_stones_pcs' => 8,
            ],
            'status' => 'in_progress',
        ]);

        // Receive piece 1 (partial receiving)
        WorkOrderReceivedPiece::create([
            'work_order_id' => $order->id,
            'work_order_item_id' => $item->id,
            'design_no' => 'DES-102',
            'piece_number' => 1,
            'gross_weight' => 24.500,
            'net_gold_weight' => 22.000,
            'diamond_count' => 6,
            'color_stone_count' => 4,
            'status' => 'received',
            'received_at' => now(),
        ]);

        $res = $this->actingAs($this->adminUser)->getJson("/api/work-orders/{$order->id}");
        $res->assertStatus(200);

        $orderData = $res->json('data');
        $this->assertNotNull($orderData);
        $this->assertEquals(50.000, (float)$orderData['allotted_weight']);

        $items = $orderData['items'] ?? [];
        $this->assertNotEmpty($items);
        $stoneDetails = is_string($items[0]['stone_details']) ? json_decode($items[0]['stone_details'], true) : $items[0]['stone_details'];
        $this->assertEquals(20, (int)($stoneDetails['total_dia_pcs'] + $stoneDetails['total_color_stones_pcs']));

        $pieces = $orderData['received_pieces'] ?? [];
        $this->assertCount(1, $pieces);
        $this->assertEquals(24.500, (float)$pieces[0]['gross_weight']);
        $this->assertEquals(10, (int)($pieces[0]['diamond_count'] + $pieces[0]['color_stone_count']));
    }

    /**
     * Test 3: Opening Stock creation, raw material balance increment, and inventory movement.
     */
    public function test_material_opening_stock_creation_and_inventory_balance_update()
    {
        $unique = uniqid();
        $rawGold = RawMaterial::where('material_type', 'gold')->first();
        if (!$rawGold) {
            $rawGold = RawMaterial::create([
                'material_type' => 'gold',
                'name' => 'Raw Gold 24K',
                'current_balance' => 0.0,
                'purchased_weight' => 0.0,
                'allocated_weight' => 0.0,
                'opening_weight' => 0.0,
                'unit' => 'g',
            ]);
        } else {
            $rawGold->update([
                'unit' => 'g',
                'current_balance' => 0.0,
                'opening_weight' => 0.0,
                'purchased_weight' => 0.0,
                'allocated_weight' => 0.0,
            ]);
        }

        $response = $this->actingAs($this->adminUser)->postJson('/api/material-opening-stocks', [
            'material_type' => 'gold',
            'stamp' => '916',
            'karat' => '22K',
            'purity' => 91.6,
            'unit' => 'g',
            'weight' => 100.000,
            'rate' => 7000.00,
            'entry_date' => '2026-10-12',
            'notes' => "Opening gold stock {$unique}",
        ]);

        $response->assertStatus(201);
        $this->assertTrue($response->json('status') === 'success');

        $openingStock = MaterialOpeningStock::where('notes', "Opening gold stock {$unique}")->first();
        $this->assertNotNull($openingStock);
        $this->assertEquals(100.000, (float)$openingStock->weight);

        // Check RawMaterial stock balance
        $rawGold->refresh();
        $this->assertEquals(100.000, (float)$rawGold->opening_weight);
        $this->assertEquals(100.000, (float)$rawGold->current_balance);

        // Check InventoryMovement
        $movement = InventoryMovement::where('material_opening_stock_id', $openingStock->id)->first();
        $this->assertNotNull($movement);
        $this->assertEquals('opening_stock', $movement->movement_type);
        $this->assertEquals(100.000, (float)$movement->weight);
    }

    /**
     * Test 4: Diamond Opening Stock and Unified Stock API with Diamond by Stamp breakdown.
     */
    public function test_diamond_opening_stock_and_unified_stock_by_stamp()
    {
        $rawDia = RawMaterial::where('material_type', 'diamond')->first();
        if (!$rawDia) {
            $rawDia = RawMaterial::create([
                'material_type' => 'diamond',
                'name' => 'Raw Diamonds Vault',
                'current_balance' => 0.0,
                'purchased_weight' => 0.0,
                'allocated_weight' => 0.0,
                'opening_weight' => 0.0,
                'opening_count' => 0.0,
                'current_count' => 0.0,
                'unit' => 'ct',
            ]);
        } else {
            $rawDia->update([
                'unit' => 'ct',
                'current_balance' => 0.0,
                'purchased_weight' => 0.0,
                'allocated_weight' => 0.0,
                'opening_weight' => 0.0,
                'opening_count' => 0.0,
                'current_count' => 0.0,
            ]);
        }

        // Add Stamp master
        Stamp::firstOrCreate(['name' => '+7'], [
            'code' => 'D-PLUS7',
            'applicable_for' => 'Diamond',
        ]);

        // Post diamond opening stock
        $res = $this->actingAs($this->adminUser)->postJson('/api/material-opening-stocks', [
            'material_type' => 'diamond',
            'stamp' => '+7',
            'unit' => 'ct',
            'carat_weight' => 5.250,
            'quantity' => 30,
            'rate' => 50000.00,
            'entry_date' => '2026-10-12',
            'notes' => 'Starting diamond stock for +7 grade',
        ]);
        $res->assertStatus(201);

        // Check Unified Stock API
        $unifiedRes = $this->actingAs($this->adminUser)->getJson('/api/raw-materials/unified-stock');
        $unifiedRes->assertStatus(200);
        $this->assertTrue($unifiedRes->json('status') === 'success');

        $summary = $unifiedRes->json('summary');
        $this->assertEquals(5.250, (float)$summary['diamond_total_carats']);
        $this->assertEquals(30, (int)$summary['diamond_total_count']);

        $byStamp = collect($unifiedRes->json('diamond_by_stamp'));
        $plusSevenRow = $byStamp->firstWhere('stamp', '+7');
        $this->assertNotNull($plusSevenRow);
        $this->assertEquals(5.250, (float)$plusSevenRow['available_carats']);
        $this->assertEquals(30, (int)$plusSevenRow['available_count']);
    }

    /**
     * Test 5: Dashboard reflects authoritative Total Diamond Carats and Diamond Stamps Breakdown.
     */
    public function test_dashboard_authoritative_total_diamond_carats()
    {
        $dashRes = $this->actingAs($this->adminUser)->getJson('/api/dashboard?refresh=1');
        $dashRes->assertStatus(200);

        $summary = $dashRes->json('summary');
        $this->assertArrayHasKey('totalDiamondCarats', $summary);
        $this->assertArrayHasKey('totalDiamondCaratsFormatted', $summary);
        $this->assertArrayHasKey('totalDiamondCount', $summary);
        $this->assertArrayHasKey('diamondStampsBreakdown', $summary);
        $this->assertIsArray($summary['diamondStampsBreakdown']);
    }

    /**
     * Test 6: Opening stock deletion/reversal cleanly deducts balance and movements.
     */
    public function test_opening_stock_reversal()
    {
        $rawSilver = RawMaterial::where('material_type', 'silver')->first();
        if (!$rawSilver) {
            $rawSilver = RawMaterial::create([
                'material_type' => 'silver',
                'name' => 'Raw Silver 925',
                'current_balance' => 0.0,
                'purchased_weight' => 0.0,
                'allocated_weight' => 0.0,
                'opening_weight' => 0.0,
                'unit' => 'g',
            ]);
        } else {
            $rawSilver->update([
                'unit' => 'g',
                'current_balance' => 0.0,
                'purchased_weight' => 0.0,
                'allocated_weight' => 0.0,
                'opening_weight' => 0.0,
            ]);
        }

        $res = $this->actingAs($this->adminUser)->postJson('/api/material-opening-stocks', [
            'material_type' => 'silver',
            'stamp' => '925',
            'unit' => 'g',
            'weight' => 500.000,
            'entry_date' => '2026-10-12',
        ]);
        $res->assertStatus(201);
        $stockId = $res->json('data.id');

        $rawSilver->refresh();
        $this->assertEquals(500.000, (float)$rawSilver->current_balance);

        // Reverse
        $delRes = $this->actingAs($this->adminUser)->deleteJson("/api/material-opening-stocks/{$stockId}");
        $delRes->assertStatus(200);

        $rawSilver->refresh();
        $this->assertEquals(0.0, (float)$rawSilver->current_balance);
        $this->assertDatabaseMissing('material_opening_stocks', ['id' => $stockId]);
        $this->assertDatabaseMissing('inventory_movements', ['material_opening_stock_id' => $stockId]);
    }
}
