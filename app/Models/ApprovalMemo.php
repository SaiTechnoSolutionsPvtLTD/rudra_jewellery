<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApprovalMemo extends Model
{
    use HasFactory;

    protected $table = 'approval_memos';

    protected $fillable = [
        'memo_number',
        'client_id',
        'client_name',
        'memo_date',
        'due_date',
        'status', // pending, returned, converted_to_sale, partial
        'total_pieces',
        'total_weight',
        'estimated_value',
        'notes',
    ];

    protected $casts = [
        'memo_date' => 'date',
        'due_date' => 'date',
        'total_pieces' => 'integer',
        'total_weight' => 'decimal:3',
        'estimated_value' => 'decimal:2',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class, 'client_id');
    }

    public function items()
    {
        return $this->hasMany(ApprovalMemoItem::class, 'approval_memo_id');
    }
}
