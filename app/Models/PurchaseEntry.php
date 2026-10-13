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
