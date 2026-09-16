<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkSpecification;
use App\Models\Karigar;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class WorkSpecificationController extends Controller
{
    /**
     * Display a listing of the work specifications.
     */
    public function index(Request $request)
    {
        $query = WorkSpecification::query()->withCount('karigars');

        // Status filter
        if ($request->has('status') && $request->status !== 'all' && !empty($request->status)) {
            $query->where('status', $request->status);
        }

        // Search filter
        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $items = $query->orderBy('sort_order', 'asc')->orderBy('name', 'asc')->get();

        // Calculate summary statistics in a single aggregate query
        $statsRow = DB::table('work_specifications')->selectRaw(
            'COUNT(*) as total,
             SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as active_count,
             SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as inactive_count,
             COALESCE(AVG(CASE WHEN status = ? THEN default_wastage_percent END), 4.5) as avg_wastage',
            ['active', 'inactive', 'active']
        )->first();

        $stats = [
            'total'        => (int) ($statsRow->total ?? 0),
            'active_count' => (int) ($statsRow->active_count ?? 0),
            'inactive_count' => (int) ($statsRow->inactive_count ?? 0),
            'avg_wastage'  => round($statsRow->avg_wastage ?? 4.5, 2),
        ];

        return response()->json([
            'data'  => $items,
            'stats' => $stats,
        ]);
    }

    /**
     * Store a newly created work specification.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:150|unique:work_specifications,name',
            'code' => 'nullable|string|max:50|unique:work_specifications,code',
            'description' => 'nullable|string|max:1000',
            'default_wastage_percent' => 'nullable|numeric|min:0|max:100',
            'default_making_charge' => 'nullable|numeric|min:0',
            'icon' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:50',
            'status' => 'nullable|in:active,inactive',
            'sort_order' => 'nullable|integer',
        ]);

        if (empty($validated['code'])) {
            $count = WorkSpecification::count() + 1;
            $validated['code'] = 'SPEC-' . str_pad($count, 3, '0', STR_PAD_LEFT);
        }

        $validated['default_wastage_percent'] = $validated['default_wastage_percent'] ?? 4.50;
        $validated['default_making_charge'] = $validated['default_making_charge'] ?? 0.00;
        $validated['icon'] = $validated['icon'] ?? 'fa-solid fa-gem';
        $validated['color'] = $validated['color'] ?? 'amber';
        $validated['status'] = $validated['status'] ?? 'active';

        $spec = WorkSpecification::create($validated);

        return response()->json([
            'message' => 'Work specification created successfully.',
            'data' => $spec->loadCount('karigars'),
        ], 201);
    }

    /**
     * Display the specified work specification.
     */
    public function show($id)
    {
        $spec = WorkSpecification::withCount('karigars')->findOrFail($id);
        
        $assignedKarigars = Karigar::where('specialization', $spec->name)
            ->select('id', 'karigar_code', 'name', 'primary_phone', 'status', 'current_gold_balance_grams', 'avatar_url', 'city')
            ->get();

        return response()->json([
            'data' => $spec,
            'assigned_karigars' => $assignedKarigars,
        ]);
    }

    /**
     * Update the specified work specification.
     */
    public function update(Request $request, $id)
    {
        $spec = WorkSpecification::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:150|unique:work_specifications,name,' . $spec->id,
            'code' => 'nullable|string|max:50|unique:work_specifications,code,' . $spec->id,
            'description' => 'nullable|string|max:1000',
            'default_wastage_percent' => 'nullable|numeric|min:0|max:100',
            'default_making_charge' => 'nullable|numeric|min:0',
            'icon' => 'nullable|string|max:100',
            'color' => 'nullable|string|max:50',
            'status' => 'nullable|in:active,inactive',
            'sort_order' => 'nullable|integer',
        ]);

        $oldName = $spec->name;
        $spec->update($validated);

        // If the name changed, update linked Karigar records to preserve data integrity
        if ($oldName !== $spec->name) {
            Karigar::where('specialization', $oldName)->update(['specialization' => $spec->name]);
        }

        return response()->json([
            'message' => 'Work specification updated successfully.',
            'data' => $spec->fresh()->loadCount('karigars'),
        ]);
    }

    /**
     * Remove the specified work specification.
     */
    public function destroy($id)
    {
        $spec = WorkSpecification::withCount('karigars')->findOrFail($id);

        if ($spec->karigars_count > 0) {
            return response()->json([
                'message' => "Cannot delete '{$spec->name}' because {$spec->karigars_count} master artisan(s) are currently assigned to this craft specification. You can deactivate it instead.",
            ], 422);
        }

        $spec->delete();

        return response()->json([
            'message' => 'Work specification deleted successfully.',
        ]);
    }
}
