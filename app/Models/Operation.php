<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Operation extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'code',
        'icon',
        'color',
        'sort_order',
        'status',
        'description',
    ];

    protected $casts = [
        'sort_order' => 'integer',
    ];
}
