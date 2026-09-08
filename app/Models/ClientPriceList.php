<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ClientPriceList extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'version',
        'status',
        'effective_from',
        'effective_to',
        'diamond_stone_rates',
        'color_stone_charges',
        'additional_charges',
        'making_charges',
        'stamping_instructions',
        'payment_terms',
    ];

    protected $casts = [
        'diamond_stone_rates' => 'array',
        'color_stone_charges' => 'array',
        'additional_charges' => 'array',
        'making_charges' => 'array',
        'stamping_instructions' => 'array',
        'payment_terms' => 'array',
        'effective_from' => 'date',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }
}
