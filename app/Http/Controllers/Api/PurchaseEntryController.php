<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseEntry;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseEntryController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = PurchaseEntry::with(['supplier', 'category', 'product.category', 'product.subcategory']);

            if ($request->has('supplier_id') && !empty($request->supplier_id)) {
                $query->where('supplier_id', $request->supplier_id);
            }

            if ($request->has('product_id') && !empty($request->product_id)) {
                $query->where('product_id', $request->product_id);
            }

            if ($request->has('purchase_type') && !empty($request->purchase_type)) {
                $query->where('purchase_type', $request->purchase_type);
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
            'product_id' => 'nullable|exists:products,id',
            'category_id' => 'nullable|exists:categories,id',
            'is_new_product' => 'nullable|boolean',
            'purchase_type' => 'nullable|string|in:raw_material,finished_product',
            'metal_type' => 'nullable|string|max:50',
            'purity' => 'nullable|string|max:50',
            'item_name' => 'nullable|string|max:255',
            'product_code' => 'nullable|string|max:100',
            'qty' => 'nullable|numeric|min:0',
            'weight' => 'required|numeric|min:0.001',
            'less_weight' => 'nullable|numeric|min:0',
            'net_weight' => 'nullable|numeric|min:0',
            'touch' => 'nullable|numeric|min:0|max:100',
            'fine_weight' => 'nullable|numeric|min:0',
            'stone_weight' => 'nullable|numeric|min:0',
            'rate' => 'nullable|numeric|min:0',
            'making_charge' => 'nullable|numeric|min:0',
            'stone_cost' => 'nullable|numeric|min:0',
            'total_amount' => 'nullable|numeric|min:0',
            'purchase_date' => 'required|date',
            'notes' => 'nullable|string',
            'image' => 'nullable',
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

                // Handle Image File Upload or URL string
                $imagePath = null;
                if ($request->hasFile('image')) {
                    $imagePath = $request->file('image')->store('products/images', 'public');
                } elseif (!empty($validated['image']) && is_string($validated['image'])) {
                    $imagePath = $validated['image'];
                }
                $validated['image'] = $imagePath;

                $purchaseType = $validated['purchase_type'] ?? (!empty($validated['product_id']) ? 'finished_product' : 'raw_material');
                $validated['purchase_type'] = $purchaseType;

                $weight = floatval($validated['weight'] ?? 0);
                $lessWeight = floatval($validated['less_weight'] ?? 0);
                $netWeight = isset($validated['net_weight']) && floatval($validated['net_weight']) > 0
                    ? floatval($validated['net_weight'])
                    : max(0, $weight - $lessWeight);
                
                $touch = floatval($validated['touch'] ?? 100);
                $fineWeight = isset($validated['fine_weight']) && floatval($validated['fine_weight']) > 0
                    ? floatval($validated['fine_weight'])
                    : ($netWeight * ($touch / 100));

                $rate = floatval($validated['rate'] ?? 0);
                $qty = intval($validated['qty'] ?? 1);
                $qty = $qty > 0 ? $qty : 1;

                if (isset($validated['total_amount']) && floatval($validated['total_amount']) > 0) {
                    $totalAmount = floatval($validated['total_amount']);
                } else {
                    $totalAmount = ($netWeight > 0 && $rate > 0) ? ($netWeight * $rate) : ($qty * $rate);
                }

                $validated['qty'] = $qty;
                $validated['weight'] = $weight;
                $validated['less_weight'] = round($lessWeight, 3);
                $validated['net_weight'] = round($netWeight, 3);
                $validated['touch'] = $touch;
                $validated['fine_weight'] = round($fineWeight, 3);
                $validated['rate'] = $rate;
                $validated['total_amount'] = round($totalAmount, 2);

                $product = null;
                $isNewProduct = !empty($request->input('is_new_product')) || ($purchaseType === 'finished_product' && empty($validated['product_id']));

                if ($purchaseType === 'finished_product') {
                    if ($isNewProduct) {
                        // Create a NEW Finished Jewellery Product directly from Purchase Entry!
                        $itemName = !empty($validated['item_name']) ? $validated['item_name'] : 'Purchased Jewellery ' . date('dM-Y');
                        $productCode = !empty($validated['product_code']) ? strtoupper(trim($validated['product_code'])) : 'RJ-PUR-' . strtoupper(Str::random(6));

                        // Ensure SKU uniqueness
                        $uniqueCode = $productCode;
                        $counter = 1;
                        while (Product::where('product_code', $uniqueCode)->exists()) {
                            $uniqueCode = $productCode . '-' . $counter;
                            $counter++;
                        }

                        $product = Product::create([
                            'name' => $itemName,
                            'product_code' => $uniqueCode,
                            'category_id' => $validated['category_id'] ?? null,
                            'opening_stock_qty' => $qty,
                            'current_stock_qty' => $qty,
                            'opening_stock_weight' => round($netWeight > 0 ? $netWeight : $weight, 3),
                            'opening_touch' => $touch,
                            'opening_fine_weight' => round($fineWeight, 3),
                            'opening_stock_rate' => $rate,
                            'opening_stock_date' => $validated['purchase_date'],
                            'image' => $imagePath,
                            'status' => 'active',
                            'attributes' => [
                                'purity' => $validated['purity'] ?? null,
                                'metal_type' => $validated['metal_type'] ?? 'gold',
                                'gross_weight' => $weight,
                                'less_weight' => $lessWeight,
                                'net_weight' => $netWeight,
                                'making_charge' => floatval($validated['making_charge'] ?? 0),
                                'stone_weight' => floatval($validated['stone_weight'] ?? 0),
                                'stone_cost' => floatval($validated['stone_cost'] ?? 0),
                                'purchase_rate' => $rate,
                                'supplier_id' => $validated['supplier_id'],
                            ]
                        ]);

                        $validated['product_id'] = $product->id;
                    } elseif (!empty($validated['product_id'])) {
                        // Update existing product in finished stock
                        $product = Product::findOrFail($validated['product_id']);
                        $currentWeight = floatval($product->opening_stock_weight ?? 0);
                        $addWeight = $netWeight > 0 ? $netWeight : $weight;
                        $product->opening_stock_weight = round($currentWeight + $addWeight, 3);
                        $product->current_stock_qty = intval($product->current_stock_qty ?? 0) + $qty;

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
                        if ($imagePath && empty($product->image)) {
                            $product->image = $imagePath;
                        }
                        $product->save();
                    }

                    if ($product) {
                        // Log Inventory Movement for finished product purchase
                        \App\Models\InventoryMovement::create([
                            'product_id' => $product->id,
                            'movement_type' => 'purchase',
                            'quantity' => $qty,
                            'weight' => $netWeight > 0 ? $netWeight : $weight,
                            'unit_cost' => $rate,
                            'notes' => "Finished product purchase entry {$validated['purchase_no']}",
                            'created_by' => auth()->id() ?? null,
                        ]);
                    }
                } else {
                    // Update Raw Material Vault Inventory for raw material purchase
                    $matType = strtolower($validated['metal_type'] ?? 'gold');
                    $creditWeight = $netWeight > 0 ? $netWeight : $weight;
                    \App\Models\RawMaterial::creditPurchase($matType, $creditWeight);
                }

                // Create Purchase Entry record
                $purchaseEntry = PurchaseEntry::create($validated);
                $purchaseEntry->load(['supplier', 'category', 'product.category', 'product.subcategory']);

                return response()->json([
                    'status' => 'success',
                    'message' => 'Purchase entry recorded & inventory updated successfully!',
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
        $entry = PurchaseEntry::with(['supplier', 'category', 'product.category', 'product.subcategory'])->find($id);
        if (!$entry) {
            return response()->json(['message' => 'Purchase entry not found'], 404);
        }
        return response()->json($entry);
    }

    public function destroy($id)
    {
        try {
            return DB::transaction(function () use ($id) {
                $entry = PurchaseEntry::find($id);
                if (!$entry) {
                    return response()->json(['message' => 'Purchase entry not found'], 404);
                }

                if ($entry->purchase_type === 'finished_product' && $entry->product_id) {
                    $product = Product::find($entry->product_id);
                    if ($product) {
                        $deductWeight = floatval($entry->net_weight) > 0 ? floatval($entry->net_weight) : floatval($entry->weight);
                        $currentWeight = floatval($product->opening_stock_weight ?? 0);
                        $product->opening_stock_weight = max(0, round($currentWeight - $deductWeight, 3));
                        
                        $currentFineWt = floatval($product->opening_fine_weight ?? 0);
                        $product->opening_fine_weight = max(0, round($currentFineWt - floatval($entry->fine_weight), 3));

                        $newQty = max(0, intval($product->current_stock_qty ?? 0) - intval($entry->qty));
                        $product->current_stock_qty = $newQty;
                        $product->save();
                    }
                } else {
                    $matType = strtolower($entry->metal_type ?? 'gold');
                    $deductWeight = floatval($entry->net_weight) > 0 ? floatval($entry->net_weight) : floatval($entry->weight);
                    $rawMat = \App\Models\RawMaterial::where('material_type', $matType)->first();
                    if ($rawMat) {
                        $rawMat->purchased_weight = max(0, round($rawMat->purchased_weight - $deductWeight, 3));
                        $rawMat->current_balance = max(0, round($rawMat->purchased_weight - $rawMat->allocated_weight, 3));
                        $rawMat->save();
                    }
                }

                $entry->delete();

                return response()->json([
                    'status' => 'success',
                    'message' => 'Purchase entry deleted and inventory reversed successfully.'
                ]);
            });
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error deleting purchase entry: ' . $e->getMessage()], 500);
        }
    }
}
