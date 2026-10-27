<?php

namespace App\Services;

use App\Models\WorkOrder;
use App\Models\WorkOrderItem;
use App\Models\KarigarMaterialTransaction;
use App\Models\Stamp;
use App\Helpers\GoldConversionHelper;

class WorkOrderMaterialRequirementService
{
    /**
     * Get authoritative 24K fine-gold requirement and all diamond component requirements for a Work Order.
     *
     * @param WorkOrder|int $workOrder
     * @return array
     */
    public static function getWorkOrderMaterialRequirements($workOrder): array
    {
        if (is_numeric($workOrder)) {
            $workOrder = WorkOrder::with(['items', 'product', 'karigar'])->findOrFail($workOrder);
        } else {
            if (method_exists($workOrder, 'relationLoaded')) {
                if (!$workOrder->relationLoaded('items') && method_exists($workOrder, 'items')) {
                    try { $workOrder->load('items'); } catch (\Throwable $e) {}
                }
                if (!$workOrder->relationLoaded('product') && $workOrder->product_id) {
                    try { $workOrder->load('product'); } catch (\Throwable $e) {}
                }
                if (!$workOrder->relationLoaded('karigar') && $workOrder->karigar_id) {
                    try { $workOrder->load('karigar'); } catch (\Throwable $e) {}
                }
            }
        }

        $workOrderId = $workOrder->id;
        $workOrderNumber = $workOrder->work_order_number;
        $productName = $workOrder->product_name ?: 'Jewellery Piece';
        $designCode = $workOrder->design_code ?: ($workOrder->product?->design_no ?: '—');
        $karigarId = $workOrder->karigar_id;
        $karigarName = $workOrder->karigar_name ?: ($workOrder->karigar?->name ?: 'Unassigned');
        $status = $workOrder->status;
        $stage = $workOrder->current_stage;
        $requiredQty = max(1, (int)$workOrder->required_qty);

        // Normalize items collection
        $woItems = collect();
        if (isset($workOrder->items)) {
            if ($workOrder->items instanceof \Illuminate\Support\Collection) {
                $woItems = $workOrder->items;
            } elseif (is_array($workOrder->items)) {
                $woItems = collect($workOrder->items);
            }
        }
        if ($woItems->isEmpty() && method_exists($workOrder, 'items')) {
            try {
                $woItems = $workOrder->items()->get();
            } catch (\Throwable $e) {
                $woItems = collect();
            }
        }

        // -------------------------------------------------------------
        // 1. GOLD REQUIREMENT: Exclusively in 24K Fine-Gold Equivalent (grams)
        // -------------------------------------------------------------
        $storedFine = null;
        if (!empty($workOrder->fine_weight) && (float)$workOrder->fine_weight > 0) {
            $storedFine = (float)$workOrder->fine_weight;
        } elseif (!empty($workOrder->pure_weight) && (float)$workOrder->pure_weight > 0) {
            $storedFine = (float)$workOrder->pure_weight;
        } elseif (!empty($workOrder->pricing_details['fine_weight']) && (float)$workOrder->pricing_details['fine_weight'] > 0) {
            $storedFine = (float)$workOrder->pricing_details['fine_weight'];
        } elseif (!empty($workOrder->pricing_details['pure_weight']) && (float)$workOrder->pricing_details['pure_weight'] > 0) {
            $storedFine = (float)$workOrder->pricing_details['pure_weight'];
        }

        $netGoldWeight = (float)(
            $workOrder->pricing_details['required_gold_weight']
            ?? $workOrder->pricing_details['net_gold_weight']
            ?? $workOrder->pricing_details['total_gold_weight']
            ?? $workOrder->expected_return_weight
            ?? $workOrder->net_gold_weight
            ?? $workOrder->net_weight
            ?? $workOrder->gold_weight
            ?? $workOrder->allotted_weight
            ?? 0
        );
        if ($netGoldWeight <= 0 && $woItems->isNotEmpty()) {
            $netGoldWeight = (float)$woItems->sum(function ($it) {
                $itObj = is_array($it) ? (object)$it : $it;
                $pd = is_array($itObj->pricing_details ?? null)
                    ? $itObj->pricing_details
                    : (is_string($itObj->pricing_details ?? null) ? json_decode($itObj->pricing_details, true) : []);
                $itemNet = (float)($pd['required_gold_weight'] ?? $pd['gold_weight'] ?? $itObj->gold_weight ?? $itObj->allotted_weight ?? 0);
                return $itemNet;
            });
        }

        // Determine Purity & Touch
        $purityStr = $workOrder->purity ?: ($workOrder->karat ?: ($workOrder->pricing_details['gold_purity'] ?? $workOrder->pricing_details['purity'] ?? $workOrder->material_type ?? '22K'));
        $touch = null;
        if ($workOrder->touch !== null && (float)$workOrder->touch > 0) {
            $touch = (float)$workOrder->touch;
        } elseif (!empty($workOrder->pricing_details['touch']) && (float)$workOrder->pricing_details['touch'] > 0) {
            $touch = (float)$workOrder->pricing_details['touch'];
        }

        if ($storedFine !== null && $storedFine > 0) {
            // Avoid applying purity conversion twice if fine weight is already stored
            $requiredFineGold = $storedFine;
        } else {
            // Authoritative purity conversion
            if ($touch !== null && $touch > 0) {
                $requiredFineGold = round($netGoldWeight * ($touch / 100.0), 3);
            } else {
                $requiredFineGold = GoldConversionHelper::convertTo24kPureWeight($netGoldWeight, $purityStr);
            }
        }
        $requiredFineGold = round($requiredFineGold, 3);

        // Previously allocated 24K fine gold from persisted backend transactions
        $goldAllocTxs = KarigarMaterialTransaction::where('work_order_id', $workOrderId)
            ->where('material_type', 'gold')
            ->where('is_reversed', false)
            ->whereIn('transaction_type', ['allocation', 'additional_allocation', 'issue'])
            ->get();

        $allocatedFineGold = 0.0;
        foreach ($goldAllocTxs as $gtx) {
            $txFine = (float)$gtx->fine_weight;
            if ($txFine <= 0) {
                $txFine = (float)$gtx->company_gold_weight;
            }
            if ($txFine <= 0) {
                $txNet = (float)($gtx->net_weight > 0 ? $gtx->net_weight : $gtx->weight);
                $txTouch = (float)($gtx->touch > 0 ? $gtx->touch : GoldConversionHelper::getTouchPercent($gtx->purity ?? '24K'));
                $txFine = $txNet * ($txTouch / 100.0);
            }
            $allocatedFineGold += $txFine;
        }
        $allocatedFineGold = round($allocatedFineGold, 3);
        $remainingFineGold = max(0.0, round($requiredFineGold - $allocatedFineGold, 3));

        $goldRequirement = [
            'material' => 'Fine Gold',
            'basis' => '24K Fine Gold Equivalent',
            'unit' => 'g',
            'net_gold_weight' => round($netGoldWeight, 3),
            'purity_label' => $purityStr,
            'touch' => $touch ?: GoldConversionHelper::getTouchPercent($purityStr),
            'required_fine_gold' => $requiredFineGold,
            'allocated_fine_gold' => $allocatedFineGold,
            'remaining_fine_gold' => $remainingFineGold,
            'is_fully_allocated' => ($remainingFineGold <= 0.0001 && $requiredFineGold > 0),
        ];

        // -------------------------------------------------------------
        // 2. DIAMOND REQUIREMENTS: Retrieve Every Diamond Component Row
        // -------------------------------------------------------------
        $stampsMaster = Stamp::all();
        $diamondRows = [];

        $addDiaRow = function ($stamp, $carats, $pieces, $name = null, $stampId = null) use (&$diamondRows, $stampsMaster) {
            $carats = (float)$carats;
            if ($carats <= 0 && (empty($pieces) || (int)$pieces <= 0)) {
                return;
            }

            $stampStr = trim((string)$stamp);
            if (empty($stampStr) || $stampStr === '-' || $stampStr === '—' || $stampStr === '0.00') {
                $stampStr = 'Standard / Master';
            }

            // Resolve stamp_id from Stamp master if not provided
            $resolvedStampId = $stampId ? (int)$stampId : null;
            if (!$resolvedStampId) {
                $matchedMaster = $stampsMaster->first(function ($s) use ($stampStr) {
                    return strtolower(trim($s->name)) === strtolower($stampStr)
                        || strtolower(trim($s->code ?? '')) === strtolower($stampStr);
                });
                if ($matchedMaster) {
                    $resolvedStampId = $matchedMaster->id;
                    $stampStr = $matchedMaster->name;
                }
            } else {
                $matchedMaster = $stampsMaster->firstWhere('id', $resolvedStampId);
                if ($matchedMaster) {
                    $stampStr = $matchedMaster->name;
                }
            }

            $hasPieces = ($pieces !== null && $pieces !== '' && (int)$pieces > 0);
            $pcsCount = $hasPieces ? (int)$pieces : null;

            // Unique key by master ID if available, otherwise by normalized stamp string.
            // Never merge different stamps into one requirement!
            $key = $resolvedStampId ? ('id_' . $resolvedStampId) : ('name_' . strtolower($stampStr));

            if (!isset($diamondRows[$key])) {
                $diamondRows[$key] = [
                    'material' => 'Diamond',
                    'stamp' => $stampStr,
                    'stamp_id' => $resolvedStampId,
                    'name' => $name ?: ($stampStr . ' Diamonds'),
                    'required_carats' => 0.0,
                    'required_pieces' => $hasPieces ? 0 : null,
                    'has_pieces' => $hasPieces,
                ];
            }

            $diamondRows[$key]['required_carats'] += $carats;
            if ($hasPieces) {
                $diamondRows[$key]['required_pieces'] = (int)($diamondRows[$key]['required_pieces'] ?? 0) + $pcsCount;
                $diamondRows[$key]['has_pieces'] = true;
            }
        };

        // A. Inspect WorkOrderItem rows
        foreach ($woItems as $itm) {
            $qtyMultiplier = max(1, (int)(data_get($itm, 'required_qty') ?? 1));

            // 1) Components in stone_details
            $stDetails = data_get($itm, 'stone_details');
            $stDetails = is_array($stDetails) ? $stDetails : (json_decode($stDetails ?? '[]', true) ?: []);
            $comps = $stDetails['diamonds'] ?? $stDetails['diamond_components'] ?? $stDetails['components'] ?? [];
            if (is_array($comps) && !empty($comps)) {
                foreach ($comps as $c) {
                    $cType = strtolower(trim($c['component_type'] ?? ''));
                    $cCat = strtolower(trim($c['category_name'] ?? $c['item_name'] ?? ''));
                    if ($cType === 'diamond' || str_contains($cCat, 'diamond') || !empty($c['is_diamond']) || !empty($c['diamond_weight'])) {
                        $cWeight = (float)($c['diamond_weight'] ?? $c['carat'] ?? $c['stone_weight'] ?? $c['weight'] ?? 0);
                        $cPcs = isset($c['pieces']) ? $c['pieces'] : ($c['no_of_diamonds'] ?? $c['diamond_count'] ?? $c['count'] ?? null);
                        $cStamp = $c['stamp'] ?? $c['diamond_stamp'] ?? $c['sieve_size'] ?? null;
                        $cStampId = $c['stamp_id'] ?? null;
                        $cName = $c['item_name'] ?? $c['component_name'] ?? null;
                        $addDiaRow($cStamp, $cWeight * $qtyMultiplier, $cPcs !== null ? ($cPcs * $qtyMultiplier) : null, $cName, $cStampId);
                    }
                }
            }

            // 2) Components in pricing_details
            $prDetails = data_get($itm, 'pricing_details');
            $prDetails = is_array($prDetails) ? $prDetails : (json_decode($prDetails ?? '[]', true) ?: []);
            $prComps = $prDetails['components'] ?? $prDetails['diamond_components'] ?? $prDetails['diamonds'] ?? [];
            if (is_array($prComps) && !empty($prComps)) {
                foreach ($prComps as $c) {
                    $cType = strtolower(trim($c['component_type'] ?? ''));
                    $cCat = strtolower(trim($c['category_name'] ?? $c['item_name'] ?? ''));
                    if ($cType === 'diamond' || str_contains($cCat, 'diamond') || !empty($c['is_diamond']) || !empty($c['diamond_weight'])) {
                        $cWeight = (float)($c['diamond_weight'] ?? $c['carat'] ?? $c['stone_weight'] ?? $c['weight'] ?? 0);
                        $cPcs = isset($c['pieces']) ? $c['pieces'] : ($c['no_of_diamonds'] ?? $c['diamond_count'] ?? $c['count'] ?? null);
                        $cStamp = $c['stamp'] ?? $c['diamond_stamp'] ?? $c['sieve_size'] ?? null;
                        $cStampId = $c['stamp_id'] ?? null;
                        $cName = $c['item_name'] ?? $c['component_name'] ?? null;
                        $addDiaRow($cStamp, $cWeight * $qtyMultiplier, $cPcs !== null ? ($cPcs * $qtyMultiplier) : null, $cName, $cStampId);
                    }
                }
            }

            // 3) Direct diamond columns on item
            $diaWeight = (float)(data_get($itm, 'diamond_weight') ?? data_get($stDetails, 'diamond_weight') ?? data_get($prDetails, 'diamond_weight') ?? 0);
            $diaCount = data_get($itm, 'diamond_count') ?? data_get($stDetails, 'diamond_count') ?? data_get($stDetails, 'no_of_diamonds') ?? data_get($prDetails, 'no_of_diamonds') ?? data_get($prDetails, 'diamond_count');
            $diaStamp = data_get($itm, 'diamond_stamp') ?? data_get($stDetails, 'diamond_stamp') ?? data_get($stDetails, 'stamp') ?? data_get($prDetails, 'diamond_stamp') ?? data_get($prDetails, 'stamp') ?? data_get($itm, 'stamp');
            $diaStampId = data_get($itm, 'stamp_id') ?? data_get($stDetails, 'stamp_id') ?? data_get($prDetails, 'stamp_id');
            if ($diaWeight > 0 || ($diaCount !== null && (int)$diaCount > 0)) {
                if (empty($comps) && empty($prComps)) {
                    $addDiaRow($diaStamp, $diaWeight * $qtyMultiplier, $diaCount !== null ? ($diaCount * $qtyMultiplier) : null, null, $diaStampId);
                }
            }
        }

        // B. Check WorkOrder pricing_details['items'] or components
        if (empty($diamondRows)) {
            $woPricing = is_array($workOrder->pricing_details) ? $workOrder->pricing_details : (json_decode($workOrder->pricing_details ?? '[]', true) ?: []);
            $rawItems = $woPricing['items'] ?? [];
            if (is_array($rawItems) && !empty($rawItems)) {
                foreach ($rawItems as $rItm) {
                    $rQty = max(1, (int)($rItm['need_pcs'] ?? $rItm['quantity'] ?? $rItm['qty'] ?? 1));
                    $rComps = $rItm['components'] ?? $rItm['diamond_components'] ?? [];
                    if (is_array($rComps) && !empty($rComps)) {
                        foreach ($rComps as $c) {
                            $cWeight = (float)($c['diamond_weight'] ?? $c['carat'] ?? $c['stone_weight'] ?? $c['weight'] ?? 0);
                            $cPcs = isset($c['pieces']) ? $c['pieces'] : ($c['no_of_diamonds'] ?? $c['diamond_count'] ?? null);
                            $cStamp = $c['stamp'] ?? $c['diamond_stamp'] ?? $c['sieve_size'] ?? null;
                            $cStampId = $c['stamp_id'] ?? null;
                            $addDiaRow($cStamp, $cWeight * $rQty, $cPcs !== null ? ($cPcs * $rQty) : null, $c['item_name'] ?? null, $cStampId);
                        }
                    } else {
                        $rDiaWeight = (float)($rItm['diamond_weight'] ?? 0);
                        $rDiaCount = isset($rItm['no_of_diamonds']) ? $rItm['no_of_diamonds'] : ($rItm['diamond_count'] ?? null);
                        $rDiaStamp = $rItm['diamond_stamp'] ?? $rItm['stamp'] ?? $rItm['stamp_and_no'] ?? null;
                        if ($rDiaWeight > 0 || ($rDiaCount !== null && (int)$rDiaCount > 0)) {
                            $addDiaRow($rDiaStamp, $rDiaWeight * $rQty, $rDiaCount !== null ? ($rDiaCount * $rQty) : null);
                        }
                    }
                }
            }
        }

        // C. Check WorkOrder stone_details
        if (empty($diamondRows)) {
            $woStones = is_array($workOrder->stone_details) ? $workOrder->stone_details : (json_decode($workOrder->stone_details ?? '[]', true) ?: []);
            $stoneComps = $woStones['diamonds'] ?? $woStones['diamond_components'] ?? $woStones['components'] ?? [];
            if (is_array($stoneComps) && !empty($stoneComps)) {
                foreach ($stoneComps as $c) {
                    $cWeight = (float)($c['diamond_weight'] ?? $c['carat'] ?? $c['stone_weight'] ?? $c['weight'] ?? 0);
                    $cPcs = isset($c['pieces']) ? $c['pieces'] : ($c['no_of_diamonds'] ?? $c['diamond_count'] ?? null);
                    $cStamp = $c['stamp'] ?? $c['diamond_stamp'] ?? $c['sieve_size'] ?? null;
                    $cStampId = $c['stamp_id'] ?? null;
                    $addDiaRow($cStamp, $cWeight * $requiredQty, $cPcs !== null ? ($cPcs * $requiredQty) : null, $c['item_name'] ?? null, $cStampId);
                }
            } elseif (!empty($woStones['diamond_weight']) || !empty($woStones['diamond_count'])) {
                $addDiaRow(
                    $woStones['diamond_stamp'] ?? $woStones['stamp'] ?? null,
                    (float)($woStones['diamond_weight'] ?? 0) * $requiredQty,
                    isset($woStones['diamond_count']) ? ((int)$woStones['diamond_count'] * $requiredQty) : null
                );
            }
        }

        // D. Check Linked Product components
        if (empty($diamondRows) && $workOrder->product) {
            $prodAttrs = is_array($workOrder->product->attributes) ? $workOrder->product->attributes : (json_decode($workOrder->product->attributes ?? '[]', true) ?: []);
            $prodComps = $prodAttrs['components'] ?? [];
            if (is_array($prodComps) && !empty($prodComps)) {
                foreach ($prodComps as $c) {
                    $cType = strtolower(trim($c['component_type'] ?? ''));
                    $cCat = strtolower(trim($c['category_name'] ?? $c['item_name'] ?? ''));
                    if ($cType === 'diamond' || str_contains($cCat, 'diamond') || !empty($c['is_diamond'])) {
                        $cWeight = (float)($c['diamond_weight'] ?? $c['carat'] ?? $c['stone_weight'] ?? $c['weight'] ?? 0);
                        $cPcs = isset($c['pieces']) ? $c['pieces'] : ($c['no_of_diamonds'] ?? $c['diamond_count'] ?? $c['count'] ?? null);
                        $cStamp = $c['stamp'] ?? $c['diamond_stamp'] ?? $c['sieve_size'] ?? null;
                        $cStampId = $c['stamp_id'] ?? null;
                        $addDiaRow($cStamp, $cWeight * $requiredQty, $cPcs !== null ? ($cPcs * $requiredQty) : null, $c['item_name'] ?? null, $cStampId);
                    }
                }
            }
        }

        // Tally previously allocated diamond transactions for this Work Order by stamp
        $diaAllocTxs = KarigarMaterialTransaction::where('work_order_id', $workOrderId)
            ->where('material_type', 'diamond')
            ->where('is_reversed', false)
            ->whereIn('transaction_type', ['allocation', 'additional_allocation', 'issue'])
            ->get();

        $finalDiamondRequirements = [];
        foreach ($diamondRows as $dKey => $dReq) {
            $reqStamp = $dReq['stamp'];
            $reqStampId = $dReq['stamp_id'];
            $reqCarats = round((float)$dReq['required_carats'], 3);
            $reqPieces = $dReq['has_pieces'] ? (int)$dReq['required_pieces'] : null;

            $matchingTxs = $diaAllocTxs->filter(function ($tx) use ($reqStamp, $reqStampId) {
                if ($reqStampId && !empty($tx->stamp_id) && (int)$tx->stamp_id === (int)$reqStampId) {
                    return true;
                }
                $txStamp = strtolower(trim($tx->stamp ?? ''));
                $txSieve = strtolower(trim($tx->sieve_size ?? ''));
                $target = strtolower(trim($reqStamp));
                return ($txStamp !== '' && $txStamp === $target) || ($txSieve !== '' && $txSieve === $target);
            });

            $allocatedCarats = round((float)$matchingTxs->sum(function ($t) {
                return (float)($t->net_weight > 0 ? $t->net_weight : $t->weight);
            }), 3);
            $allocatedPieces = $dReq['has_pieces'] ? (int)$matchingTxs->sum('pieces') : null;

            $remainingCarats = max(0.0, round($reqCarats - $allocatedCarats, 3));
            $remainingPieces = $dReq['has_pieces'] ? max(0, $reqPieces - $allocatedPieces) : null;

            $finalDiamondRequirements[] = [
                'material' => 'Diamond',
                'stamp' => $reqStamp,
                'stamp_id' => $reqStampId,
                'name' => $dReq['name'],
                'required_carats' => $reqCarats,
                'required_pieces' => $reqPieces,
                'has_pieces' => $dReq['has_pieces'],
                'allocated_carats' => $allocatedCarats,
                'allocated_pieces' => $allocatedPieces,
                'remaining_carats' => $remainingCarats,
                'remaining_pieces' => $remainingPieces,
                'is_fully_allocated' => ($remainingCarats <= 0.0001 && (!$dReq['has_pieces'] || $remainingPieces <= 0)),
            ];
        }

        $allFullyAllocated = ($goldRequirement['is_fully_allocated'] || $goldRequirement['required_fine_gold'] <= 0);
        foreach ($finalDiamondRequirements as $dr) {
            if (!$dr['is_fully_allocated']) {
                $allFullyAllocated = false;
                break;
            }
        }

        return [
            'work_order_id' => $workOrderId,
            'work_order_number' => $workOrderNumber,
            'product_name' => $productName,
            'design_code' => $designCode,
            'karigar_id' => $karigarId,
            'karigar_name' => $karigarName,
            'status' => $status,
            'current_stage' => $stage,
            'required_qty' => $requiredQty,
            'gold_requirement' => $goldRequirement,
            'diamond_requirements' => array_values($finalDiamondRequirements),
            'has_diamonds' => !empty($finalDiamondRequirements),
            'is_all_fully_allocated' => $allFullyAllocated,
        ];
    }
}
