<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiamondClarity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class DiamondClarityController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $clarities = Cache::remember('masters_diamond_clarities_all', 300, function () {
            return DiamondClarity::orderBy('sort_order')->orderBy('name')->get();
        });
        return response()->json($clarities);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:diamond_clarities,name',
            'code' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        if (!isset($validated['sort_order']) || $validated['sort_order'] === null || $validated['sort_order'] === '') {
            $maxOrder = DiamondClarity::max('sort_order') ?? 0;
            $validated['sort_order'] = $maxOrder + 1;
        } else {
            $validated['sort_order'] = (int)$validated['sort_order'];
        }

        if (!isset($validated['status'])) {
            $validated['status'] = 'active';
        }

        $clarity = DiamondClarity::create($validated);
        Cache::forget('masters_diamond_clarities_all');

        return response()->json([
            'message' => 'Diamond clarity created successfully.',
            'data' => $clarity,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(DiamondClarity $diamondClarity)
    {
        return response()->json($diamondClarity);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, DiamondClarity $diamondClarity)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:diamond_clarities,name,' . $diamondClarity->id,
            'code' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
            'status' => 'nullable|string|in:active,inactive',
        ]);

        if (!isset($validated['sort_order']) || $validated['sort_order'] === null || $validated['sort_order'] === '') {
            $validated['sort_order'] = $diamondClarity->sort_order ?? ((DiamondClarity::max('sort_order') ?? 0) + 1);
        } else {
            $validated['sort_order'] = (int)$validated['sort_order'];
        }

        $diamondClarity->update($validated);
        Cache::forget('masters_diamond_clarities_all');

        return response()->json([
            'message' => 'Diamond clarity updated successfully.',
            'data' => $diamondClarity,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(DiamondClarity $diamondClarity)
    {
        $diamondClarity->delete();
        Cache::forget('masters_diamond_clarities_all');

        return response()->json([
            'message' => 'Diamond clarity deleted successfully.',
        ]);
    }
}
