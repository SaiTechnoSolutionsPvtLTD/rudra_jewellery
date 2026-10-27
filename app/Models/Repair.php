<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Repair extends Model
{
    use HasFactory;

    protected $table = 'repairs';

    protected $fillable = [
        'repair_number',
        'client_id',
        'client_name',
        'intake_date',
        'promised_date',
        'item_description',
        'intake_weight',
        'status', // received, assigned, in_progress, ready, delivered
        'karigar_id',
        'karigar_name',
        'added_metal_weight',
        'added_metal_cost',
        'labour_charges',
        'stone_charges',
        'total_charges',
        'advance_paid',
        'balance_due',
        'notes',
    ];

    protected $casts = [
        'intake_date' => 'date',
        'promised_date' => 'date',
        'intake_weight' => 'decimal:3',
        'added_metal_weight' => 'decimal:3',
        'added_metal_cost' => 'decimal:2',
        'labour_charges' => 'decimal:2',
        'stone_charges' => 'decimal:2',
        'total_charges' => 'decimal:2',
        'advance_paid' => 'decimal:2',
        'balance_due' => 'decimal:2',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function karigar()
    {
        return $this->belongsTo(Karigar::class, 'karigar_id');
    }
}
