<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Stamp;
use Illuminate\Http\Request;

class StampController extends Controller
{
    public function index()
    {
        $items = Stamp::orderBy('sort_order')->orderBy('name')->get();
        return response()->json($items);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:stamps,name',
            'code' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        if (!isset($validated['sort_order'])) {
            $maxOrder = Stamp::max('sort_order') ?? 0;
            $validated['sort_order'] = $maxOrder + 1;
        }

        $stamp = Stamp::create($validated);

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
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:stamps,name,' . $stamp->id,
            'code' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        $stamp->update($validated);

        return response()->json([
            'message' => 'Stamp updated successfully.',
            'data' => $stamp,
        ]);
    }

    public function destroy(Stamp $stamp)
    {
        $stamp->delete();

        return response()->json([
            'message' => 'Stamp deleted successfully.',
        ]);
    }
}
