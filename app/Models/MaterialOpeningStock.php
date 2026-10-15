<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MaterialOpeningStock extends Model
{
    use HasFactory;

    protected $fillable = [
        'stock_number',
        'material_type',
        'raw_material_id',
        'stamp',
        'karat',
        'purity',
        'unit',
        'weight',
        'carat_weight',
        'quantity',
        'rate',
        'total_value',
        'entry_date',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'purity' => 'float',
        'weight' => 'float',
        'carat_weight' => 'float',
        'quantity' => 'float',
        'rate' => 'float',
        'total_value' => 'float',
        'entry_date' => 'date:Y-m-d',
        'raw_material_id' => 'integer',
        'created_by' => 'integer',
    ];

    protected static function booted()
    {
        static::saving(function ($model) {
            $model->weight = round(floatval($model->weight ?? 0), 3);
            $model->carat_weight = round(floatval($model->carat_weight ?? 0), 3);
            $model->quantity = round(floatval($model->quantity ?? 0), 3);
            $model->rate = round(floatval($model->rate ?? 0), 2);
            $model->total_value = round(floatval($model->total_value ?? 0), 2);
            if (empty($model->unit)) {
                $model->unit = (strtolower($model->material_type ?? '') === 'diamond') ? 'ct' : 'g';
            }
        });
    }

    public function rawMaterial()
    {
        return $this->belongsTo(RawMaterial::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
