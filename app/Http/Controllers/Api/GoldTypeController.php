<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GoldType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class GoldTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $types = Cache::remember('masters_gold_types_all', 300, function () {
            return GoldType::orderBy('sort_order')->orderBy('name')->get();
        });
        return response()->json($types);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:gold_types,name',
            'karat' => 'nullable|string|max:100',
            'purity' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        if (!isset($validated['sort_order']) || $validated['sort_order'] === null || $validated['sort_order'] === '') {
            $maxOrder = GoldType::max('sort_order') ?? 0;
            $validated['sort_order'] = $maxOrder + 1;
        } else {
            $validated['sort_order'] = (int)$validated['sort_order'];
        }

        $goldType = GoldType::create($validated);
        Cache::forget('masters_gold_types_all');

        return response()->json([
            'message' => 'Gold type created successfully.',
            'data' => $goldType,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(GoldType $goldType)
    {
        return response()->json($goldType);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, GoldType $goldType)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:gold_types,name,' . $goldType->id,
            'karat' => 'nullable|string|max:100',
            'purity' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        if (!isset($validated['sort_order']) || $validated['sort_order'] === null || $validated['sort_order'] === '') {
            $validated['sort_order'] = $goldType->sort_order ?? ((GoldType::max('sort_order') ?? 0) + 1);
        } else {
            $validated['sort_order'] = (int)$validated['sort_order'];
        }

        $goldType->update($validated);
        Cache::forget('masters_gold_types_all');

        return response()->json([
            'message' => 'Gold type updated successfully.',
            'data' => $goldType,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(GoldType $goldType)
    {
        $goldType->delete();
        Cache::forget('masters_gold_types_all');

        return response()->json([
            'message' => 'Gold type deleted successfully.',
        ]);
    }
}
