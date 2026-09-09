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
        'qty',
        'weight',
        'touch',
        'fine_weight',
        'rate',
        'total_amount',
        'purchase_date',
        'notes',
    ];

    protected $casts = [
        'qty' => 'integer',
        'weight' => 'float',
        'touch' => 'float',
        'fine_weight' => 'float',
        'rate' => 'float',
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
}
