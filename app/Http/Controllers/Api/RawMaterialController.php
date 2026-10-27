<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RawMaterial;
use App\Models\PurchaseEntry;
use App\Models\MaterialOpeningStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RawMaterialController extends Controller
{
    /**
     * Display a listing of raw materials.
     */
    public function index(Request $request)
    {
        $query = RawMaterial::query();

        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('material_type', 'like', "%{$search}%")
                  ->orWhere('karat', 'like', "%{$search}%")
                  ->orWhere('purity', 'like', "%{$search}%");
            });
        }

        if ($request->filled('material_type') && $request->material_type !== 'all') {
            $query->where('material_type', strtolower($request->material_type));
        }

        if ($request->has('active_only')) {
            $query->where('is_active', true);
        }

        $materials = $query->orderBy('sort_order', 'asc')
            ->orderBy('id', 'asc')
            ->get();

        return response()->json($materials);
    }

    /**
     * Store a newly created raw material.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'material_type' => 'required|string|in:gold,silver,platinum,diamond,stone',
            'code' => 'nullable|string|max:50',
            'karat' => 'nullable|string|max:50',
            'purity' => 'nullable|string|max:50',
            'unit' => 'required|string|max:20',
            'description' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        if (empty($validated['code'])) {
            $prefix = match(strtolower($validated['material_type'])) {
                'gold' => 'RM-GLD',
                'silver' => 'RM-SLV',
                'platinum' => 'RM-PLT',
                'diamond' => 'RM-DIA',
                'stone' => 'RM-STN',
                default => 'RM-MAT',
            };
            $validated['code'] = $prefix . '-' . strtoupper(Str::random(4));
        }

        $validated['is_active'] = $request->boolean('is_active', true);
        $validated['sort_order'] = $request->input('sort_order', 0);
        $validated['current_balance'] = 0;
        $validated['current_count'] = 0;
        $validated['opening_weight'] = 0;
        $validated['opening_count'] = 0;
        $validated['purchased_weight'] = 0;
        $validated['purchased_count'] = 0;
        $validated['allocated_weight'] = 0;
        $validated['allocated_count'] = 0;

        $material = RawMaterial::create($validated);

        return response()->json([
            'message' => 'Raw material master created successfully',
            'data' => $material,
        ], 201);
    }

    /**
     * Display the specified raw material.
     */
    public function show($id)
    {
        $material = RawMaterial::findOrFail($id);
        return response()->json($material);
    }

    /**
     * Update the specified raw material.
     */
    public function update(Request $request, $id)
    {
        $material = RawMaterial::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'material_type' => 'required|string|in:gold,silver,platinum,diamond,stone',
            'code' => 'nullable|string|max:50',
            'karat' => 'nullable|string|max:50',
            'purity' => 'nullable|string|max:50',
            'unit' => 'required|string|max:20',
            'description' => 'nullable|string',
            'sort_order' => 'nullable|integer',
            'is_active' => 'nullable|boolean',
        ]);

        if ($request->has('is_active')) {
            $validated['is_active'] = $request->boolean('is_active');
        }

        $material->update($validated);

        return response()->json([
            'message' => 'Raw material master updated successfully',
            'data' => $material,
        ]);
    }

    /**
     * Remove the specified raw material.
     */
    public function destroy($id)
    {
        $material = RawMaterial::findOrFail($id);

        // Check if there are active transactions associated
        $hasPurchases = PurchaseEntry::where('raw_material_id', $id)->exists();
        $hasOpenings = MaterialOpeningStock::where('raw_material_id', $id)->exists();
        $hasBalance = (float) $material->current_balance > 0 || (float) $material->current_count > 0;

        if ($hasPurchases || $hasOpenings || $hasBalance) {
            return response()->json([
                'message' => 'Cannot delete raw material that has recorded inventory transactions or an active balance. You can deactivate it instead.',
            ], 422);
        }

        $material->delete();

        return response()->json([
            'message' => 'Raw material master deleted successfully',
        ]);
    }

    /**
     * Quickly replenish or add stock for materials (e.g. diamonds, stones) directly from order creation flows.
     */
    public function quickStockAdd(Request $request)
    {
        $validated = $request->validate([
            'material_type' => 'required|string|in:diamond,stone,gold,silver,platinum',
            'weight' => 'nullable|numeric|min:0',
            'count' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string',
            'stamp' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $type = strtolower($validated['material_type']);
        $weight = (float)($validated['weight'] ?? 0);
        $count = (float)($validated['count'] ?? 0);
        $unit = $validated['unit'] ?? ($type === 'diamond' ? 'ct' : ($type === 'stone' ? 'units' : 'g'));

        if ($weight <= 0 && $count <= 0) {
            return response()->json([
                'success' => false,
                'message' => 'Please provide a valid weight or piece count to add stock.',
            ], 422);
        }

        $record = RawMaterial::creditOpeningStock($type, $weight, $count, $unit);
        RawMaterial::recalculateAllocations();
        if ($record) {
            $record->refresh();
        }
        // Also record in MaterialOpeningStock for audit trail
        try {
            $latest = MaterialOpeningStock::orderBy('id', 'desc')->first();
            $stockNo = 'OS-QUICK-' . ($latest ? ($latest->id + 1001) : rand(1000, 9999));
            MaterialOpeningStock::create([
                'stock_number' => $stockNo,
                'material_type' => $type,
                'raw_material_id' => $record?->id,
                'item_name' => 'Quick Vault Stock Add (' . ucfirst($type) . ')',
                'purity' => $record?->purity ?? 'Standard',
                'gross_weight' => $weight,
                'net_weight' => $weight,
                'weight' => $weight,
                'pieces' => $count,
                'unit' => $unit,
                'description' => $validated['notes'] ?? 'Quick stock replenishment from order creation flow',
                'created_by' => auth()->id() ?? 1,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Quick opening stock audit log warning: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'message' => "Successfully added {$weight} {$unit} and {$count} pcs to {$type} vault stock.",
            'material' => $record,
            'current_balance' => $record?->current_balance ?? 0,
            'current_count' => $record?->current_count ?? 0,
        ]);
    }
}

