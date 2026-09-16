<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryMovement extends Model
{
    use HasFactory;

    protected $fillable = ['product_id', 'invoice_id', 'movement_type', 'quantity', 'weight', 'unit_cost', 'notes', 'created_by'];
    protected $casts = ['quantity' => 'float', 'weight' => 'float', 'unit_cost' => 'float'];

    public function product() { return $this->belongsTo(Product::class); }
    public function invoice() { return $this->belongsTo(Invoice::class); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
}
