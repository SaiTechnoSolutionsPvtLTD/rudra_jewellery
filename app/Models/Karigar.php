<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Karigar extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'karigar_code',
        'name',
        'primary_phone',
        'secondary_phone',
        'email',
        'specialization',
        'experience_years',
        'workshop_name',
        'workshop_address',
        'city',
        'state',
        'zip_code',
        'pan_number',
        'aadhar_number',
        'bank_name',
        'account_number',
        'ifsc_code',
        'upi_id',
        'standard_wastage_percent',
        'making_charge_per_gram',
        'current_gold_balance_grams',
        'status',
        'avatar_url',
        'notes',
    ];

    protected $casts = [
        'experience_years' => 'integer',
        'standard_wastage_percent' => 'float',
        'making_charge_per_gram' => 'float',
        'current_gold_balance_grams' => 'float',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function workOrders()
    {
        return $this->hasMany(WorkOrder::class, 'karigar_id');
    }

    /**
     * Active work order (not completed or cancelled)
     */
    public function activeWorkOrder()
    {
        return $this->hasOne(WorkOrder::class, 'karigar_id')
            ->whereNotIn('status', ['completed', 'cancelled', 'final_received'])
            ->latest('id');
    }

    /**
     * Check if karigar is currently assigned to an active work order
     */
    public function hasActiveWorkOrder(): bool
    {
        return $this->workOrders()
            ->whereNotIn('status', ['completed', 'cancelled', 'final_received'])
            ->exists();
    }
}
