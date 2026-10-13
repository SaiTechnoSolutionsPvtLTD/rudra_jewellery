<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkOrderReceivedPiece extends Model
{
    use HasFactory;

    protected $fillable = [
        'work_order_id',
        'work_order_item_id',
        'receive_order_number',
        'tag_number',
        'piece_number',
        'design_no',
        'product_id',
        'product_name',
        'client_id',
        'karigar_id',
        'gross_weight',
        'old_weight',
        'net_gold_weight',
        'purity',
        'gold_karat',
        'pure_24k_weight',
        'silver_weight',
        'diamond_weight',
        'diamond_count',
        'diamond_details',
        'color_stone_weight',
        'color_stone_count',
        'making_charge_type',
        'making_charge_per_gram',
        'total_making_charge',
        'given_metal_qty',
        'given_cash',
        'huid',
        'certificate_no',
        'description',
        'image_path',
        'status',
        'qc_status',
        'qc_notes',
        'qc_submission_data',
        'qc_checked_at',
        'qc_checked_by',
        'certification_status',
        'certification_agency',
        'certified_at',
        'certified_by',
        'hallmarking_status',
        'hallmarked_at',
        'hallmarked_by',
        'is_inventory_posted',
        'posted_at',
        'posted_by',
        'received_at',
        'received_by',
    ];

    protected $casts = [
        'piece_number' => 'integer',
        'gross_weight' => 'decimal:3',
        'old_weight' => 'decimal:3',
        'net_gold_weight' => 'decimal:3',
        'purity' => 'decimal:2',
        'pure_24k_weight' => 'decimal:3',
        'silver_weight' => 'decimal:3',
        'diamond_weight' => 'decimal:3',
        'diamond_count' => 'integer',
        'color_stone_weight' => 'decimal:3',
        'color_stone_count' => 'integer',
        'making_charge_per_gram' => 'decimal:2',
        'total_making_charge' => 'decimal:2',
        'given_metal_qty' => 'decimal:3',
        'given_cash' => 'decimal:2',
        'is_inventory_posted' => 'boolean',
        'qc_submission_data' => 'array',
        'qc_checked_at' => 'datetime',
        'certified_at' => 'datetime',
        'hallmarked_at' => 'datetime',
        'posted_at' => 'datetime',
        'received_at' => 'datetime',
    ];

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function item()
    {
        return $this->belongsTo(WorkOrderItem::class, 'work_order_item_id');
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function karigar()
    {
        return $this->belongsTo(Karigar::class);
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function poster()
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    public function qcChecker()
    {
        return $this->belongsTo(User::class, 'qc_checked_by');
    }

    public function certifier()
    {
        return $this->belongsTo(User::class, 'certified_by');
    }

    public function hallmarker()
    {
        return $this->belongsTo(User::class, 'hallmarked_by');
    }

    public function isReadyForReceiving(): bool
    {
        return ($this->qc_status === 'passed' || $this->status === 'ready') && empty($this->received_at);
    }

    public function isEligibleForInventory(): bool
    {
        if ($this->is_inventory_posted || empty($this->received_at)) {
            return false;
        }

        $certDone = in_array($this->certification_status, ['completed', 'skipped', 'not_required'], true);
        $hallDone = in_array($this->hallmarking_status, ['completed', 'skipped', 'not_required'], true);

        return $certDone && $hallDone;
    }

    /**
     * Generate unique concurrency-safe Tag Number (e.g. TAG-2026-000008)
     */
    public static function generateTagNumber(): string
    {
        $year = date('Y');
        $latestPiece = self::where('tag_number', 'like', "TAG-{$year}-%")
            ->lockForUpdate()
            ->orderBy('id', 'desc')
            ->first();

        $nextNum = 1;
        if ($latestPiece && preg_match("/TAG-{$year}-(\d+)/", $latestPiece->tag_number, $matches)) {
            $nextNum = (int)$matches[1] + 1;
        } else {
            $countTag = self::whereYear('created_at', $year)->count();
            $nextNum = $countTag + 1;
        }

        // Ensure absolute uniqueness if existing tag exists
        while (self::where('tag_number', "TAG-{$year}-" . str_pad($nextNum, 6, '0', STR_PAD_LEFT))->exists()) {
            $nextNum++;
        }

        return "TAG-{$year}-" . str_pad($nextNum, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Generate unique concurrency-safe Receive Work Order Number (e.g. RWO-2026-000008)
     */
    public static function generateReceiveOrderNumber(): string
    {
        $year = date('Y');
        $latestRwo = self::where('receive_order_number', 'like', "RWO-{$year}-%")
            ->lockForUpdate()
            ->orderBy('id', 'desc')
            ->first();

        $nextRwoNum = 1;
        if ($latestRwo && preg_match("/RWO-{$year}-(\d+)/", $latestRwo->receive_order_number, $matches)) {
            $nextRwoNum = (int)$matches[1] + 1;
        } else {
            $countRwo = self::whereYear('created_at', $year)->count();
            $nextRwoNum = $countRwo + 1;
        }

        while (self::where('receive_order_number', "RWO-{$year}-" . str_pad($nextRwoNum, 6, '0', STR_PAD_LEFT))->exists()) {
            $nextRwoNum++;
        }

        return "RWO-{$year}-" . str_pad($nextRwoNum, 6, '0', STR_PAD_LEFT);
    }
}
