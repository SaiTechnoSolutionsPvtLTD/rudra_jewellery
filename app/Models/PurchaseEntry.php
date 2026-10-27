<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_no',
        'supplier_id',
        'product_id',
        'raw_material_id',
        'category_id',
        'purchase_type',
        'metal_type',
        'purity',
        'stamp',
        'item_name',
        'design_no',
        'qty',
        'count_qty',
        'unit',
        'weight',
        'less_weight',
        'net_weight',
        'touch',
        'wastage_percent',
        'fine_weight',
        'stone_weight',
        'rate',
        'making_charge',
        'stone_cost',
        'cgst_percent',
        'cgst_amount',
        'sgst_percent',
        'sgst_amount',
        'igst_percent',
        'igst_amount',
        'total_tax_amount',
        'total_amount',
        'purchase_date',
        'credit_days',
        'due_date',
        'payment_status',
        'paid_amount',
        'notes',
        'components',
        'image',
    ];

    protected $casts = [
        'raw_material_id' => 'integer',
        'qty' => 'integer',
        'count_qty' => 'float',
        'weight' => 'float',
        'less_weight' => 'float',
        'net_weight' => 'float',
        'touch' => 'float',
        'wastage_percent' => 'float',
        'fine_weight' => 'float',
        'stone_weight' => 'float',
        'rate' => 'float',
        'making_charge' => 'float',
        'stone_cost' => 'float',
        'cgst_percent' => 'float',
        'cgst_amount' => 'float',
        'sgst_percent' => 'float',
        'sgst_amount' => 'float',
        'igst_percent' => 'float',
        'igst_amount' => 'float',
        'total_tax_amount' => 'float',
        'total_amount' => 'float',
        'purchase_date' => 'date:Y-m-d',
        'credit_days' => 'integer',
        'due_date' => 'date:Y-m-d',
        'paid_amount' => 'float',
        'components' => 'array',
    ];

    protected static function booted()
    {
        static::saving(function ($model) {
            $model->qty = max(1, intval($model->qty ?? 1));
            $model->count_qty = floatval($model->count_qty ?? 0);
            $model->weight = floatval($model->weight ?? 0);
            $model->less_weight = floatval($model->less_weight ?? 0);
            $isDiamond = strtolower($model->metal_type ?? '') === 'diamond';
            $lessWeightGrams = $isDiamond ? $model->less_weight : ($model->less_weight * 0.2);
            $model->net_weight = floatval($model->net_weight ?? max(0, $model->weight - $lessWeightGrams));
            
            $model->touch = floatval($model->touch ?? 100);
            $model->wastage_percent = floatval($model->wastage_percent ?? 0);
            
            if ($isDiamond) {
                // Diamonds stay in carats, fine weight represents net carat weight directly
                $model->fine_weight = floatval($model->fine_weight ?? $model->net_weight);
            } else {
                // 24K Pure Gold Conversion: Purchased weight * Purchased purity / 24
                if ($model->fine_weight === null || $model->fine_weight === '' || floatval($model->fine_weight) <= 0) {
                    $model->fine_weight = \App\Helpers\GoldConversionHelper::convertTo24kPureWeight(
                        $model->net_weight,
                        $model->purity,
                        $model->touch,
                        $model->wastage_percent
                    );
                } else {
                    $model->fine_weight = floatval($model->fine_weight);
                }
            }

            $model->stone_weight = floatval($model->stone_weight ?? 0);
            $model->rate = floatval($model->rate ?? 0);
            $model->making_charge = floatval($model->making_charge ?? 0);
            $model->stone_cost = floatval($model->stone_cost ?? 0);

            // Base material cost
            $baseCost = ($model->net_weight > 0 && $model->rate > 0)
                ? ($model->net_weight * $model->rate)
                : ($model->qty * $model->rate);

            // Taxes
            $taxableSubtotal = $baseCost + $model->making_charge + $model->stone_cost;
            $cgstAmt = floatval($model->cgst_amount ?? 0);
            $sgstAmt = floatval($model->sgst_amount ?? 0);
            $igstAmt = floatval($model->igst_amount ?? 0);

            if ($cgstAmt <= 0 && floatval($model->cgst_percent ?? 0) > 0) {
                $cgstAmt = round($taxableSubtotal * (floatval($model->cgst_percent) / 100), 2);
                $model->cgst_amount = $cgstAmt;
            }
            if ($sgstAmt <= 0 && floatval($model->sgst_percent ?? 0) > 0) {
                $sgstAmt = round($taxableSubtotal * (floatval($model->sgst_percent) / 100), 2);
                $model->sgst_amount = $sgstAmt;
            }
            if ($igstAmt <= 0 && floatval($model->igst_percent ?? 0) > 0) {
                $igstAmt = round($taxableSubtotal * (floatval($model->igst_percent) / 100), 2);
                $model->igst_amount = $igstAmt;
            }
            $totalTax = round($cgstAmt + $sgstAmt + $igstAmt, 2);
            $model->total_tax_amount = $totalTax;

            if ($model->total_amount === null || $model->total_amount === '' || floatval($model->total_amount) <= 0) {
                $model->total_amount = round($taxableSubtotal + $totalTax, 2);
            } else {
                $model->total_amount = floatval($model->total_amount);
            }

            // Calculate due_date if credit_days is set and due_date is empty
            if (!empty($model->credit_days) && intval($model->credit_days) > 0 && empty($model->due_date) && !empty($model->purchase_date)) {
                $model->due_date = \Carbon\Carbon::parse($model->purchase_date)->addDays(intval($model->credit_days))->format('Y-m-d');
            }

            // Payment status & paid amount
            $model->paid_amount = floatval($model->paid_amount ?? 0);
            $total = floatval($model->total_amount ?? 0);
            $rate = floatval($model->rate ?? 0);

            if ($rate > 0 && $total > 0) {
                if ($model->paid_amount >= $total) {
                    $model->payment_status = 'paid';
                } elseif ($model->paid_amount > 0) {
                    $model->payment_status = 'partial';
                } else {
                    $model->payment_status = 'unpaid';
                }
            } elseif (empty($model->payment_status)) {
                $model->payment_status = 'unpaid';
            }
        });
    }

    protected $appends = [
        'fine_weight_24k',
        'is_unpriced',
        'payable_type',
        'outstanding_balance',
    ];

    public function getFineWeight24kAttribute(): float
    {
        return round((float) ($this->fine_weight ?? 0), 3);
    }

    public function getIsUnpricedAttribute(): bool
    {
        return (float) ($this->rate ?? 0) <= 0;
    }

    public function getPayableTypeAttribute(): string
    {
        return (float) ($this->rate ?? 0) <= 0 ? 'gold' : 'monetary';
    }

    public function getOutstandingBalanceAttribute(): float
    {
        if ($this->getIsUnpricedAttribute()) {
            return (float) $this->getFineWeight24kAttribute();
        }
        return max(0, round((float) ($this->total_amount ?? 0) - (float) ($this->paid_amount ?? 0), 2));
    }

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function rawMaterial()
    {
        return $this->belongsTo(RawMaterial::class);
    }

    public function settlements()
    {
        return $this->hasMany(SupplierSettlement::class);
    }
}
