<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    /**
     * Display a listing of the suppliers.
     */
    public function index(Request $request)
    {
        $hasFilters = $request->filled('search') ||
            ($request->filled('supplier_type') && $request->input('supplier_type') !== 'all') ||
            ($request->filled('status') && $request->input('status') !== 'all');

        if (!$hasFilters) {
            $suppliers = Cache::remember('masters_suppliers_all', 300, function () {
                return Supplier::orderBy('id', 'desc')->get();
            });

            return response()->json([
                'status' => 'success',
                'data' => $suppliers
            ]);
        }

        $query = Supplier::query();

        // Search filter
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('supplier_code', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('gstin', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        // Supplier type filter
        if ($request->filled('supplier_type') && $request->input('supplier_type') !== 'all') {
            $query->where('supplier_type', $request->input('supplier_type'));
        }

        // Status filter
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        $suppliers = $query->orderBy('id', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $suppliers
        ]);
    }

    /**
     * Store a newly created supplier in storage.
     */
    public function store(Request $request)
    {
        $sanitizePhone = function ($val) {
            if (!$val) return $val;
            $digits = preg_replace('/\D/', '', (string)$val);
            if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
                $digits = substr($digits, 2);
            } elseif (strlen($digits) === 11 && str_starts_with($digits, '0')) {
                $digits = substr($digits, 1);
            }
            return strlen($digits) === 10 ? $digits : $val;
        };

        if ($request->has('phone')) {
            $request->merge(['phone' => $sanitizePhone($request->phone)]);
        }

        $validated = $request->validate([
            'supplier_code' => 'required|string|max:50|unique:suppliers,supplier_code',
            'name' => ['required', 'string', 'max:255', 'regex:/^[\p{L}\s.\'-]+$/u'],
            'company_name' => 'nullable|string|max:255',
            'supplier_type' => 'required|string|max:50',
            'phone' => ['nullable', 'string', 'regex:/^[6-9]\d{9}$/'],
            'email' => 'nullable|email|max:255',
            'gstin' => ['nullable', 'string', 'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i'],
            'pan_number' => ['nullable', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => ['nullable', 'string', 'regex:/^[1-9][0-9]{5}$/'],
            'bank_name' => 'nullable|string|max:100',
            'account_number' => ['nullable', 'string', 'regex:/^\d{9,18}$/'],
            'ifsc_code' => ['nullable', 'string', 'regex:/^[A-Z]{4}0[A-Z0-9]{6}$/i'],
            'branch' => 'nullable|string|max:100',
            'status' => 'required|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        $validated['supplier_code'] = strtoupper(trim($validated['supplier_code']));
        if (!empty($validated['gstin'])) {
            $validated['gstin'] = strtoupper(trim($validated['gstin']));
        }
        if (!empty($validated['pan_number'])) {
            $validated['pan_number'] = strtoupper(trim($validated['pan_number']));
        }
        if (!empty($validated['email'])) {
            $validated['email'] = strtolower(trim($validated['email']));
        }

        $supplier = Supplier::create($validated);
        Cache::forget('masters_suppliers_all');

        return response()->json([
            'status' => 'success',
            'message' => 'Supplier registered successfully!',
            'data' => $supplier
        ], 201);
    }

    /**
     * Display the specified supplier.
     */
    public function show($id)
    {
        $supplier = Supplier::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $supplier
        ]);
    }

    /**
     * Update the specified supplier in storage.
     */
    public function update(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);

        if ($request->has('phone')) {
            $request->merge(['phone' => $sanitizePhone($request->phone)]);
        }

        $validated = $request->validate([
            'supplier_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('suppliers', 'supplier_code')->ignore($supplier->id),
            ],
            'name' => ['required', 'string', 'max:255', 'regex:/^[\p{L}\s.\'-]+$/u'],
            'company_name' => 'nullable|string|max:255',
            'supplier_type' => 'required|string|max:50',
            'phone' => ['nullable', 'string', 'regex:/^[6-9]\d{9}$/'],
            'email' => 'nullable|email|max:255',
            'gstin' => ['nullable', 'string', 'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i'],
            'pan_number' => ['nullable', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => ['nullable', 'string', 'regex:/^[1-9][0-9]{5}$/'],
            'bank_name' => 'nullable|string|max:100',
            'account_number' => ['nullable', 'string', 'regex:/^\d{9,18}$/'],
            'ifsc_code' => ['nullable', 'string', 'regex:/^[A-Z]{4}0[A-Z0-9]{6}$/i'],
            'branch' => 'nullable|string|max:100',
            'status' => 'required|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        $validated['supplier_code'] = strtoupper(trim($validated['supplier_code']));
        if (!empty($validated['gstin'])) {
            $validated['gstin'] = strtoupper(trim($validated['gstin']));
        }
        if (!empty($validated['pan_number'])) {
            $validated['pan_number'] = strtoupper(trim($validated['pan_number']));
        }
        if (!empty($validated['email'])) {
            $validated['email'] = strtolower(trim($validated['email']));
        }

        $supplier->update($validated);
        Cache::forget('masters_suppliers_all');

        return response()->json([
            'status' => 'success',
            'message' => 'Supplier details updated successfully!',
            'data' => $supplier
        ]);
    }

    /**
     * Remove the specified supplier from storage.
     */
    public function destroy($id)
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->delete();
        Cache::forget('masters_suppliers_all');

        return response()->json([
            'status' => 'success',
            'message' => 'Supplier removed successfully.'
        ]);
    }

    /**
     * Get detailed ledger for a specific supplier.
     * Displays purchase history, settlements, and distinct monetary vs 24K pure-gold payables.
     */
    public function ledger(Request $request, $id)
    {
        try {
            $supplier = Supplier::findOrFail($id);

            $purchases = \App\Models\PurchaseEntry::where('supplier_id', $supplier->id)
                ->with(['product', 'category', 'rawMaterial'])
                ->orderBy('purchase_date', 'desc')
                ->orderBy('id', 'desc')
                ->get();

            $settlements = \App\Models\SupplierSettlement::where('supplier_id', $supplier->id)
                ->with(['purchaseEntry', 'creator'])
                ->orderBy('settlement_date', 'desc')
                ->orderBy('id', 'desc')
                ->get();

            // Calculate distinct payables & advances (negative = we owe supplier; positive = supplier holds advance / extra)
            $rawCash = (float) $supplier->current_balance;
            $rawGold = (float) $supplier->gold_balance_grams;
            $rawSilver = (float) $supplier->silver_balance_grams;

            $outstandingMoney = $rawCash < 0 ? abs($rawCash) : 0.0;
            $advanceMoney = $rawCash > 0 ? $rawCash : 0.0;

            $outstandingGold24k = $rawGold < 0 ? abs($rawGold) : 0.0;
            $advanceGold24k = $rawGold > 0 ? $rawGold : 0.0;

            $outstandingSilver = $rawSilver < 0 ? abs($rawSilver) : 0.0;
            $advanceSilver = $rawSilver > 0 ? $rawSilver : 0.0;

            // Summary aggregates
            $totalPricedPurchases = $purchases->where('rate', '>', 0);
            $totalUnpricedPurchases = $purchases->where('rate', '<=', 0);

            $totalMonetarySpend = round((float) $totalPricedPurchases->sum('total_amount'), 2);
            $totalCashPaid = round((float) $totalPricedPurchases->sum('paid_amount'), 2);

            $totalGoldPurchasedWeight = round((float) $purchases->whereIn('metal_type', ['gold', null])->sum('weight'), 3);
            $totalGoldPurchased24k = round((float) $purchases->whereIn('metal_type', ['gold', null])->sum('fine_weight'), 3);

            $totalGoldSettled24k = round((float) $settlements->where('settlement_type', 'gold')->sum('fine_weight'), 3);
            $totalCashSettled = round((float) $settlements->where('settlement_type', 'cash')->sum('amount'), 2);

            $formattedPurchases = $purchases->map(function ($p) use ($supplier) {
                $isUnpriced = (float)($p->rate ?? 0) <= 0;
                $fine24k = round((float)($p->fine_weight ?? 0), 3);
                $totalAmt = round((float)($p->total_amount ?? 0), 2);
                $paidAmt = round((float)($p->paid_amount ?? 0), 2);
                $balanceAmt = max(0, round($totalAmt - $paidAmt, 2));

                $paymentStatus = strtolower($p->payment_status ?? '');
                if (!$isUnpriced) {
                    if ($balanceAmt <= 0 && $totalAmt > 0) {
                        $paymentStatus = 'paid';
                    } elseif ($paidAmt > 0 && $balanceAmt > 0) {
                        $paymentStatus = 'partial';
                    } elseif (empty($paymentStatus)) {
                        $paymentStatus = 'unpaid';
                    }
                } else {
                    $paymentStatus = 'unpriced';
                }

                return [
                    'id' => $p->id,
                    'purchase_no' => $p->purchase_no,
                    'purchase_date' => $p->purchase_date?->format('Y-m-d') ?? (string)$p->purchase_date,
                    'purchase_type' => $p->purchase_type,
                    'metal_type' => $p->metal_type ?? 'gold',
                    'item_name' => $p->product?->name ?? $p->rawMaterial?->name ?? $p->item_name ?? 'Gold Purchase',
                    'weight' => round((float)$p->weight, 3),
                    'less_weight' => round((float)$p->less_weight, 3),
                    'net_weight' => round((float)$p->net_weight, 3),
                    'purity' => $p->purity ?: ($p->touch ? "{$p->touch}%" : '22K'),
                    'touch' => (float)$p->touch,
                    'fine_weight' => $fine24k,
                    'fine_weight_24k' => $fine24k,
                    'rate' => (float)$p->rate,
                    'total_amount' => $totalAmt,
                    'paid_amount' => $paidAmt,
                    'balance_amount' => $balanceAmt,
                    'payment_status' => $paymentStatus,
                    'credit_days' => intval($p->credit_days ?? 0),
                    'is_unpriced' => $isUnpriced,
                    'payable_type' => $isUnpriced ? 'gold' : 'monetary',
                    'stamp' => $p->stamp ?: ($p->diamond_stamp ?: $p->gold_stamp),
                    'components' => $p->components ?: [],
                    'count_qty' => (float)$p->count_qty,
                    'unit' => $p->unit ?: 'g',
                    'due_date' => $p->due_date?->format('Y-m-d') ?? (string)$p->due_date,
                    'notes' => $p->notes,
                    'supplier' => $p->supplier ?? $supplier,
                ];
            });

            $responsePayload = [
                'status' => 'success',
                'supplier' => $supplier,
                'outstanding' => [
                    'money' => $outstandingMoney,
                    'money_formatted' => '₹' . number_format($outstandingMoney, 2),
                    'advance_money' => $advanceMoney,
                    'advance_money_formatted' => '₹' . number_format($advanceMoney, 2),
                    'has_advance_money' => $advanceMoney > 0,
                    'gold_24k_grams' => $outstandingGold24k,
                    'gold_24k_grams_formatted' => number_format($outstandingGold24k, 3) . ' g',
                    'advance_gold_24k' => $advanceGold24k,
                    'advance_gold_24k_formatted' => number_format($advanceGold24k, 3) . ' g',
                    'has_advance_gold' => $advanceGold24k > 0,
                    'silver_grams' => $outstandingSilver,
                    'raw_cash_balance' => $rawCash,
                    'raw_gold_balance' => $rawGold,
                ],
                'summary' => [
                    'total_purchases_count' => $purchases->count(),
                    'priced_purchases_count' => $totalPricedPurchases->count(),
                    'unpriced_purchases_count' => $totalUnpricedPurchases->count(),
                    'total_monetary_spend' => $totalMonetarySpend,
                    'total_cash_paid' => $totalCashPaid,
                    'outstanding_cash_owed' => $outstandingMoney,
                    'advance_cash_held' => $advanceMoney,
                    'current_balance' => (float)$supplier->current_balance,
                    'total_gold_purchased_weight' => $totalGoldPurchasedWeight,
                    'total_gold_purchased_24k' => $totalGoldPurchased24k,
                    'total_gold_settled_24k' => $totalGoldSettled24k,
                    'outstanding_gold_owed_24k' => $outstandingGold24k,
                    'advance_gold_held_24k' => $advanceGold24k,
                ],
                'purchases' => $formattedPurchases,
                'settlements' => $settlements,
            ];
            $responsePayload['data'] = $responsePayload;

            return response()->json($responsePayload);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error fetching supplier ledger: ' . $e->getMessage());
            return response()->json(['message' => 'Unable to fetch supplier ledger (500). Please try again later.'], 500);
        }
    }

    /**
     * Settle monetary payables or gold-quantity payables to a supplier.
     */
    public function settle(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);

        $validated = $request->validate([
            'settlement_type' => 'required|string|in:cash,gold,silver',
            'amount' => 'nullable|numeric|min:0.01',
            'weight' => 'nullable|numeric|min:0.001',
            'purity' => 'nullable|string|max:50',
            'touch' => 'nullable|numeric|min:0|max:100',
            'fine_weight' => 'nullable|numeric|min:0',
            'payment_mode' => 'nullable|string|max:50',
            'reference_no' => 'nullable|string|max:100',
            'settlement_date' => 'required|date',
            'notes' => 'nullable|string',
            'purchase_entry_id' => 'nullable|exists:purchase_entries,id',
            'deduct_vault_inventory' => 'nullable|boolean',
            'apply_to_cash' => 'nullable|boolean',
            'rate_per_gram' => 'nullable|numeric|min:0',
        ]);

        try {
            return \Illuminate\Support\Facades\DB::transaction(function () use ($supplier, $validated, $request) {
                $type = $validated['settlement_type'];
                $settlementDate = $validated['settlement_date'];
                $notes = $validated['notes'] ?? null;
                $paymentMode = $validated['payment_mode'] ?? ($type === 'cash' ? 'cash' : 'physical_metal');
                $referenceNo = $validated['reference_no'] ?? null;
                $purchaseEntryId = $validated['purchase_entry_id'] ?? null;

                if ($type === 'cash') {
                    $amount = round(floatval($validated['amount'] ?? 0), 2);
                    if ($amount <= 0) {
                        return response()->json(['message' => 'Payment amount must be greater than zero.'], 422);
                    }

                    // Credit supplier cash balance (increases current_balance, reducing payable owed)
                    $supplier->current_balance = round((float) $supplier->current_balance + $amount, 2);
                    $supplier->save();

                    // If linked to a specific purchase entry, update its paid_amount
                    if ($purchaseEntryId) {
                        $entry = \App\Models\PurchaseEntry::find($purchaseEntryId);
                        if ($entry) {
                            $totalAmt = floatval($entry->total_amount ?? 0);
                            $oldPaid = floatval($entry->paid_amount ?? 0);
                            $newPaid = round(min($totalAmt, $oldPaid + $amount), 2);
                            $entry->paid_amount = $newPaid;
                            $entry->payment_status = $newPaid >= $totalAmt ? 'paid' : 'partial';
                            $entry->save();
                        }
                    } else {
                        // Auto-allocate cash against oldest unpaid/partial priced purchases
                        $unpaidEntries = \App\Models\PurchaseEntry::where('supplier_id', $supplier->id)
                            ->where('rate', '>', 0)
                            ->where('payment_status', '!=', 'paid')
                            ->orderBy('purchase_date', 'asc')
                            ->orderBy('id', 'asc')
                            ->get();

                        $rem = $amount;
                        foreach ($unpaidEntries as $pe) {
                            if ($rem <= 0) break;
                            $due = max(0, floatval($pe->total_amount) - floatval($pe->paid_amount));
                            $alloc = min($due, $rem);
                            $pe->paid_amount = round(floatval($pe->paid_amount) + $alloc, 2);
                            $pe->payment_status = $pe->paid_amount >= floatval($pe->total_amount) ? 'paid' : 'partial';
                            $pe->save();
                            $rem = round($rem - $alloc, 2);
                        }
                    }

                    $settlement = \App\Models\SupplierSettlement::create([
                        'supplier_id' => $supplier->id,
                        'purchase_entry_id' => $purchaseEntryId,
                        'settlement_type' => 'cash',
                        'amount' => $amount,
                        'payment_mode' => $paymentMode,
                        'reference_no' => $referenceNo,
                        'settlement_date' => $settlementDate,
                        'notes' => $notes ?: "Cash settlement of ₹" . number_format($amount, 2),
                        'created_by' => auth()->id() ?? null,
                    ]);

                    \Illuminate\Support\Facades\Cache::forget('masters_suppliers_all');

                    return response()->json([
                        'status' => 'success',
                        'message' => "Successfully recorded cash payment of ₹" . number_format($amount, 2) . " to {$supplier->name}.",
                        'settlement' => $settlement,
                        'supplier' => $supplier,
                    ], 201);
                } else {
                    // Metal Settlement (Gold or Silver)
                    $weight = round(floatval($validated['weight'] ?? 0), 3);
                    if ($weight <= 0) {
                        return response()->json(['message' => 'Settlement metal weight must be greater than zero.'], 422);
                    }

                    $touch = isset($validated['touch']) && floatval($validated['touch']) > 0
                        ? floatval($validated['touch'])
                        : ($type === 'gold' ? 100.0 : 99.9);
                    $purity = $validated['purity'] ?? ($type === 'gold' ? '24K' : '999');

                    // Compute 24K equivalent weight settled
                    $fineWeight = isset($validated['fine_weight']) && floatval($validated['fine_weight']) > 0
                        ? floatval($validated['fine_weight'])
                        : \App\Helpers\GoldConversionHelper::convertTo24kPureWeight($weight, $purity, $touch);

                    $applyToCash = $request->boolean('apply_to_cash', false);
                    $ratePerGram = floatval($request->input('rate_per_gram', 0));
                    $cashEquivalent = ($applyToCash && $ratePerGram > 0) ? round($fineWeight * $ratePerGram, 2) : 0;

                    if ($applyToCash && $cashEquivalent > 0) {
                        // Offset cash liability (credit supplier's cash balance)
                        $supplier->current_balance = round((float) $supplier->current_balance + $cashEquivalent, 2);
                        $supplier->save();

                        // Allocate against linked purchase or oldest unpaid priced purchases
                        if ($purchaseEntryId) {
                            $entry = \App\Models\PurchaseEntry::find($purchaseEntryId);
                            if ($entry && floatval($entry->rate ?? 0) > 0) {
                                $totalAmt = floatval($entry->total_amount ?? 0);
                                $oldPaid = floatval($entry->paid_amount ?? 0);
                                $newPaid = round(min($totalAmt, $oldPaid + $cashEquivalent), 2);
                                $entry->paid_amount = $newPaid;
                                $entry->payment_status = $newPaid >= $totalAmt ? 'paid' : 'partial';
                                $entry->save();
                            }
                        } else {
                            $unpaidEntries = \App\Models\PurchaseEntry::where('supplier_id', $supplier->id)
                                ->where('rate', '>', 0)
                                ->where('payment_status', '!=', 'paid')
                                ->orderBy('purchase_date', 'asc')
                                ->orderBy('id', 'asc')
                                ->get();

                            $rem = $cashEquivalent;
                            foreach ($unpaidEntries as $pe) {
                                if ($rem <= 0) break;
                                $due = max(0, floatval($pe->total_amount) - floatval($pe->paid_amount));
                                $alloc = min($due, $rem);
                                $pe->paid_amount = round(floatval($pe->paid_amount) + $alloc, 2);
                                $pe->payment_status = $pe->paid_amount >= floatval($pe->total_amount) ? 'paid' : 'partial';
                                $pe->save();
                                $rem = round($rem - $alloc, 2);
                            }
                        }
                    } else {
                        // Credit supplier metal balance (increases metal balance, reducing gold owed)
                        if ($type === 'gold') {
                            $supplier->gold_balance_grams = round((float) $supplier->gold_balance_grams + $fineWeight, 3);
                        } else {
                            $supplier->silver_balance_grams = round((float) $supplier->silver_balance_grams + $fineWeight, 3);
                        }
                        $supplier->save();
                    }

                    // Vault inventory debit: physical gold delivered to supplier
                    $deductVault = $request->boolean('deduct_vault_inventory', true);
                    if ($deductVault) {
                        $rawMat = \App\Models\RawMaterial::where('material_type', $type)->lockForUpdate()->first();
                        if ($rawMat) {
                            $rawMat->allocated_weight = round(($rawMat->allocated_weight ?? 0) + $fineWeight, 3);
                            $rawMat->current_balance = max(0, round(($rawMat->opening_weight ?? 0) + $rawMat->purchased_weight - $rawMat->allocated_weight, 3));
                            $rawMat->save();

                            \App\Models\InventoryMovement::create([
                                'raw_material_id' => $rawMat->id,
                                'movement_type' => 'supplier_settlement',
                                'quantity' => 1,
                                'weight' => $fineWeight,
                                'unit_cost' => $ratePerGram > 0 ? $ratePerGram : 0,
                                'notes' => "24K pure {$type} settlement to supplier {$supplier->name} ({$fineWeight}g pure metal" . ($applyToCash ? " applied to cash debt @ ₹{$ratePerGram}/g" : "") . ")",
                                'created_by' => auth()->id() ?? null,
                            ]);
                        }
                    }

                    $settlement = \App\Models\SupplierSettlement::create([
                        'supplier_id' => $supplier->id,
                        'purchase_entry_id' => $purchaseEntryId,
                        'settlement_type' => $applyToCash ? 'gold_for_cash' : $type,
                        'amount' => $applyToCash ? $cashEquivalent : 0,
                        'weight' => $weight,
                        'purity' => $purity,
                        'touch' => $touch,
                        'fine_weight' => $fineWeight,
                        'payment_mode' => $paymentMode,
                        'reference_no' => $referenceNo,
                        'settlement_date' => $settlementDate,
                        'notes' => $notes ?: ($applyToCash
                            ? "Delivered {$fineWeight}g pure {$type} @ ₹" . number_format($ratePerGram, 2) . "/g to offset ₹" . number_format($cashEquivalent, 2) . " cash payable"
                            : "Settlement of {$fineWeight}g 24K pure {$type} (Physical wt: {$weight}g)"),
                        'created_by' => auth()->id() ?? null,
                    ]);

                    \Illuminate\Support\Facades\Cache::forget('masters_suppliers_all');

                    $msg = $applyToCash
                        ? "Successfully settled ₹" . number_format($cashEquivalent, 2) . " cash debt by delivering {$fineWeight}g 24K pure {$type} to {$supplier->name}."
                        : "Successfully recorded {$fineWeight}g 24K pure {$type} settlement to {$supplier->name}.";

                    return response()->json([
                        'status' => 'success',
                        'message' => $msg,
                        'settlement' => $settlement,
                        'supplier' => $supplier,
                    ], 201);
                }
            });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error recording supplier settlement: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to record supplier settlement (500). Please try again later.'], 500);
        }
    }

    /**
     * Manually edit or adjust a supplier's balance due (Money and/or 24K Pure Gold).
     * Synchronizes supplier balances and records audit settlement.
     */
    public function adjustBalance(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);

        $validated = $request->validate([
            'current_balance' => 'required|numeric',
            'gold_balance_grams' => 'required|numeric',
            'silver_balance_grams' => 'nullable|numeric',
            'reason' => 'nullable|string|max:500',
        ]);

        try {
            return \Illuminate\Support\Facades\DB::transaction(function () use ($supplier, $validated) {
                $prevMoney = (float) $supplier->current_balance;
                $prevGold = (float) $supplier->gold_balance_grams;
                $newMoney = round((float) $validated['current_balance'], 2);
                $newGold = round((float) $validated['gold_balance_grams'], 3);
                $newSilver = isset($validated['silver_balance_grams']) ? round((float) $validated['silver_balance_grams'], 3) : (float) $supplier->silver_balance_grams;
                $reason = $validated['reason'] ?? 'Manual balance adjustment';

                $supplier->current_balance = $newMoney;
                $supplier->gold_balance_grams = $newGold;
                $supplier->silver_balance_grams = $newSilver;
                $supplier->save();

                $moneyDiff = round(abs($newMoney - $prevMoney), 2);
                $goldDiff = round(abs($newGold - $prevGold), 3);

                \App\Models\SupplierSettlement::create([
                    'supplier_id' => $supplier->id,
                    'settlement_type' => 'balance_adjustment',
                    'amount' => $moneyDiff,
                    'fine_weight' => $goldDiff,
                    'settlement_date' => now()->toDateString(),
                    'notes' => "Balance manually adjusted. Cash: " . ($prevMoney < 0 ? "Owes ₹" . abs($prevMoney) : "Adv ₹" . $prevMoney) . " -> " . ($newMoney < 0 ? "Owes ₹" . abs($newMoney) : "Adv ₹" . $newMoney) . "; 24K Gold: " . ($prevGold < 0 ? "Owes " . abs($prevGold) . "g" : "Adv " . $prevGold . "g") . " -> " . ($newGold < 0 ? "Owes " . abs($newGold) . "g" : "Adv " . $newGold . "g") . ". Reason: {$reason}",
                    'created_by' => auth()->id() ?? null,
                ]);

                \Illuminate\Support\Facades\Cache::forget('masters_suppliers_all');

                return response()->json([
                    'status' => 'success',
                    'message' => "Supplier {$supplier->name} balances updated successfully.",
                    'supplier' => $supplier->fresh(),
                ]);
            });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error adjusting supplier balance: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to adjust supplier balance: ' . $e->getMessage()], 500);
        }
    }
}
