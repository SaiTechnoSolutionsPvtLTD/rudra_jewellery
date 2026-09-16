<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Karigar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class KarigarController extends Controller
{
    /**
     * Display a listing of karigars with stats and search/filters.
     */
    public function index(Request $request)
    {
        $query = Karigar::query();

        // Search across name, code, phone, email, specialization, city
        if ($request->filled('search')) {
            $search = trim($request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('karigar_code', 'like', "%{$search}%")
                  ->orWhere('primary_phone', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('specialization', 'like', "%{$search}%")
                  ->orWhere('workshop_name', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        // Specialization filter
        if ($request->filled('specialization') && $request->specialization !== 'all') {
            $query->where('specialization', $request->specialization);
        }

        // Status filter
        if ($request->filled('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }

        // Calculate statistics in a single aggregate query (no Karigar::all() scan)
        $statsRow = DB::table('karigars')->selectRaw(
            'COUNT(*) as total_karigars,
             SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as active_karigars,
             SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as on_leave_karigars,
             COALESCE(SUM(current_gold_balance_grams), 0) as total_gold_balance,
             COALESCE(AVG(standard_wastage_percent), 0) as avg_wastage_percent',
            ['active', 'on_leave']
        )->first();

        $stats = [
            'total_karigars'    => (int) ($statsRow->total_karigars ?? 0),
            'active_karigars'   => (int) ($statsRow->active_karigars ?? 0),
            'on_leave_karigars' => (int) ($statsRow->on_leave_karigars ?? 0),
            'total_gold_balance'  => round($statsRow->total_gold_balance ?? 0, 3),
            'avg_wastage_percent' => round($statsRow->avg_wastage_percent ?? 0, 2),
        ];

        // Ordering
        $sortBy = $request->input('sort_by', 'created_at');
        $sortDir = $request->input('sort_dir', 'desc');
        $query->orderBy($sortBy, $sortDir);

        // Pagination or full list
        $perPage = (int) $request->input('per_page', 10);
        if ($perPage === -1 || $request->input('all') === 'true') {
            $karigars = $query->get();
            $this->attachWorkOrderMetadata($karigars);
            return response()->json([
                'status' => 'success',
                'data' => $karigars,
                'stats' => $stats,
            ]);
        }

        $paginated = $query->paginate($perPage);
        $items = collect($paginated->items());
        $this->attachWorkOrderMetadata($items);

        return response()->json([
            'status' => 'success',
            'data' => $items,
            'meta' => [
                'current_page' => $paginated->currentPage(),
                'last_page' => $paginated->lastPage(),
                'per_page' => $paginated->perPage(),
                'total' => $paginated->total(),
            ],
            'stats' => $stats,
        ]);
    }

    /**
     * Attach current assigned work order, availability status, and work order counts
     */
    protected function attachWorkOrderMetadata($karigars)
    {
        if ($karigars->isEmpty()) return;

        $karigarIds = $karigars->pluck('id')->toArray();

        // Get all active work orders for these karigars in one query
        $activeOrders = \App\Models\WorkOrder::whereIn('karigar_id', $karigarIds)
            ->whereNotIn('status', ['completed', 'cancelled', 'final_received'])
            ->latest('id')
            ->get()
            ->groupBy('karigar_id');

        // Counts grouped by karigar and status
        $statusCounts = \App\Models\WorkOrder::whereIn('karigar_id', $karigarIds)
            ->selectRaw("karigar_id,
                SUM(CASE WHEN status NOT IN ('completed', 'cancelled', 'final_received') THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN status IN ('completed', 'final_received') THEN 1 ELSE 0 END) as completed_count,
                SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned_count")
            ->groupBy('karigar_id')
            ->get()
            ->keyBy('karigar_id');

        foreach ($karigars as $k) {
            $currentOrder = $activeOrders->get($k->id)?->first();
            $counts = $statusCounts->get($k->id);

            $k->current_assigned_order = $currentOrder ? [
                'id' => $currentOrder->id,
                'work_order_number' => $currentOrder->work_order_number,
                'product_name' => $currentOrder->product_name,
                'status' => $currentOrder->status,
                'current_stage' => $currentOrder->current_stage,
                'allotted_date' => $currentOrder->allotted_date?->toDateString(),
                'delivery_date' => $currentOrder->delivery_date?->toDateString(),
                'allotted_weight' => (float)$currentOrder->allotted_weight,
            ] : null;

            $k->is_available = ($currentOrder === null);
            $k->active_works_count = (int)($counts->active_count ?? 0);
            $k->completed_works_count = (int)($counts->completed_count ?? 0);
            $k->returned_works_count = (int)($counts->returned_count ?? 0);
        }
    }

    /**
     * Generate the next unique karigar code.
     */
    public function generateCode()
    {
        $last = Karigar::withTrashed()
            ->where('karigar_code', 'like', 'KRG-%')
            ->orderBy('id', 'desc')
            ->first();

        if ($last && preg_match('/KRG-(\d+)/', $last->karigar_code, $matches)) {
            $nextNumber = intval($matches[1]) + 1;
        } else {
            $nextNumber = 1001;
        }

        return response()->json([
            'status' => 'success',
            'code' => 'KRG-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT),
        ]);
    }

    /**
     * Store a newly created karigar in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'karigar_code' => 'required|string|unique:karigars,karigar_code',
            'name' => 'required|string|max:255',
            'primary_phone' => 'required|string|max:20',
            'secondary_phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'specialization' => 'required|string|max:100',
            'experience_years' => 'nullable|integer|min:0',
            'workshop_name' => 'nullable|string|max:255',
            'workshop_address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'zip_code' => 'nullable|string|max:20',
            'pan_number' => 'nullable|string|max:20',
            'aadhar_number' => 'nullable|string|max:20',
            'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'ifsc_code' => 'nullable|string|max:20',
            'upi_id' => 'nullable|string|max:100',
            'standard_wastage_percent' => 'nullable|numeric|min:0|max:100',
            'making_charge_per_gram' => 'nullable|numeric|min:0',
            'current_gold_balance_grams' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:active,on_leave,inactive',
            'avatar_url' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $data = $validator->validated();
        if (empty($data['status'])) {
            $data['status'] = 'active';
        }
        if (empty($data['city'])) {
            $data['city'] = 'Chennai';
        }
        if (empty($data['state'])) {
            $data['state'] = 'Tamil Nadu';
        }

        $karigar = Karigar::create($data);

        return response()->json([
            'status' => 'success',
            'message' => 'Karigar created successfully',
            'data' => $karigar,
        ], 201);
    }

    /**
     * Display the specified karigar.
     */
    public function show($id)
    {
        $karigar = Karigar::find($id);

        if (!$karigar) {
            return response()->json([
                'status' => 'error',
                'message' => 'Karigar not found',
            ], 404);
        }

        return response()->json([
            'status' => 'success',
            'data' => $karigar,
        ]);
    }

    /**
     * Update the specified karigar in storage.
     */
    public function update(Request $request, $id)
    {
        $karigar = Karigar::find($id);

        if (!$karigar) {
            return response()->json([
                'status' => 'error',
                'message' => 'Karigar not found',
            ], 404);
        }

        $validator = Validator::make($request->all(), [
            'karigar_code' => 'required|string|unique:karigars,karigar_code,' . $id,
            'name' => 'required|string|max:255',
            'primary_phone' => 'required|string|max:20',
            'secondary_phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'specialization' => 'required|string|max:100',
            'experience_years' => 'nullable|integer|min:0',
            'workshop_name' => 'nullable|string|max:255',
            'workshop_address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'zip_code' => 'nullable|string|max:20',
            'pan_number' => 'nullable|string|max:20',
            'aadhar_number' => 'nullable|string|max:20',
            'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'ifsc_code' => 'nullable|string|max:20',
            'upi_id' => 'nullable|string|max:100',
            'standard_wastage_percent' => 'nullable|numeric|min:0|max:100',
            'making_charge_per_gram' => 'nullable|numeric|min:0',
            'current_gold_balance_grams' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:active,on_leave,inactive',
            'avatar_url' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $karigar->update($validator->validated());

        return response()->json([
            'status' => 'success',
            'message' => 'Karigar updated successfully',
            'data' => $karigar,
        ]);
    }

    /**
     * Remove the specified karigar from storage.
     */
    public function destroy($id)
    {
        $karigar = Karigar::find($id);

        if (!$karigar) {
            return response()->json([
                'status' => 'error',
                'message' => 'Karigar not found',
            ], 404);
        }

        $karigar->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Karigar removed successfully',
        ]);
    }

    /**
     * Helper to populate initial master artisans.
     */
    private function seedInitialKarigars()
    {
        $initials = [
            [
                'karigar_code' => 'KRG-1001',
                'name' => 'Rajesh Varma',
                'primary_phone' => '+91 98401 23456',
                'secondary_phone' => '+91 98401 23457',
                'email' => 'rajesh.varma@craftgoldsmith.in',
                'specialization' => 'Antique & Temple Work',
                'experience_years' => 18,
                'workshop_name' => 'Varma Handcrafted Filigree & Temple Arts',
                'workshop_address' => 'No. 42, NSC Bose Road, Sowcarpet',
                'city' => 'Chennai',
                'state' => 'Tamil Nadu',
                'zip_code' => '600079',
                'pan_number' => 'ABCDE1234F',
                'aadhar_number' => '4321 8765 2109',
                'bank_name' => 'State Bank of India',
                'account_number' => '30982415124',
                'ifsc_code' => 'SBIN0001234',
                'upi_id' => 'rajeshvarma@sbi',
                'standard_wastage_percent' => 5.20,
                'making_charge_per_gram' => 680.00,
                'current_gold_balance_grams' => 142.500,
                'status' => 'active',
                'avatar_url' => 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
                'notes' => 'Master artisan specializing in 22K Nagas and South Indian traditional Temple necklace sets.',
            ],
            [
                'karigar_code' => 'KRG-1002',
                'name' => 'Suresh Achari',
                'primary_phone' => '+91 97890 87654',
                'secondary_phone' => null,
                'email' => 'suresh.achari@gemsettings.com',
                'specialization' => 'Diamond & Prong Setting',
                'experience_years' => 14,
                'workshop_name' => 'Precision Micro Pave Studio',
                'workshop_address' => '12/4, Mint Street, George Town',
                'city' => 'Chennai',
                'state' => 'Tamil Nadu',
                'zip_code' => '600001',
                'pan_number' => 'FGHIJ5678K',
                'aadhar_number' => '8765 4321 9876',
                'bank_name' => 'HDFC Bank',
                'account_number' => '501004128965',
                'ifsc_code' => 'HDFC0000124',
                'upi_id' => 'sureshadorn@hdfcbank',
                'standard_wastage_percent' => 3.80,
                'making_charge_per_gram' => 850.00,
                'current_gold_balance_grams' => 88.250,
                'status' => 'active',
                'avatar_url' => 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
                'notes' => 'Micro-prong and invisible diamond setter for solitaires, bridal sets and eternity rings.',
            ],
            [
                'karigar_code' => 'KRG-1003',
                'name' => 'Gopal Das',
                'primary_phone' => '+91 94440 33221',
                'secondary_phone' => '+91 94440 33222',
                'email' => 'gopaldas.casting@gmail.com',
                'specialization' => 'Plain Gold & Machine Casting',
                'experience_years' => 12,
                'workshop_name' => 'Das Casting & Vacuum Foundry',
                'workshop_address' => 'Plot 88, SIDCO Industrial Estate, Guindy',
                'city' => 'Chennai',
                'state' => 'Tamil Nadu',
                'zip_code' => '600032',
                'pan_number' => 'KLMNO9012P',
                'aadhar_number' => '1122 3344 5566',
                'bank_name' => 'ICICI Bank',
                'account_number' => '001105023412',
                'ifsc_code' => 'ICIC0000011',
                'upi_id' => 'gopaldas@icici',
                'standard_wastage_percent' => 3.50,
                'making_charge_per_gram' => 450.00,
                'current_gold_balance_grams' => 210.800,
                'status' => 'active',
                'avatar_url' => 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
                'notes' => 'High throughput automated centrifugal and vacuum casting. Handles daily bullion batches.',
            ],
            [
                'karigar_code' => 'KRG-1004',
                'name' => 'Babu Mistry',
                'primary_phone' => '+91 98840 99887',
                'secondary_phone' => null,
                'email' => 'babu.mistry@jaipurenka.in',
                'specialization' => 'Kundan & Meenakari',
                'experience_years' => 22,
                'workshop_name' => 'Royal Heritage Enamel Works',
                'workshop_address' => '25, Govindappa Naicken Street',
                'city' => 'Chennai',
                'state' => 'Tamil Nadu',
                'zip_code' => '600001',
                'pan_number' => 'QRSTU3456V',
                'aadhar_number' => '9988 7766 5544',
                'bank_name' => 'Canara Bank',
                'account_number' => '1205101034561',
                'ifsc_code' => 'CNRB0001205',
                'upi_id' => 'babumistry@upi',
                'standard_wastage_percent' => 6.00,
                'making_charge_per_gram' => 920.00,
                'current_gold_balance_grams' => 64.100,
                'status' => 'on_leave',
                'avatar_url' => 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
                'notes' => 'Expert in traditional reverse Jaipur meenakari enameling and jadau foil backing.',
            ],
            [
                'karigar_code' => 'KRG-1005',
                'name' => 'Kavitha Swaminathan',
                'primary_phone' => '+91 94451 12389',
                'secondary_phone' => '+91 94451 12390',
                'email' => 'kavitha.swami@gemstonecraft.in',
                'specialization' => 'Stone Setting & Polishing',
                'experience_years' => 9,
                'workshop_name' => 'Sri Lakshmi Gem Finishers',
                'workshop_address' => '15, South Mada Street, Mylapore',
                'city' => 'Chennai',
                'state' => 'Tamil Nadu',
                'zip_code' => '600004',
                'pan_number' => 'WXYZ12345A',
                'aadhar_number' => '3344 5566 7788',
                'bank_name' => 'Axis Bank',
                'account_number' => '916020045612348',
                'ifsc_code' => 'UTIB0000054',
                'upi_id' => 'kavithas@axisbank',
                'standard_wastage_percent' => 4.20,
                'making_charge_per_gram' => 520.00,
                'current_gold_balance_grams' => 35.450,
                'status' => 'active',
                'avatar_url' => 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
                'notes' => 'Specialized in semi-precious navaratna settings and high-luster rhodium finish.',
            ],
        ];

        foreach ($initials as $item) {
            Karigar::create($item);
        }
    }

    /**
     * Get active and completed works assigned to a specific karigar
     */
    public function works(Request $request, $id)
    {
        $karigar = Karigar::with('user')->findOrFail($id);

        $activeWorks = \App\Models\WorkOrder::where('karigar_id', $id)
            ->whereNotIn('status', ['completed', 'cancelled', 'final_received'])
            ->with(['timelines', 'client', 'category', 'subcategory'])
            ->latest('id')
            ->get();

        $completedWorks = \App\Models\WorkOrder::where('karigar_id', $id)
            ->whereIn('status', ['completed', 'final_received'])
            ->with(['timelines', 'client', 'category', 'subcategory'])
            ->latest('id')
            ->get();

        $allWorks = $activeWorks->concat($completedWorks);

        return response()->json([
            'status' => 'success',
            'karigar' => $karigar,
            'data' => $allWorks,
            'active_works' => $activeWorks,
            'completed_works' => $completedWorks,
            'active_count' => $activeWorks->count(),
            'completed_count' => $completedWorks->count(),
        ]);
    }
}
