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
        $ranges = DiamondRange::orderBy('id', 'asc')->get();
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
            'item_name' => 'nullable|string|max:255',
            'stamp' => 'nullable|string|max:100',
            'part' => 'nullable|string|max:100',
            'colour' => 'nullable|string|max:100',
            'clarity' => 'nullable|string|max:100',
            'remarks' => 'nullable|string|max:255',
            'unit' => 'nullable|string|max:50',
            'tunch' => 'nullable|string|max:50',
            'sale_lb' => 'nullable|string|max:50',
            'pc' => 'nullable|integer|min:0',
            'wt_ct' => 'nullable|numeric|min:0',
            'dollar' => 'nullable|numeric|min:0',
            'disc_percent' => 'nullable|numeric|min:0',
            'dolx_rate' => 'nullable|numeric|min:0',
            'rate' => 'nullable|numeric|min:0',
            'value' => 'nullable|numeric|min:0',
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

        if (empty($validated['item_name'])) {
            $validated['item_name'] = 'DIAMOND';
        }

        if (isset($validated['wt_ct']) && isset($validated['rate'])) {
            $validated['value'] = $validated['wt_ct'] * $validated['rate'];
        }

        $range = DiamondRange::create($validated);

        return response()->json([
            'message' => 'Diamond master item created successfully.',
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
            'name' => 'sometimes|required|string|max:255',
            'code' => 'nullable|string|max:100|unique:diamond_ranges,code,' . $diamondRange->id,
            'min_ct' => 'nullable|numeric|min:0',
            'max_ct' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'item_name' => 'nullable|string|max:255',
            'stamp' => 'nullable|string|max:100',
            'part' => 'nullable|string|max:100',
            'colour' => 'nullable|string|max:100',
            'clarity' => 'nullable|string|max:100',
            'remarks' => 'nullable|string|max:255',
            'unit' => 'nullable|string|max:50',
            'tunch' => 'nullable|string|max:50',
            'sale_lb' => 'nullable|string|max:50',
            'pc' => 'nullable|integer|min:0',
            'wt_ct' => 'nullable|numeric|min:0',
            'dollar' => 'nullable|numeric|min:0',
            'disc_percent' => 'nullable|numeric|min:0',
            'dolx_rate' => 'nullable|numeric|min:0',
            'rate' => 'nullable|numeric|min:0',
            'value' => 'nullable|numeric|min:0',
        ]);

        if (isset($validated['wt_ct']) && isset($validated['rate'])) {
            $validated['value'] = $validated['wt_ct'] * $validated['rate'];
        }

        $diamondRange->update($validated);

        return response()->json([
            'message' => 'Diamond master item updated successfully.',
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
            'message' => 'Diamond master item deleted successfully.',
        ]);
    }
}
