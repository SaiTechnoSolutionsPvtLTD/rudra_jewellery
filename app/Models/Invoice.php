<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Invoice extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_no',
        'client_id',
        'client_name',
        'client_email',
        'client_tier',
        'client_initials',
        'invoice_date',
        'amount',
        'gst_rate',
        'gst_amount',
        'total_amount',
        'paid_amount',
        'due_amount',
        'due_date',
        'payment_method',
        'cost_amount',
        'profit_amount',
        'sale_status',
        'created_by',
        'status',
        'invoice_type',
        'notes',
        'items',
    ];

    protected $casts = [
        'invoice_date' => 'date',
        'amount' => 'float',
        'gst_rate' => 'float',
        'gst_amount' => 'float',
        'total_amount' => 'float',
        'paid_amount' => 'float',
        'due_amount' => 'float',
        'due_date' => 'date',
        'cost_amount' => 'float',
        'profit_amount' => 'float',
        'items' => 'array',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function itemsRelation()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function payments()
    {
        return $this->hasMany(SalePayment::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
