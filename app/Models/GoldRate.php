<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GoldRate extends Model
{
    use HasFactory;

    protected $fillable = [
        'rate_date',
        'gold_24k_10g',
        'gold_24k_1g',
        'gold_22k_10g',
        'gold_22k_1g',
        'gold_18k_1g',
        'gold_14k_1g',
        'silver_1kg',
        'silver_1g',
        'source',
        'notes',
    ];

    protected $casts = [
        'rate_date' => 'date:Y-m-d',
        'gold_24k_10g' => 'float',
        'gold_24k_1g' => 'float',
        'gold_22k_10g' => 'float',
        'gold_22k_1g' => 'float',
        'gold_18k_1g' => 'float',
        'gold_14k_1g' => 'float',
        'silver_1kg' => 'float',
        'silver_1g' => 'float',
    ];
}
