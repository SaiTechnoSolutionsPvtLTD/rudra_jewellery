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

    public function rawMaterial()
    {
        return $this->belongsTo(RawMaterial::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
