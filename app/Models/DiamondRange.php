<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DiamondRange extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'min_ct',
        'max_ct',
        'description',
        'item_name',
        'stamp',
        'part',
        'colour',
        'clarity',
        'remarks',
        'unit',
        'tunch',
        'sale_lb',
        'pc',
        'wt_ct',
        'dollar',
        'disc_percent',
        'dolx_rate',
        'rate',
        'value',
    ];

    protected $casts = [
        'min_ct' => 'float',
        'max_ct' => 'float',
        'pc' => 'integer',
        'wt_ct' => 'float',
        'dollar' => 'float',
        'disc_percent' => 'float',
        'dolx_rate' => 'float',
        'rate' => 'float',
        'value' => 'float',
    ];
}
