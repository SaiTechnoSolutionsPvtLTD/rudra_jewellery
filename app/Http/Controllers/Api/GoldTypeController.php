<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GoldType;
use Illuminate\Http\Request;

class GoldTypeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $types = GoldType::orderBy('sort_order')->orderBy('name')->get();
        return response()->json($types);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:gold_types,name',
            'purity' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        if (!isset($validated['sort_order'])) {
            $maxOrder = GoldType::max('sort_order') ?? 0;
            $validated['sort_order'] = $maxOrder + 1;
        }

        $goldType = GoldType::create($validated);

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
            'purity' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        $goldType->update($validated);

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

        return response()->json([
            'message' => 'Gold type deleted successfully.',
        ]);
    }
}
