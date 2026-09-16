<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SaleItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id', 'product_id', 'product_name', 'product_code', 'quantity',
        'gross_weight', 'net_weight', 'stone_weight', 'purity', 'rate',
        'making_charge', 'labour_charge', 'stone_charge', 'diamond_charge',
        'other_charge', 'line_total', 'cost_amount', 'details',
    ];

    protected $casts = [
        'quantity' => 'float', 'gross_weight' => 'float', 'net_weight' => 'float',
        'stone_weight' => 'float', 'purity' => 'float', 'rate' => 'float',
        'making_charge' => 'float', 'labour_charge' => 'float', 'stone_charge' => 'float',
        'diamond_charge' => 'float', 'other_charge' => 'float', 'line_total' => 'float',
        'cost_amount' => 'float', 'details' => 'array',
    ];

    public function invoice() { return $this->belongsTo(Invoice::class); }
    public function product() { return $this->belongsTo(Product::class); }
}
