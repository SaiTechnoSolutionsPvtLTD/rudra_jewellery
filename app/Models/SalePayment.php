<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalePayment extends Model
{
    use HasFactory;

    protected $fillable = ['invoice_id', 'amount', 'payment_method', 'reference', 'paid_at', 'received_by'];
    protected $casts = ['amount' => 'float', 'paid_at' => 'datetime'];

    public function invoice() { return $this->belongsTo(Invoice::class); }
    public function receiver() { return $this->belongsTo(User::class, 'received_by'); }
}
