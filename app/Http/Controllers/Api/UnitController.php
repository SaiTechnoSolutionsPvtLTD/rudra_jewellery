<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Unit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class UnitController extends Controller
{
    public function index()
    {
        $items = Cache::remember('masters_units_all', 300, function () {
            return Unit::orderBy('sort_order')->orderBy('name')->get();
        });
        return response()->json($items);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:units,name',
            'code' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        if (!isset($validated['sort_order']) || $validated['sort_order'] === null || $validated['sort_order'] === '') {
            $maxOrder = Unit::max('sort_order') ?? 0;
            $validated['sort_order'] = $maxOrder + 1;
        } else {
            $validated['sort_order'] = (int)$validated['sort_order'];
        }

        $unit = Unit::create($validated);
        Cache::forget('masters_units_all');

        return response()->json([
            'message' => 'Unit created successfully.',
            'data' => $unit,
        ], 201);
    }

    public function show(Unit $unit)
    {
        return response()->json($unit);
    }

    public function update(Request $request, Unit $unit)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:units,name,' . $unit->id,
            'code' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        if (!isset($validated['sort_order']) || $validated['sort_order'] === null || $validated['sort_order'] === '') {
            $validated['sort_order'] = $unit->sort_order ?? ((Unit::max('sort_order') ?? 0) + 1);
        } else {
            $validated['sort_order'] = (int)$validated['sort_order'];
        }

        $unit->update($validated);
        Cache::forget('masters_units_all');

        return response()->json([
            'message' => 'Unit updated successfully.',
            'data' => $unit,
        ]);
    }

    public function destroy(Unit $unit)
    {
        $unit->delete();
        Cache::forget('masters_units_all');

        return response()->json([
            'message' => 'Unit deleted successfully.',
        ]);
    }
}
