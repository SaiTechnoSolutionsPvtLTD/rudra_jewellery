<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class KarigarMaterialTransaction extends Model
{
    use HasFactory;

    protected $table = 'karigar_material_transactions';

    protected $fillable = [
        'karigar_id',
        'work_order_id',
        'transaction_type',
        'transaction_date',
        'weight',
        'stamp',
        'stamp_id',
        'material_type',
        'material_item',
        'source',
        'purity',
        'touch',
        'sieve_size',
        'unit',
        'pieces',
        'gross_weight',
        'net_weight',
        'fine_weight',
        'wastage_weight',
        'difference_weight',
        'raw_material_id',
        'parent_transaction_id',
        'is_reversed',
        'company_gold_weight',
        'karigar_gold_weight',
        'signed_change',
        'settlement_balance_after',
        'bench_balance_after',
        'reason',
        'created_by',
        'action_by_name',
    ];

    protected $casts = [
        'transaction_date' => 'datetime',
        'weight' => 'decimal:3',
        'gross_weight' => 'decimal:3',
        'net_weight' => 'decimal:3',
        'fine_weight' => 'decimal:3',
        'wastage_weight' => 'decimal:3',
        'difference_weight' => 'decimal:3',
        'touch' => 'decimal:2',
        'pieces' => 'integer',
        'is_reversed' => 'boolean',
        'company_gold_weight' => 'decimal:3',
        'karigar_gold_weight' => 'decimal:3',
        'signed_change' => 'decimal:3',
        'settlement_balance_after' => 'decimal:3',
        'bench_balance_after' => 'decimal:3',
    ];

    public function karigar()
    {
        return $this->belongsTo(Karigar::class);
    }

    public function workOrder()
    {
        return $this->belongsTo(WorkOrder::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function stampMaster()
    {
        return $this->belongsTo(Stamp::class, 'stamp_id');
    }
}
