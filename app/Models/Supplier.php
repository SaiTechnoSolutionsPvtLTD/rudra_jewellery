<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Supplier extends Model
{
    use HasFactory;

    protected $table = 'suppliers';

    protected $fillable = [
        'supplier_code',
        'name',
        'company_name',
        'supplier_type',
        'phone',
        'email',
        'gstin',
        'pan_number',
        'address',
        'city',
        'state',
        'pincode',
        'bank_name',
        'account_number',
        'ifsc_code',
        'branch',
        'status',
        'notes',
        'gold_balance_grams',
        'silver_balance_grams',
        'current_balance',
    ];

    protected $casts = [
        'gold_balance_grams' => 'float',
        'silver_balance_grams' => 'float',
        'current_balance' => 'float',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    public function purchaseEntries()
    {
        return $this->hasMany(PurchaseEntry::class);
    }

    public function settlements()
    {
        return $this->hasMany(SupplierSettlement::class);
    }

    public function getOutstandingMoneyAttribute(): float
    {
        return $this->current_balance < 0 ? abs((float) $this->current_balance) : 0.0;
    }

    public function getOutstandingGoldAttribute(): float
    {
        return $this->gold_balance_grams < 0 ? abs((float) $this->gold_balance_grams) : 0.0;
    }
}
