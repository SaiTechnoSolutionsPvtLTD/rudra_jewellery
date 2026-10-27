<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Cache;

class CategoryController extends Controller
{
    private function getDefaultFormSchema($code)
    {
        $codeUpper = strtoupper($code);
        if ($codeUpper === 'GOLD') {
            return [
                ['key' => 'purity', 'label' => 'Gold Purity / Karat', 'type' => 'select', 'options' => ['24K (99.9% Pure)', '22K (91.6% Standard)', '18K (75.0% Jewel)', '14K (58.5% Fashion)'], 'required' => true],
                ['key' => 'gross_weight', 'label' => 'Gross Weight (g)', 'type' => 'number', 'options' => [], 'required' => true],
                ['key' => 'net_weight', 'label' => 'Net Weight (g)', 'type' => 'number', 'options' => [], 'required' => true],
                ['key' => 'wastage_percent', 'label' => 'Wastage %', 'type' => 'number', 'options' => [], 'required' => false],
                ['key' => 'making_charge', 'label' => 'Making Charges (₹)', 'type' => 'number', 'options' => [], 'required' => false],
                ['key' => 'hallmark_no', 'label' => 'BIS Hallmark Reg No', 'type' => 'text', 'options' => [], 'required' => false],
            ];
        }

        if ($codeUpper === 'SILVER') {
            return [
                ['key' => 'purity', 'label' => 'Silver Purity', 'type' => 'select', 'options' => ['99.9% Fine Pure', '92.5% Sterling', '80.0% German Silver'], 'required' => true],
                ['key' => 'weight', 'label' => 'Weight (g)', 'type' => 'number', 'options' => [], 'required' => true],
                ['key' => 'making_charge', 'label' => 'Making Charges (₹)', 'type' => 'number', 'options' => [], 'required' => false],
            ];
        }

        if ($codeUpper === 'DIAMOND') {
            return [
                ['key' => 'cut', 'label' => 'Diamond Cut', 'type' => 'select', 'options' => ['Round Brilliant', 'Princess Cut', 'Emerald Cut', 'Oval Cut', 'Marquise Cut'], 'required' => true],
                ['key' => 'clarity', 'label' => 'Clarity', 'type' => 'select', 'options' => ['FL/IF (Flawless)', 'VVS1', 'VVS2', 'VS1', 'SI1'], 'required' => true],
                ['key' => 'color', 'label' => 'Color Grade', 'type' => 'select', 'options' => ['D-F (Colorless)', 'E-F (Rare White)', 'G-H (Near Colorless)', 'I-J (Slight Yellowish)'], 'required' => true],
                ['key' => 'carat_weight', 'label' => 'Carat Weight (ct)', 'type' => 'number', 'options' => [], 'required' => true],
                ['key' => 'piece_count', 'label' => 'Piece Count', 'type' => 'number', 'options' => [], 'required' => false],
                ['key' => 'metal_setting', 'label' => 'Metal Setting Purity', 'type' => 'text', 'options' => [], 'required' => false],
            ];
        }

        return [
            ['key' => 'weight', 'label' => 'Weight (g)', 'type' => 'number', 'options' => [], 'required' => false],
            ['key' => 'price', 'label' => 'Price (₹)', 'type' => 'number', 'options' => [], 'required' => false],
            ['key' => 'making_charge', 'label' => 'Making Charge (₹)', 'type' => 'number', 'options' => [], 'required' => false],
        ];
    }

    public function index(Request $request)
    {
        try {
            $categories = Cache::remember('master_categories_list', 300, function () {
                $cats = Category::orderBy('id', 'desc')->get();
                foreach ($cats as $cat) {
                    if (empty($cat->form_schema)) {
                        $cat->form_schema = $this->getDefaultFormSchema($cat->code);
                        $cat->save();
                    }
                }
                return $cats;
            });
            return response()->json($categories);
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json([]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
            'form_schema' => 'nullable|array',
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));

        if (!isset($validated['form_schema']) || empty($validated['form_schema'])) {
            $validated['form_schema'] = $this->getDefaultFormSchema($validated['code']);
        }

        try {
            if (Schema::hasTable('categories')) {
                $existing = Category::where('code', $validated['code'])->first();
                if ($existing) {
                    return response()->json(['message' => 'This code already exists.'], 422);
                }

                $category = Category::create($validated);
                Cache::forget('master_categories_list');
                return response()->json([
                    'status' => 'success',
                    'message' => 'Category created successfully',
                    'category' => $category
                ], 201);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to create category: ' . $e->getMessage());
            return response()->json(['message' => 'Unable to connect to the server. Please try again later.'], 500);
        }

        return response()->json(['message' => 'Unable to connect to the server. Please try again later.'], 500);
    }

    public function show(Request $request, $id)
    {
        try {
            if (Schema::hasTable('categories')) {
                $category = Category::find($id);
                if ($category) {
                    return response()->json($category);
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Category fetch error: ' . $e->getMessage());
        }

        return response()->json(['message' => 'The requested record could not be found.'], 404);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
            'form_schema' => 'nullable|array',
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));

        try {
            if (Schema::hasTable('categories')) {
                $category = Category::find($id);
                if ($category) {
                    $existing = Category::where('code', $validated['code'])
                        ->where('id', '!=', $id)
                        ->first();
                    if ($existing) {
                        return response()->json(['message' => 'This code already exists.'], 422);
                    }

                    $category->update($validated);
                    Cache::forget('master_categories_list');
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Category updated successfully',
                        'category' => $category
                    ]);
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Category update error: ' . $e->getMessage());
        }

        return response()->json(['message' => 'The requested record could not be found.'], 404);
    }

    public function destroy(Request $request, $id)
    {
        try {
            if (Schema::hasTable('categories')) {
                $category = Category::find($id);
                if ($category) {
                    $category->delete();
                    Cache::forget('master_categories_list');
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Category deleted successfully'
                    ]);
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Category deletion error: ' . $e->getMessage());
        }

        return response()->json(['message' => 'The requested record could not be found.'], 404);
    }
}
