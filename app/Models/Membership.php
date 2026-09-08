<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Membership extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'discount_percentage',
        'reward_points_multiplier',
        'validity_months',
        'min_purchase_amount',
        'description',
        'status',
    ];

    protected $casts = [
        'discount_percentage' => 'float',
        'reward_points_multiplier' => 'float',
        'validity_months' => 'integer',
        'min_purchase_amount' => 'float',
    ];
}
