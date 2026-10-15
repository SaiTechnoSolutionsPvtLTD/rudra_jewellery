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
        'item_name',
        'qty',
        'count_qty',
        'unit',
        'weight',
        'less_weight',
        'net_weight',
        'touch',
        'fine_weight',
        'stone_weight',
        'rate',
        'making_charge',
        'stone_cost',
        'total_amount',
        'purchase_date',
        'notes',
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
        'fine_weight' => 'float',
        'stone_weight' => 'float',
        'rate' => 'float',
        'making_charge' => 'float',
        'stone_cost' => 'float',
        'total_amount' => 'float',
        'purchase_date' => 'date:Y-m-d',
    ];

    protected static function booted()
    {
        static::saving(function ($model) {
            $model->qty = max(1, intval($model->qty ?? 1));
            $model->count_qty = floatval($model->count_qty ?? 0);
            $model->weight = floatval($model->weight ?? 0);
            $model->less_weight = floatval($model->less_weight ?? 0);
            $model->net_weight = floatval($model->net_weight ?? max(0, $model->weight - $model->less_weight));
            $model->touch = floatval($model->touch ?? 100);
            $model->fine_weight = floatval($model->fine_weight ?? ($model->net_weight * ($model->touch / 100)));
            $model->stone_weight = floatval($model->stone_weight ?? 0);
            $model->rate = floatval($model->rate ?? 0);
            $model->making_charge = floatval($model->making_charge ?? 0);
            $model->stone_cost = floatval($model->stone_cost ?? 0);
            if ($model->total_amount === null || $model->total_amount === '') {
                $model->total_amount = ($model->net_weight > 0 && $model->rate > 0) ? ($model->net_weight * $model->rate) : ($model->qty * $model->rate);
            } else {
                $model->total_amount = floatval($model->total_amount);
            }
        });
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
}
