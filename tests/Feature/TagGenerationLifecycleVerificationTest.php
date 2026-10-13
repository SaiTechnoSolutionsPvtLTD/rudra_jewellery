<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Karigar;
use App\Models\Client;
use App\Models\Product;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use App\Models\InventoryMovement;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TagGenerationLifecycleVerificationTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $karigar;
    protected $client;
    protected $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::firstOrCreate(
            ['email' => 'admin@rudhra.test'],
            [
                'name' => 'Admin User',
                'password' => bcrypt('password123'),
                'role' => 'admin',
                'status' => 'active',
            ]
        );

        $this->karigar = Karigar::firstOrCreate(
            ['name' => 'Suresh Achari'],
            [
                'karigar_code' => 'KRG-SUR-01',
                'primary_phone' => '9876543210',
                'status' => 'active',
            ]
        );

        $this->client = Client::firstOrCreate(
            ['client_code' => 'CL-TAG-01'],
            [
                'name' => 'Royal Jewellers',
                'full_name' => 'Royal Jewellers Pvt Ltd',
                'primary_phone' => '9988776655',
                'status' => 'active',
            ]
        );

        $this->category = \App\Models\Category::firstOrCreate(
            ['name' => 'Gold Bangles'],
            ['code' => 'BGL-01', 'status' => 'active']
        );
    }

    private function createReadyWorkOrder($num = 'WO-TAG-001', $qty = 1, $design = 'DES-BGL-100')
    {
        $order = WorkOrder::create([
            'work_order_number' => $num,
            'product_name' => '22K Gold Antique Bangle',
            'category_id' => $this->category->id,
            'client_id' => $this->client->id,
            'karigar_id' => $this->karigar->id,
            'allotted_weight' => 25.000 * $qty,
            'required_qty' => $qty,
            'completed_qty' => $qty,
            'qc_approved_qty' => $qty,
            'ready_qty' => $qty,
            'received_qty' => 0,
            'status' => 'ready',
            'current_stage' => 'ready',
            'allotted_date' => now()->toDateString(),
            'delivery_date' => now()->addDays(7)->toDateString(),
            'metal_type' => 'gold',
            'purity' => '91.60',
            'karat' => '22K',
            'design_code' => $design,
        ]);

        $item = WorkOrderItem::create([
            'work_order_id' => $order->id,
            'item_code' => "ITEM-{$num}-1",
            'design_no' => $design,
            'design_code' => $design,
            'product_name' => '22K Gold Antique Bangle',
            'required_qty' => $qty,
            'completed_qty' => $qty,
            'ready_qty' => $qty,
            'received_qty' => 0,
        ]);

        return [$order, $item];
    }

    /**
     * Scenario 1 & 9: Receive a product and generate its tag: both sections show pending ('-')
     */
    public function test_scenario_1_and_9_receiving_generates_tag_with_pending_status()
    {
        [$order, $item] = $this->createReadyWorkOrder('WO-TEST-REC-1', 1, 'DES-101');

        $response = $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'work_order_item_id' => $item->id,
            'gross_weight' => 24.500,
            'net_gold_weight' => 24.500,
            'purity' => 91.60,
            'gold_karat' => '22K',
            'pure_24k_weight' => 22.442,
        ]);

        $response->assertStatus(200);
        $tagNumber = $response->json('tag_number');
        $this->assertNotEmpty($tagNumber);

        // Verify the database record
        $piece = WorkOrderReceivedPiece::where('tag_number', $tagNumber)->first();
        $this->assertNotNull($piece);
        $this->assertEquals('pending', $piece->certification_status);
        $this->assertNull($piece->certificate_no);
        $this->assertEquals('pending', $piece->hallmarking_status);
        $this->assertNull($piece->huid);

        // Fetch via tags API (used by Tag Generation table)
        $tagsRes = $this->actingAs($this->admin)->getJson('/api/work-orders/tags?tag_number=' . $tagNumber);
        $tagsRes->assertStatus(200);
        $tagsData = $tagsRes->json('data');
        $this->assertCount(1, $tagsData);

        $tagRow = $tagsData[0];
        $this->assertEquals('pending', $tagRow['certification_status']);
        $this->assertNull($tagRow['certificate_no']);
        $this->assertEquals('pending', $tagRow['hallmarking_status']);
        $this->assertNull($tagRow['huid']);
    }

    /**
     * Scenario 2: Complete Certification: certification data appears; Hallmarking remains pending ('-')
     */
    public function test_scenario_2_complete_certification_leaves_hallmarking_pending()
    {
        [$order, $item] = $this->createReadyWorkOrder('WO-TEST-REC-2', 1, 'DES-102');

        $recRes = $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'work_order_item_id' => $item->id,
            'gross_weight' => 18.200,
            'net_gold_weight' => 18.200,
            'purity' => 91.60,
        ]);
        $tagNumber = $recRes->json('tag_number');

        // Complete Certification
        $certRes = $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/update-certification", [
            'action' => 'add',
            'certification_no' => 'GIA-2026-998877',
            'certification_agency' => 'GIA - Gemological Institute of America',
        ]);
        $certRes->assertStatus(200);

        // Fetch via tags API
        $tagsRes = $this->actingAs($this->admin)->getJson('/api/work-orders/tags?tag_number=' . $tagNumber);
        $tagRow = $tagsRes->json('data.0');

        $this->assertEquals('completed', $tagRow['certification_status']);
        $this->assertEquals('GIA-2026-998877', $tagRow['certificate_no']);
        $this->assertEquals('pending', $tagRow['hallmarking_status']);
        $this->assertNull($tagRow['huid']);
    }

    /**
     * Scenario 3: Complete Hallmarking: both sections show their actual saved data
     */
    public function test_scenario_3_complete_both_stages_displays_actual_saved_data()
    {
        [$order, $item] = $this->createReadyWorkOrder('WO-TEST-REC-3', 1, 'DES-103');

        $recRes = $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'work_order_item_id' => $item->id,
            'gross_weight' => 15.000,
            'net_gold_weight' => 15.000,
            'purity' => 91.60,
        ]);
        $tagNumber = $recRes->json('tag_number');

        // 1. Complete Cert
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/update-certification", [
            'action' => 'add',
            'certification_no' => 'IGI-774411',
            'certification_agency' => 'IGI',
        ]);

        // 2. Complete Hallmarking
        $hallRes = $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/update-hallmarking", [
            'action' => 'add',
            'huid' => 'HUID998877',
            'hallmark_center' => 'BIS Center Chennai',
        ]);
        $hallRes->assertStatus(200);

        // Fetch via tags API
        $tagsRes = $this->actingAs($this->admin)->getJson('/api/work-orders/tags?tag_number=' . $tagNumber);
        $tagRow = $tagsRes->json('data.0');

        $this->assertEquals('completed', $tagRow['certification_status']);
        $this->assertEquals('IGI-774411', $tagRow['certificate_no']);
        $this->assertEquals('completed', $tagRow['hallmarking_status']);
        $this->assertEquals('HUID998877', $tagRow['huid']);
    }

    /**
     * Scenario 4: Skip Certification: shows 'skipped', not fabricated data, Hallmarking remains pending ('-')
     */
    public function test_scenario_4_skip_certification_shows_skipped_without_fabricated_data()
    {
        [$order, $item] = $this->createReadyWorkOrder('WO-TEST-REC-4', 1, 'DES-104');

        $recRes = $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'work_order_item_id' => $item->id,
            'gross_weight' => 12.000,
            'net_gold_weight' => 12.000,
            'purity' => 91.60,
        ]);
        $tagNumber = $recRes->json('tag_number');

        // Skip Certification
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/update-certification", [
            'action' => 'skip',
        ]);

        $tagsRes = $this->actingAs($this->admin)->getJson('/api/work-orders/tags?tag_number=' . $tagNumber);
        $tagRow = $tagsRes->json('data.0');

        $this->assertEquals('skipped', $tagRow['certification_status']);
        $this->assertNull($tagRow['certificate_no']);
        $this->assertEquals('pending', $tagRow['hallmarking_status']);
        $this->assertNull($tagRow['huid']);
    }

    /**
     * Scenario 5 & 6: Complete one stage and skip the other (Both combinations)
     */
    public function test_scenario_5_and_6_combinations_of_completed_and_skipped()
    {
        // Case A: Certification completed, Hallmarking skipped
        [$orderA, $itemA] = $this->createReadyWorkOrder('WO-TEST-REC-5A', 1, 'DES-105A');
        $recResA = $this->actingAs($this->admin)->postJson("/api/work-orders/{$orderA->id}/receive-piece", [
            'work_order_item_id' => $itemA->id,
            'gross_weight' => 10.000,
            'net_gold_weight' => 10.000,
        ]);
        $tagA = $recResA->json('tag_number');

        $this->actingAs($this->admin)->postJson("/api/work-orders/{$orderA->id}/update-certification", [
            'action' => 'add',
            'certification_no' => 'BIS-CERT-001',
        ]);
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$orderA->id}/update-hallmarking", [
            'action' => 'skip',
        ]);

        $rowA = $this->actingAs($this->admin)->getJson('/api/work-orders/tags?tag_number=' . $tagA)->json('data.0');
        $this->assertEquals('completed', $rowA['certification_status']);
        $this->assertEquals('BIS-CERT-001', $rowA['certificate_no']);
        $this->assertEquals('skipped', $rowA['hallmarking_status']);
        $this->assertNull($rowA['huid']);

        // Case B: Certification skipped, Hallmarking completed
        [$orderB, $itemB] = $this->createReadyWorkOrder('WO-TEST-REC-5B', 1, 'DES-105B');
        $recResB = $this->actingAs($this->admin)->postJson("/api/work-orders/{$orderB->id}/receive-piece", [
            'work_order_item_id' => $itemB->id,
            'gross_weight' => 10.000,
            'net_gold_weight' => 10.000,
        ]);
        $tagB = $recResB->json('tag_number');

        $this->actingAs($this->admin)->postJson("/api/work-orders/{$orderB->id}/update-certification", [
            'action' => 'skip',
        ]);
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$orderB->id}/update-hallmarking", [
            'action' => 'add',
            'huid' => 'HUID-B-888',
        ]);

        $rowB = $this->actingAs($this->admin)->getJson('/api/work-orders/tags?tag_number=' . $tagB)->json('data.0');
        $this->assertEquals('skipped', $rowB['certification_status']);
        $this->assertNull($rowB['certificate_no']);
        $this->assertEquals('completed', $rowB['hallmarking_status']);
        $this->assertEquals('HUID-B-888', $rowB['huid']);

        // Case C: Both skipped
        [$orderC, $itemC] = $this->createReadyWorkOrder('WO-TEST-REC-5C', 1, 'DES-105C');
        $recResC = $this->actingAs($this->admin)->postJson("/api/work-orders/{$orderC->id}/receive-piece", [
            'work_order_item_id' => $itemC->id,
            'gross_weight' => 10.000,
            'net_gold_weight' => 10.000,
        ]);
        $tagC = $recResC->json('tag_number');

        $this->actingAs($this->admin)->postJson("/api/work-orders/{$orderC->id}/update-certification", [
            'action' => 'skip',
        ]);
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$orderC->id}/update-hallmarking", [
            'action' => 'skip',
        ]);

        $rowC = $this->actingAs($this->admin)->getJson('/api/work-orders/tags?tag_number=' . $tagC)->json('data.0');
        $this->assertEquals('skipped', $rowC['certification_status']);
        $this->assertNull($rowC['certificate_no']);
        $this->assertEquals('skipped', $rowC['hallmarking_status']);
        $this->assertNull($rowC['huid']);
    }

    /**
     * Scenario 7: Multiple physical pieces sharing one design: each tag displays only its own stage data
     */
    public function test_scenario_7_multiple_physical_pieces_sharing_design_maintain_isolated_data()
    {
        [$order, $item] = $this->createReadyWorkOrder('WO-TEST-MULTI-PIECE', 2, 'SHARED-DESIGN-999');

        // Receive Piece 1
        $res1 = $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'work_order_item_id' => $item->id,
            'gross_weight' => 14.100,
            'net_gold_weight' => 14.100,
        ]);
        $tag1 = $res1->json('tag_number');
        $piece1Id = $res1->json('piece.id');

        // Receive Piece 2
        $res2 = $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'work_order_item_id' => $item->id,
            'gross_weight' => 14.200,
            'net_gold_weight' => 14.200,
        ]);
        $tag2 = $res2->json('tag_number');
        $piece2Id = $res2->json('piece.id');

        $this->assertNotEquals($tag1, $tag2);

        // Update Piece 1 specifically
        $this->actingAs($this->admin)->postJson("/api/received-pieces/{$piece1Id}/update-certification", [
            'action' => 'add',
            'certification_no' => 'CERT-PIECE-1',
        ]);
        $this->actingAs($this->admin)->postJson("/api/received-pieces/{$piece1Id}/update-hallmarking", [
            'action' => 'add',
            'huid' => 'HUID-PIECE-1',
        ]);

        // Piece 2 should remain pending
        $tags = $this->actingAs($this->admin)->getJson('/api/work-orders/tags')->json('data');
        $row1 = collect($tags)->firstWhere('tag_number', $tag1);
        $row2 = collect($tags)->firstWhere('tag_number', $tag2);

        $this->assertEquals('completed', $row1['certification_status']);
        $this->assertEquals('CERT-PIECE-1', $row1['certificate_no']);
        $this->assertEquals('completed', $row1['hallmarking_status']);
        $this->assertEquals('HUID-PIECE-1', $row1['huid']);

        $this->assertEquals('pending', $row2['certification_status']);
        $this->assertNull($row2['certificate_no']);
        $this->assertEquals('pending', $row2['hallmarking_status']);
        $this->assertNull($row2['huid']);
    }

    /**
     * Scenario 8: Reopen / refresh Tag Generation after completing stage preserves saved result without regeneration
     */
    public function test_scenario_8_reopening_tag_table_preserves_persisted_updates_without_regeneration()
    {
        [$order, $item] = $this->createReadyWorkOrder('WO-TEST-REFRESH', 1, 'DES-REF-01');

        $recRes = $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'work_order_item_id' => $item->id,
            'gross_weight' => 16.000,
            'net_gold_weight' => 16.000,
        ]);
        $tagNumber = $recRes->json('tag_number');

        // Check initially pending
        $initialRow = $this->actingAs($this->admin)->getJson('/api/work-orders/tags?tag_number=' . $tagNumber)->json('data.0');
        $this->assertEquals('pending', $initialRow['certification_status']);

        // Progress stage in background
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/update-certification", [
            'action' => 'add',
            'certification_no' => 'PERSIST-CERT-99',
        ]);

        // "Reopen/refresh" Tag Generation table
        $refreshedRow = $this->actingAs($this->admin)->getJson('/api/work-orders/tags?tag_number=' . $tagNumber)->json('data.0');
        $this->assertEquals('completed', $refreshedRow['certification_status']);
        $this->assertEquals('PERSIST-CERT-99', $refreshedRow['certificate_no']);
        $this->assertEquals('pending', $refreshedRow['hallmarking_status']);
    }

    /**
     * Scenario 10: Verify tag generation does not create duplicate tags, cert records, or inventory movements
     */
    public function test_scenario_10_no_duplicate_tags_or_inventory_movements()
    {
        [$order, $item] = $this->createReadyWorkOrder('WO-TEST-DUP', 1, 'DES-DUP-01');

        $initialTagsCount = WorkOrderReceivedPiece::count();
        $initialMovementsCount = InventoryMovement::count();

        $recRes = $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/receive-piece", [
            'work_order_item_id' => $item->id,
            'gross_weight' => 10.000,
            'net_gold_weight' => 10.000,
        ]);
        $recRes->assertStatus(200);

        // Exactly 1 new piece tag created
        $this->assertEquals($initialTagsCount + 1, WorkOrderReceivedPiece::count());
        // Since certification and hallmarking are not yet done, inventory movement has NOT happened
        $this->assertEquals($initialMovementsCount, InventoryMovement::count());

        // Complete Cert & Hallmark
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/update-certification", [
            'action' => 'skip',
        ]);
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/update-hallmarking", [
            'action' => 'skip',
        ]);

        // Exactly 1 inventory movement created upon finalization
        $this->assertEquals($initialMovementsCount + 1, InventoryMovement::count());

        // Call finalReceive/sync again to ensure idempotency
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$order->id}/final-receive", []);
        $this->assertEquals($initialMovementsCount + 1, InventoryMovement::count());
        $this->assertEquals($initialTagsCount + 1, WorkOrderReceivedPiece::count());
    }

    public function test_received_legacy_pieces_without_tags_are_backfilled_once_and_listed()
    {
        [$order, $item] = $this->createReadyWorkOrder('WO-TEST-LEGACY-TAGS', 3, 'DES-LEGACY-TAG');

        foreach (range(1, 3) as $pieceNumber) {
            WorkOrderReceivedPiece::create([
                'work_order_id' => $order->id,
                'work_order_item_id' => $item->id,
                'piece_number' => $pieceNumber,
                'design_no' => $item->design_no,
                'product_name' => $item->product_name,
                'gross_weight' => 10 + $pieceNumber,
                'net_gold_weight' => 10 + $pieceNumber,
                'status' => 'received',
                'qc_status' => 'passed',
                'received_at' => now()->subMinutes($pieceNumber),
            ]);
        }

        $pieceHistory = $this->actingAs($this->admin)->getJson("/api/work-orders/{$order->id}/pieces")->assertOk();
        $this->assertCount(3, collect($pieceHistory->json('data'))->filter(fn ($piece) => !empty($piece['received_at'])));

        $firstResponse = $this->actingAs($this->admin)->getJson('/api/work-orders/tags?work_order_number=WO-TEST-LEGACY-TAGS');
        $firstResponse->assertOk();
        $this->assertCount(3, $firstResponse->json('data'));
        $firstTags = collect($firstResponse->json('data'))->pluck('tag_number');
        $this->assertCount(3, $firstTags->unique());
        $this->assertSame(3, WorkOrderReceivedPiece::where('work_order_id', $order->id)->whereNotNull('tag_number')->count());

        $secondResponse = $this->actingAs($this->admin)->getJson('/api/work-orders/tags?work_order_number=WO-TEST-LEGACY-TAGS');
        $secondResponse->assertOk()->assertJsonCount(3, 'data');
        $this->assertSame(3, WorkOrderReceivedPiece::where('work_order_id', $order->id)->whereNotNull('tag_number')->count());
        $this->assertEqualsCanonicalizing($firstTags->all(), collect($secondResponse->json('data'))->pluck('tag_number')->all());
    }
}
