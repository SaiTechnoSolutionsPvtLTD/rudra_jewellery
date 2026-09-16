<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkOrderTimeline extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'work_order_id',
        'stage',
        'stage_label',
        'completed_weight_at_step',
        'pending_weight_at_step',
        'status',
        'notes',
        'user_id',
        'action_by_name',
        'created_at',
    ];

    protected $casts = [
        'completed_weight_at_step' => 'float',
        'pending_weight_at_step' => 'float',
        'created_at' => 'datetime',
    ];

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
