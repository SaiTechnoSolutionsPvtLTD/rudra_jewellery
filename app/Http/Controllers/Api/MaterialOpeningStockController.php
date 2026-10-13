<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MaterialOpeningStock;
use App\Models\RawMaterial;
use App\Models\PurchaseEntry;
use App\Models\InventoryMovement;
use App\Models\WorkOrder;
use App\Models\Stamp;
use App\Models\Karat;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class MaterialOpeningStockController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = MaterialOpeningStock::with(['rawMaterial', 'creator']);

            if ($request->has('material_type') && !empty($request->material_type)) {
                $query->where('material_type', strtolower($request->material_type));
            }

            $entries = $query->orderBy('id', 'desc')->get();
            return response()->json([
                'status' => 'success',
                'data' => $entries
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Error fetching opening stock entries: ' . $e->getMessage()
            ], 500);
        }
    }

    public function generateNo()
    {
        $latest = MaterialOpeningStock::orderBy('id', 'desc')->first();
        $nextNum = $latest ? ($latest->id + 1001) : 1001;
        $stockNo = 'OS-' . $nextNum;

        while (MaterialOpeningStock::where('stock_number', $stockNo)->exists()) {
            $nextNum++;
            $stockNo = 'OS-' . $nextNum;
        }

        return response()->json(['stock_number' => $stockNo]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'stock_number' => 'nullable|string|max:50',
            'material_type' => 'required|string|in:gold,diamond,stone,silver',
            'stamp' => 'nullable|string|max:50',
            'karat' => 'nullable|string|max:50',
            'purity' => 'nullable|numeric|min:0|max:100',
            'unit' => 'required|string|max:20',
            'weight' => 'nullable|numeric|min:0',
            'carat_weight' => 'nullable|numeric|min:0',
            'quantity' => 'nullable|numeric|min:0',
            'rate' => 'nullable|numeric|min:0',
            'total_value' => 'nullable|numeric|min:0',
            'entry_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        try {
            return DB::transaction(function () use ($validated, $request) {
                // Generate stock number if not provided
                if (empty($validated['stock_number'])) {
                    $latest = MaterialOpeningStock::orderBy('id', 'desc')->first();
                    $nextNum = $latest ? ($latest->id + 1001) : 1001;
                    $stockNo = 'OS-' . $nextNum;
                    while (MaterialOpeningStock::where('stock_number', $stockNo)->exists()) {
                        $nextNum++;
                        $stockNo = 'OS-' . $nextNum;
                    }
                    $validated['stock_number'] = $stockNo;
                }

                $matType = strtolower($validated['material_type']);
                $weight = floatval($validated['weight'] ?? 0);
                $caratWeight = floatval($validated['carat_weight'] ?? 0);
                $quantity = floatval($validated['quantity'] ?? 0);
                $rate = floatval($validated['rate'] ?? 0);

                // Auto-calculate total value if missing
                if (empty($validated['total_value']) || floatval($validated['total_value']) <= 0) {
                    if ($matType === 'diamond') {
                        $validated['total_value'] = ($caratWeight > 0) ? round($caratWeight * $rate, 2) : round($quantity * $rate, 2);
                    } elseif ($matType === 'stone') {
                        $validated['total_value'] = ($caratWeight > 0) ? round($caratWeight * $rate, 2) : round($quantity * $rate, 2);
                    } else {
                        $validated['total_value'] = round($weight * $rate, 2);
                    }
                }

                // Credit RawMaterial stock balance
                $creditWeight = ($matType === 'diamond') ? $caratWeight : (($matType === 'stone' && $caratWeight > 0) ? $caratWeight : $weight);
                $creditCount = $quantity;

                $rawMat = RawMaterial::creditOpeningStock(
                    $matType,
                    $creditWeight,
                    $creditCount,
                    $validated['unit']
                );

                $validated['raw_material_id'] = $rawMat?->id;
                $validated['created_by'] = Auth::id() ?? 1;

                $openingStock = MaterialOpeningStock::create($validated);

                // Create Inventory Movement
                if ($rawMat) {
                    InventoryMovement::create([
                        'raw_material_id' => $rawMat->id,
                        'material_opening_stock_id' => $openingStock->id,
                        'movement_type' => 'opening_stock',
                        'quantity' => $creditCount,
                        'weight' => $creditWeight,
                        'unit_cost' => $rate,
                        'notes' => "Opening stock entry {$openingStock->stock_number} ({$rawMat->name})",
                        'created_by' => Auth::id() ?? 1,
                    ]);
                }

                return response()->json([
                    'status' => 'success',
                    'message' => 'Material opening stock recorded successfully!',
                    'data' => $openingStock->fresh(['rawMaterial', 'creator']),
                    'updated_raw_material' => $rawMat
                ], 201);
            });
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to save opening stock: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            return DB::transaction(function () use ($id) {
                $stock = MaterialOpeningStock::lockForUpdate()->find($id);
                if (!$stock) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Opening stock entry not found'
                    ], 404);
                }

                $matType = $stock->material_type;
                $rawMat = RawMaterial::where('material_type', $matType)->lockForUpdate()->first();

                if ($rawMat) {
                    $deductWeight = ($matType === 'diamond') ? floatval($stock->carat_weight) : floatval($stock->weight);
                    $deductCount = floatval($stock->quantity);

                    $rawMat->opening_weight = max(0, round(($rawMat->opening_weight ?? 0) - $deductWeight, 3));
                    $rawMat->opening_count = max(0, round(($rawMat->opening_count ?? 0) - $deductCount, 3));
                    $rawMat->current_balance = max(0, round(($rawMat->opening_weight ?? 0) + $rawMat->purchased_weight - $rawMat->allocated_weight, 3));
                    $rawMat->current_count = max(0, round(($rawMat->opening_count ?? 0) + ($rawMat->purchased_count ?? 0) - ($rawMat->allocated_count ?? 0), 3));
                    $rawMat->save();
                }

                // Delete linked movement
                InventoryMovement::where('material_opening_stock_id', $stock->id)->delete();

                $stock->delete();

                return response()->json([
                    'status' => 'success',
                    'message' => 'Opening stock entry reversed successfully!',
                    'updated_raw_material' => $rawMat
                ]);
            });
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to reverse opening stock: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Unified Available Stock View with Diamond Stock by Stamp
     */
    public function unifiedStock()
    {
        try {
            // 1. Authoritative Diamond Stock with breakdown by stamp/grade
            $diamondRaw = RawMaterial::where('material_type', 'diamond')->first();
            $diamondOpening = MaterialOpeningStock::where('material_type', 'diamond')->get();
            $diamondPurchases = PurchaseEntry::where('purchase_type', 'raw_material')
                ->where('metal_type', 'diamond')
                ->get();

            // Diamond stamps from masters
            $diamondStampMasters = Stamp::where('applicable_for', 'diamond')
                ->orWhere('applicable_for', 'all')
                ->get();

            $diamondBreakdown = [];
            $allDiamondStamps = collect();

            foreach ($diamondOpening as $op) {
                $st = trim($op->stamp ?: 'Unclassified');
                if ($st) $allDiamondStamps->push($st);
            }
            foreach ($diamondPurchases as $pur) {
                $st = trim($pur->purity ?: ($pur->item_name ?: 'Unclassified'));
                if ($st) $allDiamondStamps->push($st);
            }
            foreach ($diamondStampMasters as $m) {
                $allDiamondStamps->push(trim($m->name));
            }

            $uniqueStamps = $allDiamondStamps->unique()->values();

            $totalDiaCarats = 0.0;
            $totalDiaCount = 0.0;

            foreach ($uniqueStamps as $st) {
                $opCts = (float) $diamondOpening->filter(fn($o) => strcasecmp(trim($o->stamp ?? ''), $st) === 0)->sum('carat_weight');
                $opPcs = (float) $diamondOpening->filter(fn($o) => strcasecmp(trim($o->stamp ?? ''), $st) === 0)->sum('quantity');

                $purCts = (float) $diamondPurchases->filter(fn($p) => strcasecmp(trim($p->purity ?? ''), $st) === 0 || strcasecmp(trim($p->item_name ?? ''), $st) === 0)->sum('weight');
                $purPcs = (float) $diamondPurchases->filter(fn($p) => strcasecmp(trim($p->purity ?? ''), $st) === 0 || strcasecmp(trim($p->item_name ?? ''), $st) === 0)->sum('count_qty');

                $availCts = round($opCts + $purCts, 3);
                $availPcs = round($opPcs + $purPcs, 0);

                if ($availCts > 0 || $availPcs > 0 || $diamondStampMasters->pluck('name')->contains($st)) {
                    $diamondBreakdown[] = [
                        'stamp' => $st,
                        'available_carats' => $availCts,
                        'available_count' => $availPcs,
                        'unit' => 'ct',
                    ];
                }

                $totalDiaCarats += $availCts;
                $totalDiaCount += $availPcs;
            }

            // Deduct allocated diamond from work orders
            $activeWorkOrders = WorkOrder::whereNotIn('status', ['completed', 'cancelled', 'final_received', 'delivered'])->get();
            $allocatedDiaCarats = (float) $activeWorkOrders->sum('total_dia_cts');
            $allocatedDiaCount = (float) $activeWorkOrders->sum('total_dia_pcs');

            // If raw material master has authoritative current_balance, respect it
            if ($diamondRaw) {
                $authoritativeCarats = max(0.0, round((float)$diamondRaw->current_balance, 3));
                $authoritativeCount = max(0.0, round((float)$diamondRaw->current_count, 0));
                if ($authoritativeCarats > 0 || $totalDiaCarats == 0) {
                    $totalDiaCarats = $authoritativeCarats;
                    $totalDiaCount = $authoritativeCount;
                }
            } else {
                $totalDiaCarats = max(0.0, round($totalDiaCarats - $allocatedDiaCarats, 3));
                $totalDiaCount = max(0.0, round($totalDiaCount - $allocatedDiaCount, 0));
            }

            // 2. Gold stock breakdown by Karat / Purity
            $goldRaw = RawMaterial::where('material_type', 'gold')->first();
            $goldOpening = MaterialOpeningStock::where('material_type', 'gold')->get();
            $goldPurchases = PurchaseEntry::where('purchase_type', 'raw_material')
                ->where('metal_type', 'gold')
                ->get();

            $goldBreakdown = [];
            $goldKarats = Karat::all();
            foreach ($goldKarats as $k) {
                $kName = $k->name;
                $opWt = (float) $goldOpening->filter(fn($o) => strcasecmp(trim($o->karat ?? ''), $kName) === 0 || strcasecmp(trim($o->stamp ?? ''), $kName) === 0)->sum('weight');
                $purWt = (float) $goldPurchases->filter(fn($p) => stripos($p->purity ?? '', $kName) !== false || stripos($p->item_name ?? '', $kName) !== false)->sum('weight');
                $goldBreakdown[] = [
                    'karat' => $kName,
                    'available_weight' => round($opWt + $purWt, 3),
                    'unit' => 'g'
                ];
            }

            $totalGoldWeight = $goldRaw ? round((float)$goldRaw->current_balance, 3) : round((float)$goldOpening->sum('weight') + (float)$goldPurchases->sum('weight'), 3);

            // 3. Silver Stock
            $silverRaw = RawMaterial::where('material_type', 'silver')->first();
            $silverOpening = MaterialOpeningStock::where('material_type', 'silver')->get();
            $silverPurchases = PurchaseEntry::where('purchase_type', 'raw_material')->where('metal_type', 'silver')->get();
            $totalSilverWeight = $silverRaw ? round((float)$silverRaw->current_balance, 3) : round((float)$silverOpening->sum('weight') + (float)$silverPurchases->sum('weight'), 3);

            // 4. Colour Stones Stock
            $stoneRaw = RawMaterial::where('material_type', 'stone')->first();
            $stoneOpening = MaterialOpeningStock::where('material_type', 'stone')->get();
            $stonePurchases = PurchaseEntry::where('purchase_type', 'raw_material')->where('metal_type', 'stone')->get();
            $totalStoneWeight = $stoneRaw ? round((float)$stoneRaw->current_balance, 3) : round((float)$stoneOpening->sum('weight') + (float)$stonePurchases->sum('weight'), 3);
            $totalStoneCount = $stoneRaw ? round((float)$stoneRaw->current_count, 0) : round((float)$stoneOpening->sum('quantity') + (float)$stonePurchases->sum('count_qty'), 0);

            // Unified readable table rows
            $unifiedRows = [
                [
                    'material_type' => 'Gold',
                    'stamp_grade' => '22K916 / 24K',
                    'karat' => '22K / 24K',
                    'unit' => 'g',
                    'available_weight' => $totalGoldWeight,
                    'available_carat_weight' => null,
                    'available_quantity' => null,
                ],
                [
                    'material_type' => 'Diamond',
                    'stamp_grade' => 'All Diamond Grades (' . count($diamondBreakdown) . ' Stamps)',
                    'karat' => '—',
                    'unit' => 'ct',
                    'available_weight' => round($totalDiaCarats * 0.2, 3),
                    'available_carat_weight' => $totalDiaCarats,
                    'available_quantity' => $totalDiaCount,
                ],
                [
                    'material_type' => 'Colour Stones',
                    'stamp_grade' => 'Precious & Semi-Precious',
                    'karat' => '—',
                    'unit' => 'ct / pcs',
                    'available_weight' => $totalStoneWeight,
                    'available_carat_weight' => $totalStoneWeight,
                    'available_quantity' => $totalStoneCount,
                ],
                [
                    'material_type' => 'Silver',
                    'stamp_grade' => '92.5 Sterling / Fine Silver',
                    'karat' => '925',
                    'unit' => 'g',
                    'available_weight' => $totalSilverWeight,
                    'available_carat_weight' => null,
                    'available_quantity' => null,
                ],
            ];

            return response()->json([
                'status' => 'success',
                'summary' => [
                    'diamond_total_carats' => $totalDiaCarats,
                    'diamond_total_count' => $totalDiaCount,
                    'gold_total_weight' => $totalGoldWeight,
                    'silver_total_weight' => $totalSilverWeight,
                    'stone_total_count' => $totalStoneCount,
                ],
                'diamond_by_stamp' => $diamondBreakdown,
                'gold_by_karat' => $goldBreakdown,
                'unified_rows' => $unifiedRows,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to calculate unified stock: ' . $e->getMessage()
            ], 500);
        }
    }
}
