<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkOrderOperation extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_order_id',
        'work_order_item_id',
        'operation_name',
        'status',
        'processed_qty',
        'weight_measurement',
        'assigned_staff',
        'remarks',
        'started_at',
        'completed_at',
        'created_by',
    ];

    protected $casts = [
        'processed_qty' => 'integer',
        'weight_measurement' => 'decimal:3',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function workOrderItem()
    {
        return $this->belongsTo(WorkOrderItem::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
