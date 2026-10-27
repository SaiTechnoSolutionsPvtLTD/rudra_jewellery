<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceOldGold extends Model
{
    use HasFactory;

    protected $table = 'invoice_old_golds';

    protected $fillable = [
        'invoice_id',
        'item_description',
        'gross_weight',
        'melting_loss',
        'net_weight',
        'purity_touch',
        'fine_weight',
        'rate_per_gram',
        'total_credit',
        'notes',
    ];

    protected $casts = [
        'gross_weight' => 'decimal:3',
        'melting_loss' => 'decimal:3',
        'net_weight' => 'decimal:3',
        'purity_touch' => 'decimal:2',
        'fine_weight' => 'decimal:3',
        'rate_per_gram' => 'decimal:2',
        'total_credit' => 'decimal:2',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }
}
