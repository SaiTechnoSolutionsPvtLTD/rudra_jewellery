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
    ];

    protected $casts = [
        'min_ct' => 'float',
        'max_ct' => 'float',
    ];
}
