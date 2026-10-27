<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\User;
use App\Models\Karigar;
use App\Models\RawMaterial;
use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use App\Models\KarigarMaterialTransaction;
use App\Models\Stamp;
use App\Models\Category;
use Illuminate\Foundation\Testing\RefreshDatabase;

class WorkOrderKarigarMaterialAllocationTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected User $operator;
    protected Karigar $karigarA;
    protected Karigar $karigarB;
    protected Category $category;
    protected Stamp $stamp5;
    protected Stamp $stamp4;
    protected Stamp $stamp3;
    protected Stamp $stamp2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin', 'name' => 'Admin Manager']);
        $this->operator = User::factory()->create(['role' => 'operator', 'name' => 'Floor Operator']);

        $this->karigarA = Karigar::create([
            'karigar_code' => 'KAR-ALLOC-01',
            'name' => 'Karigar Raman',
            'primary_phone' => '9840001111',
            'status' => 'active',
            'specialization' => 'Gold Goldsmith',
            'current_gold_balance_grams' => 0.000,
        ]);

        $this->karigarB = Karigar::create([
            'karigar_code' => 'KAR-ALLOC-02',
            'name' => 'Karigar Suresh',
            'primary_phone' => '9840002222',
            'status' => 'active',
            'specialization' => 'Diamond Setter',
            'current_gold_balance_grams' => 0.000,
        ]);

        $this->category = Category::create([
            'name' => 'Bridal Jewellery',
            'code' => 'BJ-01',
            'status' => 'active',
        ]);

        $this->stamp5 = Stamp::create(['name' => '+5 Sieve', 'code' => '+5', 'status' => 'active']);
        $this->stamp4 = Stamp::create(['name' => '+4 Sieve', 'code' => '+4', 'status' => 'active']);
        $this->stamp3 = Stamp::create(['name' => '+3 Sieve', 'code' => '+3', 'status' => 'active']);
        $this->stamp2 = Stamp::create(['name' => '+2 Sieve', 'code' => '+2', 'status' => 'active']);

        RawMaterial::updateOrCreate(
            ['material_type' => 'gold'],
            ['name' => '24K Raw Gold', 'unit' => 'g', 'opening_weight' => 0, 'current_balance' => 0.000, 'allocated_weight' => 0.000]
        );
        RawMaterial::updateOrCreate(
            ['material_type' => 'diamond'],
            ['name' => 'Rough / Master Diamonds', 'unit' => 'ct', 'opening_weight' => 0, 'opening_count' => 0, 'current_balance' => 0.000, 'current_count' => 0, 'allocated_weight' => 0.000, 'allocated_count' => 0]
        );
    }

    protected function setVaultGold(float $balance): RawMaterial
    {
        $v = RawMaterial::where('material_type', 'gold')->first();
        $v->opening_weight = $balance;
        $v->purchased_weight = 0.000;
        $v->allocated_weight = 0.000;
        $v->current_balance = $balance;
        $v->save();
        return $v;
    }

    protected function setVaultDiamond(float $balance, int $count = 100): RawMaterial
    {
        try {
            \App\Models\MaterialOpeningStock::updateOrCreate(
                ['material_type' => 'diamond'],
                [
                    'stock_number' => 'OS-TEST-DIA',
                    'carat_weight' => $balance,
                    'quantity' => $count,
                ]
            );
        } catch (\Throwable $e) {}

        $v = RawMaterial::where('material_type', 'diamond')->first();
        $v->opening_weight = $balance;
        $v->opening_count = $count;
        $v->purchased_weight = 0.000;
        $v->purchased_count = 0;
        $v->allocated_weight = 0.000;
        $v->allocated_count = 0;
        $v->current_balance = $balance;
        $v->current_count = $count;
        $v->save();
        return $v;
    }

    /**
     * Test 1: Work Order gold requirements are displayed in 24K fine-gold equivalent.
     * E.g. 30g 22K at 22/24 = 27.500g fine gold.
     * E.g. 30g 18K at 18/24 = 22.500g fine gold.
     */
    public function test_01_work_order_gold_requirements_displayed_in_24k_fine_gold_equivalent()
    {
        $wo22k = WorkOrder::create([
            'work_order_number' => 'WO-GOLD-22K',
            'product_name' => '22K Necklace',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 30.000,
            'material_type' => 'Gold 22K (916)',
            'status' => 'active',
        ]);

        $res22k = $this->actingAs($this->admin)->getJson("/api/work-orders/{$wo22k->id}/material-requirements");
        $res22k->assertStatus(200);
        $data22k = $res22k->json('data.gold_requirement');
        $this->assertEquals(27.500, (float)$data22k['required_fine_gold'], '30g 22K must equal 27.500g fine gold');
        $this->assertEquals(27.500, (float)$data22k['remaining_fine_gold']);

        $wo18k = WorkOrder::create([
            'work_order_number' => 'WO-GOLD-18K',
            'product_name' => '18K Diamond Ring Base',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 30.000,
            'material_type' => 'Gold 18K (750)',
            'status' => 'active',
        ]);

        $res18k = $this->actingAs($this->admin)->getJson("/api/work-orders/{$wo18k->id}/material-requirements");
        $res18k->assertStatus(200);
        $data18k = $res18k->json('data.gold_requirement');
        $this->assertEquals(22.500, (float)$data18k['required_fine_gold'], '30g 18K at 75% touch must equal 22.500g fine gold');
        $this->assertEquals(22.500, (float)$data18k['remaining_fine_gold']);
    }

    /**
     * Test 2: Purity conversion is not applied twice if the Work Order already stores fine weight.
     */
    public function test_02_purity_conversion_is_not_applied_twice()
    {
        $woStoredFine = WorkOrder::create([
            'work_order_number' => 'WO-FINE-STORED',
            'product_name' => 'Bangle with Stored Fine',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 30.000,
            'material_type' => 'Gold 22K (916)',
            'pricing_details' => [
                'fine_weight' => 27.480, // Pre-calculated fine gold weight
            ],
            'status' => 'active',
        ]);

        $res = $this->actingAs($this->admin)->getJson("/api/work-orders/{$woStoredFine->id}/material-requirements");
        $res->assertStatus(200);
        $data = $res->json('data.gold_requirement');
        $this->assertEquals(27.480, (float)$data['required_fine_gold'], 'Pre-calculated fine weight must not be converted a second time');
    }

    /**
     * Test 3 & 4: Every diamond type entered in the Work Order appears in Material Allocation,
     * and more than 3 diamond stamps are supported without limit or merging.
     */
    public function test_03_and_04_more_than_three_diamond_stamps_supported_and_never_merged()
    {
        $wo = WorkOrder::create([
            'work_order_number' => 'WO-MULTI-DIAMOND-01',
            'product_name' => 'Multi-Stone Solitaire Set',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 20.000,
            'material_type' => '24K Gold',
            'status' => 'active',
            'stone_details' => [
                'diamonds' => [
                    ['stamp' => '+5 Sieve', 'stamp_id' => $this->stamp5->id, 'diamond_weight' => 1.500, 'pieces' => 10, 'item_name' => '+5 Sieve Round Brilliant'],
                    ['stamp' => '+4 Sieve', 'stamp_id' => $this->stamp4->id, 'diamond_weight' => 2.000, 'pieces' => 15, 'item_name' => '+4 Sieve Small Pave'],
                    ['stamp' => '+3 Sieve', 'stamp_id' => $this->stamp3->id, 'diamond_weight' => 0.750, 'pieces' => 8, 'item_name' => '+3 Sieve Side Accents'],
                    ['stamp' => '+2 Sieve', 'stamp_id' => $this->stamp2->id, 'diamond_weight' => 0.500, 'pieces' => 6, 'item_name' => '+2 Sieve Micro Pave'],
                ],
            ],
        ]);

        $res = $this->actingAs($this->admin)->getJson("/api/work-orders/{$wo->id}/material-requirements");
        $res->assertStatus(200);
        $diamonds = $res->json('data.diamond_requirements');

        $this->assertCount(4, $diamonds, 'All 4 diamond stamps must appear separately without truncating or merging');
        $stampsFound = array_column($diamonds, 'stamp');
        $this->assertContains('+5 Sieve', $stampsFound);
        $this->assertContains('+4 Sieve', $stampsFound);
        $this->assertContains('+3 Sieve', $stampsFound);
        $this->assertContains('+2 Sieve', $stampsFound);

        // Verify master IDs and piece counts
        $d5 = collect($diamonds)->firstWhere('stamp', '+5 Sieve');
        $this->assertEquals($this->stamp5->id, $d5['stamp_id']);
        $this->assertEquals(1.500, (float)$d5['required_carats']);
        $this->assertEquals(10, $d5['required_pieces']);
        $this->assertEquals(1.500, (float)$d5['remaining_carats']);
        $this->assertEquals(10, $d5['remaining_pieces']);
    }

    /**
     * Test 5: Each stamp's allocated and remaining quantities are calculated independently.
     * Piece count is tracked if present and never invented if absent.
     */
    public function test_05_independent_stamp_tracking_and_piece_count_not_invented()
    {
        $wo = WorkOrder::create([
            'work_order_number' => 'WO-INDEPENDENT-01',
            'product_name' => 'Custom Pendant',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 15.000,
            'material_type' => '24K Gold',
            'status' => 'active',
            'stone_details' => [
                'diamonds' => [
                    ['stamp' => '+5 Sieve', 'stamp_id' => $this->stamp5->id, 'diamond_weight' => 2.500, 'pieces' => 20],
                    ['stamp' => '+4 Sieve', 'stamp_id' => $this->stamp4->id, 'diamond_weight' => 1.800], // Untracked piece count!
                ],
            ],
        ]);

        $res = $this->actingAs($this->admin)->getJson("/api/work-orders/{$wo->id}/material-requirements");
        $res->assertStatus(200);
        $diamonds = $res->json('data.diamond_requirements');

        $d5 = collect($diamonds)->firstWhere('stamp', '+5 Sieve');
        $d4 = collect($diamonds)->firstWhere('stamp', '+4 Sieve');

        $this->assertTrue($d5['has_pieces']);
        $this->assertEquals(20, $d5['required_pieces']);

        $this->assertFalse($d4['has_pieces'], 'Untracked pieces must not invent a count');
        $this->assertNull($d4['required_pieces']);
        $this->assertNull($d4['remaining_pieces']);
    }

    /**
     * Test 6: Partial fine-gold allocation reduces only the gold requirement.
     */
    public function test_06_partial_fine_gold_allocation_reduces_only_gold_requirement()
    {
        $this->setVaultGold(100.000);

        $wo = WorkOrder::create([
            'work_order_number' => 'WO-PARTIAL-GOLD',
            'product_name' => 'Royal Bangle',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 30.000,
            'material_type' => '24K Gold',
            'status' => 'active',
            'stone_details' => [
                'diamonds' => [
                    ['stamp' => '+5 Sieve', 'stamp_id' => $this->stamp5->id, 'diamond_weight' => 1.500, 'pieces' => 10],
                ],
            ],
        ]);

        // Allocate 10g fine gold out of 30g
        $allocRes = $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $wo->id,
            'materials' => [
                ['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'touch' => 100, 'gross_weight' => 10.000, 'net_weight' => 10.000],
            ],
        ]);
        $allocRes->assertStatus(200);

        // Check updated requirements
        $reqRes = $this->actingAs($this->admin)->getJson("/api/work-orders/{$wo->id}/material-requirements");
        $reqRes->assertStatus(200);
        $goldReq = $reqRes->json('data.gold_requirement');
        $diaReq = $reqRes->json('data.diamond_requirements.0');

        $this->assertEquals(30.000, (float)$goldReq['required_fine_gold']);
        $this->assertEquals(10.000, (float)$goldReq['allocated_fine_gold']);
        $this->assertEquals(20.000, (float)$goldReq['remaining_fine_gold'], '30 - 10 = 20g remaining fine gold');

        // Diamond requirement is completely untouched
        $this->assertEquals(1.500, (float)$diaReq['required_carats']);
        $this->assertEquals(0.000, (float)$diaReq['allocated_carats']);
        $this->assertEquals(1.500, (float)$diaReq['remaining_carats']);
    }

    /**
     * Test 7: Partial diamond allocation reduces only the matching stamp's requirement.
     */
    public function test_07_partial_diamond_allocation_reduces_only_matching_stamp_requirement()
    {
        $this->setVaultDiamond(50.000, 100);

        $wo = WorkOrder::create([
            'work_order_number' => 'WO-PARTIAL-DIA',
            'product_name' => 'Diamond Studs',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 10.000,
            'material_type' => '24K Gold',
            'status' => 'active',
            'stone_details' => [
                'diamonds' => [
                    ['stamp' => '+5 Sieve', 'stamp_id' => $this->stamp5->id, 'diamond_weight' => 1.500, 'pieces' => 10],
                    ['stamp' => '+4 Sieve', 'stamp_id' => $this->stamp4->id, 'diamond_weight' => 2.000, 'pieces' => 15],
                ],
            ],
        ]);

        // Allocate 0.500 ct / 3 pcs of +5 Sieve
        $allocRes = $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $wo->id,
            'materials' => [
                [
                    'source' => 'vault',
                    'material_type' => 'diamond',
                    'stamp' => '+5 Sieve',
                    'stamp_id' => $this->stamp5->id,
                    'gross_weight' => 0.500,
                    'net_weight' => 0.500,
                    'pieces' => 3,
                    'unit' => 'ct',
                ],
            ],
        ]);
        $allocRes->assertStatus(200);

        $reqRes = $this->actingAs($this->admin)->getJson("/api/work-orders/{$wo->id}/material-requirements");
        $reqRes->assertStatus(200);
        $diamonds = $reqRes->json('data.diamond_requirements');

        $d5 = collect($diamonds)->firstWhere('stamp', '+5 Sieve');
        $d4 = collect($diamonds)->firstWhere('stamp', '+4 Sieve');

        $this->assertEquals(0.500, (float)$d5['allocated_carats']);
        $this->assertEquals(3, (int)$d5['allocated_pieces']);
        $this->assertEquals(1.000, (float)$d5['remaining_carats'], '1.500 - 0.500 = 1.000 ct');
        $this->assertEquals(7, (int)$d5['remaining_pieces'], '10 - 3 = 7 pcs');

        // +4 Sieve is completely unaffected
        $this->assertEquals(0.000, (float)$d4['allocated_carats']);
        $this->assertEquals(0, (int)$d4['allocated_pieces']);
        $this->assertEquals(2.000, (float)$d4['remaining_carats']);
        $this->assertEquals(15, (int)$d4['remaining_pieces']);
    }

    /**
     * Test 8 & 9: Repeated allocations calculate the correct remaining values,
     * and fully allocated requirements show zero remaining.
     */
    public function test_08_and_09_repeated_allocations_and_fully_allocated_shows_zero()
    {
        $this->setVaultGold(100.000);
        $this->setVaultDiamond(50.000, 100);

        $wo = WorkOrder::create([
            'work_order_number' => 'WO-STEP-CYCLE',
            'product_name' => 'Royal Bridal Set',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 30.000,
            'material_type' => '24K Gold',
            'status' => 'active',
            'stone_details' => [
                'diamonds' => [
                    ['stamp' => '+5 Sieve', 'stamp_id' => $this->stamp5->id, 'diamond_weight' => 1.500],
                    ['stamp' => '+4 Sieve', 'stamp_id' => $this->stamp4->id, 'diamond_weight' => 2.000],
                ],
            ],
        ]);

        // Allocation #1: 10g fine gold, 0.500 ct +5, 0.800 ct +4
        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $wo->id,
            'materials' => [
                ['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'touch' => 100, 'gross_weight' => 10.000, 'net_weight' => 10.000],
                ['source' => 'vault', 'material_type' => 'diamond', 'stamp' => '+5 Sieve', 'stamp_id' => $this->stamp5->id, 'gross_weight' => 0.500, 'net_weight' => 0.500, 'unit' => 'ct'],
                ['source' => 'vault', 'material_type' => 'diamond', 'stamp' => '+4 Sieve', 'stamp_id' => $this->stamp4->id, 'gross_weight' => 0.800, 'net_weight' => 0.800, 'unit' => 'ct'],
            ],
        ])->assertStatus(200);

        $res1 = $this->actingAs($this->admin)->getJson("/api/work-orders/{$wo->id}/material-requirements")->json('data');
        $this->assertEquals(20.000, (float)$res1['gold_requirement']['remaining_fine_gold']);
        $this->assertEquals(1.000, (float)collect($res1['diamond_requirements'])->firstWhere('stamp', '+5 Sieve')['remaining_carats']);
        $this->assertEquals(1.200, (float)collect($res1['diamond_requirements'])->firstWhere('stamp', '+4 Sieve')['remaining_carats']);
        $this->assertFalse($res1['is_all_fully_allocated']);

        // Allocation #2: 5g fine gold, 0.300 ct +5, 0.200 ct +4
        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $wo->id,
            'materials' => [
                ['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'touch' => 100, 'gross_weight' => 5.000, 'net_weight' => 5.000],
                ['source' => 'vault', 'material_type' => 'diamond', 'stamp' => '+5 Sieve', 'stamp_id' => $this->stamp5->id, 'gross_weight' => 0.300, 'net_weight' => 0.300, 'unit' => 'ct'],
                ['source' => 'vault', 'material_type' => 'diamond', 'stamp' => '+4 Sieve', 'stamp_id' => $this->stamp4->id, 'gross_weight' => 0.200, 'net_weight' => 0.200, 'unit' => 'ct'],
            ],
        ])->assertStatus(200);

        $res2 = $this->actingAs($this->admin)->getJson("/api/work-orders/{$wo->id}/material-requirements")->json('data');
        $this->assertEquals(15.000, (float)$res2['gold_requirement']['remaining_fine_gold']);
        $this->assertEquals(0.700, (float)collect($res2['diamond_requirements'])->firstWhere('stamp', '+5 Sieve')['remaining_carats']);
        $this->assertEquals(1.000, (float)collect($res2['diamond_requirements'])->firstWhere('stamp', '+4 Sieve')['remaining_carats']);
        $this->assertFalse($res2['is_all_fully_allocated']);

        // Allocation #3: Fulfill all remaining
        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $wo->id,
            'materials' => [
                ['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'touch' => 100, 'gross_weight' => 15.000, 'net_weight' => 15.000],
                ['source' => 'vault', 'material_type' => 'diamond', 'stamp' => '+5 Sieve', 'stamp_id' => $this->stamp5->id, 'gross_weight' => 0.700, 'net_weight' => 0.700, 'unit' => 'ct'],
                ['source' => 'vault', 'material_type' => 'diamond', 'stamp' => '+4 Sieve', 'stamp_id' => $this->stamp4->id, 'gross_weight' => 1.000, 'net_weight' => 1.000, 'unit' => 'ct'],
            ],
        ])->assertStatus(200);

        $res3 = $this->actingAs($this->admin)->getJson("/api/work-orders/{$wo->id}/material-requirements")->json('data');
        $this->assertEquals(0.000, (float)$res3['gold_requirement']['remaining_fine_gold']);
        $this->assertEquals(0.000, (float)collect($res3['diamond_requirements'])->firstWhere('stamp', '+5 Sieve')['remaining_carats']);
        $this->assertEquals(0.000, (float)collect($res3['diamond_requirements'])->firstWhere('stamp', '+4 Sieve')['remaining_carats']);
        $this->assertTrue($res3['is_all_fully_allocated'], 'All requirements must be marked fully allocated');
    }

    /**
     * Test 10: Other Work Orders and other Karigars' transactions do not affect the selected requirement.
     */
    public function test_10_isolation_between_work_orders_and_karigars()
    {
        $this->setVaultGold(100.000);

        $woTarget = WorkOrder::create([
            'work_order_number' => 'WO-TARGET-A',
            'product_name' => 'Target Order',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 20.000,
            'material_type' => '24K Gold',
            'status' => 'active',
        ]);

        $woOther = WorkOrder::create([
            'work_order_number' => 'WO-OTHER-B',
            'product_name' => 'Other Order',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarB->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 25.000,
            'material_type' => '24K Gold',
            'status' => 'active',
        ]);

        // Allocate to woOther (Karigar B)
        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarB->id}/allocate-materials", [
            'work_order_id' => $woOther->id,
            'materials' => [
                ['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'touch' => 100, 'gross_weight' => 15.000, 'net_weight' => 15.000],
            ],
        ])->assertStatus(200);

        // Target requirement must remain completely untouched
        $res = $this->actingAs($this->admin)->getJson("/api/work-orders/{$woTarget->id}/material-requirements")->json('data');
        $this->assertEquals(20.000, (float)$res['gold_requirement']['required_fine_gold']);
        $this->assertEquals(0.000, (float)$res['gold_requirement']['allocated_fine_gold']);
        $this->assertEquals(20.000, (float)$res['gold_requirement']['remaining_fine_gold']);
    }

    /**
     * Test 11: Page refresh and reopening reproduce the correct persisted quantities.
     */
    public function test_11_persisted_quantities_remain_exact_on_reload()
    {
        $this->setVaultGold(100.000);

        $wo = WorkOrder::create([
            'work_order_number' => 'WO-PERSIST-CHECK',
            'product_name' => 'Persist Bangle',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 40.000,
            'material_type' => '24K Gold',
            'status' => 'active',
        ]);

        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $wo->id,
            'materials' => [
                ['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'touch' => 100, 'gross_weight' => 18.250, 'net_weight' => 18.250],
            ],
        ])->assertStatus(200);

        // Fetch multiple times simulating reloads and multiple sessions
        for ($i = 0; $i < 3; $i++) {
            $res = $this->actingAs($this->admin)->getJson("/api/karigars/{$this->karigarA->id}/work-orders/{$wo->id}/material-requirements")->json('data');
            $this->assertEquals(18.250, (float)$res['gold_requirement']['allocated_fine_gold']);
            $this->assertEquals(21.750, (float)$res['gold_requirement']['remaining_fine_gold']);
        }
    }

    /**
     * Test 12 & 13: Vault stock is deducted only for newly issued material,
     * and carried-forward material from Karigar bench is not deducted from vault again.
     */
    public function test_12_and_13_vault_deduction_and_carried_forward_bench_integrity()
    {
        $vaultGold = $this->setVaultGold(100.000);

        // 1. First allocation: 25g from vault to Karigar A bench
        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'materials' => [
                ['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'touch' => 100, 'gross_weight' => 25.000, 'net_weight' => 25.000],
            ],
        ])->assertStatus(200);

        $vaultGold->refresh();
        $this->assertEquals(75.000, (float)$vaultGold->current_balance, 'Vault stock must decrease by 25g');
        $this->karigarA->refresh();
        $this->assertEquals(25.000, (float)$this->karigarA->current_gold_balance_grams, 'Bench balance must be 25g');

        // 2. Second allocation for a Work Order using carried-forward bench material
        $wo = WorkOrder::create([
            'work_order_number' => 'WO-BENCH-REUSE',
            'product_name' => 'Ring from Bench',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 10.000,
            'material_type' => '24K Gold',
            'status' => 'active',
        ]);

        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $wo->id,
            'materials' => [
                ['source' => 'bench', 'material_type' => 'gold', 'purity' => '24K', 'touch' => 100, 'gross_weight' => 10.000, 'net_weight' => 10.000],
            ],
        ])->assertStatus(200);

        $vaultGold->refresh();
        $this->assertEquals(75.000, (float)$vaultGold->current_balance, 'Vault stock must NOT decrease when material is carried-forward from bench');

        // Work order requirements must reflect 10g allocated
        $req = $this->actingAs($this->admin)->getJson("/api/work-orders/{$wo->id}/material-requirements")->json('data');
        $this->assertEquals(10.000, (float)$req['gold_requirement']['allocated_fine_gold']);
        $this->assertEquals(0.000, (float)$req['gold_requirement']['remaining_fine_gold']);
        $this->assertTrue($req['gold_requirement']['is_fully_allocated']);
    }

    /**
     * Test 14: Work Order completion does not automatically clear the Karigar's bench.
     */
    public function test_14_work_order_completion_preserves_unused_material_on_bench()
    {
        $this->setVaultGold(100.000);

        $wo = WorkOrder::create([
            'work_order_number' => 'WO-COMPLETION-TEST',
            'product_name' => 'Diamond Bangle',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 20.000,
            'material_type' => '24K Gold',
            'status' => 'active',
        ]);

        // Allocate 20g from vault
        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $wo->id,
            'materials' => [
                ['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'touch' => 100, 'gross_weight' => 20.000, 'net_weight' => 20.000],
            ],
        ])->assertStatus(200);

        // Receive 15g finished piece, leaving 5g unused on bench
        $piece = WorkOrderReceivedPiece::create([
            'work_order_id' => $wo->id,
            'piece_number' => 1,
            'design_no' => 'DES-COMP',
            'status' => 'ready',
            'qc_status' => 'passed',
        ]);

        $this->actingAs($this->admin)->postJson("/api/work-orders/{$wo->id}/receive-piece", [
            'piece_id' => $piece->id,
            'gross_weight' => 15.000,
            'net_gold_weight' => 15.000,
            'gold_karat' => '24K',
            'purity' => 100.0,
            'returned_gold_weight' => 0,
            'wastage_weight' => 0,
        ])->assertStatus(200);

        // Mark work order completed
        $wo->status = 'completed';
        $wo->save();

        // Verify Karigar bench still holds the remaining 5g
        $this->karigarA->refresh();
        $this->assertEquals(5.000, (float)$this->karigarA->current_gold_balance_grams, 'Completing work order must not clear unused bench material');
    }

    /**
     * Test 15: Physical returns update the bench and vault correctly.
     */
    public function test_15_physical_return_updates_bench_and_vault()
    {
        $vaultGold = $this->setVaultGold(100.000);

        // Allocate 30g
        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'materials' => [
                ['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'touch' => 100, 'gross_weight' => 30.000, 'net_weight' => 30.000],
            ],
        ])->assertStatus(200);

        $vaultGold->refresh();
        $this->assertEquals(70.000, (float)$vaultGold->current_balance);

        // Physical return of 10g from Karigar A back to vault
        $retRes = $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/material-action", [
            'action' => 'physical_return',
            'material_type' => 'gold',
            'weight' => 10.000,
            'purity' => '24K',
            'touch' => 100.0,
            'reason' => 'Returning excess pure gold casting grains to vault',
        ]);
        $retRes->assertStatus(200);

        // Karigar bench decreases to 20g (30 - 10)
        $this->karigarA->refresh();
        $this->assertEquals(20.000, (float)$this->karigarA->current_gold_balance_grams);

        // Vault stock increases back to 80g (70 + 10)
        $vaultGold->refresh();
        $this->assertEquals(80.000, (float)$vaultGold->current_balance);
    }

    /**
     * Test 16: Safe validation prevents exceeding remaining requirement when allow_excess is not permitted.
     */
    public function test_16_excess_allocation_blocked_when_unauthorized()
    {
        $this->setVaultGold(100.000);

        $wo = WorkOrder::create([
            'work_order_number' => 'WO-LIMIT-CHECK',
            'product_name' => 'Gold Kada',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 20.000,
            'material_type' => '24K Gold',
            'status' => 'active',
        ]);

        // Attempting to allocate 25g when only 20g is required, with allow_excess = false
        $res = $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $wo->id,
            'allow_excess' => false,
            'materials' => [
                ['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'touch' => 100, 'gross_weight' => 25.000, 'net_weight' => 25.000],
            ],
        ]);

        $res->assertStatus(422);
        $res->assertJsonFragment(['status' => 'error']);
    }

    /**
     * Test 17: Karigar Ledger endpoint includes material_requirements for assigned work orders.
     */
    public function test_17_karigar_ledger_includes_material_requirements_for_work_orders()
    {
        $wo = WorkOrder::create([
            'work_order_number' => 'WO-LEDGER-ATTACHED',
            'product_name' => 'Attached Order',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'allotted_date' => now()->toDateString(),
            'allotted_weight' => 15.000,
            'material_type' => '24K Gold',
            'status' => 'active',
            'stone_details' => [
                'diamonds' => [
                    ['stamp' => '+5 Sieve', 'stamp_id' => $this->stamp5->id, 'diamond_weight' => 0.850, 'pieces' => 5],
                ],
            ],
        ]);

        $res = $this->actingAs($this->admin)->getJson("/api/karigars/{$this->karigarA->id}/material-ledger");
        $res->assertStatus(200);

        $activeOrders = $res->json('data.active_work_orders');
        $this->assertNotEmpty($activeOrders);
        $targetWo = collect($activeOrders)->firstWhere('id', $wo->id);
        $this->assertNotNull($targetWo);
        $this->assertArrayHasKey('material_requirements', $targetWo);
        $this->assertEquals(15.000, (float)$targetWo['material_requirements']['gold_requirement']['required_fine_gold']);
        $this->assertEquals(0.850, (float)$targetWo['material_requirements']['diamond_requirements'][0]['required_carats']);
    }
}
