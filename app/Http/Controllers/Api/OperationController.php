<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Operation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class OperationController extends Controller
{
    private function ensureTable()
    {
        if (!Schema::hasTable('operations')) {
            Schema::create('operations', function ($table) {
                $table->id();
                $table->string('name')->unique();
                $table->string('code', 50)->nullable();
                $table->string('icon', 100)->nullable()->default('fa-solid fa-gears');
                $table->string('color', 50)->nullable()->default('amber');
                $table->integer('sort_order')->default(0);
                $table->string('status', 20)->default('active');
                $table->text('description')->nullable();
                $table->timestamps();
            });
        }
    }

    public function index(Request $request)
    {
        $hasFilters = $request->filled('search') || ($request->filled('status') && $request->status !== 'all');

        if (!$hasFilters) {
            $items = Cache::remember('masters_operations_all', 300, function () {
                $this->ensureTable();
                return Operation::orderBy('sort_order', 'asc')->orderBy('name', 'asc')->get();
            });
            return response()->json($items);
        }

        $this->ensureTable();

        $query = Operation::query();

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        $items = $query->orderBy('sort_order', 'asc')->orderBy('name', 'asc')->get();
        return response()->json($items);
    }

    public function store(Request $request)
    {
        $this->ensureTable();

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:operations,name',
            'code' => 'nullable|string|max:50',
            'icon' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer',
            'status' => 'nullable|string|in:active,inactive',
            'description' => 'nullable|string',
        ]);

        if (!isset($validated['sort_order']) || $validated['sort_order'] === null || $validated['sort_order'] === '') {
            $maxOrder = Operation::max('sort_order') ?? 0;
            $validated['sort_order'] = $maxOrder + 1;
        } else {
            $validated['sort_order'] = (int)$validated['sort_order'];
        }

        if (empty($validated['status'])) {
            $validated['status'] = 'active';
        }

        if (empty($validated['icon'])) {
            $validated['icon'] = 'fa-solid fa-gears';
        }

        if (empty($validated['color'])) {
            $validated['color'] = 'amber';
        }

        $item = Operation::create($validated);
        Cache::forget('masters_operations_all');

        return response()->json([
            'message' => 'Operation created successfully.',
            'data' => $item,
        ], 201);
    }

    public function show($id)
    {
        $this->ensureTable();

        $item = Operation::findOrFail($id);
        return response()->json($item);
    }

    public function update(Request $request, $id)
    {
        $this->ensureTable();

        $item = Operation::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:operations,name,' . $item->id,
            'code' => 'nullable|string|max:50',
            'icon' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:50',
            'sort_order' => 'nullable|integer',
            'status' => 'nullable|string|in:active,inactive',
            'description' => 'nullable|string',
        ]);

        if (!isset($validated['sort_order']) || $validated['sort_order'] === null || $validated['sort_order'] === '') {
            $validated['sort_order'] = $item->sort_order ?? ((Operation::max('sort_order') ?? 0) + 1);
        } else {
            $validated['sort_order'] = (int)$validated['sort_order'];
        }

        $item->update($validated);
        Cache::forget('masters_operations_all');

        return response()->json([
            'message' => 'Operation updated successfully.',
            'data' => $item,
        ]);
    }

    public function destroy($id)
    {
        $this->ensureTable();

        $item = Operation::findOrFail($id);
        $item->delete();
        Cache::forget('masters_operations_all');

        return response()->json([
            'message' => 'Operation deleted successfully.',
        ]);
    }
}
