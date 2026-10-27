<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KarigarPayment extends Model
{
    use HasFactory;

    protected $table = 'karigar_payments';

    protected $fillable = [
        'karigar_id',
        'work_order_id',
        'received_piece_id',
        'transaction_type', // payable, payment, advance, adjustment
        'amount',
        'payment_mode', // cash, bank_transfer, upi, cheque, auto_payable, adjustment
        'reference_no',
        'transaction_date',
        'notes',
        'created_by',
        'action_by_name',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'transaction_date' => 'date',
    ];

    public function karigar()
    {
        return $this->belongsTo(Karigar::class);
    }

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function receivedPiece()
    {
        return $this->belongsTo(WorkOrderReceivedPiece::class, 'received_piece_id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
