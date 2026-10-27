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

class PersistentKarigarMaterialBenchTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;
    protected Karigar $karigarA;
    protected Karigar $karigarB;
    protected Category $category;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::factory()->create(['role' => 'admin']);

        $this->karigarA = Karigar::create([
            'karigar_code' => 'KAR-BENCH-01',
            'name' => 'Karigar A (Goldsmith)',
            'primary_phone' => '9840000001',
            'status' => 'active',
            'specialization' => 'Gold Casting & Setting',
            'current_gold_balance_grams' => 0.000,
        ]);

        $this->karigarB = Karigar::create([
            'karigar_code' => 'KAR-BENCH-02',
            'name' => 'Karigar B (Diamond Setter)',
            'primary_phone' => '9840000002',
            'status' => 'active',
            'specialization' => 'Diamond Setting',
            'current_gold_balance_grams' => 0.000,
        ]);

        $this->category = Category::create([
            'name' => 'Gold Jewellery',
            'code' => 'GJ-01',
            'status' => 'active',
        ]);

        RawMaterial::updateOrCreate(
            ['material_type' => 'gold'],
            [
                'name' => 'Raw Gold',
                'unit' => 'g',
                'opening_weight' => 0.000,
                'purchased_weight' => 0.000,
                'allocated_weight' => 0.000,
                'current_balance' => 0.000,
            ]
        );

        RawMaterial::updateOrCreate(
            ['material_type' => 'diamond'],
            [
                'name' => 'Raw Diamond',
                'unit' => 'ct',
                'opening_weight' => 0.000,
                'opening_count' => 0,
                'purchased_weight' => 0.000,
                'purchased_count' => 0,
                'allocated_weight' => 0.000,
                'allocated_count' => 0,
                'current_balance' => 0.000,
                'current_count' => 0,
            ]
        );

        RawMaterial::updateOrCreate(
            ['material_type' => 'stone'],
            [
                'name' => 'Raw Stone',
                'unit' => 'units',
                'opening_weight' => 0.000,
                'opening_count' => 0,
                'purchased_weight' => 0.000,
                'purchased_count' => 0,
                'allocated_weight' => 0.000,
                'allocated_count' => 0,
                'current_balance' => 0.000,
                'current_count' => 0,
            ]
        );
    }

    /**
     * Scenarios 1 to 5: Core Worked Reconciliation Workflow
     * 100g Vault -> Issue 50g -> Consume 45g -> 5g bench -> WO Complete (no return) ->
     * Issue 20g (25g bench, vault -20g) -> Consume 18g (7g bench) ->
     * Return 2g to vault (5g bench, vault +2g).
     */
    public function test_scenarios_1_to_5_complete_reconciliation_workflow(): void
    {
        // Vault Opening: 100g pure 24K gold
        RawMaterial::creditOpeningStock('gold', 100.000);
        $vaultGold = RawMaterial::where('material_type', 'gold')->first();
        $this->assertEquals(100.000, (float)$vaultGold->current_balance);

        // Create Work Order 1 for Karigar A (1 piece, required_weight = 45g)
        $wo1 = WorkOrder::create([
            'work_order_number' => 'WO-BENCH-001',
            'product_name' => 'Gold Bangle 24K',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'required_qty' => 1,
            'allotted_date' => now()->toDateString(),
            'gold_weight' => 45.000,
            'gold_purity' => '24K',
            'touch' => 100.0,
            'allotted_weight' => 0,
            'pending_weight' => 0,
            'status' => 'draft',
            'current_stage' => 'draft',
        ]);

        // STEP 1: Allocate 50g to Karigar A for WO-BENCH-001 from Company Vault
        $respAlloc1 = $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $wo1->id,
            'allocation_date' => now()->toDateString(),
            'notes' => 'Allocating 50g 24K gold for WO-BENCH-001',
            'materials' => [
                [
                    'source' => 'vault',
                    'material_type' => 'gold',
                    'purity' => '24K',
                    'touch' => 100.0,
                    'gross_weight' => 50.000,
                    'net_weight' => 50.000,
                    'fine_weight' => 50.000,
                ],
            ],
        ]);
        $respAlloc1->assertStatus(200);

        // Verify: Company vault decreases by 50g (100 - 50 = 50g)
        $vaultGold->refresh();
        $this->assertEquals(50.000, (float)$vaultGold->current_balance, 'Vault should decrease by 50g');

        // Verify: Karigar A bench increases by 50g
        $this->karigarA->refresh();
        $this->assertEquals(50.000, (float)$this->karigarA->current_gold_balance_grams, 'Karigar A bench should be 50g');

        // STEP 2: Karigar uses 45g in finished jewellery, 0 wastage, 0 physical return
        $piece1 = WorkOrderReceivedPiece::create([
            'work_order_id' => $wo1->id,
            'piece_number' => 1,
            'design_no' => 'DES-001',
            'status' => 'ready',
            'qc_status' => 'passed',
        ]);

        $respReceive1 = $this->actingAs($this->admin)->postJson("/api/work-orders/{$wo1->id}/receive-piece", [
            'piece_id' => $piece1->id,
            'gross_weight' => 45.000,
            'net_gold_weight' => 45.000,
            'gold_karat' => '24K',
            'purity' => 100.0,
            'returned_gold_weight' => 0,
            'wastage_weight' => 0,
            'making_charge_rate' => 100,
            'making_charge_type' => 'fixed',
        ]);
        $respReceive1->assertStatus(200);

        // 45g accounted for as production consumption -> 5g remains on Karigar bench
        $this->karigarA->refresh();
        $this->assertEquals(5.000, (float)$this->karigarA->current_gold_balance_grams, '5g must remain on Karigar bench');

        // Company vault remains at 50g (finished jewellery is NOT raw gold returned to vault!)
        $vaultGold->refresh();
        $this->assertEquals(50.000, (float)$vaultGold->current_balance, 'Vault remains 50g during production consumption');

        // STEP 3: Complete Work Order 1
        $wo1->refresh();
        $wo1->status = 'completed';
        $wo1->current_stage = 'completed';
        $wo1->save();

        // Recalculate allocations and balances
        RawMaterial::recalculateAllocations();
        app(\App\Http\Controllers\Api\KarigarMaterialController::class)->syncKarigarBalances($this->karigarA);
        $this->karigarA->refresh();
        $vaultGold->refresh();

        // CRITICAL RULE: Completing work order must NOT return the 5g to the vault or clear the Karigar bench!
        $this->assertEquals(5.000, (float)$this->karigarA->current_gold_balance_grams, '5g remains with Karigar after work order completion');
        $this->assertEquals(50.000, (float)$vaultGold->current_balance, 'Vault remains at 50g after work order completion');

        // STEP 4: Allocate another 20g from Company Vault to the same Karigar for Work Order 2
        $wo2 = WorkOrder::create([
            'work_order_number' => 'WO-BENCH-002',
            'product_name' => 'Gold Chain 24K',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'required_qty' => 1,
            'allotted_date' => now()->toDateString(),
            'gold_weight' => 20.000,
            'gold_purity' => '24K',
            'touch' => 100.0,
            'allotted_weight' => 0,
            'pending_weight' => 0,
            'status' => 'draft',
            'current_stage' => 'draft',
        ]);

        $respAlloc2 = $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $wo2->id,
            'allocation_date' => now()->toDateString(),
            'notes' => 'Allocating additional 20g 24K gold for WO-BENCH-002',
            'materials' => [
                [
                    'source' => 'vault',
                    'material_type' => 'gold',
                    'purity' => '24K',
                    'touch' => 100.0,
                    'gross_weight' => 20.000,
                    'net_weight' => 20.000,
                    'fine_weight' => 20.000,
                ],
            ],
        ]);
        $respAlloc2->assertStatus(200);

        // Vault decreases only by 20g (50 - 20 = 30g)
        $vaultGold->refresh();
        $this->assertEquals(30.000, (float)$vaultGold->current_balance, 'Vault decreases by 20g to 30g');

        // Karigar bench becomes 25g (5g carried forward + 20g newly issued)
        $this->karigarA->refresh();
        $this->assertEquals(25.000, (float)$this->karigarA->current_gold_balance_grams, 'Bench becomes 25g (5g carried forward + 20g newly issued)');

        // STEP 5: Karigar uses 18g in finished jewellery on WO 2
        $piece2 = WorkOrderReceivedPiece::create([
            'work_order_id' => $wo2->id,
            'piece_number' => 1,
            'design_no' => 'DES-002',
            'status' => 'ready',
            'qc_status' => 'passed',
        ]);

        $respReceive2 = $this->actingAs($this->admin)->postJson("/api/work-orders/{$wo2->id}/receive-piece", [
            'piece_id' => $piece2->id,
            'gross_weight' => 18.000,
            'net_gold_weight' => 18.000,
            'gold_karat' => '24K',
            'purity' => 100.0,
            'returned_gold_weight' => 0,
            'wastage_weight' => 0,
        ]);
        $respReceive2->assertStatus(200);

        // Remaining bench becomes 7g (25g - 18g = 7g)
        $this->karigarA->refresh();
        $this->assertEquals(7.000, (float)$this->karigarA->current_gold_balance_grams, 'Bench becomes 7g after 18g consumption');

        // STEP 6: Karigar physically returns 2g to the company vault
        $respReturn = $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/material-action", [
            'action_type' => 'physical_return',
            'material_type' => 'gold',
            'weight' => 2.000,
            'purity' => '24K',
            'reason' => 'Physical return of 2g unworked gold bullion to company vault',
        ]);
        $respReturn->assertStatus(200);

        // Karigar bench decreases by 2g to 5g
        $this->karigarA->refresh();
        $this->assertEquals(5.000, (float)$this->karigarA->current_gold_balance_grams, 'Bench decreases by 2g to 5g');

        // Company vault increases by 2g to 32g
        $vaultGold->refresh();
        $this->assertEquals(32.000, (float)$vaultGold->current_balance, 'Vault increases by 2g to 32g');
    }

    /**
     * Scenario 6: Repeated receipt or duplicate requests do not double-post material.
     */
    public function test_scenario_6_duplicate_receipt_requests_do_not_double_post(): void
    {
        RawMaterial::creditOpeningStock('gold', 50.000);

        $wo = WorkOrder::create([
            'work_order_number' => 'WO-BENCH-DUP',
            'product_name' => 'Gold Ring 24K',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'required_qty' => 1,
            'allotted_date' => now()->toDateString(),
            'gold_weight' => 10.000,
            'allotted_weight' => 0,
            'pending_weight' => 0,
            'status' => 'draft',
        ]);

        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $wo->id,
            'materials' => [
                [
                    'source' => 'vault',
                    'material_type' => 'gold',
                    'purity' => '24K',
                    'touch' => 100.0,
                    'gross_weight' => 10.000,
                    'net_weight' => 10.000,
                    'fine_weight' => 10.000,
                ],
            ],
        ])->assertStatus(200);

        $this->karigarA->refresh();
        $this->assertEquals(10.000, (float)$this->karigarA->current_gold_balance_grams);

        $piece = WorkOrderReceivedPiece::create([
            'work_order_id' => $wo->id,
            'piece_number' => 1,
            'design_no' => 'DES-DUP',
            'status' => 'ready',
            'qc_status' => 'passed',
        ]);

        // First receipt
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$wo->id}/receive-piece", [
            'piece_id' => $piece->id,
            'gross_weight' => 8.000,
            'net_gold_weight' => 8.000,
            'gold_karat' => '24K',
            'purity' => 100.0,
        ])->assertStatus(200);

        $this->karigarA->refresh();
        $this->assertEquals(2.000, (float)$this->karigarA->current_gold_balance_grams);

        // Duplicate receipt attempt on the same piece
        $respDuplicate = $this->actingAs($this->admin)->postJson("/api/work-orders/{$wo->id}/receive-piece", [
            'piece_id' => $piece->id,
            'gross_weight' => 8.000,
            'net_gold_weight' => 8.000,
            'gold_karat' => '24K',
            'purity' => 100.0,
        ]);
        // Controller returns 409 Conflict if already received
        $this->assertTrue(in_array($respDuplicate->status(), [409, 422]));

        // Bench balance must NOT double-deduct
        $this->karigarA->refresh();
        $this->assertEquals(2.000, (float)$this->karigarA->current_gold_balance_grams);
    }

    /**
     * Scenario 7: Partial work-order receipt does not clear unrelated bench material.
     */
    public function test_scenario_7_partial_receipt_does_not_clear_unrelated_bench_material(): void
    {
        RawMaterial::creditOpeningStock('gold', 100.000);

        // Pre-existing bench gold from previous work
        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'materials' => [
                ['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'touch' => 100.0, 'gross_weight' => 15.000],
            ],
        ])->assertStatus(200);

        $this->karigarA->refresh();
        $this->assertEquals(15.000, (float)$this->karigarA->current_gold_balance_grams);

        // Multi-piece work order (2 pieces, 10g each)
        $wo = WorkOrder::create([
            'work_order_number' => 'WO-BENCH-MULTI',
            'product_name' => 'Gold Bangles Pair',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'required_qty' => 2,
            'allotted_date' => now()->toDateString(),
            'gold_weight' => 20.000,
            'allotted_weight' => 0,
            'status' => 'draft',
        ]);

        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $wo->id,
            'materials' => [
                ['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'touch' => 100.0, 'gross_weight' => 20.000],
            ],
        ])->assertStatus(200);

        // Total bench = 15 + 20 = 35g
        $this->karigarA->refresh();
        $this->assertEquals(35.000, (float)$this->karigarA->current_gold_balance_grams);

        // Receive only piece #1 (10g)
        $piece1 = WorkOrderReceivedPiece::create([
            'work_order_id' => $wo->id,
            'piece_number' => 1,
            'design_no' => 'DES-MULTI',
            'status' => 'ready',
            'qc_status' => 'passed',
        ]);

        $this->actingAs($this->admin)->postJson("/api/work-orders/{$wo->id}/receive-piece", [
            'piece_id' => $piece1->id,
            'gross_weight' => 10.000,
            'net_gold_weight' => 10.000,
            'gold_karat' => '24K',
            'purity' => 100.0,
        ])->assertStatus(200);

        // Bench = 35 - 10 = 25g (preserves the unrelated 15g + unreceived 10g)
        $this->karigarA->refresh();
        $this->assertEquals(25.000, (float)$this->karigarA->current_gold_balance_grams);
    }

    /**
     * Scenario 8: Multiple work orders for same Karigar preserve one correct running balance.
     */
    public function test_scenario_8_multiple_work_orders_preserve_one_running_balance(): void
    {
        RawMaterial::creditOpeningStock('gold', 100.000);

        $woA = WorkOrder::create([
            'work_order_number' => 'WO-MULT-A',
            'product_name' => 'Product A',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'required_qty' => 1,
            'allotted_date' => now()->toDateString(),
            'gold_weight' => 10.000,
            'allotted_weight' => 0,
            'status' => 'draft',
        ]);

        $woB = WorkOrder::create([
            'work_order_number' => 'WO-MULT-B',
            'product_name' => 'Product B',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'required_qty' => 1,
            'allotted_date' => now()->toDateString(),
            'gold_weight' => 15.000,
            'allotted_weight' => 0,
            'status' => 'draft',
        ]);

        // Issue 10g for WO A and 15g for WO B
        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $woA->id,
            'materials' => [['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'gross_weight' => 10.000]],
        ])->assertStatus(200);

        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $woB->id,
            'materials' => [['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'gross_weight' => 15.000]],
        ])->assertStatus(200);

        // Bench should be 25g
        $this->karigarA->refresh();
        $this->assertEquals(25.000, (float)$this->karigarA->current_gold_balance_grams);

        // Receive WO A (10g consumed)
        $pA = WorkOrderReceivedPiece::create(['work_order_id' => $woA->id, 'piece_number' => 1, 'design_no' => 'DES-A', 'status' => 'ready', 'qc_status' => 'passed']);
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$woA->id}/receive-piece", [
            'piece_id' => $pA->id,
            'gross_weight' => 10.000,
            'net_gold_weight' => 10.000,
            'gold_karat' => '24K',
            'purity' => 100.0,
        ])->assertStatus(200);

        // Complete WO A
        $woA->status = 'completed';
        $woA->save();
        RawMaterial::recalculateAllocations();
        app(\App\Http\Controllers\Api\KarigarMaterialController::class)->syncKarigarBalances($this->karigarA);

        // Bench should be 15g (WO B remains active)
        $this->karigarA->refresh();
        $this->assertEquals(15.000, (float)$this->karigarA->current_gold_balance_grams);
    }

    /**
     * Scenario 9: Two Karigars' balances remain completely independent.
     */
    public function test_scenario_9_two_karigars_balances_remain_independent(): void
    {
        RawMaterial::creditOpeningStock('gold', 100.000);

        // Allocate 30g to Karigar A
        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'materials' => [['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'gross_weight' => 30.000]],
        ])->assertStatus(200);

        // Allocate 20g to Karigar B
        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarB->id}/allocate-materials", [
            'materials' => [['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'gross_weight' => 20.000]],
        ])->assertStatus(200);

        $this->karigarA->refresh();
        $this->karigarB->refresh();
        $this->assertEquals(30.000, (float)$this->karigarA->current_gold_balance_grams);
        $this->assertEquals(20.000, (float)$this->karigarB->current_gold_balance_grams);

        // Karigar A physically returns 5g to vault
        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/material-action", [
            'action_type' => 'physical_return',
            'material_type' => 'gold',
            'weight' => 5.000,
            'purity' => '24K',
            'reason' => 'Vault return from A',
        ])->assertStatus(200);

        $this->karigarA->refresh();
        $this->karigarB->refresh();
        $this->assertEquals(25.000, (float)$this->karigarA->current_gold_balance_grams);
        $this->assertEquals(20.000, (float)$this->karigarB->current_gold_balance_grams, 'Karigar B balance must remain unaffected');
    }

    /**
     * Scenario 10: Gold purity/fine-weight calculations reconcile without mixing physical and fine weight.
     */
    public function test_scenario_10_gold_purity_fine_weight_reconciles_without_mixing(): void
    {
        RawMaterial::creditOpeningStock('gold', 100.000);

        // Allocate 22K gold (91.6% touch): 10g physical -> 9.16g fine
        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'materials' => [
                [
                    'source' => 'vault',
                    'material_type' => 'gold',
                    'purity' => '22K',
                    'touch' => 91.6,
                    'gross_weight' => 10.000,
                    'net_weight' => 10.000,
                ],
            ],
        ])->assertStatus(200);

        $vaultGold = RawMaterial::where('material_type', 'gold')->first();
        // 9.16g debited from vault in 24K fine equivalent
        $this->assertEquals(90.840, (float)$vaultGold->current_balance);

        $this->karigarA->refresh();
        $this->assertEquals(9.160, (float)$this->karigarA->current_gold_balance_grams);
    }

    /**
     * Scenario 11: Diamond and stone balances reconcile independently by master/stamp.
     */
    public function test_scenario_11_diamond_and_stone_balances_reconcile_by_stamp(): void
    {
        RawMaterial::creditOpeningStock('diamond', 50.000, 100);

        $stampVvs = Stamp::create(['name' => 'VVS-E', 'code' => 'ST-VVS-E', 'type' => 'diamond', 'status' => 'active']);
        $stampVs = Stamp::create(['name' => 'VS-G', 'code' => 'ST-VS-G', 'type' => 'diamond', 'status' => 'active']);

        // Issue 5ct (10 pcs) of VVS-E and 3ct (5 pcs) of VS-G
        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'materials' => [
                ['source' => 'vault', 'material_type' => 'diamond', 'stamp' => 'VVS-E', 'pieces' => 10, 'gross_weight' => 5.000],
                ['source' => 'vault', 'material_type' => 'diamond', 'stamp' => 'VS-G', 'pieces' => 5, 'gross_weight' => 3.000],
            ],
        ])->assertStatus(200);

        // Fetch ledger breakdown
        $respLedger = $this->actingAs($this->admin)->getJson("/api/karigars/{$this->karigarA->id}/material-ledger");
        $respLedger->assertStatus(200);

        $diaData = $respLedger->json('data.summary');
        $this->assertEquals(8.000, (float)$diaData['diamond_on_bench']);
        $this->assertEquals(15, (int)$diaData['diamond_count_on_bench']);
    }

    /**
     * Scenario 12: Finished jewellery is not credited as raw vault material.
     */
    public function test_scenario_12_finished_jewellery_not_credited_as_raw_vault_material(): void
    {
        RawMaterial::creditOpeningStock('gold', 100.000);
        $vaultGold = RawMaterial::where('material_type', 'gold')->first();

        $wo = WorkOrder::create([
            'work_order_number' => 'WO-FG-NOT-RAW',
            'product_name' => 'Solitaire Necklace',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'required_qty' => 1,
            'allotted_date' => now()->toDateString(),
            'gold_weight' => 30.000,
            'allotted_weight' => 0,
            'status' => 'draft',
        ]);

        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $wo->id,
            'materials' => [['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'gross_weight' => 30.000]],
        ])->assertStatus(200);

        $vaultGold->refresh();
        $this->assertEquals(70.000, (float)$vaultGold->current_balance);

        $piece = WorkOrderReceivedPiece::create(['work_order_id' => $wo->id, 'piece_number' => 1, 'design_no' => 'DES-FG', 'status' => 'ready', 'qc_status' => 'passed']);
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$wo->id}/receive-piece", [
            'piece_id' => $piece->id,
            'gross_weight' => 30.000,
            'net_gold_weight' => 30.000,
            'gold_karat' => '24K',
            'purity' => 100.0,
        ])->assertStatus(200);

        // Vault MUST remain 70g (finished goods go into inventory, NOT raw gold bullion vault)
        $vaultGold->refresh();
        $this->assertEquals(70.000, (float)$vaultGold->current_balance, 'Finished jewellery must not credit raw vault');
    }

    /**
     * Scenario 13: Approved wastage is recorded separately from material retained or returned.
     */
    public function test_scenario_13_approved_wastage_recorded_separately(): void
    {
        RawMaterial::creditOpeningStock('gold', 100.000);

        $wo = WorkOrder::create([
            'work_order_number' => 'WO-WASTAGE-01',
            'product_name' => 'Gold Chain',
            'category_id' => $this->category->id,
            'karigar_id' => $this->karigarA->id,
            'required_qty' => 1,
            'allotted_date' => now()->toDateString(),
            'gold_weight' => 20.000,
            'allotted_weight' => 0,
            'status' => 'draft',
        ]);

        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'work_order_id' => $wo->id,
            'materials' => [['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'gross_weight' => 20.000]],
        ])->assertStatus(200);

        // Receive piece: 18g finished product, 1g approved wastage, 1g retained on bench
        $piece = WorkOrderReceivedPiece::create(['work_order_id' => $wo->id, 'piece_number' => 1, 'design_no' => 'DES-WASTE', 'status' => 'ready', 'qc_status' => 'passed']);
        $this->actingAs($this->admin)->postJson("/api/work-orders/{$wo->id}/receive-piece", [
            'piece_id' => $piece->id,
            'gross_weight' => 18.000,
            'net_gold_weight' => 18.000,
            'gold_karat' => '24K',
            'purity' => 100.0,
            'wastage_weight' => 1.000,
            'returned_gold_weight' => 0.000, // Retained on bench, not returned to vault
        ])->assertStatus(200);

        // Remaining bench balance: 20 - 18 - 1 = 1g
        $this->karigarA->refresh();
        $this->assertEquals(1.000, (float)$this->karigarA->current_gold_balance_grams);

        // Check KarigarMaterialTransaction records
        $wastageTx = KarigarMaterialTransaction::where('karigar_id', $this->karigarA->id)
            ->where('transaction_type', 'approved_wastage')
            ->first();
        $this->assertNotNull($wastageTx);
        $this->assertEquals(1.000, (float)$wastageTx->fine_weight);
    }

    /**
     * Scenario 14: Ledger totals match underlying material transactions and vault stock.
     */
    public function test_scenario_14_ledger_totals_match_underlying_transactions(): void
    {
        RawMaterial::creditOpeningStock('gold', 100.000);

        $this->actingAs($this->admin)->postJson("/api/karigars/{$this->karigarA->id}/allocate-materials", [
            'materials' => [['source' => 'vault', 'material_type' => 'gold', 'purity' => '24K', 'gross_weight' => 25.000]],
        ])->assertStatus(200);

        $respLedger = $this->actingAs($this->admin)->getJson("/api/karigars/{$this->karigarA->id}/material-ledger");
        $respLedger->assertStatus(200);

        $summary = $respLedger->json('data.summary');
        $this->assertEquals(25.000, (float)$summary['total_issued_fine']);
        $this->assertEquals(25.000, (float)$summary['outstanding_gold_fine']);

        // Check vault balance
        $vaultGold = RawMaterial::where('material_type', 'gold')->first();
        $this->assertEquals(75.000, (float)$vaultGold->current_balance);
        $this->assertEquals(25.000, (float)$vaultGold->allocated_weight);
    }
}
