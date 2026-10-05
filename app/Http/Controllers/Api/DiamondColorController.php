<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiamondColor;
use Illuminate\Http\Request;

class DiamondColorController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $colors = DiamondColor::orderBy('sort_order')->orderBy('name')->get();
        return response()->json($colors);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:diamond_colors,name',
            'code' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        if (!isset($validated['sort_order'])) {
            $maxOrder = DiamondColor::max('sort_order') ?? 0;
            $validated['sort_order'] = $maxOrder + 1;
        }

        if (!isset($validated['status'])) {
            $validated['status'] = 'active';
        }

        $color = DiamondColor::create($validated);

        return response()->json([
            'message' => 'Diamond color created successfully.',
            'data' => $color,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(DiamondColor $diamondColor)
    {
        return response()->json($diamondColor);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, DiamondColor $diamondColor)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:diamond_colors,name,' . $diamondColor->id,
            'code' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        $diamondColor->update($validated);

        return response()->json([
            'message' => 'Diamond color updated successfully.',
            'data' => $diamondColor,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(DiamondColor $diamondColor)
    {
        $diamondColor->delete();

        return response()->json([
            'message' => 'Diamond color deleted successfully.',
        ]);
    }
}
