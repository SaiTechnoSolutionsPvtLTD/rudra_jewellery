<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Stamp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class StampController extends Controller
{
    public function index(Request $request)
    {
        $material = $request->input('material_type', $request->input('applicable_for', 'all'));
        $cacheKey = 'masters_stamps_' . md5($material ?: 'all');

        $items = Cache::remember($cacheKey, 300, function () use ($request, $material) {
            $query = Stamp::query();

            // Optional filtering by material type (Gold, Diamond, Stone)
            if (!empty($material) && strtolower($material) !== 'all') {
                $matStr = ucfirst(strtolower(trim($material)));
                if (str_contains(strtolower($matStr), 'gold')) $matStr = 'Gold';
                elseif (str_contains(strtolower($matStr), 'diamond')) $matStr = 'Diamond';
                elseif (str_contains(strtolower($matStr), 'stone')) $matStr = 'Stone';
                elseif (str_contains(strtolower($matStr), 'silver')) $matStr = 'Silver';

                $query->where(function($q) use ($matStr) {
                    $q->where('applicable_for', 'like', "%{$matStr}%")
                      ->orWhere('applicable_for', 'like', '%All%')
                      ->orWhereNull('applicable_for')
                      ->orWhere('applicable_for', '');
                });
            }

            return $query->orderBy('sort_order')->orderBy('name')->get();
        });

        return response()->json($items);
    }

    public function store(Request $request)
    {
        $applicableFor = $request->input('applicable_for');
        if (is_array($applicableFor)) {
            $applicableFor = implode(',', array_filter($applicableFor));
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:stamps,name',
            'code' => 'nullable|string|max:100',
            'applicable_for' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        $validated['applicable_for'] = !empty($applicableFor) ? $applicableFor : null;

        if (!isset($validated['sort_order']) || $validated['sort_order'] === null || $validated['sort_order'] === '') {
            $maxOrder = Stamp::max('sort_order') ?? 0;
            $validated['sort_order'] = $maxOrder + 1;
        } else {
            $validated['sort_order'] = (int)$validated['sort_order'];
        }

        $stamp = Stamp::create($validated);
        Cache::flush();

        return response()->json([
            'message' => 'Stamp created successfully.',
            'data' => $stamp,
        ], 201);
    }

    public function show(Stamp $stamp)
    {
        return response()->json($stamp);
    }

    public function update(Request $request, Stamp $stamp)
    {
        $applicableFor = $request->input('applicable_for');
        if (is_array($applicableFor)) {
            $applicableFor = implode(',', array_filter($applicableFor));
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:stamps,name,' . $stamp->id,
            'code' => 'nullable|string|max:100',
            'applicable_for' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        if (!empty($applicableFor)) {
            $validated['applicable_for'] = $applicableFor;
        }

        if (!isset($validated['sort_order']) || $validated['sort_order'] === null || $validated['sort_order'] === '') {
            $validated['sort_order'] = $stamp->sort_order ?? ((Stamp::max('sort_order') ?? 0) + 1);
        } else {
            $validated['sort_order'] = (int)$validated['sort_order'];
        }

        $stamp->update($validated);
        Cache::flush();

        return response()->json([
            'message' => 'Stamp updated successfully.',
            'data' => $stamp,
        ]);
    }

    public function destroy(Stamp $stamp)
    {
        $stamp->delete();
        Cache::flush();

        return response()->json([
            'message' => 'Stamp deleted successfully.',
        ]);
    }
}
