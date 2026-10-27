<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Karigar;
use App\Models\Product;
use App\Models\Category;
use App\Models\WorkOrder;
use App\Models\RawMaterial;
use App\Models\Stamp;
use App\Models\PurchaseEntry;
use App\Services\WorkOrderMaterialRequirementService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class WorkOrderMaterialAllocationDecouplingTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Karigar $karigar;
    protected Category $category;
    protected Stamp $stamp;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $this->karigar = Karigar::create([
            'karigar_code' => 'K-TEST-001',
            'name' => 'Artisan Test',
            'primary_phone' => '9876543210',
            'status' => 'active',
            'current_gold_balance_grams' => 0.000,
        ]);

        $this->category = Category::create([
            'name' => 'Rings',
            'code' => 'RNG',
            'status' => 'active',
        ]);

        $this->stamp = Stamp::create([
            'name' => '+3 Sieve',
            'code' => '+3',
            'status' => 'active',
        ]);

        // Setup Gold & Diamond Vault
        RawMaterial::updateOrCreate(
            ['material_type' => 'gold'],
            ['name' => '24K Raw Gold', 'unit' => 'g', 'opening_weight' => 100.000, 'current_balance' => 100.000, 'allocated_weight' => 0.000]
        );
        RawMaterial::updateOrCreate(
            ['material_type' => 'diamond'],
            ['name' => 'Rough Diamonds', 'unit' => 'ct', 'opening_weight' => 3.000, 'opening_count' => 3, 'current_balance' => 3.000, 'current_count' => 3, 'allocated_weight' => 0.000, 'allocated_count' => 0]
        );
    }

    /** @test */
    public function work_order_creation_does_not_auto_allot_materials_or_credit_artisan_bench()
    {
        $payload = [
            'work_order_number' => 'WO-DECOUPLE-001',
            'product_name' => 'Diamond Chain',
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'priority' => 'Normal',
            'material_type' => 'Gold (22K)',
            'gold_purity' => '22K',
            'items' => [
                [
                    'variant' => '22K Gold Chain',
                    'design_number' => 'CH-100',
                    'gold_purity' => '22K',
                    'need_pcs' => 1,
                    'gold_weight' => 89.200,
                    'diamond_weight' => 0.0,
                    'no_of_diamonds' => 0,
                ]
            ],
            'job_summary' => [
                'allocated_gold' => 89.200,
            ],
        ];

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/work-orders', $payload);
        $response->assertStatus(201);

        $wo = WorkOrder::where('work_order_number', 'WO-DECOUPLE-001')->firstOrFail();
        
        // 1. Allotted and pending weight are initially ZERO
        $this->assertEquals(0.000, (float)$wo->allotted_weight);
        $this->assertEquals(0.000, (float)$wo->pending_weight);
        $this->assertEquals(89.200, (float)$wo->expected_return_weight);

        // 2. Karigar bench balance remains ZERO (unaltered before manual allocation)
        $this->karigar->refresh();
        $this->assertEquals(0.000, (float)$this->karigar->current_gold_balance_grams);

        // 3. Vault allocation remains ZERO
        RawMaterial::recalculateAllocations();
        $goldRaw = RawMaterial::where('material_type', 'gold')->first();
        $this->assertEquals(0.000, (float)$goldRaw->allocated_weight);

        // 4. Requirement service correctly computes full remaining fine-gold requirement
        $req = WorkOrderMaterialRequirementService::getWorkOrderMaterialRequirements($wo);
        $this->assertEquals(89.200, (float)$req['gold_requirement']['net_gold_weight']);
        $this->assertEquals(81.767, (float)$req['gold_requirement']['required_fine_gold']);
        $this->assertEquals(0.000, (float)$req['gold_requirement']['allocated_fine_gold']);
        $this->assertEquals(81.767, (float)$req['gold_requirement']['remaining_fine_gold']);
        $this->assertFalse($req['gold_requirement']['is_fully_allocated']);
    }

    /** @test */
    public function low_stock_in_vault_triggers_shortage_notice_and_can_be_confirmed_with_allow_shortage()
    {
        // Vault has 3.000 ct diamonds. We request 4.000 ct.
        $payload = [
            'work_order_number' => 'WO-SHORTAGE-001',
            'product_name' => 'Diamond Bangle',
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'priority' => 'Normal',
            'material_type' => 'Gold (22K)',
            'gold_purity' => '22K',
            'items' => [
                [
                    'variant' => 'Diamond Bangle Item',
                    'design_number' => 'BG-200',
                    'gold_purity' => '22K',
                    'need_pcs' => 1,
                    'gold_weight' => 20.000,
                    'diamond_weight' => 4.000, // Shortage of 1.000 ct
                    'no_of_diamonds' => 4,
                    'diamond_stamp' => '+3',
                ]
            ],
            'job_summary' => [
                'allocated_gold' => 20.000,
            ],
        ];

        // 1. Without allow_shortage: returns 422 with shortage details
        $res1 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/work-orders', $payload);
        $res1->assertStatus(422);
        $res1->assertJson([
            'error_type' => 'INSUFFICIENT_DIAMOND_STOCK',
            'required_carats' => 4.000,
            'available_carats' => 3.000,
            'shortage_carats' => 1.000,
        ]);

        // 2. With allow_shortage: creates work order cleanly without faking vault inventory
        $payloadWithShortage = array_merge($payload, ['allow_shortage' => true]);
        $res2 = $this->actingAs($this->admin, 'sanctum')->postJson('/api/work-orders', $payloadWithShortage);
        $res2->assertStatus(201);

        // Verify diamond vault still holds 3.000 ct and NO fake opening stock was added
        $diaRaw = RawMaterial::where('material_type', 'diamond')->first();
        $this->assertEquals(3.000, (float)$diaRaw->current_balance);
        $this->assertEquals(0.000, (float)$diaRaw->allocated_weight);
    }

    /** @test */
    public function subsequent_material_allocation_from_hub_updates_work_order_and_karigar_bench()
    {
        $payload = [
            'work_order_number' => 'WO-ALLOC-HUB-001',
            'product_name' => 'Custom Pendant',
            'karigar_id' => $this->karigar->id,
            'allotted_date' => now()->toDateString(),
            'priority' => 'Normal',
            'material_type' => 'Gold (24K)',
            'gold_purity' => '24K',
            'items' => [
                [
                    'variant' => 'Custom Pendant Item',
                    'design_number' => 'PD-300',
                    'gold_purity' => '24K',
                    'need_pcs' => 1,
                    'gold_weight' => 20.000,
                    'diamond_weight' => 1.000,
                    'no_of_diamonds' => 1,
                    'diamond_stamp' => '+3 Sieve',
                ]
            ],
            'job_summary' => [
                'allocated_gold' => 20.000,
            ],
        ];

        $this->actingAs($this->admin, 'sanctum')->postJson('/api/work-orders', $payload)->assertStatus(201);
        $wo = WorkOrder::where('work_order_number', 'WO-ALLOC-HUB-001')->firstOrFail();

        // Initially zero
        $this->assertEquals(0.000, (float)$wo->allotted_weight);

        // Now allocate 20.000g of 24K gold (20.000g fine) and 1.000ct diamond from vault
        $allocPayload = [
            'work_order_id' => $wo->id,
            'materials' => [
                [
                    'source' => 'vault',
                    'material_type' => 'gold',
                    'purity' => '24K',
                    'touch' => 100,
                    'gross_weight' => 20.000,
                    'net_weight' => 20.000,
                ],
                [
                    'source' => 'vault',
                    'material_type' => 'diamond',
                    'stamp' => '+3 Sieve',
                    'stamp_id' => $this->stamp->id,
                    'gross_weight' => 1.000,
                    'net_weight' => 1.000,
                    'pieces' => 1,
                    'unit' => 'ct',
                ],
            ],
        ];

        $allocRes = $this->actingAs($this->admin, 'sanctum')->postJson("/api/karigars/{$this->karigar->id}/allocate-materials", $allocPayload);
        $allocRes->assertStatus(200);

        // Work Order now reflects allocated weight
        $wo->refresh();
        $this->assertEquals(20.000, (float)$wo->allotted_weight);
        $this->assertEquals(20.000, (float)$wo->pending_weight);

        // Karigar bench balance holds the issued fine gold
        $this->karigar->refresh();
        $this->assertEquals(20.000, (float)$this->karigar->current_gold_balance_grams);

        // Diamond vault debited 1.000 ct
        $diaRaw = RawMaterial::where('material_type', 'diamond')->first();
        $this->assertEquals(1.000, (float)$diaRaw->allocated_weight);
        $this->assertEquals(2.000, (float)$diaRaw->current_balance);

        // Requirements are now fulfilled
        $req = WorkOrderMaterialRequirementService::getWorkOrderMaterialRequirements($wo);
        $this->assertEquals(0.000, (float)$req['gold_requirement']['remaining_fine_gold']);
        $this->assertTrue($req['gold_requirement']['is_fully_allocated']);
    }
}
