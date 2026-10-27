<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApprovalMemoItem extends Model
{
    use HasFactory;

    protected $table = 'approval_memo_items';

    protected $fillable = [
        'approval_memo_id',
        'piece_id',
        'tag_number',
        'product_id',
        'product_name',
        'gross_weight',
        'net_weight',
        'estimated_price',
        'status', // pending, returned, sold
        'returned_at',
        'sold_at',
        'invoice_id',
    ];

    protected $casts = [
        'gross_weight' => 'decimal:3',
        'net_weight' => 'decimal:3',
        'estimated_price' => 'decimal:2',
        'returned_at' => 'datetime',
        'sold_at' => 'datetime',
    ];

    public function memo()
    {
        return $this->belongsTo(ApprovalMemo::class, 'approval_memo_id');
    }

    public function piece()
    {
        return $this->belongsTo(WorkOrderReceivedPiece::class, 'piece_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class, 'product_id');
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }
}
