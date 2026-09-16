<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkOrderNotification extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_order_id',
        'karigar_id',
        'user_id',
        'type',
        'title',
        'message',
        'data',
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

    public function karigar()
    {
        return $this->belongsTo(Karigar::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
