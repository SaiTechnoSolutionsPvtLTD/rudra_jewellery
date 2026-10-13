<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class JobOrder extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'job_orders';

    protected $fillable = [
        'job_order_number',
        'client_id',
        'customer_name',
        'order_date',
        'delivery_date',
        'status',
        'total_jobs_count',
        'total_allotted_weight',
        'total_completed_weight',
        'total_pending_weight',
        'total_making_charges',
        'total_price',
        'notes',
        'created_by',
    ];

    protected static function booted()
    {
        static::deleting(function ($jobOrder) {
            foreach ($jobOrder->jobs as $job) {
                $job->delete();
            }
        });
    }

    protected $casts = [
        'order_date' => 'date',
        'delivery_date' => 'date',
        'total_jobs_count' => 'integer',
        'total_allotted_weight' => 'float',
        'total_completed_weight' => 'float',
        'total_pending_weight' => 'float',
        'total_making_charges' => 'float',
        'total_price' => 'float',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function jobs()
    {
        return $this->hasMany(WorkOrder::class, 'job_order_id');
    }

    /**
     * Recalculate and update the overall derived status and totals of the Job Order based on its child jobs.
     */
    public function updateDerivedStatus()
    {
        $childJobs = $this->jobs()->get();
        if ($childJobs->isEmpty()) {
            return;
        }

        $totalCount = $childJobs->count();
        $allotted = $childJobs->sum('allotted_weight');
        $completed = $childJobs->sum('completed_weight');
        $pending = max(0, $allotted - $completed);

        $statuses = $childJobs->pluck('status')->toArray();
        $qualityStatuses = $childJobs->pluck('quality_status')->toArray();

        $newStatus = 'ongoing';

        $allCompleted = count(array_filter($statuses, fn($s) => in_array($s, ['completed', 'approved', 'final_received']))) === $totalCount;
        $anyReturned = in_array('returned', $statuses) || in_array('returned', $qualityStatuses);
        $allPendingQc = count(array_filter($statuses, fn($s) => $s === 'pending_approval')) === $totalCount;
        $anyInProgress = count(array_filter($statuses, fn($s) => in_array($s, ['in_progress', 'work_started', 'assigned']))) > 0;
        $anyCompleted = count(array_filter($statuses, fn($s) => in_array($s, ['completed', 'approved', 'ready']))) > 0;

        if ($allCompleted) {
            $newStatus = 'completed';
        } elseif ($anyReturned) {
            $newStatus = 'rework';
        } elseif ($allPendingQc) {
            $newStatus = 'pending_qc';
        } elseif ($anyCompleted || $anyInProgress) {
            $newStatus = 'partially_completed';
        }

        $this->total_jobs_count = $totalCount;
        $this->total_allotted_weight = round((float) $allotted, 3);
        $this->total_completed_weight = round((float) $completed, 3);
        $this->total_pending_weight = round((float) $pending, 3);
        $this->status = $newStatus;
        $this->save();
    }
}
