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
            $record->allocated_weight = max(0, round($record->allocated_weight - $retAmount, 3));
        }

        if ($retCount > 0) {
            $record->allocated_count = max(0, round(($record->allocated_count ?? 0) - $retCount, 3));
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
            
            $goldAlloc = 0.0;
            $silverAlloc = 0.0;
            $platinumAlloc = 0.0;
            $diamondAlloc = 0.0;
            $diamondAllocCount = 0;
            $stoneAlloc = 0.0;
            $stoneAllocCount = 0;

            foreach ($activeWorkOrders as $wo) {
                $mat = strtolower($wo->material_type ?? '');
                $allottedGold = (float)$wo->allotted_weight + (float)($wo->additional_allocated_weight ?? 0);
                $compGold = (float)$wo->completed_weight;
                $wastageGold = (float)($wo->wastage_weight ?? 0);
                $retGold = (float)($wo->returned_weight ?? 0);
                $pendingGold = max(0.0, round($allottedGold - $compGold - $wastageGold - $retGold, 3));

                if (str_contains($mat, 'silver')) {
                    $silverAlloc += $pendingGold;
                } elseif (str_contains($mat, 'platinum') || str_contains($mat, 'plat')) {
                    $platinumAlloc += $pendingGold;
                } elseif (str_contains($mat, 'diamond') && !str_contains($mat, 'gold')) {
                    $diamondAlloc += $pendingGold;
                } else {
                    $goldAlloc += $pendingGold;
                }

                // Tally diamonds studded on this work order's items
                $totalOrderDiaWeight = 0.0;
                $totalOrderDiaCount = 0;
                $totalOrderStoneWeight = 0.0;
                $totalOrderStoneCount = 0;

                foreach ($wo->items as $itm) {
                    $p = $itm->pricing_details ?? [];
                    $st = $itm->stone_details ?? [];
                    $qty = max(1, (int)($itm->required_qty ?? 1));

                    $diaWt = (float)($p['diamond_weight'] ?? $st['diamond_weight'] ?? 0);
                    $diaCnt = (int)($p['no_of_diamonds'] ?? $p['diamond_count'] ?? $st['diamond_count'] ?? 0);
                    $stoneWt = (float)($p['color_stone_weight'] ?? $st['color_stone_weight'] ?? 0);
                    $stoneCnt = (int)($p['no_of_colour_stones'] ?? $p['color_stone_count'] ?? $st['color_stone_count'] ?? 0);

                    $totalOrderDiaWeight += ($diaWt * $qty);
                    $totalOrderDiaCount += ($diaCnt * $qty);
                    $totalOrderStoneWeight += ($stoneWt * $qty);
                    $totalOrderStoneCount += ($stoneCnt * $qty);
                }

                // If items had no explicit diamond weight but the order has diamond specifications
                if ($totalOrderDiaWeight == 0 && !empty($wo->pricing_details['specifications']['diamond_weight'])) {
                    $specDia = (float)$wo->pricing_details['specifications']['diamond_weight'];
                    if ($specDia > 0) {
                        $totalOrderDiaWeight = $specDia * max(1, (int)($wo->required_qty ?? 1));
                    }
                }

                // Subtract diamonds and stones already received in pieces
                $receivedDiaWeight = (float) $wo->receivedPieces->whereNotNull('received_at')->sum('diamond_weight');
                $receivedDiaCount = (int) $wo->receivedPieces->whereNotNull('received_at')->sum('diamond_count');
                $receivedStoneWeight = (float) $wo->receivedPieces->whereNotNull('received_at')->sum('color_stone_weight');
                $receivedStoneCount = (int) $wo->receivedPieces->whereNotNull('received_at')->sum('color_stone_count');

                // Tally: pending allocation = Allotted - Received (clamped to >= 0)
                $pendingDiaWeight = max(0.0, round($totalOrderDiaWeight - $receivedDiaWeight, 3));
                $pendingDiaCount = max(0, round($totalOrderDiaCount - $receivedDiaCount, 0));
                $pendingStoneWeight = max(0.0, round($totalOrderStoneWeight - $receivedStoneWeight, 3));
                $pendingStoneCount = max(0, round($totalOrderStoneCount - $receivedStoneCount, 0));

                $diamondAlloc += $pendingDiaWeight;
                $diamondAllocCount += $pendingDiaCount;
                $stoneAlloc += $pendingStoneWeight;
                $stoneAllocCount += $pendingStoneCount;
            }

            // Update Gold 22K record
            $g22 = static::where('material_type', 'gold_22k')->first();
            if ($g22) {
                $g22->allocated_weight = round($goldAlloc, 3);
                $g22->current_balance = max(0.0, round(($g22->opening_weight ?? 0) + ($g22->purchased_weight ?? 0) - $g22->allocated_weight, 3));
                $g22->save();
            }

            // Update Gold generic record
            $gold = static::where('material_type', 'gold')->first();
            if ($gold) {
                $val = $gold->unit === 'kg' ? round($goldAlloc / 1000, 3) : round($goldAlloc, 3);
                $gold->allocated_weight = $val;
                $gold->current_balance = max(0.0, round(($gold->opening_weight ?? 0) + ($gold->purchased_weight ?? 0) - $gold->allocated_weight, 3));
                $gold->save();
            }

            // Update Gold 24K record
            $g24 = static::where('material_type', 'gold_24k')->first();
            if ($g24) {
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

            // Update Diamond record
            $diamond = static::where('material_type', 'diamond')->first();
            if ($diamond) {
                $diamond->allocated_weight = round($diamondAlloc, 3);
                $diamond->allocated_count = round($diamondAllocCount, 0);
                $diamond->current_balance = max(0.0, round(($diamond->opening_weight ?? 0) + ($diamond->purchased_weight ?? 0) - $diamond->allocated_weight, 3));
                $diamond->current_count = max(0.0, round(($diamond->opening_count ?? 0) + ($diamond->purchased_count ?? 0) - $diamond->allocated_count, 0));
                $diamond->save();
            }

            // Update Stone record
            $stone = static::where('material_type', 'stone')->first();
            if ($stone) {
                $stone->allocated_weight = round($stoneAlloc, 3);
                $stone->allocated_count = round($stoneAllocCount, 0);
                $stone->current_balance = max(0.0, round(($stone->opening_weight ?? 0) + ($stone->purchased_weight ?? 0) - $stone->allocated_weight, 3));
                $stone->current_count = max(0.0, round(($stone->opening_count ?? 0) + ($stone->purchased_count ?? 0) - $stone->allocated_count, 0));
                $stone->save();
            }
        } catch (\Exception $e) {
            // Silently continue if table structure is being migrated
        }
    }
}
