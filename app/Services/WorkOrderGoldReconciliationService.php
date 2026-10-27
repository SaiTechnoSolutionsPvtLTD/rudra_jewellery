<?php

namespace App\Services;

use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use App\Models\KarigarMaterialTransaction;
use App\Helpers\GoldConversionHelper;

class WorkOrderGoldReconciliationService
{
    /**
     * Authoritative Gold Reconciliation for a Work Order or specific piece/batch.
     * Formula:
     * Allocated fine gold = Finished-product fine gold + Approved wastage + Unused fine gold retained by Karigar + Fine gold physically returned to company vault
     *
     * All calculations are strictly in 24K fine-gold equivalent grams.
     *
     * @param WorkOrder|int $workOrder
     * @param WorkOrderReceivedPiece|int|null $piece
     * @return array
     */
    public static function calculateForWorkOrder($workOrder, $piece = null): array
    {
        if (is_numeric($workOrder)) {
            $workOrder = WorkOrder::with(['items', 'receivedPieces', 'karigar'])->findOrFail($workOrder);
        } else {
            if (method_exists($workOrder, 'relationLoaded')) {
                if (!$workOrder->relationLoaded('items') && method_exists($workOrder, 'items')) {
                    try { $workOrder->load('items'); } catch (\Throwable $e) {}
                }
                if (!$workOrder->relationLoaded('receivedPieces') && method_exists($workOrder, 'receivedPieces')) {
                    try { $workOrder->load('receivedPieces'); } catch (\Throwable $e) {}
                }
                if (!$workOrder->relationLoaded('karigar') && $workOrder->karigar_id) {
                    try { $workOrder->load('karigar'); } catch (\Throwable $e) {}
                }
            }
        }

        if (is_numeric($piece)) {
            $piece = WorkOrderReceivedPiece::where('work_order_id', $workOrder->id)->find($piece);
        }

        $isPieceScope = ($piece instanceof WorkOrderReceivedPiece);

        // Determine Purity & Touch
        $purityStr = $workOrder->purity
            ?: ($workOrder->karat
            ?: ($workOrder->pricing_details['gold_purity']
            ?? $workOrder->pricing_details['purity']
            ?? $workOrder->material_type
            ?? '22K'));

        $touch = null;
        if ($workOrder->touch !== null && (float)$workOrder->touch > 0) {
            $touch = (float)$workOrder->touch;
        } elseif (!empty($workOrder->pricing_details['touch']) && (float)$workOrder->pricing_details['touch'] > 0) {
            $touch = (float)$workOrder->pricing_details['touch'];
        }

        // 1. ALLOCATED 24K FINE GOLD
        $goldAllocTxs = KarigarMaterialTransaction::where('work_order_id', $workOrder->id)
            ->where('material_type', 'gold')
            ->where('is_reversed', false)
            ->whereIn('transaction_type', ['allocation', 'additional_allocation', 'issue'])
            ->get();

        if ($goldAllocTxs->isNotEmpty()) {
            $allocatedFineGold = (float) $goldAllocTxs->sum(function ($tx) {
                if ((float)$tx->fine_weight > 0) return (float)$tx->fine_weight;
                if ((float)$tx->company_gold_weight > 0) return (float)$tx->company_gold_weight;
                $net = (float)($tx->net_weight > 0 ? $tx->net_weight : $tx->weight);
                return GoldConversionHelper::convertTo24kPureWeight($net, $tx->purity ?? $tx->touch);
            });
        } else {
            $rawAllotted = (float)$workOrder->allotted_weight + (float)($workOrder->additional_allocated_weight ?? 0);
            $allocatedFineGold = GoldConversionHelper::convertTo24kPureWeight($rawAllotted, $purityStr, $touch);
        }
        $allocatedFineGold = round($allocatedFineGold, 3);

        $totalRequiredQty = max(1, (int)$workOrder->required_qty);
        if ($isPieceScope) {
            $pieceAllotted = (float)($piece->allotted_weight ?: ($allocatedFineGold / $totalRequiredQty));
            $allocatedFineGold = round($pieceAllotted, 3);
        }

        // 2. FINISHED JEWELLERY FINE GOLD CONTENT
        // Only count pieces that have actually been received into inventory / passed QC
        $receivedPieces = ($workOrder->receivedPieces ?? collect())->filter(fn($p) => !empty($p->received_at) || $p->status === 'in_stock');
        if ($isPieceScope) {
            if ((float)$piece->pure_24k_weight > 0) {
                $finishedProductFineGold = (float)$piece->pure_24k_weight;
            } else {
                $pieceNet = (float)$piece->net_gold_weight;
                if ($pieceNet <= 0 && (float)$piece->gross_weight > 0) {
                    $diaGrams = ((float)$piece->diamond_weight) * 0.2;
                    $stoneGrams = ((float)$piece->color_stone_weight) * 0.2;
                    $silverGrams = (float)$piece->silver_weight;
                    $oldWeight = (float)$piece->old_weight;
                    $pieceNet = max(0.0, (float)$piece->gross_weight - $diaGrams - $stoneGrams - $silverGrams - $oldWeight);
                }
                $finishedProductFineGold = GoldConversionHelper::convertTo24kPureWeight($pieceNet, $piece->purity ?? $purityStr, $touch);
            }
        } elseif ($receivedPieces->isNotEmpty()) {
            $finishedProductFineGold = (float) $receivedPieces->sum(function ($p) use ($purityStr, $touch) {
                if ((float)$p->pure_24k_weight > 0) return (float)$p->pure_24k_weight;
                $pNet = (float)$p->net_gold_weight;
                if ($pNet <= 0 && (float)$p->gross_weight > 0) {
                    $diaGrams = ((float)$p->diamond_weight) * 0.2;
                    $stoneGrams = ((float)$p->color_stone_weight) * 0.2;
                    $silverGrams = (float)$p->silver_weight;
                    $oldWeight = (float)$p->old_weight;
                    $pNet = max(0.0, (float)$p->gross_weight - $diaGrams - $stoneGrams - $silverGrams - $oldWeight);
                }
                return GoldConversionHelper::convertTo24kPureWeight($pNet, $p->purity ?? $purityStr, $touch);
            });
        } else {
            $diaGrams = ((float)($workOrder->diamond_weight ?? 0)) * 0.2;
            $stDetails = is_array($workOrder->stone_details) ? $workOrder->stone_details : [];
            $stoneGrams = ((float)($stDetails['color_stone_weight'] ?? $workOrder->color_stone_weight ?? 0)) * 0.2;
            $silverGrams = (float)($stDetails['silver_weight'] ?? $workOrder->silver_weight ?? 0);
            $netGold = max(0.0, (float)$workOrder->completed_weight - $diaGrams - $stoneGrams - $silverGrams);
            $finishedProductFineGold = GoldConversionHelper::convertTo24kPureWeight($netGold, $purityStr, $touch);
        }
        $finishedProductFineGold = round($finishedProductFineGold, 3);

        // 3. GOLD WASTAGE (Recorded vs Approved)
        $qcData = $isPieceScope && is_array($piece->qc_submission_data) ? $piece->qc_submission_data : [];
        if ($isPieceScope && isset($qcData['wastage_weight']) && (float)$qcData['wastage_weight'] >= 0) {
            $recordedWastagePhysical = (float)$qcData['wastage_weight'];
        } elseif (isset($workOrder->wastage_weight) && (float)$workOrder->wastage_weight >= 0) {
            $recordedWastagePhysical = (float)$workOrder->wastage_weight;
        } else {
            $recordedWastagePhysical = 0.0;
        }

        // Convert physical wastage to 24K fine-gold equivalent
        $recordedWastageFineGold = GoldConversionHelper::convertTo24kPureWeight($recordedWastagePhysical, $purityStr, $touch);
        $recordedWastageFineGold = round($recordedWastageFineGold, 3);

        // Check for approved wastage transactions
        $approvedTxs = KarigarMaterialTransaction::where('work_order_id', $workOrder->id)
            ->where('material_type', 'gold')
            ->where('is_reversed', false)
            ->where('transaction_type', 'approved_wastage')
            ->get();

        if ($approvedTxs->isNotEmpty()) {
            $approvedWastagePhysical = (float)$approvedTxs->sum('wastage_weight');
            $approvedWastageFineGold = (float)$approvedTxs->sum(function ($tx) use ($purityStr, $touch) {
                if ((float)$tx->fine_weight > 0) return (float)$tx->fine_weight;
                return GoldConversionHelper::convertTo24kPureWeight($tx->wastage_weight ?: $tx->weight, $tx->purity ?? $purityStr, $touch);
            });
            $isWastageApproved = true;
        } elseif ($isPieceScope && !empty($qcData['wastage_approved'])) {
            $approvedWastagePhysical = $recordedWastagePhysical;
            $approvedWastageFineGold = $recordedWastageFineGold;
            $isWastageApproved = true;
        } elseif (!$isPieceScope && $workOrder->status === 'completed' && $recordedWastagePhysical > 0) {
            $approvedWastagePhysical = $recordedWastagePhysical;
            $approvedWastageFineGold = $recordedWastageFineGold;
            $isWastageApproved = true;
        } else {
            $approvedWastagePhysical = 0.0;
            $approvedWastageFineGold = 0.0;
            $isWastageApproved = false;
        }

        $approvedWastagePhysical = round($approvedWastagePhysical, 3);
        $approvedWastageFineGold = round($approvedWastageFineGold, 3);

        // 4. FINE GOLD PHYSICALLY RETURNED TO COMPANY VAULT
        $goldRetTxs = KarigarMaterialTransaction::where('work_order_id', $workOrder->id)
            ->where('material_type', 'gold')
            ->where('is_reversed', false)
            ->whereIn('transaction_type', ['unused_returned', 'vault_return', 'physical_return', 'return', 'scrap'])
            ->get();

        if ($goldRetTxs->isNotEmpty()) {
            $returnedFineGold = (float) $goldRetTxs->sum(function ($tx) use ($purityStr, $touch) {
                if ((float)$tx->fine_weight > 0) return (float)$tx->fine_weight;
                if ((float)$tx->company_gold_weight > 0) return (float)$tx->company_gold_weight;
                $net = (float)($tx->net_weight > 0 ? $tx->net_weight : $tx->weight);
                return GoldConversionHelper::convertTo24kPureWeight($net, $tx->purity ?? $tx->touch ?? $purityStr, $touch);
            });
        } elseif ((float)$workOrder->returned_weight > 0) {
            $returnedFineGold = GoldConversionHelper::convertTo24kPureWeight((float)$workOrder->returned_weight, $purityStr, $touch);
        } else {
            $returnedFineGold = 0.0;
        }
        $returnedFineGold = round($returnedFineGold, 3);

        // 5. UNUSED FINE GOLD RETAINED BY KARIGAR (BENCH BALANCE ATTRIBUTABLE TO THIS ALLOCATION)
        // Equation: Allocated fine gold = Finished-product fine gold + Approved/Accounted wastage + Unused fine gold + Returned fine gold
        // Unused fine gold = Allocated fine gold - Finished-product fine gold - Wastage - Returned fine gold
        $accountedWastageFine = $isWastageApproved ? $approvedWastageFineGold : $recordedWastageFineGold;
        $unusedFineGold = max(0.0, round($allocatedFineGold - $finishedProductFineGold - $accountedWastageFine - $returnedFineGold, 3));

        // 6. RECONCILIATION DIFFERENCE
        // Difference = Allocated - (Finished + Accounted Wastage + Unused Bench + Returned Vault)
        $accountedTotal = round($finishedProductFineGold + $accountedWastageFine + $unusedFineGold + $returnedFineGold, 3);
        $reconciliationDifference = round($allocatedFineGold - $accountedTotal, 3);

        // Karigar Total Bench Balance across all allocations
        $karigarTotalBenchFine = 0.0;
        if ($workOrder->karigar_id) {
            $kAllTxs = KarigarMaterialTransaction::where('karigar_id', $workOrder->karigar_id)
                ->where('material_type', 'gold')
                ->where('is_reversed', false)
                ->get();
            $kIssued = (float) $kAllTxs->whereIn('transaction_type', ['allocation', 'additional_allocation', 'issue'])
                ->where(fn($t) => empty($t->source) || !in_array($t->source, ['bench', 'carried_forward']))
                ->sum(fn($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->company_gold_weight > 0 ? $t->company_gold_weight : $t->weight));
            $kConsumed = (float) $kAllTxs->whereIn('transaction_type', ['finished_received', 'production_consumption'])
                ->sum(fn($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->company_gold_weight > 0 ? $t->company_gold_weight : $t->weight));
            $kWastage = (float) $kAllTxs->where('transaction_type', 'approved_wastage')
                ->sum(fn($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->wastage_weight > 0 ? $t->wastage_weight : $t->weight));
            $kReturned = (float) $kAllTxs->whereIn('transaction_type', ['unused_returned', 'vault_return', 'physical_return', 'return', 'scrap'])
                ->sum(fn($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->company_gold_weight > 0 ? $t->company_gold_weight : $t->weight));
            $karigarTotalBenchFine = max(0.0, round($kIssued - $kConsumed - $kWastage - $kReturned, 3));
        }

        return [
            'work_order_id' => $workOrder->id,
            'work_order_number' => $workOrder->work_order_number,
            'purity' => $purityStr,
            'touch' => $touch ?: GoldConversionHelper::getTouchPercent($purityStr),
            'is_piece_scope' => $isPieceScope,
            'piece_id' => $piece?->id,
            'piece_number' => $piece?->piece_number,

            // Core 24K Fine Gold Quantities
            'allocated_fine_gold' => $allocatedFineGold,
            'finished_product_fine_gold' => $finishedProductFineGold,
            'recorded_wastage_weight' => $recordedWastagePhysical,
            'recorded_wastage_fine_gold' => $recordedWastageFineGold,
            'approved_wastage_weight' => $approvedWastagePhysical,
            'approved_wastage_fine_gold' => $approvedWastageFineGold,
            'is_wastage_approved' => $isWastageApproved,
            'unused_fine_gold' => $unusedFineGold,
            'returned_fine_gold' => $returnedFineGold,
            'reconciliation_difference' => $reconciliationDifference,
            'is_reconciled' => abs($reconciliationDifference) < 0.001,

            // Overall Karigar Context
            'karigar_id' => $workOrder->karigar_id,
            'karigar_name' => $workOrder->karigar?->name ?? $workOrder->karigar_name,
            'karigar_total_bench_fine_gold' => $karigarTotalBenchFine,
        ];
    }
}
