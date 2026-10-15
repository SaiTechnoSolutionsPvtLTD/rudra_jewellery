<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\Subcategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ItemController extends Controller
{
    /**
     * Display a listing of items, optionally filtered by subcategory or category.
     */
    public function index(Request $request)
    {
        try {
            $version = Cache::get('items_version', 1);
            $cacheKey = 'items_v' . $version . '_' . md5(json_encode($request->all()));

            $items = Cache::remember($cacheKey, 300, function () use ($request) {
                $query = Item::with(['category', 'subcategory']);

                if ($request->has('category_id') && !empty($request->category_id) && $request->category_id !== 'all') {
                    $query->where('category_id', $request->category_id);
                }

                if ($request->has('subcategory_id') && !empty($request->subcategory_id) && $request->subcategory_id !== 'all') {
                    $query->where('subcategory_id', $request->subcategory_id);
                }

                if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
                    $query->where('status', $request->status);
                }

                if ($request->has('q') && !empty($request->q)) {
                    $search = $request->q;
                    $query->where(function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%")
                          ->orWhere('code', 'like', "%{$search}%")
                          ->orWhere('description', 'like', "%{$search}%");
                    });
                }

                return $query->orderBy('name', 'asc')->get();
            });

            return response()->json($items);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to fetch items: ' . $e->getMessage());
            return response()->json(['message' => 'Unable to fetch items (500). Please try again later.'], 500);
        }
    }

    /**
     * Store a newly created item in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'subcategory_id' => 'nullable|exists:subcategories,id',
            'category_id' => 'nullable|exists:categories,id',
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        try {
            if (empty($validated['subcategory_id'])) {
                $firstSub = Subcategory::first();
                $validated['subcategory_id'] = $firstSub ? $firstSub->id : null;
            }

            $subcategory = !empty($validated['subcategory_id']) ? Subcategory::find($validated['subcategory_id']) : null;

            // Auto-assign category_id from subcategory if missing
            if (empty($validated['category_id']) && $subcategory) {
                $validated['category_id'] = $subcategory->category_id;
            }

            if (!empty($validated['code'])) {
                $validated['code'] = strtoupper(trim($validated['code']));
            } else {
                $prefix = $subcategory ? strtoupper(substr(preg_replace('/[^A-Za-z0-9]/', '', $subcategory->name), 0, 3)) : 'GEN';
                $validated['code'] = 'ITM-' . $prefix . '-' . sprintf('%02d', Item::count() + 1);
            }

            $validated['status'] = $validated['status'] ?? 'active';

            $item = Item::create($validated);
            $item->load(['category', 'subcategory']);

            if (Cache::has('items_version')) {
                Cache::increment('items_version');
            } else {
                Cache::put('items_version', 2, 86400 * 30);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Item created successfully!',
                'data' => $item
            ], 201);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to create item: ' . $e->getMessage());
            return response()->json(['message' => 'Unable to create item (500). Please try again later.'], 500);
        }
    }

    /**
     * Display the specified item.
     */
    public function show($id)
    {
        $item = Item::with(['category', 'subcategory'])->find($id);
        if (!$item) {
            return response()->json(['message' => 'Item not found'], 404);
        }
        return response()->json($item);
    }

    /**
     * Update the specified item in storage.
     */
    public function update(Request $request, $id)
    {
        $item = Item::find($id);
        if (!$item) {
            return response()->json(['message' => 'Item not found'], 404);
        }

        $validated = $request->validate([
            'subcategory_id' => 'required|exists:subcategories,id',
            'category_id' => 'nullable|exists:categories,id',
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        try {
            $subcategory = Subcategory::findOrFail($validated['subcategory_id']);
            $validated['category_id'] = $validated['category_id'] ?? $subcategory->category_id;

            if (!empty($validated['code'])) {
                $validated['code'] = strtoupper(trim($validated['code']));
            }

            $item->update($validated);
            $item->load(['category', 'subcategory']);

            if (Cache::has('items_version')) {
                Cache::increment('items_version');
            } else {
                Cache::put('items_version', 2, 86400 * 30);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Item updated successfully!',
                'data' => $item
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to update item: ' . $e->getMessage());
            return response()->json(['message' => 'Unable to update item (500). Please try again later.'], 500);
        }
    }

    /**
     * Remove the specified item from storage.
     */
    public function destroy($id)
    {
        $item = Item::find($id);
        if (!$item) {
            return response()->json(['message' => 'Item not found'], 404);
        }

        try {
            $item->delete();

            if (Cache::has('items_version')) {
                Cache::increment('items_version');
            } else {
                Cache::put('items_version', 2, 86400 * 30);
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Item deleted successfully!'
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to delete item: ' . $e->getMessage());
            return response()->json(['message' => 'Unable to delete item (500). Please try again later.'], 500);
        }
    }
}
