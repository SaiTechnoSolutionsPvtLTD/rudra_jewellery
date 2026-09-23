<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RawMaterial extends Model
{
    use HasFactory;

    protected $fillable = [
        'material_type',
        'name',
        'purchased_weight',
        'allocated_weight',
        'current_balance',
        'unit',
    ];

    protected $casts = [
        'purchased_weight' => 'float',
        'allocated_weight' => 'float',
        'current_balance' => 'float',
    ];

    /**
     * Helper to update purchased weight and recalculate current balance
     */
    public static function creditPurchase($materialType, $weightOrQty)
    {
        $type = strtolower($materialType);
        $record = static::firstOrCreate(
            ['material_type' => $type],
            [
                'name' => 'Raw ' . ucfirst($type),
                'purchased_weight' => 0,
                'allocated_weight' => 0,
                'current_balance' => 0,
                'unit' => ($type === 'diamond') ? 'ct' : (($type === 'stone') ? 'units' : 'kg'),
            ]
        );

        $addAmount = floatval($weightOrQty);
        // If unit is kg, and input weight is in grams (e.g. > 50g), convert grams to kg
        if ($record->unit === 'kg' && $addAmount > 50) {
            $addAmount = $addAmount / 1000.0;
        }

        $record->purchased_weight = round($record->purchased_weight + $addAmount, 3);
        $record->current_balance = max(0, round($record->purchased_weight - $record->allocated_weight, 3));
        $record->save();

        return $record;
    }

    /**
     * Helper to update allocated weight and recalculate current balance
     */
    public static function debitAllocation($materialType, $weightOrQty)
    {
        $type = strtolower($materialType);
        $record = static::firstOrCreate(
            ['material_type' => $type],
            [
                'name' => 'Raw ' . ucfirst($type),
                'purchased_weight' => 0,
                'allocated_weight' => 0,
                'current_balance' => 0,
                'unit' => ($type === 'diamond') ? 'ct' : (($type === 'stone') ? 'units' : 'kg'),
            ]
        );

        $subAmount = floatval($weightOrQty);
        // If unit is kg, and input weight is in grams (e.g. > 50g), convert grams to kg
        if ($record->unit === 'kg' && $subAmount > 50) {
            $subAmount = $subAmount / 1000.0;
        }

        $record->allocated_weight = round($record->allocated_weight + $subAmount, 3);
        $record->current_balance = max(0, round($record->purchased_weight - $record->allocated_weight, 3));
        $record->save();

        return $record;
    }
}
