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
        // Auto-seed initial work specifications if database table is empty
        if (WorkSpecification::count() === 0) {
            $this->seedInitialWorkSpecifications();
        }

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
             COALESCE(AVG(CASE WHEN status = ? THEN default_wastage_percent END), 0) as avg_wastage',
            ['active', 'inactive', 'active']
        )->first();

        $stats = [
            'total'        => (int) ($statsRow->total ?? 0),
            'active_count' => (int) ($statsRow->active_count ?? 0),
            'inactive_count' => (int) ($statsRow->inactive_count ?? 0),
            'avg_wastage'  => round($statsRow->avg_wastage ?? 0, 2),
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

    /**
     * Helper to populate default work craft specifications.
     */
    public function seedInitialWorkSpecifications()
    {
        $initialSpecs = [
            [
                'code' => 'SPEC-001',
                'name' => 'Antique & Temple Work',
                'description' => 'Specialized in 22K Nagas, Nakshi, handcrafted temple jewellery, and antique heritage pieces.',
                'default_wastage_percent' => 5.20,
                'default_making_charge' => 680.00,
                'icon' => 'fa-solid fa-vihara',
                'color' => 'amber',
                'status' => 'active',
                'sort_order' => 1,
            ],
            [
                'code' => 'SPEC-002',
                'name' => 'Diamond & Prong Setting',
                'description' => 'Micro-pave, claw, prong, bezel, and invisible diamond and gemstone setting.',
                'default_wastage_percent' => 3.80,
                'default_making_charge' => 850.00,
                'icon' => 'fa-solid fa-gem',
                'color' => 'blue',
                'status' => 'active',
                'sort_order' => 2,
            ],
            [
                'code' => 'SPEC-003',
                'name' => 'Plain Gold & Machine Casting',
                'description' => 'Centrifugal vacuum casting, plain 22K/18K gold bangles, chains, and bullion casting.',
                'default_wastage_percent' => 3.50,
                'default_making_charge' => 450.00,
                'icon' => 'fa-solid fa-cubes-stacked',
                'color' => 'emerald',
                'status' => 'active',
                'sort_order' => 3,
            ],
            [
                'code' => 'SPEC-004',
                'name' => 'Kundan & Meenakari',
                'description' => 'Traditional Jaipur reverse enamel work, Jadau foil setting, and intricate color meena.',
                'default_wastage_percent' => 6.00,
                'default_making_charge' => 920.00,
                'icon' => 'fa-solid fa-palette',
                'color' => 'purple',
                'status' => 'active',
                'sort_order' => 4,
            ],
            [
                'code' => 'SPEC-005',
                'name' => 'Stone Setting & Polishing',
                'description' => 'Navaratna setting, semi-precious stone insertion, high-luster polishing, and rhodium plating.',
                'default_wastage_percent' => 4.20,
                'default_making_charge' => 520.00,
                'icon' => 'fa-solid fa-star',
                'color' => 'red',
                'status' => 'active',
                'sort_order' => 5,
            ],
            [
                'code' => 'SPEC-006',
                'name' => 'Filigree & Die Work',
                'description' => 'Delicate wire filigree, embossed die-cutting, stamp work, and decorative sheet motifs.',
                'default_wastage_percent' => 4.80,
                'default_making_charge' => 620.00,
                'icon' => 'fa-solid fa-feather-pointed',
                'color' => 'slate',
                'status' => 'active',
                'sort_order' => 6,
            ],
        ];

        foreach ($initialSpecs as $specData) {
            WorkSpecification::updateOrCreate(
                ['code' => $specData['code']],
                $specData
            );
        }
    }
}
