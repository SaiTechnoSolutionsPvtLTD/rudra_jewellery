<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use App\Models\Subcategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        try {
            if (Schema::hasTable('products')) {
                $query = Product::with(['category', 'subcategory']);

                // Filter to inventory-added products only
                $query->where(function ($q) {
                    $q->where('attributes->source', 'inventory')
                      ->orWhereNotNull('attributes->gross_wt')
                      ->orWhereNotNull('attributes->is_inventory');
                });

                if ($request->has('category_id') && !empty($request->category_id)) {
                    $query->where('category_id', $request->category_id);
                }

                if ($request->has('subcategory_id') && !empty($request->subcategory_id)) {
                    $query->where('subcategory_id', $request->subcategory_id);
                }

                $products = $query->orderBy('id', 'desc')->get();
                return response()->json($products);
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json([]);
    }

    public function generateSku(Request $request)
    {
        $prefix = 'PRD';
        if ($request->has('category_id') && !empty($request->category_id)) {
            $cat = Category::find($request->category_id);
            if ($cat) {
                $prefix .= '-' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $cat->code), 0, 4));
            }
        }
        if ($request->has('subcategory_id') && !empty($request->subcategory_id)) {
            $sub = Subcategory::find($request->subcategory_id);
            if ($sub) {
                $prefix .= '-' . strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $sub->code), 0, 4));
            }
        }

        $latestProduct = Product::orderBy('id', 'desc')->first();
        $nextId = $latestProduct ? ($latestProduct->id + 1) : 1;
        $sku = $prefix . '-' . str_pad($nextId, 4, '0', STR_PAD_LEFT);

        while (Product::where('product_code', $sku)->exists()) {
            $nextId++;
            $sku = $prefix . '-' . str_pad($nextId, 4, '0', STR_PAD_LEFT);
        }

        return response()->json(['product_code' => $sku]);
    }

    public function store(Request $request)
    {
        // Handle attributes if sent as JSON string in FormData
        $rawAttributes = $request->input('attributes');
        if (is_string($rawAttributes)) {
            $decoded = json_decode($rawAttributes, true);
            $request->merge(['attributes' => is_array($decoded) ? $decoded : []]);
        } elseif (is_null($rawAttributes)) {
            $request->merge(['attributes' => []]);
        }

        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'subcategory_id' => 'nullable|exists:subcategories,id',
            'name' => 'required|string|max:255',
            'product_code' => 'required|string|max:50',
            'attributes' => 'nullable|array',
            'description' => 'nullable|string',
            'opening_stock_qty' => 'nullable|numeric|min:0',
            'opening_stock_weight' => 'nullable|numeric|min:0',
            'opening_touch' => 'nullable|numeric|min:0|max:100',
            'opening_fine_weight' => 'nullable|numeric|min:0',
            'opening_stock_rate' => 'nullable|numeric|min:0',
            'opening_stock_date' => 'nullable|date',
            'current_stock_qty' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,inactive',
            'image' => 'nullable',
            'thumbnail' => 'nullable',
        ]);

        $validated['product_code'] = strtoupper(trim($validated['product_code']));

        // Handle Main Image file upload
        if ($request->hasFile('image')) {
            $path = $request->file('image')->store('products/images', 'public');
            $validated['image'] = $path;
        }

        // Handle Thumbnail Image file upload
        if ($request->hasFile('thumbnail')) {
            $path = $request->file('thumbnail')->store('products/thumbnails', 'public');
            $validated['thumbnail'] = $path;
        }

        try {
            if (Schema::hasTable('products')) {
                $existing = Product::where('product_code', $validated['product_code'])->first();
                if ($existing) {
                    return response()->json(['message' => 'Product code/SKU already exists.'], 422);
                }

                $product = Product::create($validated);
                $product->load(['category', 'subcategory']);

                return response()->json([
                    'status' => 'success',
                    'message' => 'Product created successfully',
                    'product' => $product
                ], 201);
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json(['message' => 'Database error'], 500);
    }

    public function show(Request $request, $id)
    {
        try {
            if (Schema::hasTable('products')) {
                $product = Product::with(['category', 'subcategory'])->find($id);
                if ($product) {
                    return response()->json($product);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json(['message' => 'Product not found'], 404);
    }

    public function update(Request $request, $id)
    {
        // Handle attributes if sent as JSON string in FormData
        $rawAttributes = $request->input('attributes');
        if (is_string($rawAttributes)) {
            $decoded = json_decode($rawAttributes, true);
            $request->merge(['attributes' => is_array($decoded) ? $decoded : []]);
        } elseif (is_null($rawAttributes)) {
            $request->merge(['attributes' => []]);
        }

        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'subcategory_id' => 'nullable|exists:subcategories,id',
            'name' => 'required|string|max:255',
            'product_code' => 'required|string|max:50',
            'attributes' => 'nullable|array',
            'description' => 'nullable|string',
            'opening_stock_qty' => 'nullable|numeric|min:0',
            'opening_stock_weight' => 'nullable|numeric|min:0',
            'opening_touch' => 'nullable|numeric|min:0|max:100',
            'opening_fine_weight' => 'nullable|numeric|min:0',
            'opening_stock_rate' => 'nullable|numeric|min:0',
            'opening_stock_date' => 'nullable|date',
            'current_stock_qty' => 'nullable|numeric|min:0',
            'status' => 'required|in:active,inactive',
            'image' => 'nullable',
            'thumbnail' => 'nullable',
        ]);

        $validated['product_code'] = strtoupper(trim($validated['product_code']));

        try {
            if (Schema::hasTable('products')) {
                $product = Product::find($id);
                if ($product) {
                    $existing = Product::where('product_code', $validated['product_code'])
                        ->where('id', '!=', $id)
                        ->first();
                    if ($existing) {
                        return response()->json(['message' => 'Product code/SKU already exists.'], 422);
                    }

                    // Handle Main Image file upload
                    if ($request->hasFile('image')) {
                        if ($product->image && Storage::disk('public')->exists($product->image)) {
                            Storage::disk('public')->delete($product->image);
                        }
                        $validated['image'] = $request->file('image')->store('products/images', 'public');
                    }

                    // Handle Thumbnail file upload
                    if ($request->hasFile('thumbnail')) {
                        if ($product->thumbnail && Storage::disk('public')->exists($product->thumbnail)) {
                            Storage::disk('public')->delete($product->thumbnail);
                        }
                        $validated['thumbnail'] = $request->file('thumbnail')->store('products/thumbnails', 'public');
                    }

                    $product->update($validated);
                    $product->load(['category', 'subcategory']);

                    return response()->json([
                        'status' => 'success',
                        'message' => 'Product updated successfully',
                        'product' => $product
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json(['message' => 'Product not found'], 404);
    }

    public function destroy(Request $request, $id)
    {
        try {
            if (Schema::hasTable('products')) {
                $product = Product::find($id);
                if ($product) {
                    if ($product->image && Storage::disk('public')->exists($product->image)) {
                        Storage::disk('public')->delete($product->image);
                    }
                    if ($product->thumbnail && Storage::disk('public')->exists($product->thumbnail)) {
                        Storage::disk('public')->delete($product->thumbnail);
                    }
                    $product->delete();
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Product deleted successfully'
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json(['message' => 'Product not found'], 404);
    }

    public function updateOpeningStock(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $validated = $request->validate([
            'opening_stock_qty' => 'nullable|numeric|min:0',
            'opening_stock_weight' => 'nullable|numeric|min:0',
            'opening_touch' => 'nullable|numeric|min:0|max:100',
            'opening_fine_weight' => 'nullable|numeric|min:0',
            'opening_stock_rate' => 'nullable|numeric|min:0',
            'opening_stock_date' => 'nullable|date',
            'current_stock_qty' => 'nullable|numeric|min:0',
        ]);

        $product->opening_stock_qty = isset($validated['opening_stock_qty']) ? $validated['opening_stock_qty'] : ($product->opening_stock_qty ?? 0);
        $product->opening_stock_weight = isset($validated['opening_stock_weight']) ? $validated['opening_stock_weight'] : ($product->opening_stock_weight ?? 0);
        $product->opening_touch = isset($validated['opening_touch']) && $validated['opening_touch'] !== null ? $validated['opening_touch'] : ($product->opening_touch ?? 100);
        
        if (isset($validated['opening_fine_weight']) && $validated['opening_fine_weight'] !== null) {
            $product->opening_fine_weight = $validated['opening_fine_weight'];
        } else {
            $product->opening_fine_weight = floatval($product->opening_stock_weight) * (floatval($product->opening_touch) / 100);
        }

        $product->opening_stock_rate = isset($validated['opening_stock_rate']) ? $validated['opening_stock_rate'] : ($product->opening_stock_rate ?? 0);
        $product->opening_stock_date = isset($validated['opening_stock_date']) ? $validated['opening_stock_date'] : ($product->opening_stock_date ?? date('Y-m-d'));

        if (array_key_exists('current_stock_qty', $validated) && $validated['current_stock_qty'] !== null && intval($validated['current_stock_qty']) > 0) {
            $product->current_stock_qty = $validated['current_stock_qty'];
        } else {
            $product->current_stock_qty = $product->opening_stock_qty;
        }

        $product->save();
        $product->load(['category', 'subcategory']);

        return response()->json([
            'status' => 'success',
            'message' => 'Opening stock updated successfully for ' . $product->name,
            'product' => $product
        ]);
    }

    public function bulkUpdateOpeningStock(Request $request)
    {
        $validated = $request->validate([
            'items' => 'required|array',
            'items.*.id' => 'required|exists:products,id',
            'items.*.opening_stock_qty' => 'nullable|numeric|min:0',
            'items.*.opening_stock_weight' => 'nullable|numeric|min:0',
            'items.*.opening_touch' => 'nullable|numeric|min:0|max:100',
            'items.*.opening_fine_weight' => 'nullable|numeric|min:0',
            'items.*.opening_stock_rate' => 'nullable|numeric|min:0',
            'items.*.opening_stock_date' => 'nullable|date',
            'items.*.current_stock_qty' => 'nullable|numeric|min:0',
        ]);

        $updatedCount = 0;
        foreach ($validated['items'] as $itemData) {
            $product = Product::find($itemData['id']);
            if ($product) {
                if (array_key_exists('opening_stock_qty', $itemData) && $itemData['opening_stock_qty'] !== null) {
                    $product->opening_stock_qty = $itemData['opening_stock_qty'];
                }
                if (array_key_exists('opening_stock_weight', $itemData) && $itemData['opening_stock_weight'] !== null) {
                    $product->opening_stock_weight = $itemData['opening_stock_weight'];
                }
                if (array_key_exists('opening_touch', $itemData) && $itemData['opening_touch'] !== null) {
                    $product->opening_touch = $itemData['opening_touch'];
                }
                if (array_key_exists('opening_fine_weight', $itemData) && $itemData['opening_fine_weight'] !== null) {
                    $product->opening_fine_weight = $itemData['opening_fine_weight'];
                } else {
                    $product->opening_fine_weight = floatval($product->opening_stock_weight) * (floatval($product->opening_touch ?? 100) / 100);
                }
                if (array_key_exists('opening_stock_rate', $itemData) && $itemData['opening_stock_rate'] !== null) {
                    $product->opening_stock_rate = $itemData['opening_stock_rate'];
                }
                if (array_key_exists('opening_stock_date', $itemData) && $itemData['opening_stock_date'] !== null) {
                    $product->opening_stock_date = $itemData['opening_stock_date'];
                }
                
                if (array_key_exists('current_stock_qty', $itemData) && $itemData['current_stock_qty'] !== null && intval($itemData['current_stock_qty']) > 0) {
                    $product->current_stock_qty = $itemData['current_stock_qty'];
                } else {
                    $product->current_stock_qty = $product->opening_stock_qty;
                }
                
                $product->save();
                $updatedCount++;
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => "Opening stock updated successfully for {$updatedCount} products.",
            'updated_count' => $updatedCount
        ]);
    }
}
