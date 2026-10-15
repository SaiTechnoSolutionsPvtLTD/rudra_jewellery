<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Style;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class StyleController extends Controller
{
    /**
     * Display a listing of styles.
     */
    public function index()
    {
        $styles = Cache::remember('masters_styles_all', 300, function () {
            return Style::orderBy('name')->get();
        });
        return response()->json($styles);
    }

    /**
     * Store a newly created style.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:50',
        ]);

        $colors = ['amber', 'red', 'orange', 'slate', 'purple', 'green', 'blue', 'pink'];
        if (empty($validated['color'])) {
            $validated['color'] = $colors[array_rand($colors)];
        }

        $style = Style::create($validated);
        Cache::forget('masters_styles_all');

        return response()->json([
            'message' => 'Style created successfully.',
            'data' => $style,
        ], 201);
    }

    /**
     * Update the specified style.
     */
    public function update(Request $request, Style $style)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'icon' => 'nullable|string|max:255',
            'description' => 'nullable|string',
            'color' => 'nullable|string|max:50',
        ]);

        $style->update($validated);
        Cache::forget('masters_styles_all');

        return response()->json([
            'message' => 'Style updated successfully.',
            'data' => $style,
        ]);
    }

    /**
     * Remove the specified style from storage.
     */
    public function destroy(Style $style)
    {
        $style->delete();
        Cache::forget('masters_styles_all');

        return response()->json([
            'message' => 'Style deleted successfully.',
        ]);
    }
}
