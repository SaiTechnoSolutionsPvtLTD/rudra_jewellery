<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Karigar;
use App\Models\WorkOrder;
use App\Models\RawMaterial;
use App\Models\KarigarMaterialTransaction;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;

class KarigarMaterialController extends Controller
{
    /**
     * Check if authenticated user has Admin or Manager authority
     */
    protected function authorizeManager(): void
    {
        $user = Auth::user();
        if (!$user) {
            return; // In development API environment where auth might be optional/mocked
        }

        $role = strtolower(str_replace(' ', '_', $user->role ?? ''));
        $isAuthorized = in_array($role, ['admin', 'super_admin', 'manager', 'store_manager', 'workshop_manager'])
            || $user->isSuperAdmin()
            || $user->hasPermission('karigar.manage')
            || $user->hasPermission('material.manage');

        if (!$isAuthorized && !empty($user->role) && !in_array($role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized: Only Admin and authorized Manager roles may manage karigar material balances.');
        }
    }

    /**
     * Get summary ledger of all karigars with material balances
     */
    public function index()
    {
        $karigars = Karigar::with(['workOrders' => function ($q) {
            $q->whereNotIn('status', ['completed', 'cancelled', 'final_received', 'delivered']);
        }])->get();

        $data = $karigars->map(function ($k) {
            $activeOrders = $k->workOrders;
            $allOrders = WorkOrder::where('karigar_id', $k->id)->get();

            $companyAllocated = (float) $allOrders->sum('allotted_weight');
            $additionalIssued = (float) $allOrders->sum('additional_allocated_weight');
            $finishedReceived = (float) $allOrders->sum('completed_weight');
            $approvedWastage = (float) $allOrders->sum('wastage_weight');
            $unusedReturned = (float) $allOrders->sum('returned_weight');
            $karigarGold = (float) $allOrders->sum('karigar_gold_weight');

            // Material physically on bench (Company-owned only)
            $benchBalance = max(0.0, round($companyAllocated + $additionalIssued - $finishedReceived - $approvedWastage - $unusedReturned, 3));

            // Signed settlement balance: Company gold on bench - Karigar-owned gold
            // Negative means Company owes gold to Karigar!
            $settlementBalance = round($benchBalance - $karigarGold, 3);

            // Diamond metrics across Karigar's active work orders
            $diaAllocated = 0.0;
            $diaReceived = 0.0;
            $diaCountAllocated = 0;
            $diaCountReceived = 0;

            foreach ($allOrders as $ord) {
                // Sum diamond from items
                foreach ($ord->items as $itm) {
                    $p = $itm->pricing_details ?? [];
                    $st = $itm->stone_details ?? [];
                    $qty = max(1, (int)($itm->required_qty ?? 1));
                    $dW = (float)($p['diamond_weight'] ?? $st['diamond_weight'] ?? 0);
                    $dC = (int)($p['no_of_diamonds'] ?? $p['diamond_count'] ?? $st['diamond_count'] ?? 0);
                    $diaAllocated += ($dW * $qty);
                    $diaCountAllocated += ($dC * $qty);
                }
                if ($diaAllocated == 0 && str_contains(strtolower($ord->material_type ?? ''), 'diamond')) {
                    $diaAllocated += (float)$ord->allotted_weight;
                }

                // Sum diamond from received pieces
                $diaReceived += (float) $ord->receivedPieces->whereNotNull('received_at')->sum('diamond_weight');
                $diaCountReceived += (int) $ord->receivedPieces->whereNotNull('received_at')->sum('diamond_count');
            }

            $diaOnBench = max(0.0, round($diaAllocated - $diaReceived, 3));
            $diaCountOnBench = max(0, round($diaCountAllocated - $diaCountReceived, 0));

            return [
                'id' => $k->id,
                'name' => $k->name,
                'karigar_code' => $k->karigar_code,
                'phone' => $k->primary_phone,
                'specialization' => $k->specialization,
                'workshop_name' => $k->workshop_name,
                'company_allocated' => round($companyAllocated, 3),
                'additional_issued' => round($additionalIssued, 3),
                'finished_received' => round($finishedReceived, 3),
                'approved_wastage' => round($approvedWastage, 3),
                'unused_returned' => round($unusedReturned, 3),
                'karigar_gold_contributed' => round($karigarGold, 3),
                'material_on_bench' => $benchBalance,
                'settlement_balance' => $settlementBalance,
                'diamond_allocated' => round($diaAllocated, 3),
                'diamond_received' => round($diaReceived, 3),
                'diamond_on_bench' => $diaOnBench,
                'diamond_count_allocated' => $diaCountAllocated,
                'diamond_count_received' => $diaCountReceived,
                'diamond_count_on_bench' => $diaCountOnBench,
                'active_jobs_count' => $activeOrders->count(),
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Get detailed material ledger and transaction history for a single karigar
     */
    public function ledger($id)
    {
        $karigar = Karigar::findOrFail($id);
        $allOrders = WorkOrder::where('karigar_id', $id)
            ->with(['items', 'receivedPieces'])
            ->orderBy('id', 'desc')
            ->get();
        $activeOrders = $allOrders->filter(fn($wo) => !in_array($wo->status, ['completed', 'cancelled', 'final_received', 'delivered']))->values();

        $companyAllocated = (float) $allOrders->sum('allotted_weight');
        $additionalIssued = (float) $allOrders->sum('additional_allocated_weight');
        $finishedReceived = (float) $allOrders->sum('completed_weight');
        $approvedWastage = (float) $allOrders->sum('wastage_weight');
        $unusedReturned = (float) $allOrders->sum('returned_weight');
        $karigarGold = (float) $allOrders->sum('karigar_gold_weight');

        // Material physically on bench (Company-owned only)
        $benchBalance = max(0.0, round($companyAllocated + $additionalIssued - $finishedReceived - $approvedWastage - $unusedReturned, 3));

        // Signed settlement balance: Company gold on bench - Karigar-owned gold
        $settlementBalance = round($benchBalance - $karigarGold, 3);

        // Diamond metrics
        $diaAllocated = 0.0;
        $diaReceived = 0.0;
        $diaCountAllocated = 0;
        $diaCountReceived = 0;

        foreach ($allOrders as $ord) {
            foreach ($ord->items as $itm) {
                $p = $itm->pricing_details ?? [];
                $st = $itm->stone_details ?? [];
                $qty = max(1, (int)($itm->required_qty ?? 1));
                $dW = (float)($p['diamond_weight'] ?? $st['diamond_weight'] ?? 0);
                $dC = (int)($p['no_of_diamonds'] ?? $p['diamond_count'] ?? $st['diamond_count'] ?? 0);
                $diaAllocated += ($dW * $qty);
                $diaCountAllocated += ($dC * $qty);
            }
            if ($diaAllocated == 0 && str_contains(strtolower($ord->material_type ?? ''), 'diamond')) {
                $diaAllocated += (float)$ord->allotted_weight;
            }

            $diaReceived += (float) $ord->receivedPieces->whereNotNull('received_at')->sum('diamond_weight');
            $diaCountReceived += (int) $ord->receivedPieces->whereNotNull('received_at')->sum('diamond_count');
        }

        $diaOnBench = max(0.0, round($diaAllocated - $diaReceived, 3));
        $diaCountOnBench = max(0, round($diaCountAllocated - $diaCountReceived, 0));

        // Fetch transaction history
        $transactions = KarigarMaterialTransaction::where('karigar_id', $id)
            ->with(['workOrder:id,work_order_number,product_name'])
            ->orderBy('transaction_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => [
                'karigar' => $karigar,
                'summary' => [
                    'company_gold_allocated' => round($companyAllocated, 3),
                    'additional_gold_issued' => round($additionalIssued, 3),
                    'total_company_issued' => round($companyAllocated + $additionalIssued, 3),
                    'finished_gold_received' => round($finishedReceived, 3),
                    'approved_wastage' => round($approvedWastage, 3),
                    'unused_gold_returned' => round($unusedReturned, 3),
                    'karigar_gold_contributed' => round($karigarGold, 3),
                    'material_on_bench' => $benchBalance,
                    'settlement_balance' => $settlementBalance,
                    'diamond_allocated' => round($diaAllocated, 3),
                    'diamond_received' => round($diaReceived, 3),
                    'diamond_on_bench' => $diaOnBench,
                    'diamond_count_allocated' => $diaCountAllocated,
                    'diamond_count_received' => $diaCountReceived,
                    'diamond_count_on_bench' => $diaCountOnBench,
                ],
                'active_work_orders' => $activeOrders,
                'all_work_orders' => $allOrders,
                'transactions' => $transactions,
            ],
        ]);
    }

    /**
     * Record an auditable material action for a karigar
     * Actions:
     * - additional_allocation: Issue more company gold to karigar
     * - karigar_contribution: Record gold supplied by karigar
     * - unused_returned: Record unused company gold returned by karigar
     * - approve_wastage: Record approved wastage against a work order
     * - adjustment: Manual auditable adjustment with mandatory reason
     * - settlement: Settle owed gold to karigar
     */
    public function storeAction(Request $request, $id)
    {
        $this->authorizeManager();

        if (!$request->has('action_type') && $request->has('action')) {
            $request->merge(['action_type' => $request->input('action')]);
        }

        $validated = $request->validate([
            'action_type' => 'required|string|in:additional_allocation,karigar_contribution,unused_returned,approve_wastage,adjustment,settlement',
            'material_type' => 'nullable|string|in:gold,diamond,colour_stone',
            'purity' => 'nullable|string|max:50',
            'stamp' => 'nullable|string|max:100',
            'weight' => 'required|numeric|min:0.001',
            'work_order_id' => 'nullable|exists:work_orders,id',
            'reason' => 'required|string|min:3|max:500',
            'transaction_date' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($validated, $id) {
            $karigar = Karigar::lockForUpdate()->findOrFail($id);
            $action = $validated['action_type'];
            $matType = strtolower($validated['material_type'] ?? 'gold');
            $weight = round((float) $validated['weight'], 3);
            $reason = trim($validated['reason']);

            $extraNotes = [];
            if (!empty($validated['purity'])) {
                $extraNotes[] = "Purity: {$validated['purity']}";
            }
            if (!empty($validated['stamp'])) {
                $extraNotes[] = "Stamp: {$validated['stamp']}";
            }
            if (!empty($validated['material_type']) && $validated['material_type'] !== 'gold') {
                $extraNotes[] = "Material: " . ucwords(str_replace('_', ' ', $validated['material_type']));
            }
            if (!empty($extraNotes)) {
                $reason = $reason . " (" . implode(', ', $extraNotes) . ")";
            }

            $date = $validated['transaction_date'] ?? now();
            $userId = Auth::id() ?? 1;
            $userName = Auth::user()?->name ?? 'Store Manager';

            $workOrder = null;
            if (!empty($validated['work_order_id'])) {
                $workOrder = WorkOrder::lockForUpdate()->where('karigar_id', $karigar->id)->find($validated['work_order_id']);
                if ($workOrder && str_contains(strtolower($workOrder->material_type ?? ''), 'diamond')) {
                    $matType = 'diamond';
                }
            }

            $companyGoldWeight = 0.0;
            $karigarGoldWeight = 0.0;
            $signedChange = 0.0;

            switch ($action) {
                case 'additional_allocation':
                    // Company issues additional material
                    if ($matType === 'diamond') {
                        RawMaterial::debitAllocation('diamond', $weight);
                    } elseif ($matType === 'colour_stone') {
                        RawMaterial::debitAllocation('stone', $weight);
                    } else {
                        $companyGoldWeight = $weight;
                        $signedChange = +$weight;

                        if ($workOrder) {
                            $workOrder->additional_allocated_weight = round((float) $workOrder->additional_allocated_weight + $weight, 3);
                            $workOrder->pending_weight = max(0.0, round((float) $workOrder->allotted_weight + (float) $workOrder->additional_allocated_weight - (float) $workOrder->completed_weight - (float) $workOrder->wastage_weight - (float) $workOrder->returned_weight, 3));
                            $workOrder->save();
                        }

                        // Reduce company raw material stock
                        RawMaterial::debitAllocation('gold', $weight);
                    }
                    break;

                case 'karigar_contribution':
                    // Karigar supplies additional gold from their own stock
                    $karigarGoldWeight = $weight;
                    $signedChange = -$weight; // Company owes gold to karigar!

                    if ($workOrder) {
                        $workOrder->karigar_gold_weight = round((float) $workOrder->karigar_gold_weight + $weight, 3);
                        $workOrder->save();
                    }
                    break;

                case 'unused_returned':
                    // Karigar returns unused company material
                    if ($matType === 'diamond') {
                        RawMaterial::creditAllocation('diamond', $weight);
                    } elseif ($matType === 'colour_stone') {
                        RawMaterial::creditAllocation('stone', $weight);
                    } else {
                        $companyGoldWeight = $weight;
                        $signedChange = -$weight;

                        if ($workOrder) {
                            $workOrder->returned_weight = round((float) $workOrder->returned_weight + $weight, 3);
                            $workOrder->pending_weight = max(0.0, round((float) $workOrder->allotted_weight + (float) $workOrder->additional_allocated_weight - (float) $workOrder->completed_weight - (float) $workOrder->wastage_weight - (float) $workOrder->returned_weight, 3));
                            $workOrder->save();
                        }

                        // Restore company raw material stock
                        RawMaterial::creditAllocation('gold', $weight);
                    }
                    break;

                case 'approve_wastage':
                    // Approve wastage on a work order
                    $companyGoldWeight = $weight;
                    $signedChange = -$weight; // Reduces karigar's material obligation

                    if ($workOrder) {
                        $workOrder->wastage_weight = round((float) $workOrder->wastage_weight + $weight, 3);
                        $workOrder->pending_weight = max(0.0, round((float) $workOrder->allotted_weight + (float) $workOrder->additional_allocated_weight - (float) $workOrder->completed_weight - (float) $workOrder->wastage_weight - (float) $workOrder->returned_weight, 3));
                        $workOrder->save();
                    }
                    break;

                case 'settlement':
                    // Company returns gold to karigar to settle owed balance
                    $karigarGoldWeight = $weight;
                    $signedChange = +$weight; // Offsets negative balance back towards 0
                    if ($workOrder && (float) $workOrder->karigar_gold_weight >= $weight) {
                        $workOrder->karigar_gold_weight = round((float) $workOrder->karigar_gold_weight - $weight, 3);
                        $workOrder->save();
                    }
                    break;

                case 'adjustment':
                    // Manual adjustment
                    $signedChange = $weight;
                    break;
            }

            // Calculate updated balances
            $allOrders = WorkOrder::where('karigar_id', $karigar->id)->get();
            $companyAllocated = (float) $allOrders->sum('allotted_weight');
            $additionalIssued = (float) $allOrders->sum('additional_allocated_weight');
            $finishedReceived = (float) $allOrders->sum('completed_weight');
            $approvedWastage = (float) $allOrders->sum('wastage_weight');
            $unusedReturned = (float) $allOrders->sum('returned_weight');
            $karigarGold = (float) $allOrders->sum('karigar_gold_weight');

            $benchBalance = max(0.0, round($companyAllocated + $additionalIssued - $finishedReceived - $approvedWastage - $unusedReturned, 3));
            $settlementBalance = round($benchBalance - $karigarGold, 3);

            $karigar->current_gold_balance_grams = $benchBalance;
            $karigar->karigar_gold_balance_grams = $karigarGold;
            $karigar->settlement_balance_grams = $settlementBalance;
            $karigar->save();

            // Record transaction in ledger
            $tx = KarigarMaterialTransaction::create([
                'karigar_id' => $karigar->id,
                'work_order_id' => $workOrder?->id,
                'transaction_type' => $action,
                'transaction_date' => $date,
                'weight' => $weight,
                'company_gold_weight' => $companyGoldWeight,
                'karigar_gold_weight' => $karigarGoldWeight,
                'signed_change' => $signedChange,
                'settlement_balance_after' => $settlementBalance,
                'bench_balance_after' => $benchBalance,
                'reason' => $reason,
                'created_by' => $userId,
                'action_by_name' => $userName,
            ]);

            RawMaterial::recalculateAllocations();

            return response()->json([
                'status' => 'success',
                'message' => 'Material action recorded and balances updated successfully.',
                'transaction' => $tx->load('workOrder'),
                'balances' => [
                    'material_on_bench' => $benchBalance,
                    'karigar_gold_balance' => $karigarGold,
                    'settlement_balance' => $settlementBalance,
                ],
            ]);
        });
    }
}
