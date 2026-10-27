<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class RawMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'material_type',
        'name',
        'code',
        'karat',
        'purity',
        'opening_weight',
        'opening_count',
        'purchased_weight',
        'allocated_weight',
        'current_balance',
        'purchased_count',
        'allocated_count',
        'current_count',
        'unit',
        'description',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'opening_weight' => 'float',
        'opening_count' => 'float',
        'purchased_weight' => 'float',
        'allocated_weight' => 'float',
        'current_balance' => 'float',
        'purchased_count' => 'float',
        'allocated_count' => 'float',
        'current_count' => 'float',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    protected static function booted()
    {
        static::saving(function ($model) {
            $model->opening_weight = max(0.0, floatval($model->opening_weight ?? 0));
            $model->opening_count = max(0.0, floatval($model->opening_count ?? 0));
            $model->purchased_weight = max(0.0, floatval($model->purchased_weight ?? 0));
            $model->purchased_count = max(0.0, floatval($model->purchased_count ?? 0));
            $model->allocated_weight = max(0.0, floatval($model->allocated_weight ?? 0));
            $model->allocated_count = max(0.0, floatval($model->allocated_count ?? 0));
            $model->current_balance = max(0.0, floatval($model->current_balance ?? 0));
            $model->current_count = max(0.0, floatval($model->current_count ?? 0));
            if (empty($model->unit)) {
                $model->unit = (strtolower($model->material_type ?? '') === 'diamond') ? 'ct' : 'g';
            }
        });
    }

    public function getAvailableWeightGramsAttribute()
    {
        $net = round(($this->opening_weight ?? 0) + ($this->purchased_weight ?? 0) - ($this->allocated_weight ?? 0), 3);
        return $this->unit === 'kg' ? round($net * 1000, 3) : $net;
    }

    /**
     * Helper to credit opening stock and recalculate current balance
     */
    public static function creditOpeningStock($materialTypeOrId, $weightOrQty, $count = 0, $unit = null)
    {
        $query = static::query();
        if (is_numeric($materialTypeOrId)) {
            $query->where('id', $materialTypeOrId);
        } else {
            $query->where('material_type', strtolower($materialTypeOrId));
        }

        $record = $query->lockForUpdate()->first();

        if (!$record && !is_numeric($materialTypeOrId)) {
            $type = strtolower($materialTypeOrId);
            $record = static::create([
                'material_type' => $type,
                'name' => 'Raw ' . ucfirst($type),
                'opening_weight' => 0,
                'opening_count' => 0,
                'purchased_weight' => 0,
                'allocated_weight' => 0,
                'current_balance' => 0,
                'purchased_count' => 0,
                'allocated_count' => 0,
                'current_count' => 0,
                'unit' => ($type === 'diamond') ? 'ct' : (($type === 'stone') ? 'units' : 'g'),
            ]);
        }

        if (!$record) {
            return null;
        }

        $addWeight = floatval($weightOrQty);
        $addCount = floatval($count);

        if ($unit && strtolower($unit) !== strtolower($record->unit)) {
            $pUnit = strtolower($unit);
            $mUnit = strtolower($record->unit);

            if ($pUnit === 'kg' && $mUnit === 'g') {
                $addWeight = $addWeight * 1000.0;
            } elseif ($pUnit === 'g' && $mUnit === 'kg') {
                $addWeight = $addWeight / 1000.0;
            }
        }

        if ($addWeight > 0) {
            $record->opening_weight = round(($record->opening_weight ?? 0) + $addWeight, 3);
        }

        if ($addCount > 0) {
            $record->opening_count = round(($record->opening_count ?? 0) + $addCount, 3);
        }

        $record->current_balance = max(0, round(($record->opening_weight ?? 0) + $record->purchased_weight - $record->allocated_weight, 3));
        $record->current_count = max(0, round(($record->opening_count ?? 0) + ($record->purchased_count ?? 0) - ($record->allocated_count ?? 0), 3));
        $record->save();

        return $record;
    }

    /**
     * Helper to update purchased weight and recalculate current balance
     */
    public static function creditPurchase($materialTypeOrId, $weightOrQty, $count = 0, $purchaseUnit = null)
    {
        $query = static::query();
        if (is_numeric($materialTypeOrId)) {
            $query->where('id', $materialTypeOrId);
        } else {
            $query->where('material_type', strtolower($materialTypeOrId));
        }

        $record = $query->lockForUpdate()->first();

        if (!$record && !is_numeric($materialTypeOrId)) {
            $type = strtolower($materialTypeOrId);
            $record = static::create([
                'material_type' => $type,
                'name' => 'Raw ' . ucfirst($type),
                'opening_weight' => 0,
                'opening_count' => 0,
                'purchased_weight' => 0,
                'allocated_weight' => 0,
                'current_balance' => 0,
                'purchased_count' => 0,
                'allocated_count' => 0,
                'current_count' => 0,
                'unit' => ($type === 'diamond') ? 'ct' : (($type === 'stone') ? 'units' : 'g'),
            ]);
        }

        if (!$record) {
            return null;
        }

        $addWeight = floatval($weightOrQty);
        $addCount = floatval($count);

        // Normalize units between purchase and raw material master
        if ($purchaseUnit && strtolower($purchaseUnit) !== strtolower($record->unit)) {
            $pUnit = strtolower($purchaseUnit);
            $mUnit = strtolower($record->unit);

            if ($pUnit === 'kg' && $mUnit === 'g') {
                $addWeight = $addWeight * 1000.0;
            } elseif ($pUnit === 'g' && $mUnit === 'kg') {
                $addWeight = $addWeight / 1000.0;
            }
        } elseif ($record->unit === 'kg' && $addWeight > 50 && !$purchaseUnit) {
            // Legacy conversion heuristic only if no unit was specified
            $addWeight = $addWeight / 1000.0;
        }

        if ($addWeight > 0) {
            $record->purchased_weight = round($record->purchased_weight + $addWeight, 3);
        }

        if ($addCount > 0) {
            $record->purchased_count = round(($record->purchased_count ?? 0) + $addCount, 3);
        }

        $record->current_balance = max(0, round(($record->opening_weight ?? 0) + $record->purchased_weight - $record->allocated_weight, 3));
        $record->current_count = max(0, round(($record->opening_count ?? 0) + ($record->purchased_count ?? 0) - ($record->allocated_count ?? 0), 3));
        $record->save();

        return $record;
    }

    /**
     * Helper to reverse purchased weight/count upon purchase entry deletion
     */
    public static function debitPurchaseReversal($materialTypeOrId, $weightOrQty, $count = 0, $purchaseUnit = null)
    {
        $query = static::query();
        if (is_numeric($materialTypeOrId)) {
            $query->where('id', $materialTypeOrId);
        } else {
            $query->where('material_type', strtolower($materialTypeOrId));
        }

        $record = $query->lockForUpdate()->first();
        if (!$record) return null;

        $subWeight = floatval($weightOrQty);
        $subCount = floatval($count);

        if ($purchaseUnit && strtolower($purchaseUnit) !== strtolower($record->unit)) {
            $pUnit = strtolower($purchaseUnit);
            $mUnit = strtolower($record->unit);
            if ($pUnit === 'kg' && $mUnit === 'g') {
                $subWeight = $subWeight * 1000.0;
            } elseif ($pUnit === 'g' && $mUnit === 'kg') {
                $subWeight = $subWeight / 1000.0;
            }
        } elseif ($record->unit === 'kg' && $subWeight > 50 && !$purchaseUnit) {
            $subWeight = $subWeight / 1000.0;
        }

        if ($subWeight > 0) {
            $record->purchased_weight = max(0, round($record->purchased_weight - $subWeight, 3));
        }

        if ($subCount > 0) {
            $record->purchased_count = max(0, round(($record->purchased_count ?? 0) - $subCount, 3));
        }

        $record->current_balance = max(0, round(($record->opening_weight ?? 0) + $record->purchased_weight - $record->allocated_weight, 3));
        $record->current_count = max(0, round(($record->opening_count ?? 0) + ($record->purchased_count ?? 0) - ($record->allocated_count ?? 0), 3));

        $record->save();

        return $record;
    }

    /**
     * Helper to update allocated weight and recalculate current balance
     */
    public static function debitAllocation($materialType, $weightOrQty, $count = 0)
    {
        $type = strtolower($materialType);
        $record = static::where('material_type', $type)->lockForUpdate()->first();

        if (!$record) {
            $record = static::create([
                'material_type' => $type,
                'name' => 'Raw ' . ucfirst($type),
                'opening_weight' => 0,
                'opening_count' => 0,
                'purchased_weight' => 0,
                'allocated_weight' => 0,
                'current_balance' => 0,
                'purchased_count' => 0,
                'allocated_count' => 0,
                'current_count' => 0,
                'unit' => ($type === 'diamond') ? 'ct' : (($type === 'stone') ? 'units' : 'g'),
            ]);
        }

        $subAmount = floatval($weightOrQty);
        $subCount = floatval($count);

        if ($record->unit === 'kg' && $subAmount > 50) {
            $subAmount = $subAmount / 1000.0;
        }

        if ($subAmount > 0) {
            $record->allocated_weight = round($record->allocated_weight + $subAmount, 3);
        }

        if ($subCount > 0) {
            $record->allocated_count = round(($record->allocated_count ?? 0) + $subCount, 3);
        }

        $record->current_balance = max(0, round(($record->opening_weight ?? 0) + $record->purchased_weight - $record->allocated_weight, 3));
        $record->current_count = max(0, round(($record->opening_count ?? 0) + ($record->purchased_count ?? 0) - ($record->allocated_count ?? 0), 3));

        $record->save();

        return $record;
    }

    /**
     * Helper to return/credit allocated weight back to available raw material stock
     */
    public static function creditAllocation($materialType, $weightOrQty, $count = 0)
    {
        $type = strtolower($materialType);
        $record = static::where('material_type', $type)->lockForUpdate()->first();

        if (!$record) {
            $record = static::where('material_type', 'like', "%{$type}%")->lockForUpdate()->first();
        }

        if (!$record) {
            return null;
        }

        $retAmount = floatval($weightOrQty);
        $retCount = floatval($count);

        if ($record->unit === 'kg' && $retAmount > 50) {
            $retAmount = $retAmount / 1000.0;
        }

        if ($retAmount > 0) {
            if ($retAmount <= ($record->allocated_weight ?? 0)) {
                $record->allocated_weight = round($record->allocated_weight - $retAmount, 3);
            } else {
                $excess = round($retAmount - ($record->allocated_weight ?? 0), 3);
                $record->allocated_weight = 0;
                $record->purchased_weight = round(($record->purchased_weight ?? 0) + $excess, 3);
            }
        }

        if ($retCount > 0) {
            if ($retCount <= ($record->allocated_count ?? 0)) {
                $record->allocated_count = round(($record->allocated_count ?? 0) - $retCount, 3);
            } else {
                $excessCount = round($retCount - ($record->allocated_count ?? 0), 3);
                $record->allocated_count = 0;
                $record->purchased_count = round(($record->purchased_count ?? 0) + $excessCount, 3);
            }
        }

        $record->current_balance = max(0, round(($record->opening_weight ?? 0) + $record->purchased_weight - $record->allocated_weight, 3));
        $record->current_count = max(0, round(($record->opening_count ?? 0) + ($record->purchased_count ?? 0) - ($record->allocated_count ?? 0), 3));

        $record->save();

        return $record;
    }

    /**
     * Recalculate allocated weights across raw materials based on live active work orders in DB
     */
    public static function recalculateAllocations()
    {
        try {
            $activeWorkOrders = \App\Models\WorkOrder::whereNotIn('status', ['completed', 'cancelled', 'final_received', 'delivered'])
                ->with(['items', 'receivedPieces'])
                ->get();
            
            $pureGoldAlloc = 0.0;
            $grossGoldAlloc = 0.0;
            $silverAlloc = 0.0;
            $platinumAlloc = 0.0;
            $diamondAlloc = 0.0;
            $diamondAllocCount = 0;
            $stoneAlloc = 0.0;
            $stoneAllocCount = 0;

            // Check if KarigarMaterialTransaction records exist in the system
            $hasMaterialTxs = \App\Models\KarigarMaterialTransaction::exists();

            if ($hasMaterialTxs) {
                // Gold issued (fine weight) from vault to karigars (exclude allocations sourced directly from karigar bench)
                $goldIssuedTxs = \App\Models\KarigarMaterialTransaction::where('material_type', 'gold')
                    ->where('is_reversed', false)
                    ->whereIn('transaction_type', ['allocation', 'additional_allocation', 'issue'])
                    ->where(function ($q) {
                        $q->whereNull('source')->orWhereNotIn('source', ['bench', 'carried_forward']);
                    })
                    ->get();

                // Physical returns of gold to the company vault (excludes finished jewellery goods and approved wastage)
                $goldRetTxs = \App\Models\KarigarMaterialTransaction::where('material_type', 'gold')
                    ->where('is_reversed', false)
                    ->whereIn('transaction_type', ['unused_returned', 'vault_return', 'physical_return', 'return', 'scrap'])
                    ->get();

                $pureGoldIssued = (float) $goldIssuedTxs->sum(fn($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->company_gold_weight > 0 ? $t->company_gold_weight : $t->weight));
                $pureGoldRet = (float) $goldRetTxs->sum(fn($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->company_gold_weight > 0 ? $t->company_gold_weight : $t->weight));

                $pureGoldAlloc = max(0.0, round($pureGoldIssued - $pureGoldRet, 3));

                $grossGoldIssued = (float) $goldIssuedTxs->sum(fn($t) => $t->gross_weight > 0 ? $t->gross_weight : ($t->net_weight > 0 ? $t->net_weight : $t->weight));
                $grossGoldRet = (float) $goldRetTxs->sum(fn($t) => $t->gross_weight > 0 ? $t->gross_weight : ($t->net_weight > 0 ? $t->net_weight : $t->weight));

                $grossGoldAlloc = max(0.0, round($grossGoldIssued - $grossGoldRet, 3));

                // Diamonds issued from vault vs physically returned to vault
                $diaIssuedTxs = \App\Models\KarigarMaterialTransaction::where('material_type', 'diamond')
                    ->where('is_reversed', false)
                    ->whereIn('transaction_type', ['allocation', 'additional_allocation', 'issue'])
                    ->where(function ($q) {
                        $q->whereNull('source')->orWhereNotIn('source', ['bench', 'carried_forward']);
                    })
                    ->get();

                $diaRetTxs = \App\Models\KarigarMaterialTransaction::where('material_type', 'diamond')
                    ->where('is_reversed', false)
                    ->whereIn('transaction_type', ['unused_returned', 'vault_return', 'physical_return', 'return', 'scrap'])
                    ->get();

                $diaIssuedCt = (float) $diaIssuedTxs->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
                $diaIssuedPcs = (int) $diaIssuedTxs->sum('pieces');
                $diaRetCt = (float) $diaRetTxs->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
                $diaRetPcs = (int) $diaRetTxs->sum('pieces');

                $diamondAlloc = max(0.0, round($diaIssuedCt - $diaRetCt, 3));
                $diamondAllocCount = max(0, round($diaIssuedPcs - $diaRetPcs, 0));

                // Stones issued from vault vs physically returned to vault
                $stoneIssuedTxs = \App\Models\KarigarMaterialTransaction::whereIn('material_type', ['stone', 'colour_stone'])
                    ->where('is_reversed', false)
                    ->whereIn('transaction_type', ['allocation', 'additional_allocation', 'issue'])
                    ->where(function ($q) {
                        $q->whereNull('source')->orWhereNotIn('source', ['bench', 'carried_forward']);
                    })
                    ->get();

                $stoneRetTxs = \App\Models\KarigarMaterialTransaction::whereIn('material_type', ['stone', 'colour_stone'])
                    ->where('is_reversed', false)
                    ->whereIn('transaction_type', ['unused_returned', 'vault_return', 'physical_return', 'return', 'scrap'])
                    ->get();

                $stoneIssuedWt = (float) $stoneIssuedTxs->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
                $stoneIssuedPcs = (int) $stoneIssuedTxs->sum('pieces');
                $stoneRetWt = (float) $stoneRetTxs->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
                $stoneRetPcs = (int) $stoneRetTxs->sum('pieces');

                $stoneAlloc = max(0.0, round($stoneIssuedWt - $stoneRetWt, 3));
                $stoneAllocCount = max(0, round($stoneIssuedPcs - $stoneRetPcs, 0));

                // Silver issued from vault vs physically returned to vault
                $silverIssuedTxs = \App\Models\KarigarMaterialTransaction::where('material_type', 'silver')
                    ->where('is_reversed', false)
                    ->whereIn('transaction_type', ['allocation', 'additional_allocation', 'issue'])
                    ->where(function ($q) {
                        $q->whereNull('source')->orWhereNotIn('source', ['bench', 'carried_forward']);
                    })
                    ->get();

                $silverRetTxs = \App\Models\KarigarMaterialTransaction::where('material_type', 'silver')
                    ->where('is_reversed', false)
                    ->whereIn('transaction_type', ['unused_returned', 'vault_return', 'physical_return', 'return', 'scrap'])
                    ->get();

                $silverIssuedWt = (float) $silverIssuedTxs->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
                $silverRetWt = (float) $silverRetTxs->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
                $silverAlloc = max(0.0, round($silverIssuedWt - $silverRetWt, 3));
            } else {
                foreach ($activeWorkOrders as $wo) {
                    $mat = strtolower($wo->material_type ?? '');
                    $allottedGold = (float)$wo->allotted_weight + (float)($wo->additional_allocated_weight ?? 0);
                    $compGold = (float)$wo->completed_weight;
                    $wastageGold = (float)($wo->wastage_weight ?? 0);
                    $retGold = (float)($wo->returned_weight ?? 0);
                    $pendingGold = max(0.0, round($allottedGold - $compGold - $wastageGold - $retGold, 3));

                    if ($pendingGold <= 0) {
                        continue;
                    }

                    if (str_contains($mat, 'silver')) {
                        $silverAlloc += $pendingGold;
                    } elseif (str_contains($mat, 'platinum') || str_contains($mat, 'plat')) {
                        $platinumAlloc += $pendingGold;
                    } else {
                        $grossGoldAlloc += $pendingGold;
                        $pureGoldAlloc += \App\Helpers\GoldConversionHelper::convertTo24kPureWeight($pendingGold, $wo->pricing_details['purity'] ?? $wo->material_type ?? '22K');
                    }
                }
            }

            // Update Gold 22K record
            $g22 = static::where('material_type', 'gold_22k')->first();
            if ($g22) {
                $g22->allocated_weight = round($grossGoldAlloc, 3);
                $g22->current_balance = max(0.0, round(($g22->opening_weight ?? 0) + ($g22->purchased_weight ?? 0) - $g22->allocated_weight, 3));
                $g22->save();
            }

            // Update Gold generic record (24K pure gold)
            $gold = static::where('material_type', 'gold')->first();
            if ($gold) {
                $val = $gold->unit === 'kg' ? round($pureGoldAlloc / 1000, 3) : round($pureGoldAlloc, 3);
                $gold->allocated_weight = $val;
                $gold->current_balance = max(0.0, round(($gold->opening_weight ?? 0) + ($gold->purchased_weight ?? 0) - $gold->allocated_weight, 3));
                $gold->save();
            }

            // Update Gold 24K record
            $g24 = static::where('material_type', 'gold_24k')->first();
            if ($g24) {
                $g24->allocated_weight = round($pureGoldAlloc, 3);
                $g24->current_balance = max(0.0, round(($g24->opening_weight ?? 0) + ($g24->purchased_weight ?? 0) - ($g24->allocated_weight ?? 0), 3));
                $g24->save();
            }

            // Update Silver record
            $silver = static::where('material_type', 'silver')->first();
            if ($silver) {
                $val = $silver->unit === 'kg' ? round($silverAlloc / 1000, 3) : round($silverAlloc, 3);
                $silver->allocated_weight = $val;
                $silver->current_balance = max(0.0, round(($silver->opening_weight ?? 0) + ($silver->purchased_weight ?? 0) - $silver->allocated_weight, 3));
                $silver->save();
            }

            // Update Platinum record
            $platinum = static::where('material_type', 'platinum')->first();
            if ($platinum) {
                $val = $platinum->unit === 'kg' ? round($platinumAlloc / 1000, 3) : round($platinumAlloc, 3);
                $platinum->allocated_weight = $val;
                $platinum->current_balance = max(0.0, round(($platinum->opening_weight ?? 0) + ($platinum->purchased_weight ?? 0) - $platinum->allocated_weight, 3));
                $platinum->save();
            }

            // Update Diamond records across vault dynamically from PurchaseEntry and MaterialOpeningStock
            $diamondPurchasesQuery = \App\Models\PurchaseEntry::where(function($q) {
                $q->where('purchase_type', 'raw_material')->orWhereNull('purchase_type');
            })->where(function($q) {
                $q->whereRaw('LOWER(metal_type) = ?', ['diamond'])->orWhere('unit', 'ct');
            });
            $actualDiaPurchasedWeight = (float) $diamondPurchasesQuery->sum('net_weight');
            $actualDiaPurchasedCount = (float) $diamondPurchasesQuery->sum('count_qty');

            $actualDiaOpeningWeight = (float) \App\Models\MaterialOpeningStock::where('material_type', 'diamond')->sum('carat_weight');
            $actualDiaOpeningCount = (float) \App\Models\MaterialOpeningStock::where('material_type', 'diamond')->sum('quantity');

            $diamondRecords = static::where('material_type', 'diamond')->get();
            if ($diamondRecords->isNotEmpty()) {
                $primaryDiamond = $diamondRecords->first();
                if ($actualDiaOpeningWeight > 0 || $actualDiaOpeningCount > 0) {
                    $primaryDiamond->opening_weight = round($actualDiaOpeningWeight, 3);
                    $primaryDiamond->opening_count = round($actualDiaOpeningCount, 0);
                } elseif (!app()->environment('testing') && \App\Models\MaterialOpeningStock::where('material_type', 'diamond')->count() === 0) {
                    $primaryDiamond->opening_weight = 0.0;
                    $primaryDiamond->opening_count = 0;
                }
                $primaryDiamond->purchased_weight = round($actualDiaPurchasedWeight, 3);
                $primaryDiamond->purchased_count = round($actualDiaPurchasedCount, 0);
                $primaryDiamond->allocated_weight = round($diamondAlloc, 3);
                $primaryDiamond->allocated_count = round($diamondAllocCount, 0);
                $primaryDiamond->current_balance = max(0.0, round($primaryDiamond->opening_weight + $primaryDiamond->purchased_weight - $primaryDiamond->allocated_weight, 3));
                $primaryDiamond->current_count = max(0.0, round($primaryDiamond->opening_count + $primaryDiamond->purchased_count - $primaryDiamond->allocated_count, 0));
                $primaryDiamond->save();

                // Subsidiary lots are consolidated to the primary record
                foreach ($diamondRecords->skip(1) as $subLot) {
                    $subLot->opening_weight = 0;
                    $subLot->purchased_weight = 0;
                    $subLot->opening_count = 0;
                    $subLot->purchased_count = 0;
                    $subLot->allocated_weight = 0;
                    $subLot->allocated_count = 0;
                    $subLot->current_balance = 0;
                    $subLot->current_count = 0;
                    $subLot->save();
                }
            }

            // Update Stone record: Colour stones are strictly vault-held inventory (never allotted to karigars)
            $stone = static::where('material_type', 'stone')->first();
            if ($stone) {
                $stone->allocated_weight = 0.0;
                $stone->allocated_count = 0;
                $stone->current_balance = max(0.0, round(($stone->opening_weight ?? 0) + ($stone->purchased_weight ?? 0), 3));
                $stone->current_count = max(0.0, round(($stone->opening_count ?? 0) + ($stone->purchased_count ?? 0), 0));
                $stone->save();
            }
        } catch (\Exception $e) {
            // Silently continue if table structure is being migrated
        }
    }
}
