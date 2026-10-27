<?php

namespace App\Http\Controllers\Api;

use App\Helpers\GoldConversionHelper;
use App\Http\Controllers\Controller;
use App\Models\Karigar;
use App\Models\KarigarMaterialTransaction;
use App\Models\KarigarPayment;
use App\Models\RawMaterial;
use App\Models\Stamp;
use App\Models\User;
use App\Models\WorkOrder;
use App\Services\WorkOrderMaterialRequirementService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class KarigarMaterialController extends Controller
{
    /**
     * Check if authenticated user has Admin or Manager authority
     */
    protected function authorizeManager(): void
    {
        $user = Auth::user();
        if (! $user) {
            return; // In development API environment where auth might be optional/mocked
        }

        $role = strtolower(str_replace(' ', '_', $user->role ?? ''));
        $isAuthorized = in_array($role, ['admin', 'super_admin', 'manager', 'store_manager', 'workshop_manager'])
            || (method_exists($user, 'isSuperAdmin') && $user->isSuperAdmin())
            || (method_exists($user, 'hasPermission') && ($user->hasPermission('karigar.manage') || $user->hasPermission('material.manage')));

        if (! $isAuthorized && ! empty($user->role) && ! in_array($role, ['admin', 'manager'])) {
            abort(403, 'Unauthorized: Only Admin and authorized Manager roles may manage karigar material balances.');
        }
    }

    /**
     * Get summary ledger of all karigars with material balances and financial status
     */
    public function index()
    {
        // Auto-heal: Ensure any artisan referenced in active work orders exists in karigars master
        $missingKarigarIds = WorkOrder::whereNotNull('karigar_id')
            ->whereNotIn('karigar_id', Karigar::pluck('id'))
            ->distinct()
            ->pluck('karigar_id');

        foreach ($missingKarigarIds as $mId) {
            $wo = WorkOrder::where('karigar_id', $mId)->first();
            $workerName = $wo->karigar_name ?? $wo->artisan_name ?? $wo->worker_allocation['worker_name'] ?? ('Artisan #'.$mId);
            $k = new Karigar;
            $k->id = $mId;
            $k->karigar_code = 'KAR-'.str_pad($mId, 3, '0', STR_PAD_LEFT);
            $k->name = $workerName;
            $k->primary_phone = '9876543210';
            $k->status = 'active';
            $k->specialization = 'Goldsmith & Stone Setter';
            $k->workshop_name = 'Main Workshop';
            $k->save();
        }

        $karigars = Karigar::with(['workOrders' => function ($q) {
            $q->whereNotIn('status', ['completed', 'cancelled', 'final_received', 'delivered']);
        }])->get();

        $data = $karigars->map(function ($k) {
            $activeOrders = $k->workOrders;
            $allOrders = WorkOrder::where('karigar_id', $k->id)->get();
            $allTxs = KarigarMaterialTransaction::where('karigar_id', $k->id)->where('is_reversed', false)->get();

            if ($allTxs->isNotEmpty()) {
                $goldTxs = $allTxs->where('material_type', 'gold');

                $txIssuedGross = (float) $goldTxs->whereIn('transaction_type', ['allocation', 'additional_allocation', 'issue'])
                    ->where(fn ($t) => empty($t->source) || ! in_array($t->source, ['bench', 'carried_forward']))
                    ->sum(fn ($t) => $t->gross_weight > 0 ? $t->gross_weight : ($t->net_weight > 0 ? $t->net_weight : $t->weight));

                $txIssuedFine = (float) $goldTxs->whereIn('transaction_type', ['allocation', 'additional_allocation', 'issue'])
                    ->where(fn ($t) => empty($t->source) || ! in_array($t->source, ['bench', 'carried_forward']))
                    ->sum(fn ($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->company_gold_weight > 0 ? $t->company_gold_weight : $t->weight));

                $txConsumedGross = (float) $goldTxs->whereIn('transaction_type', ['finished_received', 'production_consumption'])
                    ->sum(fn ($t) => $t->gross_weight > 0 ? $t->gross_weight : ($t->net_weight > 0 ? $t->net_weight : $t->weight));

                $txConsumedFine = (float) $goldTxs->whereIn('transaction_type', ['finished_received', 'production_consumption'])
                    ->sum(fn ($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->company_gold_weight > 0 ? $t->company_gold_weight : $t->weight));

                $txWastageGross = (float) $goldTxs->where('transaction_type', 'approved_wastage')
                    ->sum(fn ($t) => $t->wastage_weight > 0 ? $t->wastage_weight : ($t->gross_weight > 0 ? $t->gross_weight : $t->weight));

                $txWastageFine = (float) $goldTxs->where('transaction_type', 'approved_wastage')
                    ->sum(fn ($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->wastage_weight > 0 ? $t->wastage_weight : $t->weight));

                $txReturnedGross = (float) $goldTxs->whereIn('transaction_type', ['unused_returned', 'vault_return', 'physical_return', 'return', 'scrap'])
                    ->sum(fn ($t) => $t->gross_weight > 0 ? $t->gross_weight : ($t->net_weight > 0 ? $t->net_weight : $t->weight));

                $txReturnedFine = (float) $goldTxs->whereIn('transaction_type', ['unused_returned', 'vault_return', 'physical_return', 'return', 'scrap'])
                    ->sum(fn ($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->company_gold_weight > 0 ? $t->company_gold_weight : $t->weight));

                $txKarigarGold = (float) $goldTxs->where('transaction_type', 'karigar_contribution')->sum('karigar_gold_weight');

                // Include untracked legacy orders
                $untrackedAllotted = 0.0;
                $untrackedCompleted = 0.0;
                $untrackedWastage = 0.0;
                $untrackedReturned = 0.0;
                $untrackedKarigar = 0.0;

                foreach ($allOrders as $wo) {
                    if ($allTxs->where('work_order_id', $wo->id)->isEmpty()) {
                        $untrackedAllotted += (float) $wo->allotted_weight + (float) ($wo->additional_allocated_weight ?? 0);
                        $untrackedCompleted += (float) $wo->completed_weight;
                        $untrackedWastage += (float) $wo->wastage_weight;
                        $untrackedReturned += (float) $wo->returned_weight;
                        $untrackedKarigar += (float) $wo->karigar_gold_weight;
                    }
                }

                $companyAllocated = round($txIssuedGross + $untrackedAllotted, 3);
                $additionalIssued = 0.0;
                $finishedReceived = round($txConsumedGross + $untrackedCompleted, 3);
                $approvedWastage = round($txWastageGross + $untrackedWastage, 3);
                $unusedReturned = round($txReturnedGross + $untrackedReturned, 3);
                $totalKarigarGold = round($txKarigarGold + $untrackedKarigar, 3);

                $benchBalance = round($companyAllocated - $finishedReceived - $approvedWastage - $unusedReturned, 3);
                $settlementBalance = round($benchBalance - $totalKarigarGold, 3);
                $fineGoldOnBench = round($txIssuedFine - $txConsumedFine - $txWastageFine - $txReturnedFine, 3);
                if ($fineGoldOnBench == 0 && $benchBalance > 0) {
                    $fineGoldOnBench = round(GoldConversionHelper::convertTo24kPureWeight($benchBalance, '22K Gold'), 3);
                }

                // Diamond balances
                $diaTxs = $allTxs->where('material_type', 'diamond');
                $diaAllocated = (float) $diaTxs->whereIn('transaction_type', ['allocation', 'additional_allocation', 'issue'])
                    ->where(fn ($t) => empty($t->source) || ! in_array($t->source, ['bench', 'carried_forward']))
                    ->sum('weight');
                $diaCountAllocated = (int) $diaTxs->whereIn('transaction_type', ['allocation', 'additional_allocation', 'issue'])
                    ->where(fn ($t) => empty($t->source) || ! in_array($t->source, ['bench', 'carried_forward']))
                    ->sum('pieces');

                $diaConsumed = (float) $diaTxs->whereIn('transaction_type', ['finished_received', 'production_consumption'])->sum('weight');
                $diaCountConsumed = (int) $diaTxs->whereIn('transaction_type', ['finished_received', 'production_consumption'])->sum('pieces');

                $diaReturned = (float) $diaTxs->whereIn('transaction_type', ['unused_returned', 'vault_return', 'physical_return', 'return', 'scrap'])->sum('weight');
                $diaCountReturned = (int) $diaTxs->whereIn('transaction_type', ['unused_returned', 'vault_return', 'physical_return', 'return', 'scrap'])->sum('pieces');

                $diaReceived = round($diaConsumed + $diaReturned, 3);
                $diaCountReceived = $diaCountConsumed + $diaCountReturned;
                $diaOnBench = round($diaAllocated - $diaReceived, 3);
                $diaCountOnBench = $diaCountAllocated - $diaCountReceived;
            } else {
                $companyAllocated = (float) $allOrders->sum('allotted_weight');
                $additionalIssued = (float) $allOrders->sum('additional_allocated_weight');
                $finishedReceived = (float) $allOrders->sum('completed_weight');
                $approvedWastage = (float) $allOrders->sum('wastage_weight');
                $unusedReturned = (float) $allOrders->sum('returned_weight');
                $totalKarigarGold = (float) $allOrders->sum('karigar_gold_weight');

                $benchBalance = round($companyAllocated + $additionalIssued - $finishedReceived - $approvedWastage - $unusedReturned, 3);
                $settlementBalance = round($benchBalance - $totalKarigarGold, 3);
                $fineGoldOnBench = round(GoldConversionHelper::convertTo24kPureWeight($benchBalance, '22K Gold'), 3);

                $diaAllocated = 0.0;
                $diaReceived = 0.0;
                $diaCountAllocated = 0;
                $diaCountReceived = 0;
                $diaOnBench = 0.0;
                $diaCountOnBench = 0;
            }

            // Financial summary
            $financial = $this->calculateFinancialSummary($k->id);

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
                'karigar_gold_contributed' => $totalKarigarGold,
                'material_on_bench' => $benchBalance,
                'fine_gold_on_bench' => $fineGoldOnBench,
                'cash_balance' => (float) ($financial['net_balance'] ?? 0),
                'settlement_balance' => $settlementBalance,
                'diamond_allocated' => round($diaAllocated, 3),
                'diamond_received' => round($diaReceived, 3),
                'diamond_on_bench' => $diaOnBench,
                'diamond_count_allocated' => $diaCountAllocated,
                'diamond_count_received' => $diaCountReceived,
                'diamond_count_on_bench' => $diaCountOnBench,
                'active_jobs_count' => $activeOrders->count(),
                'financial' => $financial,
            ];
        });

        return response()->json([
            'status' => 'success',
            'data' => $data,
        ]);
    }

    /**
     * Get detailed material ledger, purity breakdown, and transaction history for a single karigar
     */
    public function ledger($id)
    {
        $karigar = Karigar::find($id);
        if (! $karigar) {
            $wo = WorkOrder::where('karigar_id', $id)->first();
            if ($wo) {
                $workerName = $wo->karigar_name ?? $wo->artisan_name ?? $wo->worker_allocation['worker_name'] ?? ('Artisan #'.$id);
                $karigar = new Karigar;
                $karigar->id = $id;
                $karigar->karigar_code = 'KAR-'.str_pad($id, 3, '0', STR_PAD_LEFT);
                $karigar->name = $workerName;
                $karigar->primary_phone = '9876543210';
                $karigar->status = 'active';
                $karigar->specialization = 'Goldsmith & Stone Setter';
                $karigar->workshop_name = 'Main Workshop';
                $karigar->save();
            } else {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Artisan / Karigar profile not found.',
                ], 404);
            }
        }

        $allOrders = WorkOrder::where('karigar_id', $id)
            ->with(['items', 'receivedPieces'])
            ->orderBy('id', 'desc')
            ->get();
        $activeOrders = $allOrders->filter(fn ($wo) => ! in_array($wo->status, ['completed', 'cancelled', 'final_received', 'delivered']))->values();

        // Fetch all transactions
        $transactions = KarigarMaterialTransaction::where('karigar_id', $id)
            ->with(['workOrder:id,work_order_number,product_name'])
            ->orderBy('transaction_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        // 1. Group gold transactions by purity
        $goldByPurity = [];
        $totalIssuedGross = 0.0;
        $totalIssuedNet = 0.0;
        $totalIssuedFine = 0.0;
        $totalConsumedGross = 0.0;
        $totalConsumedNet = 0.0;
        $totalConsumedFine = 0.0;
        $totalWastageGross = 0.0;
        $totalWastageFine = 0.0;
        $totalReturnedVaultGross = 0.0;
        $totalReturnedVaultNet = 0.0;
        $totalReturnedVaultFine = 0.0;

        foreach ($transactions as $tx) {
            if ($tx->is_reversed || strtolower($tx->material_type) !== 'gold') {
                continue;
            }

            $rawPurity = strtoupper(trim((string) ($tx->purity ?? '')));
            $touchVal = (float) ($tx->touch ?: 0);
            if ($touchVal <= 0 && $tx->net_weight > 0 && $tx->fine_weight > 0) {
                $touchVal = round(((float) $tx->fine_weight / (float) $tx->net_weight) * 100, 2);
            }
            if ($touchVal <= 0) {
                $touchVal = GoldConversionHelper::getTouchPercent($rawPurity ?: '24K');
            }

            if (str_contains($rawPurity, '22K') || str_contains($rawPurity, '916') || abs($touchVal - 91.6) < 0.6) {
                $purityLabel = '22K';
                $touchVal = 91.6;
            } elseif (str_contains($rawPurity, '18K') || str_contains($rawPurity, '750') || abs($touchVal - 75.0) < 0.6) {
                $purityLabel = '18K';
                $touchVal = 75.0;
            } elseif (str_contains($rawPurity, '14K') || str_contains($rawPurity, '585') || abs($touchVal - 58.5) < 0.6) {
                $purityLabel = '14K';
                $touchVal = 58.5;
            } elseif (str_contains($rawPurity, '24K') || str_contains($rawPurity, '999') || str_contains($rawPurity, 'PURE') || $touchVal >= 99.0 || empty($rawPurity)) {
                $purityLabel = '24K';
                $touchVal = 100.0;
            } else {
                $purityLabel = $tx->purity ?: '24K';
            }

            if (! isset($goldByPurity[$purityLabel])) {
                $goldByPurity[$purityLabel] = [
                    'purity' => $purityLabel,
                    'touch' => $touchVal,
                    'issued_gross' => 0.0,
                    'issued_net' => 0.0,
                    'issued_fine' => 0.0,
                    'issued_pieces' => 0,
                    'consumed_gross' => 0.0,
                    'consumed_net' => 0.0,
                    'consumed_fine' => 0.0,
                    'returned_vault_gross' => 0.0,
                    'returned_vault_net' => 0.0,
                    'returned_vault_fine' => 0.0,
                    'received_gross' => 0.0,
                    'received_net' => 0.0,
                    'received_fine' => 0.0,
                    'received_pieces' => 0,
                    'wastage_gross' => 0.0,
                    'wastage_fine' => 0.0,
                    'outstanding_net' => 0.0,
                    'outstanding_fine' => 0.0,
                ];
            }

            $gWt = (float) ($tx->gross_weight > 0 ? $tx->gross_weight : $tx->weight);
            $nWt = (float) ($tx->net_weight > 0 ? $tx->net_weight : $gWt);
            $fWt = (float) ($tx->fine_weight > 0 ? $tx->fine_weight : ($tx->company_gold_weight > 0 ? $tx->company_gold_weight : $nWt));
            $pcs = (int) ($tx->pieces ?? 0);

            if (in_array($tx->transaction_type, ['allocation', 'additional_allocation', 'issue'])) {
                // If allocation is sourced from artisan bench, it was already on the bench and does not increase company gross
                $isFromBench = in_array(strtolower($tx->source ?? ''), ['bench', 'carried_forward']);
                if (! $isFromBench) {
                    $goldByPurity[$purityLabel]['issued_gross'] += $gWt;
                    $goldByPurity[$purityLabel]['issued_net'] += $nWt;
                    $goldByPurity[$purityLabel]['issued_fine'] += $fWt;
                    $goldByPurity[$purityLabel]['issued_pieces'] += $pcs;

                    $totalIssuedGross += $gWt;
                    $totalIssuedNet += $nWt;
                    $totalIssuedFine += $fWt;
                }
            } elseif (in_array($tx->transaction_type, ['finished_received', 'production_consumption'])) {
                $goldByPurity[$purityLabel]['consumed_gross'] += $gWt;
                $goldByPurity[$purityLabel]['consumed_net'] += $nWt;
                $goldByPurity[$purityLabel]['consumed_fine'] += $fWt;
                $goldByPurity[$purityLabel]['received_pieces'] += $pcs;

                $totalConsumedGross += $gWt;
                $totalConsumedNet += $nWt;
                $totalConsumedFine += $fWt;
            } elseif (in_array($tx->transaction_type, ['unused_returned', 'vault_return', 'physical_return', 'return', 'scrap'])) {
                $goldByPurity[$purityLabel]['returned_vault_gross'] += $gWt;
                $goldByPurity[$purityLabel]['returned_vault_net'] += $nWt;
                $goldByPurity[$purityLabel]['returned_vault_fine'] += $fWt;

                $totalReturnedVaultGross += $gWt;
                $totalReturnedVaultNet += $nWt;
                $totalReturnedVaultFine += $fWt;
            } elseif ($tx->transaction_type === 'approved_wastage') {
                $wWt = (float) ($tx->wastage_weight > 0 ? $tx->wastage_weight : $gWt);
                $goldByPurity[$purityLabel]['wastage_gross'] += $wWt;
                $goldByPurity[$purityLabel]['wastage_fine'] += $fWt;

                $totalWastageGross += $wWt;
                $totalWastageFine += $fWt;
            }
        }

        // Calculate outstanding balance and totals for each purity
        foreach ($goldByPurity as $k => $item) {
            $recGross = round($item['consumed_gross'] + $item['returned_vault_gross'], 3);
            $recNet = round($item['consumed_net'] + $item['returned_vault_net'], 3);
            $recFine = round($item['consumed_fine'] + $item['returned_vault_fine'], 3);

            $goldByPurity[$k]['received_gross'] = $recGross;
            $goldByPurity[$k]['received_net'] = $recNet;
            $goldByPurity[$k]['received_fine'] = $recFine;

            $goldByPurity[$k]['outstanding_net'] = round($item['issued_net'] - $recNet - $item['wastage_gross'], 3);
            $goldByPurity[$k]['outstanding_fine'] = round($item['issued_fine'] - $recFine - $item['wastage_fine'], 3);
            $goldByPurity[$k]['issued_gross'] = round($item['issued_gross'], 3);
            $goldByPurity[$k]['issued_net'] = round($item['issued_net'], 3);
            $goldByPurity[$k]['issued_fine'] = round($item['issued_fine'], 3);
            $goldByPurity[$k]['consumed_gross'] = round($item['consumed_gross'], 3);
            $goldByPurity[$k]['consumed_net'] = round($item['consumed_net'], 3);
            $goldByPurity[$k]['consumed_fine'] = round($item['consumed_fine'], 3);
            $goldByPurity[$k]['returned_vault_gross'] = round($item['returned_vault_gross'], 3);
            $goldByPurity[$k]['returned_vault_net'] = round($item['returned_vault_net'], 3);
            $goldByPurity[$k]['returned_vault_fine'] = round($item['returned_vault_fine'], 3);
            $goldByPurity[$k]['wastage_gross'] = round($item['wastage_gross'], 3);
            $goldByPurity[$k]['wastage_fine'] = round($item['wastage_fine'], 3);
        }

        // 2. Group diamond transactions by stamp/sieve
        $diamondsByStamp = [];
        foreach ($transactions as $tx) {
            if ($tx->is_reversed || strtolower($tx->material_type) !== 'diamond') {
                continue;
            }

            $stKey = $tx->stamp ?: ($tx->sieve_size ?: 'Standard / Master');
            if (! isset($diamondsByStamp[$stKey])) {
                $diamondsByStamp[$stKey] = [
                    'stamp' => $stKey,
                    'allocated_carats' => 0.0,
                    'allocated_count' => 0,
                    'consumed_carats' => 0.0,
                    'consumed_count' => 0,
                    'returned_vault_carats' => 0.0,
                    'returned_vault_count' => 0,
                    'received_carats' => 0.0,
                    'received_count' => 0,
                    'on_bench_carats' => 0.0,
                    'on_bench_count' => 0,
                ];
            }

            $cWt = (float) ($tx->net_weight > 0 ? $tx->net_weight : $tx->weight);
            $cPcs = (int) $tx->pieces;

            if (in_array($tx->transaction_type, ['allocation', 'additional_allocation', 'issue'])) {
                $isFromBench = in_array(strtolower($tx->source ?? ''), ['bench', 'carried_forward']);
                if (! $isFromBench) {
                    $diamondsByStamp[$stKey]['allocated_carats'] += $cWt;
                    $diamondsByStamp[$stKey]['allocated_count'] += $cPcs;
                }
            } elseif (in_array($tx->transaction_type, ['finished_received', 'production_consumption'])) {
                $diamondsByStamp[$stKey]['consumed_carats'] += $cWt;
                $diamondsByStamp[$stKey]['consumed_count'] += $cPcs;
            } elseif (in_array($tx->transaction_type, ['unused_returned', 'vault_return', 'physical_return', 'return', 'scrap'])) {
                $diamondsByStamp[$stKey]['returned_vault_carats'] += $cWt;
                $diamondsByStamp[$stKey]['returned_vault_count'] += $cPcs;
            }
        }

        // Also incorporate work order items diamond quotas
        foreach ($allOrders as $ord) {
            foreach ($ord->items as $itm) {
                $p = $itm->pricing_details ?? [];
                $st = $itm->stone_details ?? [];
                $dW = (float) ($p['diamond_weight'] ?? $st['diamond_weight'] ?? 0);
                $dC = (int) ($p['no_of_diamonds'] ?? $p['diamond_count'] ?? $st['diamond_count'] ?? 0);
                $dStamp = $p['diamond_stamp'] ?? $p['stamp'] ?? $st['diamond_stamp'] ?? $st['stamp'] ?? $itm->stamp ?? 'Standard / Master';

                if ($dW > 0 || $dC > 0) {
                    if (! isset($diamondsByStamp[$dStamp])) {
                        $diamondsByStamp[$dStamp] = [
                            'stamp' => $dStamp,
                            'allocated_carats' => 0.0,
                            'allocated_count' => 0,
                            'consumed_carats' => 0.0,
                            'consumed_count' => 0,
                            'returned_vault_carats' => 0.0,
                            'returned_vault_count' => 0,
                            'received_carats' => 0.0,
                            'received_count' => 0,
                            'on_bench_carats' => 0.0,
                            'on_bench_count' => 0,
                        ];
                    }
                }
            }
        }

        foreach ($diamondsByStamp as $k => $item) {
            $totalRecCt = round($item['consumed_carats'] + $item['returned_vault_carats'], 3);
            $totalRecPcs = $item['consumed_count'] + $item['returned_vault_count'];

            $diamondsByStamp[$k]['received_carats'] = $totalRecCt;
            $diamondsByStamp[$k]['received_count'] = $totalRecPcs;
            $diamondsByStamp[$k]['on_bench_carats'] = round($item['allocated_carats'] - $totalRecCt, 3);
            $diamondsByStamp[$k]['on_bench_count'] = $item['allocated_count'] - $totalRecPcs;

            // Frontend compatibility aliases
            $diamondsByStamp[$k]['issued_carats'] = round($item['allocated_carats'], 3);
            $diamondsByStamp[$k]['issued_pieces'] = $item['allocated_count'];
            $diamondsByStamp[$k]['received_pieces'] = $totalRecPcs;
            $diamondsByStamp[$k]['outstanding_carats'] = $diamondsByStamp[$k]['on_bench_carats'];
            $diamondsByStamp[$k]['outstanding_pieces'] = $diamondsByStamp[$k]['on_bench_count'];
            $diamondsByStamp[$k]['wastage_carats'] = 0.0;
            $diamondsByStamp[$k]['allocated_carats'] = round($item['allocated_carats'], 3);
        }

        // 3. Stone & other materials summary
        $stonesSummary = [
            'allocated_weight' => 0.0,
            'allocated_count' => 0,
            'consumed_weight' => 0.0,
            'consumed_count' => 0,
            'returned_vault_weight' => 0.0,
            'returned_vault_count' => 0,
            'received_weight' => 0.0,
            'received_count' => 0,
            'on_bench_weight' => 0.0,
            'on_bench_count' => 0,
            'outstanding_weight' => 0.0,
            'item' => 'Colour Stones & Other',
            'unit' => 'units',
        ];
        foreach ($transactions as $tx) {
            if ($tx->is_reversed || ! in_array(strtolower($tx->material_type), ['stone', 'colour_stone', 'other'])) {
                continue;
            }
            $sWt = (float) ($tx->net_weight > 0 ? $tx->net_weight : $tx->weight);
            $sPcs = (int) $tx->pieces;
            if (in_array($tx->transaction_type, ['allocation', 'additional_allocation', 'issue'])) {
                $isFromBench = in_array(strtolower($tx->source ?? ''), ['bench', 'carried_forward']);
                if (! $isFromBench) {
                    $stonesSummary['allocated_weight'] += $sWt;
                    $stonesSummary['allocated_count'] += $sPcs;
                }
            } elseif (in_array($tx->transaction_type, ['finished_received', 'production_consumption'])) {
                $stonesSummary['consumed_weight'] += $sWt;
                $stonesSummary['consumed_count'] += $sPcs;
            } elseif (in_array($tx->transaction_type, ['unused_returned', 'vault_return', 'physical_return', 'return', 'scrap'])) {
                $stonesSummary['returned_vault_weight'] += $sWt;
                $stonesSummary['returned_vault_count'] += $sPcs;
            }
        }
        $stonesSummary['received_weight'] = round($stonesSummary['consumed_weight'] + $stonesSummary['returned_vault_weight'], 3);
        $stonesSummary['received_count'] = $stonesSummary['consumed_count'] + $stonesSummary['returned_vault_count'];
        $stonesSummary['on_bench_weight'] = round($stonesSummary['allocated_weight'] - $stonesSummary['received_weight'], 3);
        $stonesSummary['on_bench_count'] = $stonesSummary['allocated_count'] - $stonesSummary['received_count'];
        $stonesSummary['outstanding_weight'] = $stonesSummary['on_bench_weight'];
        $stonesSummary['allocated_weight'] = round($stonesSummary['allocated_weight'], 3);

        // Financial ledger
        $financialSummary = $this->calculateFinancialSummary($id);
        $payments = KarigarPayment::where('karigar_id', $id)
            ->with(['workOrder:id,work_order_number,product_name', 'receivedPiece:id,receive_order_number,tag_number,piece_number'])
            ->orderBy('transaction_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        // Overall gold balance (Fine and Net weight)
        $totalReceivedGross = round($totalConsumedGross + $totalReturnedVaultGross, 3);
        $totalReceivedNet = round($totalConsumedNet + $totalReturnedVaultNet, 3);
        $totalReceivedFine = round($totalConsumedFine + $totalReturnedVaultFine, 3);

        $overallOutstandingFine = round($totalIssuedFine - $totalReceivedFine - $totalWastageFine, 3);
        $overallOutstandingNet = round($totalIssuedNet - $totalReceivedNet - $totalWastageGross, 3);

        return response()->json([
            'status' => 'success',
            'data' => [
                'karigar' => $karigar,
                'summary' => [
                    'total_issued_gross' => round($totalIssuedGross, 3),
                    'total_issued_net' => round($totalIssuedNet, 3),
                    'total_issued_fine' => round($totalIssuedFine, 3),
                    'production_consumed_gross' => round($totalConsumedGross, 3),
                    'production_consumed_net' => round($totalConsumedNet, 3),
                    'production_consumed_fine' => round($totalConsumedFine, 3),
                    'approved_wastage_gross' => round($totalWastageGross, 3),
                    'approved_wastage_fine' => round($totalWastageFine, 3),
                    'physical_returned_vault_gross' => round($totalReturnedVaultGross, 3),
                    'physical_returned_vault_net' => round($totalReturnedVaultNet, 3),
                    'physical_returned_vault_fine' => round($totalReturnedVaultFine, 3),
                    'unused_carried_forward' => $overallOutstandingFine,
                    'total_received_gross' => $totalReceivedGross,
                    'total_received_net' => $totalReceivedNet,
                    'total_received_fine' => $totalReceivedFine,
                    'total_wastage_gross' => round($totalWastageGross, 3),
                    'total_wastage_fine' => round($totalWastageFine, 3),
                    'outstanding_gold_fine' => $overallOutstandingFine,
                    'outstanding_gold_net' => $overallOutstandingNet,
                    'material_on_bench' => $overallOutstandingFine,
                    'settlement_balance' => $overallOutstandingFine,
                    'diamond_allocated' => array_sum(array_column($diamondsByStamp, 'allocated_carats')),
                    'diamond_consumed' => array_sum(array_column($diamondsByStamp, 'consumed_carats')),
                    'diamond_returned_vault' => array_sum(array_column($diamondsByStamp, 'returned_vault_carats')),
                    'diamond_received' => array_sum(array_column($diamondsByStamp, 'received_carats')),
                    'diamond_on_bench' => array_sum(array_column($diamondsByStamp, 'on_bench_carats')),
                    'diamond_count_allocated' => array_sum(array_column($diamondsByStamp, 'allocated_count')),
                    'diamond_count_consumed' => array_sum(array_column($diamondsByStamp, 'consumed_count')),
                    'diamond_count_returned' => array_sum(array_column($diamondsByStamp, 'returned_vault_count')),
                    'diamond_count_received' => array_sum(array_column($diamondsByStamp, 'received_count')),
                    'diamond_count_on_bench' => array_sum(array_column($diamondsByStamp, 'on_bench_count')),
                    'diamonds_by_stamp' => array_values($diamondsByStamp),
                    'gold_by_purity' => array_values($goldByPurity),
                    'stones_summary' => [$stonesSummary],
                ],
                'diamonds_by_stamp' => array_values($diamondsByStamp),
                'gold_by_purity' => array_values($goldByPurity),
                'stones_summary' => [$stonesSummary],
                'financial_summary' => $financialSummary,
                'active_work_orders' => $activeOrders->map(function ($wo) {
                    $wo->material_requirements = WorkOrderMaterialRequirementService::getWorkOrderMaterialRequirements($wo);

                    return $wo;
                }),
                'all_work_orders' => $allOrders->map(function ($wo) {
                    $wo->material_requirements = WorkOrderMaterialRequirementService::getWorkOrderMaterialRequirements($wo);

                    return $wo;
                }),
                'transactions' => $transactions,
                'payments' => $payments,
            ],
        ]);
    }

    /**
     * Get authoritative material requirements for a specific Work Order assigned to this Karigar
     */
    public function workOrderMaterialRequirements($id, $workOrderId)
    {
        $this->authorizeManager();

        $workOrder = WorkOrder::where('karigar_id', $id)->find($workOrderId);
        if (! $workOrder) {
            $workOrder = WorkOrder::findOrFail($workOrderId);
        }

        $requirements = WorkOrderMaterialRequirementService::getWorkOrderMaterialRequirements($workOrder);

        return response()->json([
            'status' => 'success',
            'data' => $requirements,
        ]);
    }

    /**
     * Multi-row material allocation for a Karigar and optional specific work order
     */
    public function allocateMaterials(Request $request, $id)
    {
        $this->authorizeManager();

        $validated = $request->validate([
            'work_order_id' => 'nullable|exists:work_orders,id',
            'allocation_date' => 'nullable|date',
            'notes' => 'nullable|string|max:500',
            'materials' => 'required|array|min:1',
            'materials.*.material_type' => 'required|string|in:gold,diamond,stone,colour_stone,silver,platinum,other',
            'materials.*.source' => 'nullable|string|in:vault,bench,carried_forward',
            'materials.*.material_item' => 'nullable|string|max:150',
            'materials.*.purity' => 'nullable|string|max:50',
            'materials.*.touch' => 'nullable|numeric|min:0|max:100',
            'materials.*.stamp' => 'nullable|string|max:100',
            'materials.*.stamp_id' => 'nullable|integer',
            'materials.*.sieve_size' => 'nullable|string|max:50',
            'materials.*.unit' => 'nullable|string|max:20',
            'materials.*.pieces' => 'nullable|integer|min:0',
            'materials.*.gross_weight' => 'nullable|numeric|min:0',
            'materials.*.net_weight' => 'nullable|numeric|min:0',
            'materials.*.fine_weight' => 'nullable|numeric|min:0',
            'materials.*.notes' => 'nullable|string|max:500',
        ]);

        return DB::transaction(function () use ($validated, $id) {
            $karigar = Karigar::lockForUpdate()->findOrFail($id);
            $workOrder = null;
            if (! empty($validated['work_order_id'])) {
                $workOrder = WorkOrder::lockForUpdate()->where('karigar_id', $karigar->id)->find($validated['work_order_id']);
                if (! $workOrder) {
                    $workOrder = WorkOrder::lockForUpdate()->find($validated['work_order_id']);
                }
            }

            $date = $validated['allocation_date'] ?? now();
            $userId = Auth::id() ?? 1;
            $userName = Auth::user()?->name ?? 'Store Manager';
            $globalNotes = trim($validated['notes'] ?? '');

            // 0. Work Order Requirement Validation: Allocations cannot exceed remaining requirement by default
            if ($workOrder) {
                $requirements = WorkOrderMaterialRequirementService::getWorkOrderMaterialRequirements($workOrder);
                $userRole = strtolower(Auth::user()->role ?? '');
                $isAuthorizedAdmin = in_array($userRole, ['admin', 'super_admin']);
                $allowExcess = request()->boolean('allow_excess')
                    || ! empty(request()->input('authorized_by'))
                    || ($isAuthorizedAdmin && ! request()->has('allow_excess'));

                $reqFineSum = 0.0;
                $diaDemandsByStamp = [];

                foreach ($validated['materials'] as $mat) {
                    $mType = strtolower($mat['material_type']);
                    if ($mType === 'gold') {
                        $gTouch = (float) ($mat['touch'] ?? 0);
                        if ($gTouch <= 0 && ! empty($mat['purity'])) {
                            $gTouch = GoldConversionHelper::getTouchPercent($mat['purity']);
                        } elseif ($gTouch <= 0) {
                            $gTouch = 100.0;
                        }
                        $gNet = (float) ($mat['net_weight'] ?? $mat['gross_weight'] ?? 0);
                        $reqFineSum += round($gNet * ($gTouch / 100.0), 3);
                    } elseif ($mType === 'diamond') {
                        $st = strtolower(trim($mat['stamp'] ?? $mat['sieve_size'] ?? 'standard / master'));
                        $cWt = (float) ($mat['net_weight'] ?? $mat['gross_weight'] ?? 0);
                        if (! isset($diaDemandsByStamp[$st])) {
                            $diaDemandsByStamp[$st] = 0.0;
                        }
                        $diaDemandsByStamp[$st] += $cWt;
                    }
                }

                if (! $allowExcess && $requirements['gold_requirement']['required_fine_gold'] > 0) {
                    $remFine = (float) $requirements['gold_requirement']['remaining_fine_gold'];
                    if ($reqFineSum > ($remFine + 0.001)) {
                        return response()->json([
                            'status' => 'error',
                            'message' => "Allocation exceeds remaining 24K fine-gold requirement for Work Order {$workOrder->work_order_number}. Remaining: {$remFine}g, Requested: {$reqFineSum}g.",
                        ], 422);
                    }
                }

                if (! $allowExcess && ! empty($requirements['diamond_requirements'])) {
                    foreach ($diaDemandsByStamp as $st => $cWt) {
                        foreach ($requirements['diamond_requirements'] as $dReq) {
                            $dStamp = strtolower(trim($dReq['stamp'] ?? ''));
                            if ($dStamp === $st) {
                                $remCt = (float) $dReq['remaining_carats'];
                                if ($cWt > ($remCt + 0.001)) {
                                    return response()->json([
                                        'status' => 'error',
                                        'message' => "Allocation exceeds remaining diamond requirement for stamp '{$dReq['stamp']}' in Work Order {$workOrder->work_order_number}. Remaining: {$remCt} ct, Requested: {$cWt} ct.",
                                    ], 422);
                                }
                            }
                        }
                    }
                }
            }

            // 1. Pre-validation: Validate available vault stock vs bench stock
            $stockDemands = [];
            foreach ($validated['materials'] as $index => $mat) {
                $matType = strtolower($mat['material_type']);
                if ($matType === 'colour_stone') {
                    $matType = 'stone';
                }

                $matSource = in_array(strtolower($mat['source'] ?? ''), ['bench', 'carried_forward']) ? 'bench' : 'vault';
                $grossWt = (float) ($mat['gross_weight'] ?? 0);
                $netWt = (float) ($mat['net_weight'] ?? $grossWt);
                $pcs = (int) ($mat['pieces'] ?? 0);
                $touch = (float) ($mat['touch'] ?? 0);

                if ($matType === 'gold') {
                    if ($touch <= 0 && ! empty($mat['purity'])) {
                        $pStr = strtoupper($mat['purity']);
                        if (str_contains($pStr, '24K') || str_contains($pStr, '999')) {
                            $touch = 100.0;
                        } elseif (str_contains($pStr, '22K') || str_contains($pStr, '916')) {
                            $touch = 91.6;
                        } elseif (str_contains($pStr, '18K') || str_contains($pStr, '750')) {
                            $touch = 75.0;
                        } elseif (str_contains($pStr, '14K') || str_contains($pStr, '585')) {
                            $touch = 58.5;
                        } else {
                            $num = (float) preg_replace('/[^0-9.]/', '', $pStr);
                            $touch = $num > 0 ? ($num <= 1.0 ? $num * 100 : $num) : 100.0;
                        }
                    } elseif ($touch <= 0) {
                        $touch = 100.0;
                    }
                    $fineWt = round($netWt * ($touch / 100.0), 3);

                    if ($matSource === 'bench') {
                        $availBench = (float) ($karigar->current_gold_balance_grams ?? 0);
                        if ($fineWt > $availBench && $netWt > $availBench) {
                            return response()->json([
                                'status' => 'error',
                                'message' => "Insufficient Karigar bench balance for Gold. Available: {$availBench}g, Requested: {$fineWt}g (Fine) / {$netWt}g (Net)",
                            ], 422);
                        }
                    } else {
                        $demandKey = 'gold';
                        if (! isset($stockDemands[$demandKey])) {
                            $stockDemands[$demandKey] = ['weight' => 0.0, 'count' => 0];
                        }
                        $stockDemands[$demandKey]['weight'] += $fineWt;
                    }
                } elseif ($matType === 'diamond') {
                    if ($matSource === 'bench') {
                        $stampFilter = trim($mat['stamp'] ?? '');
                        $diaBenchTxs = KarigarMaterialTransaction::where('karigar_id', $karigar->id)
                            ->where('material_type', 'diamond')
                            ->where('is_reversed', false)
                            ->when(! empty($stampFilter), fn ($q) => $q->where('stamp', $stampFilter))
                            ->get();
                        $diaBenchIssued = (float) $diaBenchTxs->whereIn('transaction_type', ['allocation', 'additional_allocation'])->filter(fn ($t) => $t->source !== 'bench')->sum(fn ($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
                        $diaBenchConsumed = (float) $diaBenchTxs->whereIn('transaction_type', ['finished_received', 'production_consumption', 'unused_returned', 'vault_return', 'physical_return'])->sum(fn ($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
                        $diaBenchAvail = max(0.0, round($diaBenchIssued - $diaBenchConsumed, 3));
                        if ($netWt > $diaBenchAvail) {
                            return response()->json([
                                'status' => 'error',
                                'message' => 'Insufficient Karigar bench balance for Diamond'.(! empty($stampFilter) ? " ({$stampFilter})" : '').". Available on bench: {$diaBenchAvail} ct, Requested: {$netWt} ct",
                            ], 422);
                        }
                    } else {
                        $demandKey = 'diamond';
                        if (! isset($stockDemands[$demandKey])) {
                            $stockDemands[$demandKey] = ['weight' => 0.0, 'count' => 0];
                        }
                        $stockDemands[$demandKey]['weight'] += $netWt;
                        $stockDemands[$demandKey]['count'] += $pcs;
                    }
                } elseif ($matType === 'stone') {
                    if ($matSource !== 'bench') {
                        $demandKey = 'stone';
                        if (! isset($stockDemands[$demandKey])) {
                            $stockDemands[$demandKey] = ['weight' => 0.0, 'count' => 0];
                        }
                        $stockDemands[$demandKey]['weight'] += ($netWt > 0 ? $netWt : $pcs);
                        $stockDemands[$demandKey]['count'] += $pcs;
                    }
                } else {
                    if ($matSource !== 'bench') {
                        $demandKey = $matType;
                        if (! isset($stockDemands[$demandKey])) {
                            $stockDemands[$demandKey] = ['weight' => 0.0, 'count' => 0];
                        }
                        $stockDemands[$demandKey]['weight'] += $netWt;
                    }
                }
            }

            // Verify available stock in RawMaterial vault
            foreach ($stockDemands as $typeKey => $demand) {
                $rawMat = RawMaterial::where('material_type', $typeKey)->lockForUpdate()->first();
                $availWt = $rawMat ? (float) $rawMat->current_balance : 0.0;
                $availCnt = $rawMat ? (float) $rawMat->current_count : 0.0;

                if ($demand['weight'] > 0 && $availWt < $demand['weight']) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Insufficient vault stock for '.ucfirst($typeKey).". Available: {$availWt}, Requested: {$demand['weight']}",
                    ], 422);
                }
                if ($demand['count'] > 0 && $availCnt > 0 && $availCnt < $demand['count']) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Insufficient vault count for '.ucfirst($typeKey).". Available pieces: {$availCnt}, Requested: {$demand['count']}",
                    ], 422);
                }
            }

            // 2. Perform allocations and persist transactions
            $createdTransactions = [];
            $totalGoldPureAllocated = 0.0;
            $totalGoldGrossAllocated = 0.0;

            foreach ($validated['materials'] as $mat) {
                $matType = strtolower($mat['material_type']);
                if ($matType === 'colour_stone') {
                    $matType = 'stone';
                }
                $matSource = in_array(strtolower($mat['source'] ?? ''), ['bench', 'carried_forward']) ? 'bench' : 'vault';
                $isFromBench = ($matSource === 'bench');

                $grossWt = (float) ($mat['gross_weight'] ?? 0);
                $netWt = (float) ($mat['net_weight'] ?? $grossWt);
                $pcs = (int) ($mat['pieces'] ?? 0);
                $touch = (float) ($mat['touch'] ?? 0);
                $purity = trim($mat['purity'] ?? '');
                $stamp = trim($mat['stamp'] ?? '');
                $sieve = trim($mat['sieve_size'] ?? '');
                $unit = trim($mat['unit'] ?? ($matType === 'diamond' ? 'ct' : ($matType === 'stone' && $netWt <= 0 ? 'pcs' : 'g')));
                $itemNotes = trim($mat['notes'] ?? '');

                $fineWt = 0.0;
                if ($matType === 'gold') {
                    if ($touch <= 0 && ! empty($purity)) {
                        $pStr = strtoupper($purity);
                        if (str_contains($pStr, '24K') || str_contains($pStr, '999')) {
                            $touch = 100.0;
                        } elseif (str_contains($pStr, '22K') || str_contains($pStr, '916')) {
                            $touch = 91.6;
                        } elseif (str_contains($pStr, '18K') || str_contains($pStr, '750')) {
                            $touch = 75.0;
                        } elseif (str_contains($pStr, '14K') || str_contains($pStr, '585')) {
                            $touch = 58.5;
                        } else {
                            $num = (float) preg_replace('/[^0-9.]/', '', $pStr);
                            $touch = $num > 0 ? ($num <= 1.0 ? $num * 100 : $num) : 100.0;
                        }
                    } elseif ($touch <= 0) {
                        $touch = 100.0;
                    }
                    $fineWt = round($netWt * ($touch / 100.0), 3);
                    $totalGoldPureAllocated += $fineWt;
                    $totalGoldGrossAllocated += $grossWt;

                    // Vault stock debited only if issued from vault
                    if (! $isFromBench) {
                        RawMaterial::debitAllocation('gold', $fineWt);
                    }
                } elseif ($matType === 'diamond') {
                    if (! $isFromBench) {
                        RawMaterial::debitAllocation('diamond', $netWt, $pcs);
                    }
                } elseif ($matType === 'stone') {
                    if (! $isFromBench) {
                        RawMaterial::debitAllocation('stone', ($netWt > 0 ? $netWt : $pcs), $pcs);
                    }
                } else {
                    if (! $isFromBench) {
                        RawMaterial::debitAllocation($matType, $netWt, $pcs);
                    }
                }

                $reasonParts = [];
                if (! empty($globalNotes)) {
                    $reasonParts[] = $globalNotes;
                }
                if (! empty($itemNotes)) {
                    $reasonParts[] = $itemNotes;
                }
                if ($matType === 'gold') {
                    $reasonParts[] = "Purity: {$purity} ({$touch}% -> Fine: {$fineWt}g)";
                }
                if (! empty($stamp)) {
                    $reasonParts[] = "Stamp: {$stamp}";
                }
                if (! empty($sieve)) {
                    $reasonParts[] = "Sieve: {$sieve}";
                }
                $reasonText = implode(' | ', $reasonParts) ?: "Material allocated to {$karigar->name}";
                $reasonText .= ($isFromBench ? ' [Carried Forward from Karigar Bench]' : ' [Issued from Company Vault]');

                $stampId = ! empty($mat['stamp_id']) ? (int) $mat['stamp_id'] : null;
                if (! $stampId && ! empty($stamp) && $matType === 'diamond') {
                    $matchedStamp = Stamp::where('name', $stamp)->orWhere('code', $stamp)->first();
                    if ($matchedStamp) {
                        $stampId = $matchedStamp->id;
                    }
                }

                $tx = KarigarMaterialTransaction::create([
                    'karigar_id' => $karigar->id,
                    'work_order_id' => $workOrder?->id,
                    'source' => $matSource,
                    'transaction_type' => 'allocation',
                    'material_type' => $matType,
                    'material_item' => $mat['material_item'] ?? null,
                    'purity' => $purity ?: null,
                    'touch' => $touch > 0 ? $touch : null,
                    'stamp' => $stamp ?: null,
                    'stamp_id' => $stampId,
                    'sieve_size' => $sieve ?: null,
                    'unit' => $unit,
                    'pieces' => $pcs,
                    'gross_weight' => $grossWt,
                    'net_weight' => $netWt,
                    'fine_weight' => $fineWt,
                    'transaction_date' => $date,
                    'weight' => $grossWt > 0 ? $grossWt : ($netWt > 0 ? $netWt : $pcs),
                    'company_gold_weight' => (! $isFromBench && $matType === 'gold') ? $fineWt : 0,
                    'karigar_gold_weight' => 0,
                    'signed_change' => $isFromBench ? 0.0 : ($matType === 'gold' ? +$fineWt : +$netWt),
                    'settlement_balance_after' => 0,
                    'bench_balance_after' => 0,
                    'reason' => $reasonText,
                    'created_by' => $userId,
                    'action_by_name' => $userName,
                ]);

                $createdTransactions[] = $tx;
            }

            // 3. Update Work Order if allocated to a work order
            if ($workOrder && $totalGoldGrossAllocated > 0) {
                $currentAllotted = (float) $workOrder->allotted_weight;
                $expectedReturn = (float) ($workOrder->expected_return_weight ?: ($workOrder->pricing_details['required_gold_weight'] ?? 0));
                if ($expectedReturn <= 0) {
                    $expectedReturn = (float) ($workOrder->pricing_details['job_summary']['allocated_gold'] ?? $currentAllotted);
                }

                $newAllotted = round($currentAllotted + $totalGoldGrossAllocated, 3);
                if ($expectedReturn > 0 && $newAllotted > $expectedReturn) {
                    $workOrder->allotted_weight = round($expectedReturn, 3);
                    $workOrder->additional_allocated_weight = round((float) $workOrder->additional_allocated_weight + ($newAllotted - $expectedReturn), 3);
                } else {
                    $workOrder->allotted_weight = $newAllotted;
                }
                $workOrder->pending_weight = max(0.0, round(
                    (float) $workOrder->allotted_weight + (float) $workOrder->additional_allocated_weight
                    - (float) $workOrder->completed_weight
                    - (float) $workOrder->wastage_weight
                    - (float) $workOrder->returned_weight,
                    3
                ));
                $workOrder->save();
            }

            // 4. Recalculate Karigar Balances
            $this->syncKarigarBalances($karigar);
            RawMaterial::recalculateAllocations();

            $updatedRequirements = null;
            if ($workOrder) {
                $updatedRequirements = WorkOrderMaterialRequirementService::getWorkOrderMaterialRequirements($workOrder->fresh(['items', 'product', 'karigar']));
            }

            return response()->json([
                'status' => 'success',
                'message' => count($createdTransactions).' material allocation entries processed successfully.',
                'data' => [
                    'transactions' => $createdTransactions,
                    'karigar' => $karigar->fresh(),
                    'material_requirements' => $updatedRequirements,
                ],
                'material_requirements' => $updatedRequirements,
            ]);
        });
    }

    /**
     * Auditable reversal of a material allocation entry
     */
    public function reverseMaterialTransaction(Request $request, $id, $txId)
    {
        $this->authorizeManager();

        $validated = $request->validate([
            'reason' => 'required|string|min:3|max:500',
        ]);

        return DB::transaction(function () use ($validated, $id, $txId) {
            $karigar = Karigar::lockForUpdate()->findOrFail($id);
            $tx = KarigarMaterialTransaction::lockForUpdate()->where('karigar_id', $karigar->id)->findOrFail($txId);

            if ($tx->is_reversed) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'This transaction has already been reversed.',
                ], 422);
            }

            $userId = Auth::id() ?? 1;
            $userName = Auth::user()?->name ?? 'Store Manager';
            $matType = strtolower($tx->material_type);
            if ($matType === 'colour_stone') {
                $matType = 'stone';
            }

            // Return stock to vault if it was an allocation, or re-debit if it was a return
            if (in_array($tx->transaction_type, ['allocation', 'additional_allocation'])) {
                if ($matType === 'gold') {
                    $fine = (float) $tx->fine_weight > 0 ? (float) $tx->fine_weight : (float) $tx->company_gold_weight;
                    RawMaterial::creditAllocation('gold', $fine);
                } elseif ($matType === 'diamond') {
                    RawMaterial::creditAllocation('diamond', (float) $tx->net_weight, (int) $tx->pieces);
                } elseif ($matType === 'stone') {
                    RawMaterial::creditAllocation('stone', (float) $tx->net_weight, (int) $tx->pieces);
                } else {
                    RawMaterial::creditAllocation($matType, (float) $tx->net_weight, (int) $tx->pieces);
                }
            } elseif (in_array($tx->transaction_type, ['unused_returned', 'finished_received'])) {
                if ($matType === 'gold') {
                    $fine = (float) $tx->fine_weight > 0 ? (float) $tx->fine_weight : (float) $tx->company_gold_weight;
                    RawMaterial::debitAllocation('gold', $fine);
                } elseif ($matType === 'diamond') {
                    RawMaterial::debitAllocation('diamond', (float) $tx->net_weight, (int) $tx->pieces);
                } elseif ($matType === 'stone') {
                    RawMaterial::debitAllocation('stone', (float) $tx->net_weight, (int) $tx->pieces);
                } else {
                    RawMaterial::debitAllocation($matType, (float) $tx->net_weight, (int) $tx->pieces);
                }
            }

            // Mark original transaction as reversed
            $tx->is_reversed = true;
            $tx->save();

            // Create reversal audit transaction
            $reversalTx = KarigarMaterialTransaction::create([
                'karigar_id' => $karigar->id,
                'work_order_id' => $tx->work_order_id,
                'transaction_type' => 'reversal',
                'material_type' => $tx->material_type,
                'material_item' => $tx->material_item,
                'purity' => $tx->purity,
                'touch' => $tx->touch,
                'stamp' => $tx->stamp,
                'sieve_size' => $tx->sieve_size,
                'unit' => $tx->unit,
                'pieces' => -(int) $tx->pieces,
                'gross_weight' => -(float) $tx->gross_weight,
                'net_weight' => -(float) $tx->net_weight,
                'fine_weight' => -(float) $tx->fine_weight,
                'parent_transaction_id' => $tx->id,
                'transaction_date' => now(),
                'weight' => -(float) $tx->weight,
                'company_gold_weight' => -(float) $tx->company_gold_weight,
                'karigar_gold_weight' => -(float) $tx->karigar_gold_weight,
                'signed_change' => -(float) $tx->signed_change,
                'reason' => "Reversal of TX #{$tx->id}: {$validated['reason']}",
                'created_by' => $userId,
                'action_by_name' => $userName,
            ]);

            $this->syncKarigarBalances($karigar);
            RawMaterial::recalculateAllocations();

            return response()->json([
                'status' => 'success',
                'message' => "Transaction #{$tx->id} reversed successfully.",
                'data' => [
                    'original' => $tx,
                    'reversal' => $reversalTx,
                ],
            ]);
        });
    }

    /**
     * Edit or update a karigar material transaction (returned material, allocation, wastage, etc.)
     */
    public function updateMaterialTransaction(Request $request, $id, $txId)
    {
        $this->authorizeManager();

        $validated = $request->validate([
            'transaction_type' => 'nullable|string|in:allocation,additional_allocation,finished_received,unused_returned,approved_wastage,karigar_contribution,adjustment,settlement',
            'material_type' => 'nullable|string|in:gold,diamond,colour_stone,stone,other',
            'material_item' => 'nullable|string|max:100',
            'purity' => 'nullable|string|max:50',
            'touch' => 'nullable|numeric|min:0|max:100',
            'stamp' => 'nullable|string|max:50',
            'sieve_size' => 'nullable|string|max:50',
            'unit' => 'nullable|string|max:20',
            'pieces' => 'nullable|integer|min:0',
            'weight' => 'nullable|numeric|min:0',
            'gross_weight' => 'nullable|numeric|min:0',
            'net_weight' => 'nullable|numeric|min:0',
            'fine_weight' => 'nullable|numeric|min:0',
            'wastage_weight' => 'nullable|numeric|min:0',
            'reason' => 'nullable|string|max:500',
            'transaction_date' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($validated, $id, $txId) {
            $karigar = Karigar::lockForUpdate()->findOrFail($id);
            $tx = KarigarMaterialTransaction::lockForUpdate()->where('karigar_id', $karigar->id)->findOrFail($txId);

            if ($tx->is_reversed) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Cannot edit a reversed material transaction.',
                ], 422);
            }

            $matType = strtolower($validated['material_type'] ?? $tx->material_type ?? 'gold');
            if ($matType === 'colour_stone') {
                $matType = 'stone';
            }

            $newGross = isset($validated['gross_weight']) ? (float) $validated['gross_weight'] : ($validated['weight'] ?? (float) $tx->gross_weight);
            $newNet = isset($validated['net_weight']) ? (float) $validated['net_weight'] : ($validated['weight'] ?? (float) $tx->net_weight);
            $newPieces = isset($validated['pieces']) ? (int) $validated['pieces'] : (int) $tx->pieces;
            $newTouch = isset($validated['touch']) ? (float) $validated['touch'] : (float) $tx->touch;
            if ($newTouch <= 0 && ! empty($validated['purity'])) {
                if (str_contains($validated['purity'], '22K') || str_contains($validated['purity'], '916')) {
                    $newTouch = 91.6;
                } elseif (str_contains($validated['purity'], '18K') || str_contains($validated['purity'], '750')) {
                    $newTouch = 75.0;
                } elseif (str_contains($validated['purity'], '14K') || str_contains($validated['purity'], '585')) {
                    $newTouch = 58.5;
                } elseif (str_contains($validated['purity'], '24K') || str_contains($validated['purity'], '999')) {
                    $newTouch = 100.0;
                }
            }
            if ($newTouch <= 0) {
                $newTouch = 100.0;
            }

            $newFine = isset($validated['fine_weight']) && (float) $validated['fine_weight'] > 0
                ? (float) $validated['fine_weight']
                : ($matType === 'gold' ? round($newNet * ($newTouch / 100.0), 3) : 0);

            $oldGross = (float) $tx->gross_weight;
            $oldNet = (float) $tx->net_weight;
            $oldFine = (float) $tx->fine_weight;
            $oldPieces = (int) $tx->pieces;

            $type = $validated['transaction_type'] ?? $tx->transaction_type;

            // Recompute signed change
            $signedChange = 0.0;
            $companyGold = 0.0;
            $karigarGold = 0.0;

            if (in_array($type, ['allocation', 'additional_allocation'])) {
                $signedChange = +$newGross;
                $companyGold = $newGross;
            } elseif (in_array($type, ['finished_received', 'unused_returned'])) {
                $signedChange = -$newGross;
                $companyGold = $newGross;
            } elseif ($type === 'approved_wastage') {
                $signedChange = -$newGross;
                $companyGold = $newGross;
            } elseif ($type === 'karigar_contribution') {
                $signedChange = -$newFine;
                $karigarGold = $newFine;
            } elseif ($type === 'settlement') {
                $signedChange = +$newNet;
                $karigarGold = $newNet;
            }

            // Adjust RawMaterial inventory difference
            $fineDiff = $newFine - $oldFine;
            $netDiff = $newNet - $oldNet;
            $piecesDiff = $newPieces - $oldPieces;

            if (in_array($type, ['allocation', 'additional_allocation'])) {
                if ($matType === 'gold' && $fineDiff != 0) {
                    if ($fineDiff > 0) {
                        RawMaterial::debitAllocation('gold', $fineDiff);
                    } else {
                        RawMaterial::creditAllocation('gold', abs($fineDiff));
                    }
                } elseif ($matType === 'diamond' && $netDiff != 0) {
                    if ($netDiff > 0) {
                        RawMaterial::debitAllocation('diamond', $netDiff, max(0, $piecesDiff));
                    } else {
                        RawMaterial::creditAllocation('diamond', abs($netDiff), abs($piecesDiff));
                    }
                } elseif ($matType === 'stone' && $netDiff != 0) {
                    if ($netDiff > 0) {
                        RawMaterial::debitAllocation('stone', $netDiff, max(0, $piecesDiff));
                    } else {
                        RawMaterial::creditAllocation('stone', abs($netDiff), abs($piecesDiff));
                    }
                }
            } elseif (in_array($type, ['finished_received', 'unused_returned'])) {
                if ($matType === 'gold' && $fineDiff != 0) {
                    if ($fineDiff > 0) {
                        RawMaterial::creditAllocation('gold', $fineDiff);
                    } else {
                        RawMaterial::debitAllocation('gold', abs($fineDiff));
                    }
                } elseif ($matType === 'diamond' && $netDiff != 0) {
                    if ($netDiff > 0) {
                        RawMaterial::creditAllocation('diamond', $netDiff, max(0, $piecesDiff));
                    } else {
                        RawMaterial::debitAllocation('diamond', abs($netDiff), abs($piecesDiff));
                    }
                } elseif ($matType === 'stone' && $netDiff != 0) {
                    if ($netDiff > 0) {
                        RawMaterial::creditAllocation('stone', $netDiff, max(0, $piecesDiff));
                    } else {
                        RawMaterial::debitAllocation('stone', abs($netDiff), abs($piecesDiff));
                    }
                }
            }

            // If linked to work order, update corresponding fields
            if ($tx->work_order_id) {
                $wo = WorkOrder::lockForUpdate()->find($tx->work_order_id);
                if ($wo) {
                    $grossDiff = $newGross - $oldGross;
                    if ($type === 'unused_returned') {
                        $wo->returned_weight = max(0.0, round((float) $wo->returned_weight + $grossDiff, 3));
                    } elseif ($type === 'finished_received') {
                        $wo->completed_weight = max(0.0, round((float) $wo->completed_weight + $grossDiff, 3));
                    } elseif ($type === 'approved_wastage') {
                        $wo->wastage_weight = max(0.0, round((float) $wo->wastage_weight + $grossDiff, 3));
                    } elseif ($type === 'additional_allocation') {
                        $wo->additional_allocated_weight = max(0.0, round((float) $wo->additional_allocated_weight + $grossDiff, 3));
                    }
                    $wo->pending_weight = max(0.0, round(
                        (float) $wo->allotted_weight + (float) ($wo->additional_allocated_weight ?? 0)
                        - (float) $wo->completed_weight
                        - (float) $wo->wastage_weight
                        - (float) $wo->returned_weight,
                        3
                    ));
                    $wo->save();
                }
            }

            // Update Transaction
            $tx->update([
                'transaction_type' => $type,
                'material_type' => $matType,
                'material_item' => $validated['material_item'] ?? $tx->material_item,
                'purity' => $validated['purity'] ?? $tx->purity,
                'touch' => $newTouch,
                'stamp' => $validated['stamp'] ?? $tx->stamp,
                'sieve_size' => $validated['sieve_size'] ?? $tx->sieve_size,
                'unit' => $validated['unit'] ?? $tx->unit,
                'pieces' => $newPieces,
                'weight' => $newGross,
                'gross_weight' => $newGross,
                'net_weight' => $newNet,
                'fine_weight' => $newFine,
                'company_gold_weight' => $companyGold,
                'karigar_gold_weight' => $karigarGold,
                'signed_change' => $signedChange,
                'reason' => $validated['reason'] ?? $tx->reason,
                'transaction_date' => $validated['transaction_date'] ?? $tx->transaction_date,
            ]);

            $this->syncKarigarBalances($karigar);
            RawMaterial::recalculateAllocations();

            return response()->json([
                'status' => 'success',
                'message' => "Transaction #{$tx->id} updated successfully.",
                'data' => $tx->fresh(['workOrder']),
            ]);
        });
    }

    /**
     * Cash / Making Charges settlement or advance payment to Karigar
     */
    public function settleCash(Request $request, $id)
    {
        $this->authorizeManager();

        if (! $request->has('transaction_type')) {
            $request->merge(['transaction_type' => 'payment']);
        }
        if ($request->has('payment_method') && ! $request->has('payment_mode')) {
            $request->merge(['payment_mode' => strtolower($request->input('payment_method'))]);
        }

        $validated = $request->validate([
            'transaction_type' => 'required|string|in:payment,advance,adjustment',
            'amount' => 'required|numeric|min:0.01',
            'payment_mode' => 'nullable|string|in:cash,bank_transfer,upi,cheque,adjustment',
            'reference_no' => 'nullable|string|max:100',
            'transaction_date' => 'nullable|date',
            'work_order_id' => 'nullable|exists:work_orders,id',
            'notes' => 'nullable|string|max:500',
        ]);

        return DB::transaction(function () use ($validated, $id) {
            $karigar = Karigar::lockForUpdate()->findOrFail($id);
            $userId = Auth::id() ?? 1;
            $userName = Auth::user()?->name ?? 'Store Manager';

            $payment = KarigarPayment::create([
                'karigar_id' => $karigar->id,
                'work_order_id' => $validated['work_order_id'] ?? null,
                'transaction_type' => $validated['transaction_type'],
                'amount' => round((float) $validated['amount'], 2),
                'payment_mode' => $validated['payment_mode'] ?? 'cash',
                'reference_no' => $validated['reference_no'] ?? null,
                'transaction_date' => $validated['transaction_date'] ?? now()->toDateString(),
                'notes' => $validated['notes'] ?? null,
                'created_by' => $userId,
                'action_by_name' => $userName,
            ]);

            $financialSummary = $this->calculateFinancialSummary($karigar->id);

            return response()->json([
                'status' => 'success',
                'message' => ucfirst($validated['transaction_type']).' of ₹'.number_format($payment->amount, 2).' recorded successfully.',
                'data' => [
                    'payment' => $payment,
                    'financial_summary' => $financialSummary,
                ],
            ]);
        });
    }

    /**
     * Get detailed making charges and payment ledger for a Karigar
     */
    public function financialLedger($id)
    {
        $karigar = Karigar::findOrFail($id);
        $payments = KarigarPayment::where('karigar_id', $id)
            ->with(['workOrder:id,work_order_number,product_name', 'receivedPiece:id,receive_order_number,tag_number,piece_number'])
            ->orderBy('transaction_date', 'desc')
            ->orderBy('id', 'desc')
            ->get();

        $summary = $this->calculateFinancialSummary($id);

        return response()->json([
            'status' => 'success',
            'data' => [
                'karigar' => $karigar,
                'summary' => $summary,
                'transactions' => $payments,
            ],
        ]);
    }

    /**
     * Compute financial ledger summary (Total Earned MC, Total Paid, Advances, Net Payable / Excess Advance)
     */
    public function calculateFinancialSummary($karigarId): array
    {
        $payments = KarigarPayment::where('karigar_id', $karigarId)->get();

        $totalEarned = (float) $payments->where('transaction_type', 'payable')->sum('amount');
        $totalPaid = (float) $payments->where('transaction_type', 'payment')->sum('amount');
        $totalAdvances = (float) $payments->where('transaction_type', 'advance')->sum('amount');
        $totalAdjustments = (float) $payments->where('transaction_type', 'adjustment')->sum('amount');

        // Net due = Total Earned + Approved Adjustments - Total Paid - Total Advances
        $netBalance = round(($totalEarned + $totalAdjustments) - ($totalPaid + $totalAdvances), 2);

        $outstandingPayable = max(0.0, $netBalance);
        $excessAdvance = $netBalance < 0 ? abs($netBalance) : 0.0;

        return [
            'total_earned' => round($totalEarned, 2),
            'total_payable' => $outstandingPayable,
            'outstanding_payable' => $outstandingPayable,
            'balance_due' => $outstandingPayable,
            'total_paid' => round($totalPaid, 2),
            'total_advances' => round($totalAdvances, 2),
            'total_adjustments' => round($totalAdjustments, 2),
            'net_balance' => $netBalance,
            'excess_advance' => $excessAdvance,
        ];
    }

    /**
     * Synchronize Karigar gold bench and settlement balances strictly on 24K Fine Gold
     */
    public function syncKarigarBalances(Karigar $karigar): void
    {
        $goldTxs = KarigarMaterialTransaction::where('karigar_id', $karigar->id)
            ->where('is_reversed', false)
            ->where('material_type', 'gold')
            ->get();

        // 1. Vault issues: source != 'bench'
        $vaultIssued = (float) $goldTxs->whereIn('transaction_type', ['allocation', 'additional_allocation', 'issue'])
            ->filter(fn ($t) => $t->source !== 'bench')
            ->sum(fn ($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->company_gold_weight > 0 ? $t->company_gold_weight : $t->weight));

        // 2. Production consumption: finished pieces received or consumed
        $productionConsumed = (float) $goldTxs->whereIn('transaction_type', ['finished_received', 'production_consumption'])
            ->sum(fn ($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->company_gold_weight > 0 ? $t->company_gold_weight : $t->weight));

        // 3. Approved wastage
        $approvedWastage = (float) $goldTxs->where('transaction_type', 'approved_wastage')
            ->sum(fn ($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->wastage_weight > 0 ? $t->wastage_weight : $t->weight));

        // 4. Physical returns to vault
        $vaultReturned = (float) $goldTxs->whereIn('transaction_type', ['unused_returned', 'vault_return', 'physical_return', 'return', 'scrap'])
            ->sum(fn ($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->company_gold_weight > 0 ? $t->company_gold_weight : $t->weight));

        // 5. Adjustments
        $manualAdjustments = (float) $goldTxs->where('transaction_type', 'adjustment')->sum('signed_change');

        // Check for legacy work orders without allocation transactions
        $woIdsWithAllocationTxs = $goldTxs->whereIn('transaction_type', ['allocation', 'additional_allocation'])->pluck('work_order_id')->filter()->unique()->toArray();
        $untrackedOrders = WorkOrder::where('karigar_id', $karigar->id)
            ->whereNotIn('id', $woIdsWithAllocationTxs)
            ->get();

        $legacyPending = 0.0;
        foreach ($untrackedOrders as $wo) {
            $legacyPending += max(0.0, (float) $wo->allotted_weight + (float) $wo->additional_allocated_weight - (float) $wo->completed_weight - (float) $wo->wastage_weight - (float) $wo->returned_weight);
        }

        // Persistent bench balance: Opening bench + issues - production consumption - approved wastage - physical returns + adjustments
        $benchBalance = max(0.0, round($vaultIssued - $productionConsumed - $approvedWastage - $vaultReturned + $manualAdjustments + $legacyPending, 3));

        // Karigar contribution
        $directKarigar = (float) $goldTxs->where('transaction_type', 'karigar_contribution')->sum('karigar_gold_weight');
        $woKarigar = (float) WorkOrder::where('karigar_id', $karigar->id)->sum('karigar_gold_weight');
        $totalKarigarGold = round($directKarigar + $woKarigar, 3);

        $settlementBalance = round($benchBalance - $totalKarigarGold, 3);

        $karigar->current_gold_balance_grams = $benchBalance;
        $karigar->karigar_gold_balance_grams = $totalKarigarGold;
        $karigar->settlement_balance_grams = $settlementBalance;
        $karigar->save();
    }

    /**
     * Record an auditable material action for a karigar (backward-compatible single-row action)
     */
    public function storeAction(Request $request, $id)
    {
        $this->authorizeManager();

        if (! $request->has('action_type') && $request->has('action')) {
            $request->merge(['action_type' => $request->input('action')]);
        }

        $validated = $request->validate([
            'action_type' => 'required|string|in:additional_allocation,karigar_contribution,unused_returned,approve_wastage,adjustment,settlement,vault_return,physical_return,retain_on_bench',
            'material_type' => 'nullable|string|in:gold,diamond,colour_stone,stone',
            'purity' => 'nullable|string|max:50',
            'stamp' => 'nullable|string|max:100',
            'weight' => 'required|numeric|min:0.001',
            'pieces' => 'nullable|integer|min:0',
            'unit' => 'nullable|string|max:20',
            'work_order_id' => 'nullable|exists:work_orders,id',
            'reason' => 'required|string|min:3|max:500',
            'transaction_date' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($validated, $id, $request) {
            $karigar = Karigar::lockForUpdate()->findOrFail($id);
            $action = $validated['action_type'];
            $matType = strtolower($validated['material_type'] ?? 'gold');
            if ($matType === 'colour_stone') {
                $matType = 'stone';
            }
            $weight = round((float) $validated['weight'], 3);
            $pieces = (int) ($validated['pieces'] ?? $request->input('pieces', 0));
            $unit = $validated['unit'] ?? ($matType === 'diamond' ? 'ct' : ($matType === 'stone' ? 'units' : 'g'));
            $reason = trim($validated['reason']);

            // Parse Touch / Purity for Gold
            $purityStr = strtoupper(trim($validated['purity'] ?? ''));
            $touchPercent = 100.0;
            if (! empty($purityStr) && $matType === 'gold') {
                if (str_contains($purityStr, '22K') || str_contains($purityStr, '916')) {
                    $touchPercent = 91.6;
                } elseif (str_contains($purityStr, '18K') || str_contains($purityStr, '750')) {
                    $touchPercent = 75.0;
                } elseif (str_contains($purityStr, '14K') || str_contains($purityStr, '585')) {
                    $touchPercent = 58.5;
                } elseif (str_contains($purityStr, '24K') || str_contains($purityStr, '999')) {
                    $touchPercent = 100.0;
                } else {
                    $numericPurity = (float) preg_replace('/[^0-9.]/', '', $purityStr);
                    if ($numericPurity > 0) {
                        $touchPercent = $numericPurity <= 1.0 ? ($numericPurity * 100.0) : $numericPurity;
                    }
                }
            }

            // 24K Pure Gold equivalent (Fine Weight)
            $pure24kWt = ($matType === 'gold') ? round($weight * ($touchPercent / 100.0), 3) : $weight;

            $date = $validated['transaction_date'] ?? now();
            $userId = Auth::id() ?? 1;
            $userName = Auth::user()?->name ?? 'Store Manager';

            $workOrder = null;
            if (! empty($validated['work_order_id'])) {
                $workOrder = WorkOrder::lockForUpdate()->where('karigar_id', $karigar->id)->find($validated['work_order_id']);
            }

            $companyGoldWeight = 0.0;
            $karigarGoldWeight = 0.0;
            $signedChange = 0.0;

            switch ($action) {
                case 'additional_allocation':
                    if ($matType === 'diamond') {
                        RawMaterial::debitAllocation('diamond', $weight, $pieces);
                        $signedChange = +$weight;
                    } elseif ($matType === 'stone') {
                        RawMaterial::debitAllocation('stone', $weight, $pieces);
                        $signedChange = +$weight;
                    } else {
                        $companyGoldWeight = $pure24kWt;
                        $signedChange = +$pure24kWt;

                        if ($workOrder) {
                            $workOrder->additional_allocated_weight = round((float) $workOrder->additional_allocated_weight + $weight, 3);
                            $workOrder->pending_weight = max(0.0, round((float) $workOrder->allotted_weight + (float) $workOrder->additional_allocated_weight - (float) $workOrder->completed_weight - (float) $workOrder->wastage_weight - (float) $workOrder->returned_weight, 3));
                            $workOrder->save();
                        }
                        RawMaterial::debitAllocation('gold', $pure24kWt);
                    }
                    break;

                case 'karigar_contribution':
                    $karigarGoldWeight = $weight;
                    $signedChange = -$weight;

                    if ($workOrder) {
                        $workOrder->karigar_gold_weight = round((float) $workOrder->karigar_gold_weight + $weight, 3);
                        $workOrder->save();
                    }
                    break;

                case 'unused_returned':
                case 'vault_return':
                case 'physical_return':
                    if ($matType === 'diamond') {
                        RawMaterial::creditAllocation('diamond', $weight, $pieces);
                        $signedChange = -$weight;
                    } elseif ($matType === 'stone') {
                        RawMaterial::creditAllocation('stone', $weight, $pieces);
                        $signedChange = -$weight;
                    } else {
                        $companyGoldWeight = $pure24kWt;
                        $signedChange = -$pure24kWt;

                        if ($workOrder) {
                            $workOrder->returned_weight = round((float) $workOrder->returned_weight + $weight, 3);
                            $workOrder->pending_weight = max(0.0, round((float) $workOrder->allotted_weight + (float) $workOrder->additional_allocated_weight - (float) $workOrder->completed_weight - (float) $workOrder->wastage_weight - (float) $workOrder->returned_weight, 3));
                            $workOrder->save();
                        }
                        RawMaterial::creditAllocation('gold', $pure24kWt);
                    }
                    break;

                case 'retain_on_bench':
                    $signedChange = 0.0;
                    break;

                case 'approve_wastage':
                    $companyGoldWeight = $pure24kWt;
                    $signedChange = -$pure24kWt;

                    if ($workOrder) {
                        $workOrder->wastage_weight = round((float) $workOrder->wastage_weight + $weight, 3);
                        $workOrder->pending_weight = max(0.0, round((float) $workOrder->allotted_weight + (float) $workOrder->additional_allocated_weight - (float) $workOrder->completed_weight - (float) $workOrder->wastage_weight - (float) $workOrder->returned_weight, 3));
                        $workOrder->save();
                    }
                    break;

                case 'settlement':
                    $karigarGoldWeight = $weight;
                    $signedChange = +$weight;
                    if ($workOrder && (float) $workOrder->karigar_gold_weight >= $weight) {
                        $workOrder->karigar_gold_weight = round((float) $workOrder->karigar_gold_weight - $weight, 3);
                        $workOrder->save();
                    }
                    break;

                case 'adjustment':
                    $signedChange = $weight;
                    break;
            }

            $tx = KarigarMaterialTransaction::create([
                'karigar_id' => $karigar->id,
                'work_order_id' => $workOrder?->id,
                'source' => in_array($action, ['unused_returned', 'vault_return', 'physical_return']) ? 'vault' : ($action === 'retain_on_bench' ? 'bench' : 'vault'),
                'transaction_type' => $action,
                'material_type' => $matType,
                'purity' => $validated['purity'] ?? null,
                'touch' => $touchPercent,
                'pieces' => $pieces,
                'unit' => $unit,
                'gross_weight' => $weight,
                'net_weight' => $weight,
                'fine_weight' => $matType === 'gold' ? $pure24kWt : 0,
                'stamp' => ! empty($validated['stamp']) ? $validated['stamp'] : null,
                'transaction_date' => $date,
                'weight' => $weight,
                'company_gold_weight' => $companyGoldWeight,
                'karigar_gold_weight' => $karigarGoldWeight,
                'signed_change' => $signedChange,
                'settlement_balance_after' => 0,
                'bench_balance_after' => 0,
                'reason' => $reason,
                'created_by' => $userId,
                'action_by_name' => $userName,
            ]);

            $this->syncKarigarBalances($karigar);
            RawMaterial::recalculateAllocations();

            return response()->json([
                'status' => 'success',
                'message' => 'Material action recorded and balances updated successfully.',
                'transaction' => $tx->load('workOrder'),
            ]);
        });
    }
}
