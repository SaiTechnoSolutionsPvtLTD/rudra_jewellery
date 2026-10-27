<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SupplierSettlement extends Model
{
    use HasFactory;

    protected $table = 'supplier_settlements';

    protected $fillable = [
        'supplier_id',
        'purchase_entry_id',
        'settlement_type',
        'amount',
        'weight',
        'purity',
        'touch',
        'fine_weight',
        'payment_mode',
        'reference_no',
        'settlement_date',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'amount' => 'float',
        'weight' => 'float',
        'touch' => 'float',
        'fine_weight' => 'float',
        'settlement_date' => 'date:Y-m-d',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function supplier()
    {
        return $this->belongsTo(Supplier::class);
    }

    public function purchaseEntry()
    {
        return $this->belongsTo(PurchaseEntry::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
