<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use App\Models\Subcategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        try {
            if (Schema::hasTable('products')) {
                $query = Product::with(['category', 'subcategory']);

                // Optionally filter by source if explicitly requested
                if ($request->has('inventory_only') && $request->inventory_only === 'true') {
                    $query->where(function ($q) {
                        $q->where('attributes->source', 'inventory')
                          ->orWhereNotNull('attributes->gross_wt')
                          ->orWhereNotNull('attributes->is_inventory');
                    });
                }

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

    public function lookupDesign(Request $request)
    {
        $designNo = trim($request->input('design_number', $request->input('design_no', '')));
        if (empty($designNo)) {
            return response()->json(['found' => false]);
        }

        // Build query on products table
        $prodQuery = Product::with(['category', 'subcategory']);
        if ($request->filled('category_id')) {
            $prodQuery->where('category_id', $request->input('category_id'));
        }
        if ($request->filled('subcategory_id')) {
            $prodQuery->where('subcategory_id', $request->input('subcategory_id'));
        }

        $isSqlite = DB::connection()->getDriverName() === 'sqlite';
        $jsonExtractSql = $isSqlite
            ? 'LOWER(json_extract(attributes, "$.design_no")) = ?'
            : 'LOWER(JSON_UNQUOTE(JSON_EXTRACT(attributes, "$.design_no"))) = ?';

        $matchingProducts = (clone $prodQuery)->where(function ($q) use ($designNo, $jsonExtractSql) {
            $q->whereRaw('LOWER(product_code) = ?', [strtolower($designNo)])
              ->orWhereRaw('LOWER(design_no) = ?', [strtolower($designNo)])
              ->orWhere('attributes->design_no', $designNo)
              ->orWhereRaw($jsonExtractSql, [strtolower($designNo)]);
        })->get();

        // Disambiguate if design number matches across multiple categories without category filter
        if ($matchingProducts->count() > 1 && !$request->filled('category_id')) {
            $distinctCatCount = $matchingProducts->pluck('category_id')->unique()->count();
            if ($distinctCatCount > 1) {
                return response()->json([
                    'found' => false,
                    'ambiguous' => true,
                    'message' => "Design number '{$designNo}' exists in multiple categories. Please specify the category context.",
                    'matches' => $matchingProducts->map(fn($p) => [
                        'product_id' => $p->id,
                        'name' => $p->name,
                        'category_id' => $p->category_id,
                        'category_name' => $p->category?->name,
                    ]),
                ], 422);
            }
        }

        $product = $matchingProducts->first();
        if (!$product && !$request->filled('category_id')) {
            $product = Product::with(['category', 'subcategory'])
                ->whereRaw('LOWER(product_code) = ?', [strtolower($designNo)])
                ->orWhereRaw('LOWER(design_no) = ?', [strtolower($designNo)])
                ->orWhere('attributes->design_no', $designNo)
                ->orWhereRaw($jsonExtractSql, [strtolower($designNo)])
                ->first();
        }

        if ($product) {
            $attrs = is_array($product->attributes) 
                ? $product->attributes 
                : (is_string($product->attributes) ? json_decode($product->attributes, true) : []);

            // Extract component details (diamonds, stones, etc.)
            $components = $attrs['components'] ?? [];
            $diaWt = $attrs['dia_wt_ct'] ?? $attrs['diamond_wt'] ?? $attrs['diamond_weight'] ?? null;
            $diaCount = $attrs['diamond_count'] ?? $attrs['dia_count'] ?? $attrs['no_of_diamonds'] ?? null;
            $diaStamp = $attrs['diamond_stamp'] ?? null;
            $colorStoneWt = $attrs['stone_weight'] ?? $attrs['color_stone_weight'] ?? null;
            $colorStoneCount = $attrs['stone_count'] ?? $attrs['color_stone_count'] ?? $attrs['no_of_colour_stones'] ?? null;
            $colorStoneStamp = $attrs['color_stone_stamp'] ?? null;

            $diamondComponents = [];
            $stoneComponents = [];
            $totalCalculatedDiaWt = 0.0;
            $totalCalculatedDiaCount = 0;

            if (is_array($components)) {
                foreach ($components as $c) {
                    $catName = strtolower($c['category_name'] ?? $c['item_name'] ?? $c['component_type'] ?? '');
                    $isMetal = !empty($c['is_metal']) || !empty($c['is_primary']) || in_array(strtolower($c['material_type'] ?? ''), ['gold', 'silver', 'platinum', 'metal']);
                    
                    $isDia = !$isMetal && (
                        !empty($c['is_diamond']) ||
                        strtolower($c['component_type'] ?? '') === 'diamond' ||
                        (
                            (str_contains($catName, 'diamond') || preg_match('/\bdia\b/', $catName)) &&
                            !str_contains($catName, 'diamond cut') &&
                            !str_contains($catName, 'diamond-cut') &&
                            !str_contains($catName, 'ring') &&
                            !str_contains($catName, 'bangle') &&
                            !str_contains($catName, 'necklace') &&
                            !str_contains($catName, 'chain') &&
                            !str_contains($catName, 'earring') &&
                            !str_contains($catName, 'pendant') &&
                            !str_contains($catName, 'choker')
                        )
                    );
                    $isStn = !$isMetal && !$isDia && (!empty($c['is_stone']) || str_contains($catName, 'stone') || str_contains($catName, 'ruby') || str_contains($catName, 'emerald') || str_contains($catName, 'sapphire') || str_contains($catName, 'colour') || str_contains($catName, 'color'));

                    $unit = strtolower($c['unit'] ?? '');
                    $isCarat = in_array($unit, ['ct', 'carat', 'carats']);

                    if ($isDia) {
                        $cWt = isset($c['stone_weight']) && (float)$c['stone_weight'] > 0
                            ? (float)$c['stone_weight']
                            : ($isCarat ? (float)($c['gross_wt'] ?? $c['weight'] ?? 0) : (float)($c['diamond_weight'] ?? 0));
                        $cPcs = (int)($c['no_of_pieces'] ?? $c['quantity'] ?? $c['pieces'] ?? $c['count'] ?? 1);
                        $cRate = isset($c['purchase_rate']) ? (float)$c['purchase_rate'] : 0.0;
                        $cVal = isset($c['purchase_value']) ? (float)$c['purchase_value'] : ($cRate > 0 ? $cWt * $cRate : 0.0);

                        if ($cWt > 0) {
                            $diamondComponents[] = [
                                'stamp' => $c['stamp'] ?? $c['size'] ?? '',
                                'count' => $cPcs,
                                'diamond_count' => $cPcs,
                                'weight' => $cWt,
                                'diamond_weight' => $cWt,
                                'rate' => $cRate,
                                'purchase_rate' => $cRate,
                                'value' => $cVal,
                                'purchase_value' => $cVal,
                                'item_name' => $c['item_name'] ?? $c['category_name'] ?? 'Diamond',
                            ];
                            $totalCalculatedDiaWt += $cWt;
                            $totalCalculatedDiaCount += $cPcs;
                            if ($diaStamp === null && !empty($c['stamp'])) $diaStamp = $c['stamp'];
                        }
                    } elseif ($isStn) {
                        $cWt = isset($c['stone_weight']) && (float)$c['stone_weight'] > 0
                            ? (float)$c['stone_weight']
                            : ($isCarat ? (float)($c['gross_wt'] ?? $c['weight'] ?? 0) : (float)($c['weight'] ?? 0));
                        $cPcs = (int)($c['no_of_pieces'] ?? $c['quantity'] ?? $c['pieces'] ?? $c['count'] ?? 1);
                        $cRate = isset($c['purchase_rate']) ? (float)$c['purchase_rate'] : 0.0;
                        $cVal = isset($c['purchase_value']) ? (float)$c['purchase_value'] : ($cRate > 0 ? $cWt * $cRate : 0.0);

                        if ($cWt > 0) {
                            $stoneComponents[] = [
                                'stamp' => $c['stamp'] ?? $c['size'] ?? '',
                                'count' => $cPcs,
                                'weight' => $cWt,
                                'rate' => $cRate,
                                'value' => $cVal,
                                'item_name' => $c['item_name'] ?? $c['category_name'] ?? 'Stone',
                            ];
                            if ($colorStoneWt === null) $colorStoneWt = $cWt;
                            if ($colorStoneCount === null) $colorStoneCount = $cPcs;
                            if ($colorStoneStamp === null && !empty($c['stamp'])) $colorStoneStamp = $c['stamp'];
                        }
                    }
                }
            }

            if ($totalCalculatedDiaWt > 0) {
                $diaWt = $totalCalculatedDiaWt;
            } elseif (empty($diamondComponents)) {
                // If there are no diamond components, check if diaWt in attributes was leaked gross weight
                $grossVal = (float)($attrs['gross_wt'] ?? $product->opening_stock_weight ?? 0);
                $rawDia = (float)($attrs['dia_wt_ct'] ?? $attrs['diamond_wt'] ?? $attrs['diamond_weight'] ?? 0);
                $rawCnt = (int)($attrs['diamond_count'] ?? $attrs['dia_count'] ?? $attrs['no_of_diamonds'] ?? 0);
                if ($rawCnt === 0 || ($grossVal > 0 && abs($rawDia - $grossVal) < 0.001)) {
                    $diaWt = null;
                    $diaCount = null;
                }
            }

            if ($totalCalculatedDiaCount > 0) {
                $diaCount = $totalCalculatedDiaCount;
            }

            $goldWeight = $attrs['net_wt'] ?? $attrs['gold_weight'] ?? $product->opening_fine_weight ?? $product->opening_stock_weight ?? 0;
            $grossWeight = $attrs['gross_wt'] ?? $product->opening_stock_weight ?? 0;
            $purity = $attrs['purity'] ?? $attrs['gold_purity'] ?? $attrs['gold_type'] ?? ($product->opening_touch ? "{$product->opening_touch}%" : '22K (916)');
            $karat = $attrs['karat'] ?? $attrs['gold_karat'] ?? '22K';
            $goldStamp = $attrs['stamp'] ?? $attrs['gold_stamp'] ?? $product->stamp ?? '916';
            $size = $attrs['size'] ?? null;

            $purityPercent = 91.6;
            $purityStr = strtolower((string)$purity);
            if (str_contains($purityStr, '24') || str_contains($purityStr, '999')) $purityPercent = 99.9;
            elseif (str_contains($purityStr, '22') || str_contains($purityStr, '916')) $purityPercent = 91.6;
            elseif (str_contains($purityStr, '18') || str_contains($purityStr, '750')) $purityPercent = 75.0;
            elseif (str_contains($purityStr, '14') || str_contains($purityStr, '585')) $purityPercent = 58.5;
            elseif (preg_match('/(\d+(?:\.\d+)?)\s*%/', $purityStr, $m)) $purityPercent = (float)$m[1];

            $fineGoldWeight = round(((float)$goldWeight * $purityPercent) / 100, 3);

            $prodImage = $product->image_url ?: $product->thumbnail_url ?: $product->image;
            if ($prodImage && (str_contains($prodImage, 'placeholder-jewelry.png') || str_contains($prodImage, '/samples/'))) {
                $prodImage = null;
            }

            return response()->json([
                'found' => true,
                'source' => 'product',
                'product_id' => $product->id,
                'product_name' => $product->name,
                'product_code' => $product->product_code,
                'design_number' => $product->design_no ?: $product->product_code,
                'category_id' => $product->category_id,
                'category_name' => $product->category?->name,
                'subcategory_id' => $product->subcategory_id,
                'subcategory_name' => $product->subcategory?->name,
                'image_url' => $prodImage,
                'size' => $size,
                'gold_purity' => $purity,
                'gold_karat' => $karat,
                'gold_stamp' => $goldStamp,
                'gold_weight' => (float)$goldWeight,
                'gross_weight' => (float)$grossWeight,
                'net_gold_weight' => (float)$goldWeight,
                'fine_gold_weight' => (float)$fineGoldWeight,
                'purity_percentage' => (float)$purityPercent,
                'diamond_weight' => $diaWt !== null ? (float)$diaWt : null,
                'diamond_count' => $diaCount !== null ? (int)$diaCount : null,
                'diamond_stamp' => $diaStamp,
                'color_stone_weight' => $colorStoneWt !== null ? (float)$colorStoneWt : null,
                'color_stone_count' => $colorStoneCount !== null ? (int)$colorStoneCount : null,
                'color_stone_stamp' => $colorStoneStamp,
                'components' => $components,
                'diamond_components' => $diamondComponents,
                'stone_components' => $stoneComponents,
                'setting_type' => $attrs['setting_style'] ?? 'Prong',
            ]);
        }

        // Fallback: Search in product_designs table
        $design = \App\Models\ProductDesign::whereRaw('LOWER(design_no) = ?', [strtolower($designNo)])->first();
        if ($design) {
            $img = !empty($design->image_path) ? (is_array($design->image_path) ? ($design->image_path[0] ?? null) : $design->image_path) : null;
            if ($img && !str_starts_with($img, 'http') && !str_starts_with($img, 'data:') && !str_starts_with($img, '/')) {
                $img = '/storage/' . $img;
            }
            if ($img && (str_contains($img, 'placeholder-jewelry.png') || str_contains($img, '/samples/'))) {
                $img = null;
            }
            return response()->json([
                'found' => true,
                'source' => 'product_design',
                'product_name' => $design->category ?: 'Jewelry Piece',
                'design_number' => $design->design_no,
                'gold_purity' => $design->purity ?? '22K (916)',
                'setting_type' => $design->setting_style ?? 'Prong',
                'gold_weight' => (float)($design->net_wt ?? 0),
                'gross_weight' => (float)($design->gross_wt ?? $design->net_wt ?? 0),
                'diamond_weight' => (float)($design->dia_wt_ct ?? 0),
                'image_url' => $img,
            ]);
        }

        return response()->json(['found' => false]);
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
            'design_no' => 'nullable|string|max:100',
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
            'image' => 'nullable|file|image|mimes:jpeg,png,jpg,webp|max:5120',
            'thumbnail' => 'nullable|file|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $validated['product_code'] = strtoupper(trim($validated['product_code']));
        $validated['design_no'] = $request->input('design_no', $request->input('attributes.design_no', $validated['product_code']));
        if (!isset($validated['current_stock_qty'])) {
            $validated['current_stock_qty'] = (int)($validated['opening_stock_qty'] ?? 0);
        }

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
                    return response()->json(['message' => 'This product code already exists.'], 422);
                }

                $product = Product::create($validated);
                $product->load(['category', 'subcategory']);

                return response()->json([
                    'status' => 'success',
                    'message' => 'Product created successfully',
                    'product' => $product,
                    'data' => $product,
                ], 201);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Product creation error: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Unable to connect to the server. Please try again later.'], 500);
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
            \Illuminate\Support\Facades\Log::error('Product fetch error: ' . $e->getMessage());
        }

        return response()->json(['message' => 'The requested record could not be found.'], 404);
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
            'design_no' => 'nullable|string|max:100',
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
            'image' => 'nullable|file|image|mimes:jpeg,png,jpg,webp|max:5120',
            'thumbnail' => 'nullable|file|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $validated['product_code'] = strtoupper(trim($validated['product_code']));
        $product = Product::find($id);
        $validated['design_no'] = $request->input('design_no', $request->input('attributes.design_no', $product?->design_no ?: $validated['product_code']));

        try {
            if (Schema::hasTable('products')) {
                $product = Product::find($id);
                if ($product) {
                    $existing = Product::where('product_code', $validated['product_code'])
                        ->where('id', '!=', $id)
                        ->first();
                    if ($existing) {
                        return response()->json(['message' => 'This product code already exists.'], 422);
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
                        $validated['thumbnail'] = $request->file('thumbnail')->store('products/thumbnails', 'public');
                    }

                    // Maintain reliable deactivation timestamp in attributes to decouple historical snapshots from updated_at
                    $attrs = $validated['attributes'] ?? $product->attributes ?? [];
                    if (is_string($attrs)) {
                        $attrs = json_decode($attrs, true) ?: [];
                    }
                    if (($validated['status'] ?? null) === 'inactive') {
                        if (empty($attrs['deactivated_at'])) {
                            $attrs['deactivated_at'] = now()->toDateTimeString();
                        }
                    } elseif (($validated['status'] ?? null) === 'active') {
                        unset($attrs['deactivated_at']);
                    }
                    $validated['attributes'] = $attrs;

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
            \Illuminate\Support\Facades\Log::error('Product update error: ' . $e->getMessage());
        }

        return response()->json(['message' => 'The requested record could not be found.'], 404);
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
            \Illuminate\Support\Facades\Log::error('Product deletion error: ' . $e->getMessage());
        }

        return response()->json(['message' => 'The requested record could not be found.'], 404);
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
