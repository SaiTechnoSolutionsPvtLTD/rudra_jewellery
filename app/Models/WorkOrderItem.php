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
        'return_reason',
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
        'karat',
        'purity',
        'color_stone_weight',
        'color_stone_count',
    ];

    public function getColorStoneWeightAttribute()
    {
        $st = $this->stone_details ?? [];
        if (isset($st['color_stone_weight']) && $st['color_stone_weight'] !== '') {
            return (float)$st['color_stone_weight'];
        }
        if (isset($st['colour_stone']) && $st['colour_stone'] !== '') {
            return (float)$st['colour_stone'];
        }
        $attrs = is_array($this->product?->attributes) ? $this->product->attributes : (json_decode($this->product?->attributes ?? '[]', true) ?: []);
        return (float)($attrs['stone_weight'] ?? 0);
    }

    public function getColorStoneCountAttribute()
    {
        $st = $this->stone_details ?? [];
        if (isset($st['color_stone_count']) && $st['color_stone_count'] !== '') {
            return (int)$st['color_stone_count'];
        }
        if (isset($st['no_of_colour_stones']) && $st['no_of_colour_stones'] !== '') {
            return (int)$st['no_of_colour_stones'];
        }
        $attrs = is_array($this->product?->attributes) ? $this->product->attributes : (json_decode($this->product?->attributes ?? '[]', true) ?: []);
        return (int)($attrs['stone_count'] ?? 0);
    }

    public function getKaratAttribute()
    {
        $pd = is_array($this->pricing_details) ? $this->pricing_details : (json_decode($this->pricing_details ?? '[]', true) ?: []);
        if (!empty($pd['gold_purity'])) return (string) $pd['gold_purity'];
        if (!empty($pd['purity'])) return (string) $pd['purity'];
        if (!empty($pd['karat'])) return (string) $pd['karat'];
        if (!empty($pd['gold_priory'])) return (string) $pd['gold_priory'];
        if (!empty($pd['gold_karat'])) return (string) $pd['gold_karat'];
        if (!empty($pd['material_type']) && preg_match('/(24\s*k(?:arat|t)?|22\s*k(?:arat|t)?|18\s*k(?:arat|t)?|14\s*k(?:arat|t)?|999|916|750)/i', $pd['material_type'], $m)) {
            $v = strtoupper(trim($m[1]));
            if ($v === '999') return '24K';
            if ($v === '916') return '22K';
            if ($v === '750') return '18K';
            return $v;
        }
        if ($this->relationLoaded('workOrder') && $this->workOrder) {
            return $this->workOrder->karat;
        }
        return '22K';
    }

    public function getPurityAttribute()
    {
        return $this->karat;
    }

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
