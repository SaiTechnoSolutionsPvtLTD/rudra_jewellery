<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseEntry;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PurchaseEntryController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = PurchaseEntry::with(['supplier', 'product.category', 'product.subcategory']);

            if ($request->has('supplier_id') && !empty($request->supplier_id)) {
                $query->where('supplier_id', $request->supplier_id);
            }

            if ($request->has('product_id') && !empty($request->product_id)) {
                $query->where('product_id', $request->product_id);
            }

            $entries = $query->orderBy('id', 'desc')->get();
            return response()->json($entries);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error fetching purchase entries: ' . $e->getMessage()], 500);
        }
    }

    public function generateNo()
    {
        $latest = PurchaseEntry::orderBy('id', 'desc')->first();
        $nextNum = $latest ? ($latest->id + 1001) : 1001;
        $purchaseNo = 'PUR-' . $nextNum;

        while (PurchaseEntry::where('purchase_no', $purchaseNo)->exists()) {
            $nextNum++;
            $purchaseNo = 'PUR-' . $nextNum;
        }

        return response()->json(['purchase_no' => $purchaseNo]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'purchase_no' => 'nullable|string|max:50',
            'supplier_id' => 'required|exists:suppliers,id',
            'product_id' => 'required|exists:products,id',
            'qty' => 'nullable|numeric|min:0',
            'weight' => 'required|numeric|min:0.001',
            'touch' => 'nullable|numeric|min:0|max:100',
            'fine_weight' => 'nullable|numeric|min:0',
            'rate' => 'nullable|numeric|min:0',
            'total_amount' => 'nullable|numeric|min:0',
            'purchase_date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        try {
            return DB::transaction(function () use ($validated, $request) {
                // Generate purchase number if missing
                if (empty($validated['purchase_no'])) {
                    $latest = PurchaseEntry::orderBy('id', 'desc')->first();
                    $nextNum = $latest ? ($latest->id + 1001) : 1001;
                    $purchaseNo = 'PUR-' . $nextNum;
                    while (PurchaseEntry::where('purchase_no', $purchaseNo)->exists()) {
                        $nextNum++;
                        $purchaseNo = 'PUR-' . $nextNum;
                    }
                    $validated['purchase_no'] = $purchaseNo;
                }

                $weight = floatval($validated['weight'] ?? 0);
                $touch = floatval($validated['touch'] ?? 100);
                $fineWeight = isset($validated['fine_weight']) && $validated['fine_weight'] !== null
                    ? floatval($validated['fine_weight'])
                    : ($weight * ($touch / 100));
                
                $rate = floatval($validated['rate'] ?? 0);
                $qty = intval($validated['qty'] ?? 1);

                if (isset($validated['total_amount']) && $validated['total_amount'] !== null && floatval($validated['total_amount']) > 0) {
                    $totalAmount = floatval($validated['total_amount']);
                } else {
                    $totalAmount = ($weight > 0 && $rate > 0) ? ($weight * $rate) : ($qty * $rate);
                }

                $validated['qty'] = $qty > 0 ? $qty : 1;
                $validated['weight'] = $weight;
                $validated['touch'] = $touch;
                $validated['fine_weight'] = round($fineWeight, 3);
                $validated['rate'] = $rate;
                $validated['total_amount'] = round($totalAmount, 2);

                // 1. Create Purchase Entry record
                $purchaseEntry = PurchaseEntry::create($validated);

                // 2. Update Product Stock Weight (Grams) in database so it reflects in Stock Management immediately
                $product = Product::findOrFail($validated['product_id']);
                
                // Accumulate purchased weight in grams on product stock
                $currentWeight = floatval($product->opening_stock_weight ?? 0);
                $product->opening_stock_weight = round($currentWeight + $weight, 3);
                $product->current_stock_qty = intval($product->current_stock_qty ?? 0) + $validated['qty'];

                if ($touch > 0) {
                    $product->opening_touch = $touch;
                }
                if ($fineWeight > 0) {
                    $currentFineWeight = floatval($product->opening_fine_weight ?? 0);
                    $product->opening_fine_weight = round($currentFineWeight + $fineWeight, 3);
                }
                if ($rate > 0) {
                    $product->opening_stock_rate = $rate;
                }
                if (!empty($validated['purchase_date'])) {
                    $product->opening_stock_date = $validated['purchase_date'];
                }

                $product->save();

                $purchaseEntry->load(['supplier', 'product.category', 'product.subcategory']);

                return response()->json([
                    'status' => 'success',
                    'message' => 'Purchase entry created successfully and stock updated in Stock Management!',
                    'purchase_entry' => $purchaseEntry,
                    'updated_product' => $product
                ], 201);
            });
        } catch (\Exception $e) {
            return response()->json(['message' => 'Failed to save purchase entry: ' . $e->getMessage()], 500);
        }
    }

    public function show($id)
    {
        $entry = PurchaseEntry::with(['supplier', 'product.category', 'product.subcategory'])->find($id);
        if (!$entry) {
            return response()->json(['message' => 'Purchase entry not found'], 404);
        }
        return response()->json($entry);
    }

    public function destroy($id)
    {
        try {
            $entry = PurchaseEntry::find($id);
            if (!$entry) {
                return response()->json(['message' => 'Purchase entry not found'], 404);
            }

            // Reverse stock weight update on product
            $product = Product::find($entry->product_id);
            if ($product) {
                $currentWeight = floatval($product->opening_stock_weight ?? 0);
                $product->opening_stock_weight = max(0, round($currentWeight - floatval($entry->weight), 3));
                
                $currentFineWt = floatval($product->opening_fine_weight ?? 0);
                $product->opening_fine_weight = max(0, round($currentFineWt - floatval($entry->fine_weight), 3));

                $newQty = max(0, intval($product->current_stock_qty ?? 0) - intval($entry->qty));
                $product->current_stock_qty = $newQty;
                $product->save();
            }

            $entry->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Purchase entry deleted and product stock reversed successfully.'
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error deleting purchase entry: ' . $e->getMessage()], 500);
        }
    }
}
