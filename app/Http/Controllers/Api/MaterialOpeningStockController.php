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
            \Illuminate\Support\Facades\Log::error('Error fetching opening stock entries: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Unable to fetch opening stock entries (500). Please try again later.'
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
            'material_type' => 'required|string|in:gold,diamond,stone,silver,platinum',
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

                $validated['weight'] = round($weight, 3);
                $validated['carat_weight'] = round($caratWeight, 3);
                $validated['quantity'] = round($quantity, 3);
                $validated['rate'] = round($rate, 2);
                $validated['total_value'] = round(floatval($validated['total_value'] ?? 0), 2);
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
            \Illuminate\Support\Facades\Log::error('Failed to save opening stock: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to save opening stock (500). Please try again later.'
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
            \Illuminate\Support\Facades\Log::error('Failed to reverse opening stock: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to reverse opening stock (500). Please try again later.'
            ], 500);
        }
    }

    /**
     * Helper to check if a string represents a diamond clarity/color grade rather than a sieve stamp
     */
    public static function isClarityGrade(?string $val): bool
    {
        if (empty($val)) return false;
        $clean = trim($val);
        // Sieve stamps usually have numbers or +, e.g. +0, +2, +9.5, -2, DI12, D-01
        if (preg_match('/^[+\-]?\d+(?:\.\d+)?(?:\s*(?:stone|sieve|mesh))?$/i', $clean) || preg_match('/^D(?:I|IA)?[\-\s]?\d+/i', $clean)) {
            return false;
        }
        // Clarity grades: VVS1, VVS2, VVS, VS1, VS2, VS, SI1, SI2, SI, I1, I2, I3, FL, IF, EF, GH, IJ, etc.
        return (bool) preg_match('/^(?:FL|IF|VVS[12]?|VS[12]?|SI[12]?|I[1-3])(?:\s*[\/\-]\s*(?:EF|GH|IJ|[A-Z]{1,2}))?$/i', $clean)
            || (bool) preg_match('/^(?:EF|GH|IJ)$/i', $clean);
    }

    /**
     * Unified Available Stock View with Diamond Stock by Stamp
     */
    public function unifiedStock()
    {
        try {
            // 1. Authoritative Diamond Stock with breakdown by stamp/grade
            $diamondOpening = MaterialOpeningStock::where('material_type', 'diamond')->get();
            $diamondPurchases = PurchaseEntry::where(function($q) {
                $q->where('purchase_type', 'raw_material')
                  ->orWhereNull('purchase_type');
            })
            ->where(function($q) {
                $q->whereRaw('LOWER(metal_type) = ?', ['diamond'])
                  ->orWhere('unit', 'ct')
                  ->orWhereHas('rawMaterial', function($rm) {
                      $rm->whereRaw('LOWER(material_type) = ?', ['diamond'])
                         ->orWhere('name', 'like', '%diamond%');
                  });
            })
            ->get();

            // Diamond stamps from masters (all stamps linked to Diamond, or general stamps not specifically restricted to other materials)
            $diamondStampMasters = Stamp::where(function($q) {
                $q->whereRaw('LOWER(applicable_for) LIKE ?', ['%diamond%'])
                  ->orWhere(function($sub) {
                      $sub->where(function($any) {
                          $any->whereRaw('LOWER(applicable_for) LIKE ?', ['%all%'])
                              ->orWhereNull('applicable_for')
                              ->orWhere('applicable_for', '');
                      })
                      ->where(function($inner) {
                          $inner->whereRaw('LOWER(applicable_for) NOT LIKE ?', ['%stone%'])
                                ->whereRaw('LOWER(applicable_for) NOT LIKE ?', ['%gold%'])
                                ->whereRaw('LOWER(applicable_for) NOT LIKE ?', ['%silver%']);
                      });
                  });
            })
            ->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get();

            // Explicitly exclude non-diamond stamps (Stone/Gold/Silver) from diamond breakdown
            $nonDiamondStampNames = Stamp::where(function($q) {
                $q->whereRaw('LOWER(applicable_for) LIKE ?', ['%stone%'])
                  ->orWhereRaw('LOWER(applicable_for) LIKE ?', ['%gold%'])
                  ->orWhereRaw('LOWER(applicable_for) LIKE ?', ['%silver%']);
            })
            ->whereRaw('LOWER(applicable_for) NOT LIKE ?', ['%diamond%'])
            ->pluck('name')
            ->map(fn($n) => strtolower(trim($n)))
            ->toArray();

            $isDiamondStamp = function(?string $st) use ($nonDiamondStampNames): bool {
                if (empty($st)) return false;
                $clean = strtolower(trim($st));
                if (in_array($clean, $nonDiamondStampNames, true)) return false;
                if (preg_match('/^(?:24k|22k|18k|14k|10k|916|750|585|999|fine silver|silver)/i', $clean)) return false;
                if (preg_match('/(?:stone|ruby|emerald|sapphire|navratna|cz|gemstone)/i', $clean)) return false;
                if (self::isClarityGrade($st)) return false;
                return true;
            };

            $allDiamondStamps = collect();

            // Push all master diamond stamps first so the Master Stamp sort order is respected
            foreach ($diamondStampMasters as $m) {
                $mName = trim($m->name ?? '');
                if ($mName !== '' && $isDiamondStamp($mName)) {
                    $allDiamondStamps->push($mName);
                }
            }

            foreach ($diamondOpening as $op) {
                $st = trim($op->stamp ?: '');
                if ($st && $isDiamondStamp($st)) {
                    $allDiamondStamps->push($st);
                }
            }
            foreach ($diamondPurchases as $pur) {
                $st = trim($pur->stamp ?: '');
                if ($st && $isDiamondStamp($st)) {
                    $allDiamondStamps->push($st);
                }
                // Also collect stamps from repeatable diamond components array
                if (!empty($pur->components) && is_array($pur->components)) {
                    foreach ($pur->components as $c) {
                        $cStamp = trim($c['stamp'] ?? $c['diamond_stamp'] ?? $c['sieve_size'] ?? '');
                        if ($cStamp && $isDiamondStamp($cStamp)) {
                            $allDiamondStamps->push($cStamp);
                        }
                    }
                }
            }

            $diamondTransactions = \App\Models\KarigarMaterialTransaction::where('material_type', 'diamond')
                ->where('is_reversed', false)
                ->get();

            foreach ($diamondTransactions as $tx) {
                $txStamp = trim($tx->stamp ?: $tx->sieve_size ?: '');
                if ($txStamp && $isDiamondStamp($txStamp)) {
                    $allDiamondStamps->push($txStamp);
                }
            }

            $uniqueStamps = $allDiamondStamps->filter()->unique()->values();

            $totalDiaCarats = 0.0;
            $totalDiaCount = 0.0;
            $stampsWithStock = [];
            $stampsEmpty = [];

            $activeWorkOrders = \App\Models\WorkOrder::whereNotIn('status', ['completed', 'cancelled', 'final_received', 'delivered'])
                ->with(['items', 'receivedPieces'])
                ->get();

            foreach ($uniqueStamps as $st) {
                $opCts = (float) $diamondOpening->filter(fn($o) => strcasecmp(trim($o->stamp ?? ''), $st) === 0)->sum('carat_weight');
                $opPcs = (float) $diamondOpening->filter(fn($o) => strcasecmp(trim($o->stamp ?? ''), $st) === 0)->sum('quantity');

                $purCts = 0.0;
                $purPcs = 0.0;

                foreach ($diamondPurchases as $p) {
                    if (!empty($p->components) && is_array($p->components)) {
                        foreach ($p->components as $c) {
                            $cStamp = trim($c['stamp'] ?? $c['diamond_stamp'] ?? $c['sieve_size'] ?? '');
                            if (strcasecmp($cStamp, $st) === 0) {
                                $purCts += (float) ($c['weight_carats'] ?? $c['total_weight'] ?? $c['weight'] ?? $c['carat_weight'] ?? 0);
                                $purPcs += (float) ($c['stones_count'] ?? $c['stone_count'] ?? $c['no_of_pieces'] ?? $c['pieces'] ?? $c['count'] ?? 0);
                            }
                        }
                    } else {
                        $pStamp = trim($p->stamp ?? '');
                        if (!empty($pStamp) && strcasecmp($pStamp, $st) === 0) {
                            $purCts += (float) ($p->net_weight > 0 ? $p->net_weight : $p->weight);
                            $purPcs += (float) ($p->count_qty > 0 ? $p->count_qty : ($p->qty > 0 ? $p->qty : 0));
                        }
                    }
                }

                // Tally active work order allocations for this specific stamp
                $allocCts = 0.0;
                $allocPcs = 0;
                foreach ($activeWorkOrders as $wo) {
                    $orderAllocCts = 0.0;
                    $orderAllocPcs = 0;
                    foreach ($wo->items as $itm) {
                        $p = $itm->pricing_details ?? [];
                        $s = $itm->stone_details ?? [];
                        $itmStamp = trim($p['diamond_stamp'] ?? $p['stamp_and_no'] ?? $p['stamp_details'] ?? $p['stamp'] ?? $s['diamond_stamp'] ?? $s['stamp_and_no'] ?? $s['stamp_details'] ?? $s['stamp'] ?? $itm->stamp ?? '');
                        if (strcasecmp($itmStamp, $st) === 0) {
                            $qty = max(1, (int)($itm->required_qty ?? 1));
                            $dW = (float)($p['diamond_weight'] ?? $s['diamond_weight'] ?? 0);
                            $dC = (int)($p['no_of_diamonds'] ?? $p['diamond_count'] ?? $s['diamond_count'] ?? 0);
                            $orderAllocCts += ($dW * $qty);
                            $orderAllocPcs += ($dC * $qty);
                        }
                    }

                    // Deduct pieces of this stamp already received on this order
                    $recCts = (float) $wo->receivedPieces->whereNotNull('received_at')->filter(function($rp) use ($st) {
                        $rpStamp = trim($rp->diamond_stamp ?? $rp->stamp ?? '');
                        return strcasecmp($rpStamp, $st) === 0;
                    })->sum('diamond_weight');

                    $recPcs = (int) $wo->receivedPieces->whereNotNull('received_at')->filter(function($rp) use ($st) {
                        $rpStamp = trim($rp->diamond_stamp ?? $rp->stamp ?? '');
                        return strcasecmp($rpStamp, $st) === 0;
                    })->sum('diamond_count');

                    $allocCts += max(0.0, $orderAllocCts - $recCts);
                    $allocPcs += max(0, $orderAllocPcs - $recPcs);
                }

                // Also tally direct Karigar allocations and issues for this stamp
                $directAllocCts = (float) $diamondTransactions->filter(function($tx) use ($st) {
                    return in_array($tx->transaction_type, ['allocation', 'additional_allocation', 'issue'])
                        && (strcasecmp(trim($tx->stamp ?? ''), $st) === 0 || strcasecmp(trim($tx->sieve_size ?? ''), $st) === 0);
                })->sum('net_weight');

                $directAllocPcs = (int) $diamondTransactions->filter(function($tx) use ($st) {
                    return in_array($tx->transaction_type, ['allocation', 'additional_allocation', 'issue'])
                        && (strcasecmp(trim($tx->stamp ?? ''), $st) === 0 || strcasecmp(trim($tx->sieve_size ?? ''), $st) === 0);
                })->sum('pieces');

                $directReturnCts = (float) $diamondTransactions->filter(function($tx) use ($st) {
                    return in_array($tx->transaction_type, ['unused_returned', 'return', 'scrap'])
                        && (strcasecmp(trim($tx->stamp ?? ''), $st) === 0 || strcasecmp(trim($tx->sieve_size ?? ''), $st) === 0);
                })->sum('net_weight');

                $directReturnPcs = (int) $diamondTransactions->filter(function($tx) use ($st) {
                    return in_array($tx->transaction_type, ['unused_returned', 'return', 'scrap'])
                        && (strcasecmp(trim($tx->stamp ?? ''), $st) === 0 || strcasecmp(trim($tx->sieve_size ?? ''), $st) === 0);
                })->sum('pieces');

                $netDirectAllocCts = max(0.0, $directAllocCts - $directReturnCts);
                $netDirectAllocPcs = max(0, $directAllocPcs - $directReturnPcs);

                $allocCts = round(max($allocCts, $netDirectAllocCts), 3);
                $allocPcs = max($allocPcs, $netDirectAllocPcs);

                $availCts = max(0.0, round($opCts + $purCts - $allocCts, 3));
                $availPcs = max(0, round($opPcs + $purPcs - $allocPcs, 0));

                $entry = [
                    'stamp' => $st,
                    'available_weight' => round($availCts * 0.2, 3),
                    'available_carats' => $availCts,
                    'available_count' => (int) $availPcs,
                    'allocated_carats' => round($allocCts, 3),
                    'allocated_count' => (int) $allocPcs,
                    'unit' => 'ct',
                ];

                if ($availCts > 0 || $availPcs > 0) {
                    $stampsWithStock[] = $entry;
                    $totalDiaCarats += $availCts;
                    $totalDiaCount += $availPcs;
                } else {
                    $stampsEmpty[] = $entry;
                }
            }

            // Check for unclassified purchases (where stamp is empty or clarity grade)
            $unclassifiedPurchases = $diamondPurchases->filter(function($p) {
                $pStamp = trim($p->stamp ?? '');
                return empty($pStamp) || self::isClarityGrade($pStamp);
            });
            $unclassCts = (float) $unclassifiedPurchases->sum(function($p) {
                return (float) ($p->net_weight > 0 ? $p->net_weight : $p->weight);
            });
            $unclassPcs = (float) $unclassifiedPurchases->sum(function($p) {
                return (float) ($p->count_qty > 0 ? $p->count_qty : ($p->qty > 0 ? $p->qty : 0));
            });

            if ($unclassCts > 0 || $unclassPcs > 0) {
                $stampsWithStock[] = [
                    'stamp' => 'Unclassified / Mixed',
                    'available_weight' => round($unclassCts * 0.2, 3),
                    'available_carats' => round($unclassCts, 3),
                    'available_count' => (int) round($unclassPcs, 0),
                    'unit' => 'ct',
                ];
                $totalDiaCarats += $unclassCts;
                $totalDiaCount += $unclassPcs;
            }

            // Sort stamps with stock descending by available carats
            usort($stampsWithStock, fn($a, $b) => $b['available_carats'] <=> $a['available_carats']);

            // Combine: active stamps with stock first, followed by empty master stamps
            $diamondBreakdown = array_merge($stampsWithStock, $stampsEmpty);

            // Re-sync RawMaterial allocations
            \App\Models\RawMaterial::recalculateAllocations();

            // Total carats and count across vault strictly match the breakdown sum
            $totalDiaCarats = round(collect($diamondBreakdown)->sum('available_carats'), 3);
            $totalDiaCount = (int) round(collect($diamondBreakdown)->sum('available_count'), 0);

            // Synchronize RawMaterial primary diamond record with active vault balance
            $primaryDiamond = RawMaterial::where('material_type', 'diamond')->first();
            if ($primaryDiamond) {
                $primaryDiamond->current_balance = $totalDiaCarats;
                $primaryDiamond->current_count = $totalDiaCount;
                $primaryDiamond->save();
            }

            // 2. Gold stock breakdown by Karat / Purity (24K, 22K, 18K, 14K)
            $goldRaw = RawMaterial::where('material_type', 'gold')->first();
            $goldOpening = MaterialOpeningStock::where('material_type', 'gold')->get();
            $goldPurchases = PurchaseEntry::where('purchase_type', 'raw_material')
                ->where(function($q) {
                    $q->where('metal_type', 'gold')->orWhere('metal_type', 'like', 'gold%');
                })
                ->get();

            $activeWorkOrders = WorkOrder::whereNotIn('status', ['completed', 'cancelled', 'final_received', 'delivered'])->get();

            $knownKarats = [
                '24K' => ['purity' => 99.9, 'stamp' => '999 Fine Pure Gold', 'desc' => 'Pure Investment / Vault Bullion', 'code' => 'gold_24k'],
                '22K' => ['purity' => 91.6, 'stamp' => '916 Hallmark Standard', 'desc' => 'Traditional Jewellery Standard', 'code' => 'gold_22k'],
                '18K' => ['purity' => 75.0, 'stamp' => '750 Fine Gold', 'desc' => 'Diamond Studded & Luxury Casting', 'code' => 'gold_18k'],
                '14K' => ['purity' => 58.5, 'stamp' => '585 Hallmark', 'desc' => 'Modern Dailywear Jewellery', 'code' => 'gold_14k'],
            ];

            $goldBreakdown = [];
            $totalCalculatedKaratWeight = 0.0;

            foreach ($knownKarats as $kName => $info) {
                // Opening stock matching this karat or stamp
                $opWt = (float) $goldOpening->filter(function($o) use ($kName) {
                    $k = strtoupper(trim($o->karat ?? ''));
                    $st = strtoupper(trim($o->stamp ?? ''));
                    return str_contains($k, $kName) || str_contains($st, $kName) || ($kName === '24K' && str_contains($st, '999')) || ($kName === '22K' && str_contains($st, '916')) || ($kName === '18K' && str_contains($st, '750'));
                })->sum('weight');

                // Purchases matching this karat or purity
                $purWt = (float) $goldPurchases->filter(function($p) use ($kName) {
                    $pur = strtoupper(trim($p->purity ?? ''));
                    $item = strtoupper(trim($p->item_name ?? ''));
                    return str_contains($pur, $kName) || str_contains($item, $kName) || ($kName === '24K' && str_contains($pur, '999')) || ($kName === '22K' && str_contains($pur, '916')) || ($kName === '18K' && str_contains($pur, '750'));
                })->sum(function($p) {
                    return (float) ($p->net_weight > 0 ? $p->net_weight : $p->weight);
                });

                // Dedicated RawMaterial record if exists (e.g. gold_24k, gold_22k)
                $specificRaw = RawMaterial::where('material_type', $info['code'])->first();
                $specificBalance = $specificRaw ? floatval($specificRaw->current_balance) : 0;

                // Dedicated allocations for this karat
                $karatAlloc = (float) $activeWorkOrders->filter(function($wo) use ($kName) {
                    $k = strtoupper(trim($wo->karat ?? ''));
                    return str_contains($k, $kName);
                })->sum('allotted_weight');

                $availWt = max(0.0, round($opWt + $purWt - $karatAlloc, 3));
                if ($specificBalance > 0 && $availWt == 0) {
                    $availWt = max(0.0, round($specificBalance, 3));
                }

                $totalCalculatedKaratWeight += $availWt;

                $goldBreakdown[] = [
                    'karat' => $kName,
                    'stamp' => $info['stamp'],
                    'description' => $info['desc'],
                    'purity' => $info['purity'],
                    'available_weight' => $availWt,
                    'fine_weight_equiv' => round($availWt * ($info['purity'] / 100), 3),
                    'unit' => 'g'
                ];
            }

            // Overall Gold Balance: authoritatively from RawMaterial or sum of karats
            $rawGoldBalance = $goldRaw ? round((float)$goldRaw->current_balance, 3) : 0;
            if ($rawGoldBalance > 0) {
                $totalGoldWeight = $rawGoldBalance;
                // If sum of karats differs from total authoritatively set on gold raw material, synchronize 22k
                $sumKarats = array_sum(array_column($goldBreakdown, 'available_weight'));
                $diff = round($totalGoldWeight - $sumKarats, 3);
                if (abs($diff) > 0.001) {
                    foreach ($goldBreakdown as &$gb) {
                        if ($gb['karat'] === '22K') {
                            $gb['available_weight'] = max(0.0, round($gb['available_weight'] + $diff, 3));
                            $gb['fine_weight_equiv'] = round($gb['available_weight'] * ($gb['purity'] / 100), 3);
                            break;
                        }
                    }
                    unset($gb);
                }
            } else {
                $totalGoldWeight = round($totalCalculatedKaratWeight, 3);
            }

            // 3. Silver Stock
            $silverRaw = RawMaterial::where('material_type', 'silver')->first();
            $silverOpening = MaterialOpeningStock::where('material_type', 'silver')->get();
            $silverPurchases = PurchaseEntry::where('purchase_type', 'raw_material')->where('metal_type', 'silver')->get();
            $totalSilverWeight = $silverRaw ? round((float)$silverRaw->current_balance, 3) : round((float)$silverOpening->sum('weight') + (float)$silverPurchases->sum('weight'), 3);

            // 4. Colour Stones Stock with Stamp / Gemstone breakdown (NO Karigar Allocation deduction - vault-maintained)
            $stoneRaw = RawMaterial::where('material_type', 'stone')->first();
            $stoneOpening = MaterialOpeningStock::where('material_type', 'stone')->get();
            $stonePurchases = PurchaseEntry::where(function($q) {
                $q->where('purchase_type', 'raw_material')
                  ->orWhereNull('purchase_type');
            })
            ->where(function($q) {
                $q->whereRaw('LOWER(metal_type) = ?', ['stone'])
                  ->orWhereHas('rawMaterial', function($rm) {
                      $rm->whereRaw('LOWER(material_type) = ?', ['stone'])
                         ->orWhere('name', 'like', '%stone%')
                         ->orWhere('name', 'like', '%ruby%')
                         ->orWhere('name', 'like', '%emerald%')
                         ->orWhere('name', 'like', '%sapphire%');
                  });
            })
            ->get();

            $stoneStampMasters = Stamp::where(function($q) {
                $q->where('applicable_for', 'like', '%stone%')
                  ->orWhere('applicable_for', 'like', '%all%');
            })->get();

            $stoneBreakdown = [];
            $allStoneStamps = collect();

            foreach ($stoneOpening as $op) {
                $st = trim($op->stamp ?: 'Unclassified');
                if ($st) $allStoneStamps->push($st);
            }
            foreach ($stonePurchases as $pur) {
                $st = trim($pur->stamp ?: ($pur->color_stone_stamp ?: ($pur->purity ?: '')));
                if ($st && !preg_match('/^(?:24k|22k|18k|14k|916|750|585)/i', $st)) {
                    $allStoneStamps->push($st);
                }
            }
            foreach ($stoneStampMasters as $m) {
                $allStoneStamps->push(trim($m->name));
            }

            $uniqueStoneStamps = $allStoneStamps->unique()->values();

            $totalStoneWeightCalc = 0.0;
            $totalStoneCountCalc = 0.0;

            foreach ($uniqueStoneStamps as $st) {
                $opWt = (float) $stoneOpening->filter(fn($o) => strcasecmp(trim($o->stamp ?? ''), $st) === 0)->sum('weight');
                $opCts = (float) $stoneOpening->filter(fn($o) => strcasecmp(trim($o->stamp ?? ''), $st) === 0)->sum('carat_weight');
                $opPcs = (float) $stoneOpening->filter(fn($o) => strcasecmp(trim($o->stamp ?? ''), $st) === 0)->sum('quantity');

                $matchingPurchases = $stonePurchases->filter(function($p) use ($st) {
                    $pStamp = trim($p->stamp ?? ($p->color_stone_stamp ?? ''));
                    if (!empty($pStamp)) {
                        return strcasecmp($pStamp, $st) === 0;
                    }
                    $pPurity = trim($p->purity ?? '');
                    if (!empty($pPurity)) {
                        return strcasecmp($pPurity, $st) === 0;
                    }
                    return strcasecmp(trim($p->item_name ?? ''), $st) === 0;
                });
                $purWt = (float) $matchingPurchases->sum(function($p) {
                    return (float) ($p->net_weight > 0 ? $p->net_weight : $p->weight);
                });
                $purPcs = (float) $matchingPurchases->sum('count_qty');

                $availWt = round(($opWt > 0 ? $opWt : $opCts) + $purWt, 3);
                $availPcs = round($opPcs + $purPcs, 0);

                // Note: STRICTLY NO Karigar Allocation Deduction for colour stones!
                if ($availWt > 0 || $availPcs > 0 || $stoneStampMasters->pluck('name')->contains($st)) {
                    $stoneBreakdown[] = [
                        'stamp' => $st,
                        'available_weight' => $availWt,
                        'available_carats' => $availWt,
                        'available_count' => $availPcs,
                        'unit' => 'ct',
                    ];
                }

                $totalStoneWeightCalc += $availWt;
                $totalStoneCountCalc += $availPcs;
            }

            $totalStoneWeight = $stoneRaw ? round((float)$stoneRaw->current_balance, 3) : round($totalStoneWeightCalc, 3);
            $totalStoneCount = $stoneRaw ? round((float)$stoneRaw->current_count, 0) : round($totalStoneCountCalc, 0);
            if ($totalStoneWeight == 0 && $totalStoneWeightCalc > 0) {
                $totalStoneWeight = round($totalStoneWeightCalc, 3);
                $totalStoneCount = round($totalStoneCountCalc, 0);
            }

            // 5. Platinum Stock
            $platinumRaw = RawMaterial::where('material_type', 'platinum')->first();
            $platinumOpening = MaterialOpeningStock::where('material_type', 'platinum')->get();
            $platinumPurchases = PurchaseEntry::where('purchase_type', 'raw_material')->where('metal_type', 'platinum')->get();
            $totalPlatinumWeight = $platinumRaw ? round((float)$platinumRaw->current_balance, 3) : round((float)$platinumOpening->sum('weight') + (float)$platinumPurchases->sum('weight'), 3);

            // Unified readable table rows
            $goldStampNames = collect($goldBreakdown)->pluck('karat')->implode(' / ') ?: '24K / 22K / 18K';
            $unifiedRows = [
                [
                    'material_type' => 'Gold',
                    'stamp_grade' => $goldStampNames,
                    'karat' => $goldStampNames,
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
                    'stamp_grade' => 'All Stone Varieties (' . count($stoneBreakdown) . ' Stamps / Gemstones)',
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
                [
                    'material_type' => 'Platinum',
                    'stamp_grade' => '950 Platinum / Fine Pt',
                    'karat' => '950 Pt',
                    'unit' => 'g',
                    'available_weight' => $totalPlatinumWeight,
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
                    'stone_total_weight' => $totalStoneWeight,
                    'platinum_total_weight' => $totalPlatinumWeight,
                ],
                'diamond_by_stamp' => $diamondBreakdown,
                'stone_by_stamp' => $stoneBreakdown,
                'gold_by_karat' => $goldBreakdown,
                'unified_rows' => $unifiedRows,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to calculate unified stock: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to calculate unified stock (500). Please try again later.'
            ], 500);
        }
    }

    /**
     * Update/Adjust live stock values from Unified Available Stock Table
     */
    public function updateUnifiedStock(Request $request)
    {
        $validated = $request->validate([
            'material_type' => 'required|string',
            'available_weight' => 'nullable|numeric|min:0',
            'available_carat_weight' => 'nullable|numeric|min:0',
            'available_quantity' => 'nullable|numeric|min:0',
            'karat' => 'nullable|string|max:50',
            'stamp' => 'nullable|string|max:100',
            'notes' => 'nullable|string|max:500',
        ]);

        try {
            return DB::transaction(function () use ($validated, $request) {
                $rawType = strtolower(trim($validated['material_type']));
                if (str_contains($rawType, 'gold')) {
                    $matType = 'gold';
                } elseif (str_contains($rawType, 'diamond')) {
                    $matType = 'diamond';
                } elseif (str_contains($rawType, 'silver')) {
                    $matType = 'silver';
                } elseif (str_contains($rawType, 'platinum') || str_contains($rawType, 'plat')) {
                    $matType = 'platinum';
                } elseif (str_contains($rawType, 'stone')) {
                    $matType = 'stone';
                } else {
                    return response()->json(['status' => 'error', 'message' => 'Invalid material type.'], 422);
                }

                $weight = isset($validated['available_weight']) ? floatval($validated['available_weight']) : null;
                $caratWeight = isset($validated['available_carat_weight']) ? floatval($validated['available_carat_weight']) : null;
                $quantity = isset($validated['available_quantity']) ? floatval($validated['available_quantity']) : null;
                $karat = !empty($validated['karat']) ? strtoupper(trim($validated['karat'])) : null;
                $stamp = $validated['stamp'] ?? null;
                $notes = $validated['notes'] ?? 'Updated via Unified Available Stock interface';

                $rawMat = RawMaterial::where('material_type', $matType)->lockForUpdate()->first();
                if (!$rawMat) {
                    $rawMat = RawMaterial::create([
                        'material_type' => $matType,
                        'name' => 'Raw ' . ucfirst($matType),
                        'opening_weight' => 0,
                        'opening_count' => 0,
                        'purchased_weight' => 0,
                        'allocated_weight' => 0,
                        'current_balance' => 0,
                        'purchased_count' => 0,
                        'allocated_count' => 0,
                        'current_count' => 0,
                        'unit' => ($matType === 'diamond') ? 'ct' : (($matType === 'stone') ? 'units' : 'g'),
                    ]);
                }

                if ($matType === 'diamond') {
                    $targetCarats = $caratWeight !== null ? max(0, round($caratWeight, 3)) : ($weight !== null ? max(0, round($weight / 0.2, 3)) : floatval($rawMat->current_balance));
                    $targetWeight = round($targetCarats * 0.2, 3);
                    $targetCount = $quantity !== null ? max(0, round($quantity, 0)) : floatval($rawMat->current_count);

                    if (!empty($stamp) && $stamp !== 'all' && !str_contains(strtolower($stamp), 'all diamond')) {
                        // 1. Calculate existing purchases for this specific stamp
                        $matchingPurchases = PurchaseEntry::where('purchase_type', 'raw_material')
                            ->where(function($q) use ($stamp) {
                                $q->where('metal_type', 'diamond')->orWhere('metal_type', 'like', 'diamond%');
                            })
                            ->where(function($q) use ($stamp) {
                                $q->whereRaw('LOWER(TRIM(stamp)) = ?', [strtolower(trim($stamp))]);
                            })
                            ->get();
                        $purCts = (float) $matchingPurchases->sum('weight');
                        $purPcs = (float) $matchingPurchases->sum('count_qty');

                        // Target opening stock = Target available balance minus existing purchases
                        $opCts = max(0, round($targetCarats - $purCts, 3));
                        $opWeight = round($opCts * 0.2, 3);
                        $opPcs = max(0, round($targetCount - $purPcs, 0));

                        $opStock = MaterialOpeningStock::where('material_type', 'diamond')
                            ->where(function($q) use ($stamp) {
                                $q->whereRaw('LOWER(TRIM(stamp)) = ?', [strtolower(trim($stamp))]);
                            })->first();

                        if (!$opStock) {
                            $latest = MaterialOpeningStock::orderBy('id', 'desc')->first();
                            $nextNum = $latest ? ($latest->id + 1001) : 1001;
                            $stockNo = 'OS-' . $nextNum;
                            $opStock = new MaterialOpeningStock();
                            $opStock->stock_number = $stockNo;
                            $opStock->material_type = 'diamond';
                            $opStock->stamp = $stamp;
                            $opStock->entry_date = \Carbon\Carbon::today()->toDateString();
                            $opStock->unit = 'ct';
                            $opStock->created_by = Auth::id() ?? 1;
                        }

                        $opStock->carat_weight = $opCts;
                        $opStock->weight = $opWeight;
                        $opStock->quantity = $opPcs;
                        $opStock->notes = $notes;
                        $opStock->raw_material_id = $rawMat->id;
                        $opStock->save();

                        // Resync total diamond raw material balance
                        $allDiaOpening = MaterialOpeningStock::where('material_type', 'diamond')->get();
                        $allDiaPurchases = PurchaseEntry::where('purchase_type', 'raw_material')
                            ->where(function($q) {
                                $q->where('metal_type', 'diamond')->orWhere('metal_type', 'like', 'diamond%');
                            })->get();
                        $totalCts = (float) $allDiaOpening->sum('carat_weight') + (float) $allDiaPurchases->sum('weight');
                        $totalCount = (float) $allDiaOpening->sum('quantity') + (float) $allDiaPurchases->sum('count_qty');
                        $rawMat->opening_weight = round((float) $allDiaOpening->sum('carat_weight'), 3);
                        $rawMat->current_balance = round($totalCts, 3);
                        $rawMat->opening_count = round((float) $allDiaOpening->sum('quantity'), 0);
                        $rawMat->current_count = round($totalCount, 0);
                        $rawMat->save();

                        InventoryMovement::create([
                            'raw_material_id' => $rawMat->id,
                            'material_opening_stock_id' => $opStock->id,
                            'movement_type' => 'stock_adjustment',
                            'quantity' => $targetCount,
                            'weight' => $targetCarats,
                            'unit_cost' => 0,
                            'notes' => "Stock adjustment for Diamond ({$stamp}): {$notes}",
                            'created_by' => Auth::id() ?? 1,
                        ]);
                    } else {
                        // Overall diamond balance update
                        $rawMat->opening_weight = max(0, round($targetCarats - floatval($rawMat->purchased_weight ?? 0) + floatval($rawMat->allocated_weight ?? 0), 3));
                        $rawMat->current_balance = $targetCarats;
                        $rawMat->opening_count = max(0, round($targetCount - floatval($rawMat->purchased_count ?? 0) + floatval($rawMat->allocated_count ?? 0), 0));
                        $rawMat->current_count = $targetCount;
                        $rawMat->save();

                        $opStock = MaterialOpeningStock::where('material_type', 'diamond')->first();
                        if (!$opStock) {
                            $latest = MaterialOpeningStock::orderBy('id', 'desc')->first();
                            $nextNum = $latest ? ($latest->id + 1001) : 1001;
                            $stockNo = 'OS-' . $nextNum;
                            $opStock = new MaterialOpeningStock();
                            $opStock->stock_number = $stockNo;
                            $opStock->material_type = 'diamond';
                            $opStock->stamp = 'All Diamond Grades';
                            $opStock->entry_date = \Carbon\Carbon::today()->toDateString();
                            $opStock->unit = 'ct';
                            $opStock->created_by = Auth::id() ?? 1;
                        }
                        $opStock->carat_weight = $targetCarats;
                        $opStock->weight = $targetWeight;
                        $opStock->quantity = $targetCount;
                        $opStock->notes = $notes;
                        $opStock->raw_material_id = $rawMat->id;
                        $opStock->save();

                        InventoryMovement::create([
                            'raw_material_id' => $rawMat->id,
                            'material_opening_stock_id' => $opStock->id,
                            'movement_type' => 'stock_adjustment',
                            'quantity' => $targetCount,
                            'weight' => $targetCarats,
                            'unit_cost' => 0,
                            'notes' => "Unified stock adjustment for Diamond: {$notes}",
                            'created_by' => Auth::id() ?? 1,
                        ]);
                    }

                } elseif ($matType === 'stone') {
                    $targetWeight = $weight !== null ? max(0, round($weight, 3)) : ($caratWeight !== null ? max(0, round($caratWeight, 3)) : floatval($rawMat->current_balance));
                    $targetCount = $quantity !== null ? max(0, round($quantity, 0)) : floatval($rawMat->current_count);

                    $rawMat->opening_weight = max(0, round($targetWeight - floatval($rawMat->purchased_weight ?? 0) + floatval($rawMat->allocated_weight ?? 0), 3));
                    $rawMat->current_balance = $targetWeight;
                    $rawMat->opening_count = max(0, round($targetCount - floatval($rawMat->purchased_count ?? 0) + floatval($rawMat->allocated_count ?? 0), 0));
                    $rawMat->current_count = $targetCount;
                    $rawMat->save();

                    $opStock = MaterialOpeningStock::where('material_type', 'stone')->first();
                    if (!$opStock) {
                        $latest = MaterialOpeningStock::orderBy('id', 'desc')->first();
                        $nextNum = $latest ? ($latest->id + 1001) : 1001;
                        $stockNo = 'OS-' . $nextNum;
                        $opStock = new MaterialOpeningStock();
                        $opStock->stock_number = $stockNo;
                        $opStock->material_type = 'stone';
                        $opStock->entry_date = \Carbon\Carbon::today()->toDateString();
                        $opStock->unit = 'ct / pcs';
                        $opStock->created_by = Auth::id() ?? 1;
                    }
                    $opStock->weight = $targetWeight;
                    $opStock->carat_weight = $targetWeight;
                    $opStock->quantity = $targetCount;
                    $opStock->notes = $notes;
                    $opStock->raw_material_id = $rawMat->id;
                    $opStock->save();

                    InventoryMovement::create([
                        'raw_material_id' => $rawMat->id,
                        'material_opening_stock_id' => $opStock->id,
                        'movement_type' => 'stock_adjustment',
                        'quantity' => $targetCount,
                        'weight' => $targetWeight,
                        'unit_cost' => 0,
                        'notes' => "Unified stock adjustment for Colour Stones: {$notes}",
                        'created_by' => Auth::id() ?? 1,
                    ]);

                } elseif ($matType === 'gold') {
                    $targetWeight = $weight !== null ? max(0, round($weight, 3)) : floatval($rawMat->current_balance);

                    if ($karat && $karat !== 'ALL') {
                        // Updating a specific Karat (e.g. 24K, 22K, 18K)
                        $opStock = MaterialOpeningStock::where('material_type', 'gold')
                            ->where(function($q) use ($karat) {
                                $q->where('karat', $karat)->orWhere('stamp', $karat);
                            })->first();

                        if (!$opStock) {
                            $latest = MaterialOpeningStock::orderBy('id', 'desc')->first();
                            $nextNum = $latest ? ($latest->id + 1001) : 1001;
                            $stockNo = 'OS-' . $nextNum;
                            $opStock = new MaterialOpeningStock();
                            $opStock->stock_number = $stockNo;
                            $opStock->material_type = 'gold';
                            $opStock->karat = $karat;
                            $opStock->stamp = $stamp ?: $karat;
                            $opStock->entry_date = \Carbon\Carbon::today()->toDateString();
                            $opStock->unit = 'g';
                            $opStock->created_by = Auth::id() ?? 1;
                        }

                        $opStock->weight = $targetWeight;
                        $opStock->notes = $notes;
                        $opStock->raw_material_id = $rawMat->id;
                        $opStock->save();

                        // If dedicated raw material exists (e.g. gold_24k, gold_22k), update its current_balance
                        $codeMap = ['24K' => 'gold_24k', '22K' => 'gold_22k', '18K' => 'gold_18k', '14K' => 'gold_14k'];
                        if (isset($codeMap[$karat])) {
                            $specRm = RawMaterial::where('material_type', $codeMap[$karat])->first();
                            if ($specRm) {
                                $specRm->current_balance = $targetWeight;
                                $specRm->save();
                            }
                        }

                        // Re-sync overall gold raw material
                        $allGoldOp = MaterialOpeningStock::where('material_type', 'gold')->sum('weight');
                        $allGoldPur = PurchaseEntry::where('purchase_type', 'raw_material')
                            ->where(function($q) {
                                $q->where('metal_type', 'gold')->orWhere('metal_type', 'like', 'gold%');
                            })->sum('weight');
                        $rawMat->opening_weight = $allGoldOp;
                        $rawMat->current_balance = max(0, round($allGoldOp + $allGoldPur - floatval($rawMat->allocated_weight ?? 0), 3));
                        $rawMat->save();

                        InventoryMovement::create([
                            'raw_material_id' => $rawMat->id,
                            'material_opening_stock_id' => $opStock->id,
                            'movement_type' => 'stock_adjustment',
                            'quantity' => 1,
                            'weight' => $targetWeight,
                            'unit_cost' => 0,
                            'notes' => "Stock adjustment for Gold ({$karat}): {$notes}",
                            'created_by' => Auth::id() ?? 1,
                        ]);

                    } else {
                        // Overall gold update
                        $rawMat->opening_weight = max(0, round($targetWeight - floatval($rawMat->purchased_weight ?? 0) + floatval($rawMat->allocated_weight ?? 0), 3));
                        $rawMat->current_balance = $targetWeight;
                        $rawMat->save();

                        $opStock = MaterialOpeningStock::where('material_type', 'gold')->first();
                        if (!$opStock) {
                            $latest = MaterialOpeningStock::orderBy('id', 'desc')->first();
                            $nextNum = $latest ? ($latest->id + 1001) : 1001;
                            $stockNo = 'OS-' . $nextNum;
                            $opStock = new MaterialOpeningStock();
                            $opStock->stock_number = $stockNo;
                            $opStock->material_type = 'gold';
                            $opStock->karat = '22K';
                            $opStock->stamp = '22K (916)';
                            $opStock->entry_date = \Carbon\Carbon::today()->toDateString();
                            $opStock->unit = 'g';
                            $opStock->created_by = Auth::id() ?? 1;
                        }
                        $opStock->weight = $targetWeight;
                        $opStock->notes = $notes;
                        $opStock->raw_material_id = $rawMat->id;
                        $opStock->save();

                        InventoryMovement::create([
                            'raw_material_id' => $rawMat->id,
                            'material_opening_stock_id' => $opStock->id,
                            'movement_type' => 'stock_adjustment',
                            'quantity' => 1,
                            'weight' => $targetWeight,
                            'unit_cost' => 0,
                            'notes' => "Unified stock adjustment for Overall Gold: {$notes}",
                            'created_by' => Auth::id() ?? 1,
                        ]);
                    }

                } else {
                    // Platinum or Silver
                    $targetWeight = $weight !== null ? max(0, round($weight, 3)) : floatval($rawMat->current_balance);

                    $rawMat->opening_weight = max(0, round($targetWeight - floatval($rawMat->purchased_weight ?? 0) + floatval($rawMat->allocated_weight ?? 0), 3));
                    $rawMat->current_balance = $targetWeight;
                    $rawMat->save();

                    $opStock = MaterialOpeningStock::where('material_type', $matType)->first();
                    if (!$opStock) {
                        $latest = MaterialOpeningStock::orderBy('id', 'desc')->first();
                        $nextNum = $latest ? ($latest->id + 1001) : 1001;
                        $stockNo = 'OS-' . $nextNum;
                        $opStock = new MaterialOpeningStock();
                        $opStock->stock_number = $stockNo;
                        $opStock->material_type = $matType;
                        $opStock->entry_date = \Carbon\Carbon::today()->toDateString();
                        $opStock->unit = 'g';
                        $opStock->created_by = Auth::id() ?? 1;
                    }
                    $opStock->weight = $targetWeight;
                    $opStock->notes = $notes;
                    $opStock->raw_material_id = $rawMat->id;
                    $opStock->save();

                    InventoryMovement::create([
                        'raw_material_id' => $rawMat->id,
                        'material_opening_stock_id' => $opStock->id,
                        'movement_type' => 'stock_adjustment',
                        'quantity' => 1,
                        'weight' => $targetWeight,
                        'unit_cost' => 0,
                        'notes' => "Unified stock adjustment for " . ucfirst($matType) . ": {$notes}",
                        'created_by' => Auth::id() ?? 1,
                    ]);
                }

                $retMsg = ($matType === 'diamond' && !empty($stamp) && $stamp !== 'all' && !str_contains(strtolower($stamp), 'all diamond'))
                    ? "Diamond ({$stamp}) available stock balance updated successfully!"
                    : (($matType === 'gold' && $karat && $karat !== 'ALL')
                        ? "Gold ({$karat}) available stock balance updated successfully!"
                        : ucfirst($matType) . " available stock balance updated successfully!");

                return response()->json([
                    'status' => 'success',
                    'message' => $retMsg,
                    'raw_material' => $rawMat->fresh(),
                ]);
            });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to update unified stock: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Failed to update stock: ' . $e->getMessage()
            ], 500);
        }
    }
}
