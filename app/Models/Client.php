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
    ];

    protected $casts = [
        'dob' => 'date',
        'anniversary_date' => 'date',
        'last_visit' => 'datetime',
        'total_purchases' => 'float',
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
}
