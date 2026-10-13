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
        'opening_weight',
        'opening_count',
        'purchased_weight',
        'allocated_weight',
        'current_balance',
        'purchased_count',
        'allocated_count',
        'current_count',
        'unit',
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
    ];

    public function getAvailableWeightGramsAttribute()
    {
        return $this->unit === 'kg' ? round($this->current_balance * 1000, 3) : round($this->current_balance, 3);
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
            $activeWorkOrders = \App\Models\WorkOrder::whereNotIn('status', ['completed', 'cancelled', 'final_received', 'delivered'])->get();
            
            $goldAlloc = (float) $activeWorkOrders->filter(function ($wo) {
                $m = strtolower($wo->material_type ?? '');
                return !str_contains($m, 'silver') && !str_contains($m, 'diamond');
            })->sum('allotted_weight');

            $silverAlloc = (float) $activeWorkOrders->filter(function ($wo) {
                $m = strtolower($wo->material_type ?? '');
                return str_contains($m, 'silver');
            })->sum('allotted_weight');

            $diamondAlloc = (float) $activeWorkOrders->filter(function ($wo) {
                $m = strtolower($wo->material_type ?? '');
                return str_contains($m, 'diamond');
            })->sum('allotted_weight');

            // Update Gold 22K record
            $g22 = static::where('material_type', 'gold_22k')->first();
            if ($g22) {
                $g22->allocated_weight = round($goldAlloc, 3);
                $g22->current_balance = round($g22->purchased_weight - $g22->allocated_weight, 3);
                $g22->save();
            }

            // Update Gold generic record
            $gold = static::where('material_type', 'gold')->first();
            if ($gold) {
                $val = $gold->unit === 'kg' ? round($goldAlloc / 1000, 3) : round($goldAlloc, 3);
                $gold->allocated_weight = $val;
                $gold->current_balance = round($gold->purchased_weight - $gold->allocated_weight, 3);
                $gold->save();
            }

            // Update Silver record
            $silver = static::where('material_type', 'silver')->first();
            if ($silver) {
                $val = $silver->unit === 'kg' ? round($silverAlloc / 1000, 3) : round($silverAlloc, 3);
                $silver->allocated_weight = $val;
                $silver->current_balance = round($silver->purchased_weight - $silver->allocated_weight, 3);
                $silver->save();
            }

            // Update Diamond record
            $diamond = static::where('material_type', 'diamond')->first();
            if ($diamond) {
                $diamond->allocated_weight = round($diamondAlloc, 3);
                $diamond->current_balance = round($diamond->purchased_weight - $diamond->allocated_weight, 3);
                $diamond->save();
            }
        } catch (\Exception $e) {
            // Silently continue if table structure is being migrated
        }
    }
}
