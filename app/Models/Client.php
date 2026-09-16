<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Client extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_code',
        'full_name',
        'gender',
        'dob',
        'anniversary_date',
        'primary_phone',
        'secondary_phone',
        'email',
        'aadhar_number',
        'pan_number',
        'street_address',
        'city',
        'state',
        'zip_code',
        'company_name',
        'gst_number',
        'gst_percentage',
        'designation',
        'membership_tier',
        'total_purchases',
        'last_visit',
        'quick_notes',
        'avatar',
        'status',
        'is_removed',
        'removed_at',
        'remove_reason',
        'can_be_restored',
        'removed_by',
    ];

    protected $casts = [
        'dob' => 'date',
        'anniversary_date' => 'date',
        'last_visit' => 'datetime',
        'removed_at' => 'datetime',
        'total_purchases' => 'float',
        'is_removed' => 'boolean',
        'can_be_restored' => 'boolean',
    ];

    protected $appends = [
        'avatar_url',
    ];

    public function getAvatarUrlAttribute()
    {
        if ($this->avatar) {
            if (filter_var($this->avatar, FILTER_VALIDATE_URL)) {
                return $this->avatar;
            }
            return asset('storage/' . $this->avatar);
        }
        return null;
    }

    public function invoices()
    {
        return $this->hasMany(Invoice::class);
    }
}
