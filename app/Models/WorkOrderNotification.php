<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkOrderNotification extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_order_id',
        'piece_id',
        'karigar_id',
        'user_id',
        'type',
        'entity_type',
        'entity_id',
        'title',
        'message',
        'data',
        'action_url',
        'idempotency_key',
        'is_read',
        'read_at',
    ];

    protected $casts = [
        'data' => 'array',
        'is_read' => 'boolean',
        'read_at' => 'datetime',
    ];

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function piece()
    {
        return $this->belongsTo(WorkOrderReceivedPiece::class, 'piece_id');
    }

    public function karigar()
    {
        return $this->belongsTo(Karigar::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
