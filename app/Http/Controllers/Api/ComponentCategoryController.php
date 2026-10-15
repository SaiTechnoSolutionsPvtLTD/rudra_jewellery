<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ComponentCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class ComponentCategoryController extends Controller
{
    private function ensureTable()
    {
        if (!Schema::hasTable('component_categories')) {
            Schema::create('component_categories', function ($table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('code')->nullable();
                $table->integer('sort_order')->default(0);
                $table->text('description')->nullable();
                $table->timestamps();
            });
        }
    }

    public function index()
    {
        $items = Cache::remember('masters_component_categories_all', 300, function () {
            $this->ensureTable();
            return ComponentCategory::orderBy('sort_order')->orderBy('name')->get();
        });

        return response()->json($items);
    }

    public function store(Request $request)
    {
        $this->ensureTable();

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:component_categories,name',
            'code' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        if (!isset($validated['sort_order']) || $validated['sort_order'] === null || $validated['sort_order'] === '') {
            $maxOrder = ComponentCategory::max('sort_order') ?? 0;
            $validated['sort_order'] = $maxOrder + 1;
        } else {
            $validated['sort_order'] = (int)$validated['sort_order'];
        }

        $item = ComponentCategory::create($validated);
        Cache::forget('masters_component_categories_all');

        return response()->json([
            'message' => 'Component category created successfully.',
            'data' => $item,
        ], 201);
    }

    public function show($id)
    {
        $this->ensureTable();

        $item = ComponentCategory::findOrFail($id);
        return response()->json($item);
    }

    public function update(Request $request, $id)
    {
        $this->ensureTable();

        $item = ComponentCategory::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:component_categories,name,' . $item->id,
            'code' => 'nullable|string|max:100',
            'sort_order' => 'nullable|integer',
            'description' => 'nullable|string',
        ]);

        if (!isset($validated['sort_order']) || $validated['sort_order'] === null || $validated['sort_order'] === '') {
            $validated['sort_order'] = $item->sort_order ?? ((ComponentCategory::max('sort_order') ?? 0) + 1);
        } else {
            $validated['sort_order'] = (int)$validated['sort_order'];
        }

        $item->update($validated);
        Cache::forget('masters_component_categories_all');

        return response()->json([
            'message' => 'Component category updated successfully.',
            'data' => $item,
        ]);
    }

    public function destroy($id)
    {
        $this->ensureTable();

        $item = ComponentCategory::findOrFail($id);
        $item->delete();
        Cache::forget('masters_component_categories_all');

        return response()->json([
            'message' => 'Component category deleted successfully.',
        ]);
    }
}
