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
        'category_id',
        'purchase_type',
        'metal_type',
        'purity',
        'item_name',
        'qty',
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
        'qty' => 'integer',
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
}
