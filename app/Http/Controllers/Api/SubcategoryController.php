<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Subcategory;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class SubcategoryController extends Controller
{
    public function index(Request $request)
    {
        try {
            if (Schema::hasTable('subcategories')) {
                $subcategories = Subcategory::with('category')->orderBy('id', 'desc')->get();
                return response()->json($subcategories);
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json([]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
            'form_schema' => 'nullable|array',
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));

        try {
            if (Schema::hasTable('subcategories')) {
                $existing = Subcategory::where('code', $validated['code'])->first();
                if ($existing) {
                    return response()->json(['message' => 'Subcategory code already exists.'], 422);
                }

                $subcategory = Subcategory::create($validated);
                $subcategory->load('category');

                return response()->json([
                    'status' => 'success',
                    'message' => 'Subcategory created successfully',
                    'subcategory' => $subcategory
                ], 201);
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json(['message' => 'Database error'], 500);
    }

    public function show(Request $request, $id)
    {
        try {
            if (Schema::hasTable('subcategories')) {
                $subcategory = Subcategory::with('category')->find($id);
                if ($subcategory) {
                    return response()->json($subcategory);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json(['message' => 'Subcategory not found'], 404);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'category_id' => 'required|exists:categories,id',
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
            'form_schema' => 'nullable|array',
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));

        try {
            if (Schema::hasTable('subcategories')) {
                $subcategory = Subcategory::find($id);
                if ($subcategory) {
                    $existing = Subcategory::where('code', $validated['code'])
                        ->where('id', '!=', $id)
                        ->first();
                    if ($existing) {
                        return response()->json(['message' => 'Subcategory code already exists.'], 422);
                    }

                    $subcategory->update($validated);
                    $subcategory->load('category');

                    return response()->json([
                        'status' => 'success',
                        'message' => 'Subcategory updated successfully',
                        'subcategory' => $subcategory
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json(['message' => 'Subcategory not found'], 404);
    }

    public function destroy(Request $request, $id)
    {
        try {
            if (Schema::hasTable('subcategories')) {
                $subcategory = Subcategory::find($id);
                if ($subcategory) {
                    $subcategory->delete();
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Subcategory deleted successfully'
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json(['message' => 'Subcategory not found'], 404);
    }
}
