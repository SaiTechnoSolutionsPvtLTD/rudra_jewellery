<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkOrderItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_order_id',
        'job_order_id',
        'product_id',
        'design_no',
        'product_name',
        'category_id',
        'subcategory_id',
        'item_code',
        'required_qty',
        'completed_qty',
        'qc_pending_qty',
        'qc_approved_qty',
        'rework_qty',
        'ready_qty',
        'certified_qty',
        'hallmarked_qty',
        'received_qty',
        'finalized_qty',
        'allotted_weight',
        'completed_weight',
        'making_charge_per_gram',
        'total_making_charges',
        'stone_details',
        'pricing_details',
        'status',
        'remarks',
    ];

    protected $casts = [
        'required_qty' => 'integer',
        'completed_qty' => 'integer',
        'qc_pending_qty' => 'integer',
        'qc_approved_qty' => 'integer',
        'rework_qty' => 'integer',
        'ready_qty' => 'integer',
        'certified_qty' => 'integer',
        'hallmarked_qty' => 'integer',
        'received_qty' => 'integer',
        'finalized_qty' => 'integer',
        'allotted_weight' => 'decimal:3',
        'completed_weight' => 'decimal:3',
        'making_charge_per_gram' => 'decimal:2',
        'total_making_charges' => 'decimal:2',
        'stone_details' => 'array',
        'pricing_details' => 'array',
    ];

    protected $appends = [
        'pending_production_qty',
        'pending_receive_qty',
    ];

    public function getPendingProductionQtyAttribute()
    {
        return max(0, (int) $this->required_qty - (int) $this->completed_qty);
    }

    public function getPendingReceiveQtyAttribute()
    {
        return max(0, (int) $this->ready_qty - (int) $this->received_qty);
    }

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function jobOrder()
    {
        return $this->belongsTo(JobOrder::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function subcategory()
    {
        return $this->belongsTo(Subcategory::class);
    }

    public function receivedPieces()
    {
        return $this->hasMany(WorkOrderReceivedPiece::class, 'work_order_item_id');
    }

    public function operations()
    {
        return $this->hasMany(WorkOrderOperation::class, 'work_order_item_id');
    }
}
