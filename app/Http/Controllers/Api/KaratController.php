<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Karat;
use Illuminate\Http\Request;

class KaratController extends Controller
{
    public function index()
    {
        $items = Karat::orderBy('sort_order')->orderBy('name')->get();
        return response()->json($items);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:karats,name',
            'code' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        if (!isset($validated['sort_order'])) {
            $maxOrder = Karat::max('sort_order') ?? 0;
            $validated['sort_order'] = $maxOrder + 1;
        }

        $karat = Karat::create($validated);

        return response()->json([
            'message' => 'Karat created successfully.',
            'data' => $karat,
        ], 201);
    }

    public function show(Karat $karat)
    {
        return response()->json($karat);
    }

    public function update(Request $request, Karat $karat)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:karats,name,' . $karat->id,
            'code' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        $karat->update($validated);

        return response()->json([
            'message' => 'Karat updated successfully.',
            'data' => $karat,
        ]);
    }

    public function destroy(Karat $karat)
    {
        $karat->delete();

        return response()->json([
            'message' => 'Karat deleted successfully.',
        ]);
    }
}
