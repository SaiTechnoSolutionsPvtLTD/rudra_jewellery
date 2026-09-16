<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DiamondRange;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DiamondRangeController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $ranges = DiamondRange::orderBy('min_ct')->get();
        return response()->json($ranges);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:100|unique:diamond_ranges,code',
            'min_ct' => 'nullable|numeric|min:0',
            'max_ct' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        if (empty($validated['code'])) {
            $baseCode = Str::slug($validated['name'], '_');
            $code = $baseCode;
            $counter = 1;
            while (DiamondRange::where('code', $code)->exists()) {
                $code = $baseCode . '_' . $counter++;
            }
            $validated['code'] = $code;
        }

        $range = DiamondRange::create($validated);

        return response()->json([
            'message' => 'Diamond weight range created successfully.',
            'data' => $range,
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(DiamondRange $diamondRange)
    {
        return response()->json($diamondRange);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, DiamondRange $diamondRange)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'nullable|string|max:100|unique:diamond_ranges,code,' . $diamondRange->id,
            'min_ct' => 'nullable|numeric|min:0',
            'max_ct' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
        ]);

        if (empty($validated['code'])) {
            $validated['code'] = $diamondRange->code;
        }

        $diamondRange->update($validated);

        return response()->json([
            'message' => 'Diamond weight range updated successfully.',
            'data' => $diamondRange,
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(DiamondRange $diamondRange)
    {
        $diamondRange->delete();

        return response()->json([
            'message' => 'Diamond weight range deleted successfully.',
        ]);
    }
}
