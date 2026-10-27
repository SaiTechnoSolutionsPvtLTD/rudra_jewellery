<?php

namespace App\Services;

use App\Models\Client;
use App\Models\InventoryMovement;
use App\Models\Invoice;
use App\Models\InvoiceOldGold;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\SaleItem;
use App\Models\SalePayment;
use App\Models\WorkOrder;
use App\Models\WorkOrderReceivedPiece;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SaleService
{
    /**
     * Create a Sales Invoice (Draft or Finalized/Posted)
     */
    public function create(array $data, ?int $userId = null): Invoice
    {
        return DB::transaction(function () use ($data, $userId) {
            $client = !empty($data['client_id']) ? Client::find($data['client_id']) : null;
            if (!$client) {
                $cName = trim((string)($data['client_name'] ?? $data['customer_name'] ?? ''));
                if ($cName === '' || str_contains(strtolower($cName), 'walk')) {
                    $client = Client::firstOrCreate(
                        ['full_name' => 'Walk-in Customer'],
                        [
                            'client_code' => 'RJ-CL-1000',
                            'primary_phone' => '9999999999',
                            'status' => 'active',
                            'street_address' => 'Store Walk-in',
                            'city' => 'Chennai',
                            'state' => 'Tamil Nadu',
                        ]
                    );
                }
            }
            $items = $data['items'];
            $isDraft = !empty($data['is_draft']) || (($data['status'] ?? null) === 'draft') || (($data['sale_status'] ?? null) === 'draft');

            // 1. Gather all specified physical pieces across all items
            $allSpecifiedPieceIds = [];
            $allSpecifiedTags = [];

            foreach ($items as $item) {
                $pId = $item['piece_id'] ?? ($item['details']['piece_id'] ?? null);
                if ($pId) $allSpecifiedPieceIds[] = (int) $pId;

                $pIds = $item['piece_ids'] ?? ($item['details']['piece_ids'] ?? []);
                if (is_array($pIds)) {
                    foreach ($pIds as $idVal) {
                        if ($idVal) $allSpecifiedPieceIds[] = (int) $idVal;
                    }
                }

                $tag = $item['tag_number'] ?? ($item['details']['tag_number'] ?? null);
                if ($tag && trim($tag) !== '') $allSpecifiedTags[] = trim($tag);

                $tags = $item['tag_numbers'] ?? ($item['details']['tag_numbers'] ?? []);
                if (is_array($tags)) {
                    foreach ($tags as $tVal) {
                        if ($tVal && trim($tVal) !== '') $allSpecifiedTags[] = trim($tVal);
                    }
                }
            }

            $allSpecifiedPieceIds = array_values(array_unique($allSpecifiedPieceIds));
            $allSpecifiedTags = array_values(array_unique($allSpecifiedTags));

            // 2. If Finalizing: lock all specified physical pieces and ensure none are sold
            $lockedPieces = collect();
            if (!$isDraft && (!empty($allSpecifiedPieceIds) || !empty($allSpecifiedTags))) {
                $lockedPieces = WorkOrderReceivedPiece::where(function ($q) use ($allSpecifiedPieceIds, $allSpecifiedTags) {
                    if (!empty($allSpecifiedPieceIds)) {
                        $q->whereIn('id', $allSpecifiedPieceIds);
                    }
                    if (!empty($allSpecifiedTags)) {
                        $q->orWhereIn('tag_number', $allSpecifiedTags);
                    }
                })->lockForUpdate()->get();

                // Concurrency verification: verify no piece is already sold and is eligible for sale
                foreach ($lockedPieces as $piece) {
                    if ($piece->status === 'sold' || (!empty($piece->invoice_id) && (!isset($data['invoice_id']) || $piece->invoice_id != $data['invoice_id']))) {
                        throw ValidationException::withMessages([
                            'items' => "Physical piece with Tag '{$piece->tag_number}' (Piece #{$piece->piece_number}) has already been sold or invoiced."
                        ]);
                    }
                    if (empty($piece->received_at)) {
                        throw ValidationException::withMessages([
                            'items' => "Physical piece with Tag '{$piece->tag_number}' has not been physically received yet."
                        ]);
                    }
                    if (!$piece->is_inventory_posted && !$piece->isEligibleForInventory() && $piece->status !== 'in_stock') {
                        throw ValidationException::withMessages([
                            'items' => "Physical piece with Tag '{$piece->tag_number}' has not completed required downstream inspection/inventory stages."
                        ]);
                    }
                }
            }

            // 3. Process line items
            $subtotal = 0;
            $costTotal = 0;
            $lineItems = [];

            foreach ($items as $itemIndex => $item) {
                $product = !empty($item['product_id']) ? Product::whereKey($item['product_id'])->lockForUpdate()->first() : null;
                $quantity = (float) ($item['quantity'] ?? $item['qty'] ?? 1);
                if ($quantity <= 0) {
                    throw ValidationException::withMessages(['items' => 'Quantity must be greater than zero.']);
                }

                // Match specific physical pieces for this line item
                $itemPieceIds = [];
                if (!empty($item['piece_id'])) $itemPieceIds[] = (int) $item['piece_id'];
                if (!empty($item['details']['piece_id'])) $itemPieceIds[] = (int) $item['details']['piece_id'];
                if (isset($item['piece_ids']) && is_array($item['piece_ids'])) {
                    $itemPieceIds = array_merge($itemPieceIds, array_map('intval', $item['piece_ids']));
                }
                if (isset($item['details']['piece_ids']) && is_array($item['details']['piece_ids'])) {
                    $itemPieceIds = array_merge($itemPieceIds, array_map('intval', $item['details']['piece_ids']));
                }

                $itemTags = [];
                if (!empty($item['tag_number'])) $itemTags[] = trim($item['tag_number']);
                if (!empty($item['details']['tag_number'])) $itemTags[] = trim($item['details']['tag_number']);
                if (isset($item['tag_numbers']) && is_array($item['tag_numbers'])) {
                    foreach ($item['tag_numbers'] as $t) if ($t) $itemTags[] = trim($t);
                }
                if (isset($item['details']['tag_numbers']) && is_array($item['details']['tag_numbers'])) {
                    foreach ($item['details']['tag_numbers'] as $t) if ($t) $itemTags[] = trim($t);
                }

                $itemPieceIds = array_values(array_unique($itemPieceIds));
                $itemTags = array_values(array_unique($itemTags));

                $matchedPiecesForLine = collect();
                if (!$isDraft && (!empty($itemPieceIds) || !empty($itemTags))) {
                    $matchedPiecesForLine = $lockedPieces->filter(function ($p) use ($itemPieceIds, $itemTags) {
                        return in_array($p->id, $itemPieceIds, true) || in_array($p->tag_number, $itemTags, true);
                    });

                    // Validate quantity strictly matches piece count if physical pieces selected
                    if ($matchedPiecesForLine->isNotEmpty() && (int)$quantity !== $matchedPiecesForLine->count()) {
                        throw ValidationException::withMessages([
                            'items' => "The line quantity ({$quantity}) must exactly match the number of selected physical pieces (" . $matchedPiecesForLine->count() . ") for item '{$item['product_name']}'."
                        ]);
                    }
                }

                // If product is linked and finalizing, verify stock
                if ($product && !$isDraft) {
                    $available = (float) ($product->current_stock_qty ?? 0);
                    if ($available < $quantity) {
                        throw ValidationException::withMessages([
                            'items' => "Insufficient stock for product '{$product->name}'. Available: {$available}, Requested: {$quantity}."
                        ]);
                    }

                    // Prevent parent-child double-selling: If individual child piece tags exist,
                    // require selecting the specific child piece/tag instead of selling parent directly
                    if ($matchedPiecesForLine->isEmpty()) {
                        $unsoldChildPiecesCount = WorkOrderReceivedPiece::where('product_id', $product->id)
                            ->where(function ($q) {
                                $q->whereNull('status')->orWhereNotIn('status', ['sold', 'cancelled', 'returned']);
                            })
                            ->whereNull('invoice_id')
                            ->count();

                        if ($unsoldChildPiecesCount > 0) {
                            throw ValidationException::withMessages([
                                'items' => "Product '{$product->name}' has {$unsoldChildPiecesCount} physical piece tag(s) in inventory. Please select an individual child piece/tag rather than selling the parent product directly to prevent double-selling."
                            ]);
                        }
                    }
                }

                // Price calculations
                $rate = (float) ($item['rate'] ?? $item['add_yr'] ?? ($product?->attributes['sale_rate'] ?? $product?->attributes['rate'] ?? 0));
                $grossWt = (float) ($item['gross_weight'] ?? $item['gross_wt'] ?? ($product?->opening_stock_weight ?? 0));
                $netWt = (float) ($item['net_weight'] ?? $item['net_wt'] ?? $grossWt);
                $wastagePct = (float) ($item['wastage_percent'] ?? $item['wastage'] ?? 0);

                // Metal Value = Effective Weight * Rate * (1 + Wastage%)
                $metalValue = $netWt * $quantity * $rate * (1 + $wastagePct / 100);

                $charges = collect(['making_charge', 'labour_charge', 'labour', 'stone_charge', 'diamond_charge', 'diamond', 'other_charge', 'hallmarking'])
                    ->sum(fn ($key) => (float) ($item[$key] ?? 0));

                $itemDiscount = (float) ($item['discount'] ?? 0);
                $calculatedLineTotal = max(0, round($metalValue + $charges - $itemDiscount, 2));

                $lineTotal = !empty($item['line_total']) ? (float) $item['line_total'] : $calculatedLineTotal;
                $unitCost = (float) ($item['cost_rate'] ?? ($product?->opening_stock_rate ?? 0));
                $lineCost = round($unitCost * $quantity, 2);

                $subtotal += $lineTotal;
                $costTotal += $lineCost;

                $lineItems[] = compact('product', 'item', 'quantity', 'rate', 'lineTotal', 'unitCost', 'lineCost', 'matchedPiecesForLine', 'itemTags', 'itemPieceIds');
            }

            $discount = (float) ($data['discount'] ?? 0);
            $taxRate = isset($data['gst_rate']) ? (float) $data['gst_rate'] : 3.0; // Standard jewellery GST 3%
            $taxable = max(0, $subtotal - $discount);
            $tax = round($taxable * $taxRate / 100, 2);
            $total = round($taxable + $tax + (float) ($data['other_charge'] ?? 0), 2);

            // Calculate Old Gold intake / exchange credit
            $oldGoldItems = $data['old_gold_items'] ?? [];
            $totalOldGoldCredit = 0;
            $totalOldGoldFineWeight = 0;
            $processedOldGolds = [];

            if (is_array($oldGoldItems)) {
                foreach ($oldGoldItems as $og) {
                    $grossWt = max(0, (float)($og['gross_weight'] ?? $og['gross_wt'] ?? 0));
                    $meltingLoss = max(0, (float)($og['melting_loss'] ?? 0));
                    $netWt = max(0, (float)($og['net_weight'] ?? ($grossWt - $meltingLoss)));
                    $touch = max(0, (float)($og['purity_touch'] ?? $og['touch'] ?? 91.60));
                    $fineWt = round($netWt * ($touch / 100), 3);
                    $ratePerGram = max(0, (float)($og['rate_per_gram'] ?? $og['rate'] ?? 0));

                    $credit = isset($og['total_credit']) ? (float)$og['total_credit'] : round($fineWt > 0 && $ratePerGram > 0 ? ($fineWt * $ratePerGram) : ($netWt * $ratePerGram), 2);
                    if ($credit > 0 || $grossWt > 0) {
                        $totalOldGoldCredit += $credit;
                        $totalOldGoldFineWeight += $fineWt;
                        $processedOldGolds[] = [
                            'item_description' => $og['item_description'] ?? $og['desc'] ?? 'Old Gold Exchange',
                            'gross_weight' => $grossWt,
                            'melting_loss' => $meltingLoss,
                            'net_weight' => $netWt,
                            'purity_touch' => $touch,
                            'fine_weight' => $fineWt,
                            'rate_per_gram' => $ratePerGram,
                            'total_credit' => $credit,
                            'notes' => $og['notes'] ?? null,
                        ];
                    }
                }
            }

            $totalOldGoldCredit = round($totalOldGoldCredit, 2);
            $paid = max(0, (float) ($data['paid_amount'] ?? $data['amount_received'] ?? 0));
            $due = max(0, round($total - $paid - $totalOldGoldCredit, 2));

            $status = ($due <= 0 && !$isDraft) ? 'paid' : (($paid > 0 || $totalOldGoldCredit > 0) ? 'partial' : 'pending');
            $saleStatus = $isDraft ? 'draft' : ($due <= 0 ? 'completed' : 'partial');

            // Generate or preserve invoice number
            $invoiceNo = !empty($data['invoice_no']) ? trim($data['invoice_no']) : $this->nextInvoiceNumber();
            if (!$isDraft && Invoice::where('invoice_no', $invoiceNo)->where('id', '!=', $data['invoice_id'] ?? 0)->exists()) {
                $invoiceNo = $this->nextInvoiceNumber();
            }

            $clientName = $client?->full_name ?: trim((string) ($data['client_name'] ?? $data['customer_name'] ?? 'Walk-in Customer'));

            // Resolve and persist active price list version
            $priceListVersion = $data['price_list_version'] ?? null;
            if (!$priceListVersion && $client) {
                $activePL = \App\Models\ClientPriceList::where('client_id', $client->id)
                    ->where('status', 'active')
                    ->latest()
                    ->first() ?: \App\Models\ClientPriceList::where('client_id', $client->id)->latest()->first();
                $priceListVersion = $activePL?->version;
            }

            $invoice = Invoice::create([
                'invoice_no' => $invoiceNo,
                'client_id' => $client?->id,
                'client_name' => $clientName,
                'client_email' => $client?->email ?? ($data['client_email'] ?? null),
                'client_tier' => strtoupper($client?->membership_tier ?: 'SILVER'),
                'client_initials' => collect(explode(' ', $clientName))->map(fn ($part) => strtoupper(substr($part, 0, 1)))->take(2)->implode(''),
                'invoice_date' => $data['invoice_date'] ?? $data['date'] ?? now()->toDateString(),
                'amount' => $subtotal,
                'gst_rate' => $taxRate,
                'gst_amount' => $tax,
                'total_amount' => $total,
                'paid_amount' => $paid,
                'old_gold_amount' => $totalOldGoldCredit,
                'due_amount' => $due,
                'due_date' => $data['due_date'] ?? null,
                'payment_method' => $data['payment_method'] ?? $data['payment_mode'] ?? null,
                'price_list_version' => $priceListVersion,
                'cost_amount' => $costTotal,
                'profit_amount' => round($total - $costTotal, 2),
                'sale_status' => $saleStatus,
                'status' => $status,
                'invoice_type' => $data['invoice_type'] ?? 'retail_sale',
                'notes' => $data['notes'] ?? null,
                'items' => $items,
                'created_by' => $userId,
            ]);

            // Save old gold intake items
            foreach ($processedOldGolds as $ogRow) {
                InvoiceOldGold::create(array_merge($ogRow, ['invoice_id' => $invoice->id]));
            }

            // If finalized and scrap gold received, deposit to raw materials vault
            if (!$isDraft && $totalOldGoldFineWeight > 0) {
                try {
                    RawMaterial::quickStockAdd('gold', $totalOldGoldFineWeight, 'g', "Old Gold Exchange from Invoice {$invoiceNo}");
                } catch (\Throwable $ex) {
                    \Illuminate\Support\Facades\Log::warning("Old gold vault deposit notice: " . $ex->getMessage());
                }
            }

            // Save line items and link physical pieces
            foreach ($lineItems as $line) {
                $product = $line['product'];
                $item = $line['item'];
                $matchedPieces = $line['matchedPiecesForLine'];

                $tagNumbers = $matchedPieces->pluck('tag_number')->filter()->values()->all();
                if (empty($tagNumbers)) {
                    $tagNumbers = $line['itemTags'];
                }

                $pieceIds = $matchedPieces->pluck('id')->filter()->values()->all();
                if (empty($pieceIds)) {
                    $pieceIds = $line['itemPieceIds'];
                }

                $woNumbers = $matchedPieces->map(fn($p) => $p->workOrder?->work_order_number)->filter()->unique()->values()->all();
                $karigarNames = $matchedPieces->map(fn($p) => $p->karigar?->name)->filter()->unique()->values()->all();

                $itemGross = (float) ($item['gross_weight'] ?? $item['gross_wt'] ?? ($matchedPieces->sum('gross_weight') ?: 0));
                $itemNet = (float) ($item['net_weight'] ?? $item['net_wt'] ?? ($matchedPieces->sum('net_gold_weight') ?: $itemGross));
                $itemDiamond = (float) ($item['stone_weight'] ?? $item['diamond'] ?? $item['diamond_weight'] ?? ($matchedPieces->sum('diamond_weight') ?: 0));

                $rawPurity = $item['purity'] ?? null;
                $numericPurity = null;
                if (is_numeric($rawPurity)) {
                    $numericPurity = (float) $rawPurity;
                } elseif (is_string($rawPurity)) {
                    $upperPurity = strtoupper(trim($rawPurity));
                    if (str_contains($upperPurity, '24') || str_contains($upperPurity, '999')) {
                        $numericPurity = 99.9;
                    } elseif (str_contains($upperPurity, '22') || str_contains($upperPurity, '916')) {
                        $numericPurity = 91.6;
                    } elseif (str_contains($upperPurity, '18') || str_contains($upperPurity, '750')) {
                        $numericPurity = 75.0;
                    } elseif (str_contains($upperPurity, '14') || str_contains($upperPurity, '585')) {
                        $numericPurity = 58.5;
                    } else {
                        $filteredDigits = preg_replace('/[^0-9.]/', '', $rawPurity);
                        $numericPurity = is_numeric($filteredDigits) ? (float) $filteredDigits : null;
                    }
                }

                $touchPct = $numericPurity ?: 91.60;
                $fineGoldWeight = round($itemNet * ($touchPct / 100), 3);

                $itemDetails = is_array($item['details'] ?? null) ? $item['details'] : [];
                $itemDetails['tag_numbers'] = $tagNumbers;
                $itemDetails['piece_ids'] = $pieceIds;
                $itemDetails['work_order_numbers'] = $woNumbers;
                $itemDetails['karigar_names'] = $karigarNames;
                $itemDetails['gross_weight'] = round($itemGross, 3);
                $itemDetails['net_weight'] = round($itemNet, 3);
                $itemDetails['fine_gold_weight'] = round($fineGoldWeight, 3);
                $itemDetails['diamond_weight'] = round($itemDiamond, 3);
                $itemDetails['diamond_details'] = $matchedPieces->pluck('diamond_details')->filter()->first() ?? ($item['diamond_details'] ?? null);
                $itemDetails['diamond_count'] = (int) ($matchedPieces->sum('diamond_count') ?: ($item['diamond_count'] ?? 0));
                $itemDetails['purity_label'] = $rawPurity ?: ($numericPurity ? "{$numericPurity}%" : '22K');
                $itemDetails['price_list_version'] = $priceListVersion;

                SaleItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $product?->id,
                    'product_name' => $item['product_name'] ?? $item['desc'] ?? $product?->name ?? 'Jewellery Item',
                    'product_code' => $item['product_code'] ?? $item['code'] ?? $product?->product_code,
                    'quantity' => $line['quantity'],
                    'gross_weight' => $itemGross,
                    'net_weight' => $itemNet,
                    'stone_weight' => $itemDiamond,
                    'purity' => $numericPurity,
                    'rate' => $line['rate'],
                    'making_charge' => $item['making_charge'] ?? $item['labour'] ?? 0,
                    'labour_charge' => $item['labour_charge'] ?? 0,
                    'stone_charge' => $item['stone_charge'] ?? 0,
                    'diamond_charge' => $item['diamond_charge'] ?? 0,
                    'other_charge' => $item['other_charge'] ?? $item['hallmarking'] ?? 0,
                    'line_total' => $line['lineTotal'],
                    'cost_amount' => $line['lineCost'],
                    'price_list_version' => $priceListVersion,
                    'details' => $itemDetails,
                ]);

                // 4. If Finalized (NOT Draft), mark physical pieces as sold and deduct inventory
                if (!$isDraft) {
                    $soldTagsForThisLine = [];

                    foreach ($matchedPieces as $soldPiece) {
                        $soldPiece->status = 'sold';
                        $soldPiece->invoice_id = $invoice->id;
                        $soldPiece->client_id = $invoice->client_id;
                        $soldPiece->save();

                        if (!empty($soldPiece->tag_number)) {
                            $soldTagsForThisLine[] = $soldPiece->tag_number;
                        }

                        // Sync Work Order delivery: check if ALL pieces of this work order are now delivered
                        if (!empty($soldPiece->work_order_id)) {
                            $wo = WorkOrder::find($soldPiece->work_order_id);
                            if ($wo) {
                                $totalPieces = $wo->receivedPieces()->count();
                                $soldCount = $wo->receivedPieces()->where('status', 'sold')->count();
                                $reqQty = max((int)$wo->required_qty, (int)$wo->received_qty, $totalPieces);

                                // If every single piece of this customer work order is received and sold, mark delivered
                                if ($reqQty > 0 && $soldCount >= $reqQty && (int)$wo->received_qty >= $reqQty) {
                                    $wo->status = 'delivered';
                                    $wo->current_stage = 'delivered';
                                    $wo->invoice_id = $invoice->id;
                                    $wo->save();
                                }
                            }
                        }
                    }

                    // Deduct from Product inventory
                    if ($product) {
                        $product->decrement('current_stock_qty', $line['quantity']);

                        // Remove sold tags from product attributes tags array
                        $attrs = is_array($product->attributes)
                            ? $product->attributes
                            : (json_decode($product->attributes ?? '[]', true) ?: []);

                        $currentTags = is_array($attrs['tags'] ?? null) ? $attrs['tags'] : [];
                        if (!empty($soldTagsForThisLine) && !empty($currentTags)) {
                            $attrs['tags'] = array_values(array_diff($currentTags, $soldTagsForThisLine));
                            $attrs['no_of_pieces'] = (string) max(0, (int)($product->current_stock_qty));
                            $product->attributes = $attrs;
                            $product->save();
                        }

                        $notes = "Sold on {$invoice->invoice_no}";
                        if (!empty($soldTagsForThisLine)) {
                            $notes .= " (Tags: " . implode(', ', $soldTagsForThisLine) . ")";
                        }

                        InventoryMovement::create([
                            'product_id' => $product->id,
                            'invoice_id' => $invoice->id,
                            'movement_type' => 'sale',
                            'quantity' => -$line['quantity'],
                            'weight' => -((float) ($item['gross_weight'] ?? $item['gross_wt'] ?? 0) * $line['quantity']),
                            'unit_cost' => $line['unitCost'],
                            'notes' => $notes,
                            'created_by' => $userId,
                        ]);
                    }
                }
            }

            // Record initial payment if finalized and paid
            if (!$isDraft && $paid > 0) {
                SalePayment::create([
                    'invoice_id' => $invoice->id,
                    'amount' => $paid,
                    'payment_method' => $data['payment_method'] ?? $data['payment_mode'] ?? 'cash',
                    'reference' => $data['payment_reference'] ?? null,
                    'paid_at' => now(),
                    'received_by' => $userId,
                ]);
            }

            // Update client total purchases if finalized
            if (!$isDraft && $client) {
                $client->increment('total_purchases', $total);
                $client->update(['last_visit' => now()]);
            }

            return $invoice->load(['itemsRelation', 'payments', 'client', 'oldGoldItems', 'receivedPieces.workOrder', 'receivedPieces.karigar']);
        });
    }

    /**
     * Finalize an existing Draft invoice
     */
    public function finalize(Invoice $invoice, ?int $userId = null): Invoice
    {
        if ($invoice->sale_status === 'completed') {
            return $invoice->load(['itemsRelation', 'payments', 'client', 'oldGoldItems', 'receivedPieces.workOrder', 'receivedPieces.karigar']);
        }

        return DB::transaction(function () use ($invoice, $userId) {
            $invoice = Invoice::whereKey($invoice->id)->lockForUpdate()->firstOrFail();
            $items = $invoice->items ?: [];

            // 1. Gather all physical pieces from items
            $pieceIds = [];
            $tagNumbers = [];
            foreach ($items as $item) {
                $pIds = $item['piece_ids'] ?? ($item['details']['piece_ids'] ?? []);
                if (is_array($pIds)) {
                    foreach ($pIds as $id) if ($id) $pieceIds[] = (int) $id;
                }
                if (!empty($item['piece_id'])) $pieceIds[] = (int) $item['piece_id'];

                $tags = $item['tag_numbers'] ?? ($item['details']['tag_numbers'] ?? []);
                if (is_array($tags)) {
                    foreach ($tags as $t) if ($t) $tagNumbers[] = trim($t);
                }
                if (!empty($item['tag_number'])) $tagNumbers[] = trim($item['tag_number']);
            }

            $pieceIds = array_values(array_unique($pieceIds));
            $tagNumbers = array_values(array_unique($tagNumbers));

            // 2. Lock and verify pieces availability
            $lockedPieces = collect();
            if (!empty($pieceIds) || !empty($tagNumbers)) {
                $lockedPieces = WorkOrderReceivedPiece::where(function ($q) use ($pieceIds, $tagNumbers) {
                    if (!empty($pieceIds)) $q->whereIn('id', $pieceIds);
                    if (!empty($tagNumbers)) $q->orWhereIn('tag_number', $tagNumbers);
                })->lockForUpdate()->get();

                foreach ($lockedPieces as $piece) {
                    if ($piece->status === 'sold' && $piece->invoice_id != $invoice->id) {
                        throw ValidationException::withMessages([
                            'items' => "Tag '{$piece->tag_number}' has already been sold on another invoice."
                        ]);
                    }
                    if (empty($piece->received_at)) {
                        throw ValidationException::withMessages([
                            'items' => "Physical piece with Tag '{$piece->tag_number}' has not been physically received yet."
                        ]);
                    }
                    if (!$piece->is_inventory_posted && !$piece->isEligibleForInventory() && $piece->status !== 'in_stock') {
                        throw ValidationException::withMessages([
                            'items' => "Physical piece with Tag '{$piece->tag_number}' has not completed required downstream inspection/inventory stages."
                        ]);
                    }
                }
            }

            // 3. Mark pieces as sold
            foreach ($lockedPieces as $piece) {
                $piece->status = 'sold';
                $piece->invoice_id = $invoice->id;
                $piece->client_id = $invoice->client_id;
                $piece->save();

                // Check work order delivery
                if (!empty($piece->work_order_id)) {
                    $wo = WorkOrder::find($piece->work_order_id);
                    if ($wo) {
                        $totalPieces = $wo->receivedPieces()->count();
                        $soldCount = $wo->receivedPieces()->where('status', 'sold')->count();
                        $reqQty = max((int)$wo->required_qty, (int)$wo->received_qty, $totalPieces);
                        if ($reqQty > 0 && $soldCount >= $reqQty && (int)$wo->received_qty >= $reqQty) {
                            $wo->status = 'delivered';
                            $wo->current_stage = 'delivered';
                            $wo->invoice_id = $invoice->id;
                            $wo->save();
                        }
                    }
                }
            }

            // 4. Deduct inventory and record stock movements
            foreach ($invoice->itemsRelation as $saleItem) {
                $product = $saleItem->product_id ? Product::whereKey($saleItem->product_id)->lockForUpdate()->first() : null;
                if ($product) {
                    $product->decrement('current_stock_qty', $saleItem->quantity);

                    $soldTags = $lockedPieces->where('product_id', $product->id)->pluck('tag_number')->filter()->all();
                    $notes = "Sold on {$invoice->invoice_no}";
                    if (!empty($soldTags)) {
                        $notes .= " (Tags: " . implode(', ', $soldTags) . ")";
                    }

                    InventoryMovement::create([
                        'product_id' => $product->id,
                        'invoice_id' => $invoice->id,
                        'movement_type' => 'sale',
                        'quantity' => -$saleItem->quantity,
                        'weight' => -((float) $saleItem->gross_weight * (float) $saleItem->quantity),
                        'unit_cost' => $saleItem->cost_amount,
                        'notes' => $notes,
                        'created_by' => $userId,
                    ]);
                }
            }

            // 5. Update invoice state
            $invoice->sale_status = 'completed';
            $invoice->status = $invoice->due_amount <= 0 ? 'paid' : ($invoice->paid_amount > 0 ? 'partial' : 'pending');
            $invoice->save();

            if ($invoice->client_id) {
                $client = Client::find($invoice->client_id);
                if ($client) {
                    $client->increment('total_purchases', $invoice->total_amount);
                    $client->update(['last_visit' => now()]);
                }
            }

            return $invoice->load(['itemsRelation', 'payments', 'client', 'receivedPieces.workOrder', 'receivedPieces.karigar']);
        });
    }

    public function recordPayment(Invoice $invoice, array $data, ?int $userId = null): Invoice
    {
        return DB::transaction(function () use ($invoice, $data, $userId) {
            $invoice = Invoice::whereKey($invoice->id)->lockForUpdate()->firstOrFail();
            $amount = (float) $data['amount'];
            $due = max(0, round((float) $invoice->total_amount - (float) $invoice->paid_amount - (float) ($invoice->old_gold_amount ?? 0), 2));
            if ($amount <= 0 || $amount > round($due + 0.01, 2)) {
                throw ValidationException::withMessages(['amount' => 'Payment must be greater than zero and cannot exceed the outstanding balance.']);
            }
            SalePayment::create([
                'invoice_id' => $invoice->id,
                'amount' => $amount,
                'payment_method' => $data['payment_method'],
                'reference' => $data['reference'] ?? null,
                'paid_at' => $data['paid_at'] ?? now(),
                'received_by' => $userId
            ]);

            $totalPaid = (float) $invoice->payments()->sum('amount');
            $invoice->paid_amount = $totalPaid;
            $invoice->due_amount = max(0, round((float) $invoice->total_amount - $totalPaid - (float) ($invoice->old_gold_amount ?? 0), 2));
            $invoice->status = $invoice->due_amount <= 0 ? 'paid' : ($totalPaid > 0 ? 'partial' : 'pending');
            $invoice->payment_method = $data['payment_method'];
            $invoice->save();
            return $invoice->load(['payments.receiver', 'client', 'itemsRelation']);
        });
    }

    public function updatePayment(SalePayment $payment, array $data, ?int $userId = null): Invoice
    {
        return DB::transaction(function () use ($payment, $data, $userId) {
            $invoice = Invoice::whereKey($payment->invoice_id)->lockForUpdate()->firstOrFail();
            $newAmount = isset($data['amount']) ? (float) $data['amount'] : (float) $payment->amount;
            if ($newAmount <= 0) {
                throw ValidationException::withMessages(['amount' => 'Payment amount must be greater than zero.']);
            }

            $otherPaymentsSum = (float) $invoice->payments()->where('id', '!=', $payment->id)->sum('amount');
            $maxAllowed = max(0, round((float) $invoice->total_amount - (float) ($invoice->old_gold_amount ?? 0) - $otherPaymentsSum, 2));

            if ($newAmount > round($maxAllowed + 0.01, 2)) {
                throw ValidationException::withMessages([
                    'amount' => "Payment amount (" . number_format($newAmount, 2) . ") exceeds the invoice balance limit. Maximum allowed is " . number_format($maxAllowed, 2)
                ]);
            }

            $payment->update([
                'amount' => $newAmount,
                'payment_method' => $data['payment_method'] ?? $payment->payment_method,
                'reference' => array_key_exists('reference', $data) ? $data['reference'] : $payment->reference,
                'paid_at' => $data['paid_at'] ?? $payment->paid_at,
            ]);

            $totalPaid = (float) $invoice->payments()->sum('amount');
            $invoice->paid_amount = $totalPaid;
            $invoice->due_amount = max(0, round((float) $invoice->total_amount - $totalPaid - (float) ($invoice->old_gold_amount ?? 0), 2));
            $invoice->status = $invoice->due_amount <= 0 ? 'paid' : ($totalPaid > 0 ? 'partial' : 'pending');
            $invoice->save();

            return $invoice->load(['payments.receiver', 'client', 'itemsRelation']);
        });
    }

    public function deletePayment(SalePayment $payment, ?int $userId = null): Invoice
    {
        return DB::transaction(function () use ($payment, $userId) {
            $invoice = Invoice::whereKey($payment->invoice_id)->lockForUpdate()->firstOrFail();
            $payment->delete();

            $totalPaid = (float) $invoice->payments()->sum('amount');
            $invoice->paid_amount = $totalPaid;
            $invoice->due_amount = max(0, round((float) $invoice->total_amount - $totalPaid - (float) ($invoice->old_gold_amount ?? 0), 2));
            $invoice->status = $invoice->due_amount <= 0 ? 'paid' : ($totalPaid > 0 ? 'partial' : 'pending');
            $invoice->save();

            return $invoice->load(['payments.receiver', 'client', 'itemsRelation']);
        });
    }

    private function nextInvoiceNumber(): string
    {
        $year = now()->format('Y');
        $latest = Invoice::where('invoice_no', 'like', "INV-{$year}-%")->orderBy('id', 'desc')->first();
        $next = 1;
        if ($latest && preg_match("/INV-{$year}-(\d+)/", $latest->invoice_no, $matches)) {
            $next = ((int) $matches[1]) + 1;
        } else {
            $next = ((int) Invoice::max('id')) + 1;
        }

        do {
            $number = "INV-{$year}-" . str_pad((string) $next++, 5, '0', STR_PAD_LEFT);
        } while (Invoice::where('invoice_no', $number)->exists());

        return $number;
    }

    /**
     * Cancel an invoice, restoring physical piece statuses, returning stock,
     * recording inventory movements, and resetting work order delivery status.
     */
    public function cancel(Invoice $invoice, ?string $reason = null, ?int $userId = null): Invoice
    {
        return DB::transaction(function () use ($invoice, $reason, $userId) {
            $invoice = Invoice::whereKey($invoice->id)->lockForUpdate()->firstOrFail();
            if (in_array($invoice->sale_status, ['cancelled', 'void', 'returned'])) {
                return $invoice->load(['itemsRelation', 'payments', 'client', 'receivedPieces']);
            }

            $wasFinalized = $invoice->sale_status !== 'draft';

            // 1. Find all physical pieces associated with this invoice and restore their availability
            $pieces = WorkOrderReceivedPiece::where('invoice_id', $invoice->id)->lockForUpdate()->get();
            foreach ($pieces as $piece) {
                $piece->status = 'in_stock';
                $piece->invoice_id = null;
                $piece->client_id = null;
                $piece->save();

                // Check if parent work order was marked delivered because of this invoice
                if ($piece->work_order_id) {
                    $wo = WorkOrder::find($piece->work_order_id);
                    if ($wo && $wo->status === 'delivered' && $wo->invoice_id == $invoice->id) {
                        $wo->status = 'completed';
                        $wo->current_stage = 'completed';
                        $wo->invoice_id = null;
                        $wo->save();
                    }
                }
            }

            // 2. If it was finalized, restore inventory stock and record inventory movement
            if ($wasFinalized) {
                foreach ($invoice->itemsRelation as $saleItem) {
                    if ($saleItem->product_id) {
                        $product = Product::whereKey($saleItem->product_id)->lockForUpdate()->first();
                        if ($product) {
                            $product->increment('current_stock_qty', $saleItem->quantity);

                            // Restore tags in product attributes
                            $attrs = is_array($product->attributes) ? $product->attributes : (json_decode($product->attributes ?? '[]', true) ?: []);
                            $tagsToAdd = [];
                            if (!empty($saleItem->details['tag_numbers'])) {
                                $tagsToAdd = (array) $saleItem->details['tag_numbers'];
                            } elseif (!empty($saleItem->details['tag_number'])) {
                                $tagsToAdd = [$saleItem->details['tag_number']];
                            }
                            if (!empty($tagsToAdd)) {
                                $existingTags = is_array($attrs['tags'] ?? null) ? $attrs['tags'] : [];
                                $attrs['tags'] = array_values(array_unique(array_merge($existingTags, $tagsToAdd)));
                                $attrs['no_of_pieces'] = (string) max(0, (int)$product->current_stock_qty);
                                $product->attributes = $attrs;
                                $product->save();
                            }

                            InventoryMovement::create([
                                'product_id' => $product->id,
                                'invoice_id' => $invoice->id,
                                'movement_type' => 'sales_return',
                                'quantity' => $saleItem->quantity,
                                'weight' => ((float) $saleItem->gross_weight * (float) $saleItem->quantity),
                                'unit_cost' => $saleItem->cost_amount,
                                'notes' => "Invoice {$invoice->invoice_no} cancelled: " . ($reason ?: 'Sale cancelled and stock restored'),
                                'created_by' => $userId,
                            ]);
                        }
                    }
                }

                // Reverse client total purchases
                if ($invoice->client_id) {
                    $client = Client::find($invoice->client_id);
                    if ($client) {
                        $client->total_purchases = max(0, (float)($client->total_purchases ?: 0) - (float)$invoice->total_amount);
                        $client->save();
                    }
                }
            }

            $invoice->sale_status = 'cancelled';
            $invoice->status = 'cancelled';
            if ($reason) {
                $invoice->notes = trim(($invoice->notes ? $invoice->notes . "\n" : '') . "Cancellation reason: {$reason}");
            }
            $invoice->save();

            return $invoice->load(['itemsRelation', 'payments', 'client', 'oldGoldItems', 'receivedPieces']);
        });
    }

    /**
     * Retrieve eligible unsold physical pieces available for retail sale.
     */
    public function getAvailablePieces(?string $search = null, ?string $design = null, ?string $category = null)
    {
        $search = trim((string) ($search ?? ''));
        $design = trim((string) ($design ?? ''));
        $category = trim((string) ($category ?? ''));

        $query = WorkOrderReceivedPiece::where(function ($q) {
                $q->whereHas('workOrder')->orWhereNotNull('product_id');
            })
            ->with([
                'workOrder:id,work_order_number,status,current_stage,job_order_id,karigar_id,customer_name',
                'karigar:id,name,karigar_code',
                'product:id,name,product_code,design_no,category_id,opening_stock_weight',
                'product.category:id,name,code',
                'product.subcategory:id,name,code',
            ])
            ->whereNotNull('tag_number')
            ->where('tag_number', '!=', '')
            ->whereNotNull('received_at')
            ->where(function ($q) {
                $q->where('is_inventory_posted', true)
                  ->orWhere('status', 'in_stock')
                  ->orWhere(function ($sub) {
                      $sub->whereIn('certification_status', ['completed', 'skipped', 'not_required'])
                          ->whereIn('hallmarking_status', ['completed', 'skipped', 'not_required']);
                  });
            })
            ->where(function ($q) {
                $q->whereNull('status')->orWhereNotIn('status', ['sold', 'on_approval']);
            })
            ->whereNull('invoice_id');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('tag_number', 'like', "%{$search}%")
                  ->orWhere('design_no', 'like', "%{$search}%")
                  ->orWhere('product_name', 'like', "%{$search}%")
                  ->orWhere('huid', 'like', "%{$search}%")
                  ->orWhere('receive_order_number', 'like', "%{$search}%")
                  ->orWhereHas('product', function ($pq) use ($search) {
                      $pq->where('product_code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('workOrder', function ($wq) use ($search) {
                      $wq->where('work_order_number', 'like', "%{$search}%");
                  })
                  ->orWhereHas('karigar', function ($kq) use ($search) {
                      $kq->where('name', 'like', "%{$search}%")
                         ->orWhere('karigar_code', 'like', "%{$search}%");
                  });
            });
        }

        if ($design !== '') {
            $query->where('design_no', $design);
        }

        if ($category !== '' && strtolower($category) !== 'all') {
            $query->whereHas('product.category', function ($cq) use ($category) {
                $cq->where('name', 'like', "%{$category}%");
            });
        }

        return $query->latest('received_at')->get();
    }
}
