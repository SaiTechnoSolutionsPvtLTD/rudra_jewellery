<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Karigar;
use App\Helpers\GoldConversionHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

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

        // Calculate statistics dynamically on the filtered query
        $statsQuery = clone $query;
        $statsRow = $statsQuery
            ->selectRaw(
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

        // Workload & quantity aggregates (Section 5)
        $workloadStats = \App\Models\WorkOrder::whereIn('karigar_id', $karigarIds)
            ->selectRaw("karigar_id,
                COUNT(id) as total_wo_count,
                SUM(CASE WHEN status NOT IN ('completed', 'cancelled', 'final_received') THEN 1 ELSE 0 END) as active_wo_count,
                SUM(COALESCE(required_qty, 1)) as total_required_qty,
                SUM(COALESCE(completed_qty, 0)) as total_completed_qty,
                SUM(COALESCE(qc_pending_qty, 0)) as total_qc_qty,
                SUM(COALESCE(rework_qty, 0)) as total_rework_qty,
                SUM(COALESCE(ready_qty, 0)) as total_ready_qty,
                SUM(COALESCE(received_qty, 0)) as total_received_qty,
                SUM(CASE WHEN is_delayed = 1 THEN 1 ELSE 0 END) as delayed_wo_count,
                SUM(CASE WHEN status IN ('completed', 'final_received') THEN 1 ELSE 0 END) as completed_count,
                SUM(CASE WHEN status = 'returned' THEN 1 ELSE 0 END) as returned_count")
            ->groupBy('karigar_id')
            ->get()
            ->keyBy('karigar_id');

        foreach ($karigars as $k) {
            $currentOrder = $activeOrders->get($k->id)?->first();
            $wl = $workloadStats->get($k->id);

            // Compute live bench metal WIP from active work orders
            $activeWosForK = $activeOrders->get($k->id) ?? collect();
            $liveBenchGold = (float) $activeWosForK->sum(function($wo) {
                return (float) ($wo->pending_weight ?? max(0, ((float)$wo->allotted_weight + (float)($wo->additional_allocated_weight ?? 0)) - (float)$wo->completed_weight - (float)$wo->wastage_weight - (float)($wo->returned_weight ?? 0)));
            });

            $hasLedgerTxs = \App\Models\KarigarMaterialTransaction::where('karigar_id', $k->id)->exists();
            if ($hasLedgerTxs) {
                app(\App\Http\Controllers\Api\KarigarMaterialController::class)->syncKarigarBalances($k);
                $k->refresh();
                $k->bench_metal_wip = round((float)$k->current_gold_balance_grams, 3);
            } else {
                $k->bench_metal_wip = round($liveBenchGold, 3);
                if (((float)$k->current_gold_balance_grams == 0 && $liveBenchGold > 0) || abs((float)$k->current_gold_balance_grams - $liveBenchGold) > 0.001) {
                    $k->current_gold_balance_grams = round($liveBenchGold, 3);
                    \App\Models\Karigar::where('id', $k->id)->update(['current_gold_balance_grams' => round($liveBenchGold, 3)]);
                }
            }

            // Calculate pure 24K fine gold balance
            $fineGoldBal = 0.0;
            $diaCarats = 0.0;
            $diaPcs = 0;
            foreach ($activeWosForK as $wo) {
                $m = strtolower($wo->material_type ?? '');
                $purity = $wo->purity ?? $wo->material_type ?? '22K Gold';
                $pnd = (float) ($wo->pending_weight ?? max(0, ((float)$wo->allotted_weight + (float)($wo->additional_allocated_weight ?? 0)) - (float)$wo->completed_weight - (float)$wo->wastage_weight - (float)($wo->returned_weight ?? 0)));
                if (!str_contains($m, 'silver') && !str_contains($m, 'diamond')) {
                    $fineGoldBal += GoldConversionHelper::convertTo24kPureWeight($pnd, $purity);
                }
                // Diamonds
                if ($wo->relationLoaded('items') || $wo->items) {
                    foreach ($wo->items as $itm) {
                        $p = $itm->pricing_details ?? [];
                        $st = $itm->stone_details ?? [];
                        $qty = max(1, (int)($itm->required_qty ?? 1));
                        $diaCarats += (float)($p['diamond_weight'] ?? $st['diamond_weight'] ?? 0) * $qty;
                        $diaPcs += (int)($p['no_of_diamonds'] ?? $p['diamond_count'] ?? $st['diamond_count'] ?? 0) * $qty;
                    }
                }
            }
            if ($fineGoldBal == 0 && (float)$k->current_gold_balance_grams > 0) {
                $fineGoldBal = GoldConversionHelper::convertTo24kPureWeight((float)$k->current_gold_balance_grams, '22K Gold');
            }
            $k->fine_gold_balance = round($fineGoldBal, 3);

            // Compute financial cash balance
            $karigarMatController = app(\App\Http\Controllers\Api\KarigarMaterialController::class);
            $fin = $karigarMatController->calculateFinancialSummary($k->id);
            $k->cash_balance = (float)($fin['net_balance'] ?? 0);
            $k->diamond_balance_carats = round($diaCarats, 3);
            $k->diamond_balance_pieces = $diaPcs;

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

            // Multiple work orders allowed; never block assignment
            $k->is_available = true;
            $k->active_works_count = (int)($wl->active_wo_count ?? 0);
            $k->completed_works_count = (int)($wl->completed_count ?? 0);
            $k->returned_works_count = (int)($wl->returned_count ?? 0);

            // Section 5: Exact workload metadata
            $k->active_work_orders = (int)($wl->active_wo_count ?? 0);
            $k->active_jobs = (int)($wl->active_wo_count ?? 0);
            $k->required_qty = (int)($wl->total_required_qty ?? 0);
            $k->completed_qty = (int)($wl->total_completed_qty ?? 0);
            $k->pending_qty = max(0, (int)($wl->total_required_qty ?? 0) - (int)($wl->total_completed_qty ?? 0));
            $k->qc_qty = (int)($wl->total_qc_qty ?? 0);
            $k->rework_qty = (int)($wl->total_rework_qty ?? 0);
            $k->ready_qty = (int)($wl->total_ready_qty ?? 0);
            $k->delayed_jobs = (int)($wl->delayed_wo_count ?? 0);
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
     * Sanitize phone number to standard 10 digits.
     */
    private function sanitizePhone($val)
    {
        if (!$val) return $val;
        $digits = preg_replace('/\D/', '', (string)$val);
        if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
            $digits = substr($digits, 2);
        } elseif (strlen($digits) === 11 && str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }
        return strlen($digits) === 10 ? $digits : $val;
    }

    /**
     * Process avatar input: handles uploaded file or base64 image data URI,
     * stores the file in public storage, and returns the public path.
     */
    private function processAvatarInput(Request $request, $rawAvatar, $karigarId = null): ?string
    {
        // 1. Check for directly uploaded file
        $fileKeys = ['avatar_file', 'avatar', 'avatar_url', 'image', 'photo'];
        foreach ($fileKeys as $key) {
            if ($request->hasFile($key)) {
                $file = $request->file($key);
                if ($file && $file->isValid()) {
                    Storage::disk('public')->makeDirectory('karigars/avatars');
                    $path = $file->store('karigars/avatars', 'public');

                    // Also copy directly to public/storage for environment compatibility
                    try {
                        $publicStorageDir = public_path('storage/karigars/avatars');
                        if (!file_exists($publicStorageDir)) {
                            @mkdir($publicStorageDir, 0755, true);
                        }
                        $targetPath = public_path('storage/' . $path);
                        @copy(storage_path('app/public/' . $path), $targetPath);
                    } catch (\Exception $e) {
                        Log::warning('Failed copying karigar avatar to public storage: ' . $e->getMessage());
                    }

                    return '/storage/' . $path;
                }
            }
        }

        if (empty($rawAvatar) || $rawAvatar === 'null' || $rawAvatar === 'undefined') {
            return null;
        }

        $rawAvatar = trim((string)$rawAvatar);

        // 2. Handle base64 data URI
        if (stripos($rawAvatar, 'data:image') === 0) {
            try {
                if (preg_match('/^data:image\/([a-zA-Z0-9\+\-\.]+)(?:;[a-zA-Z0-9\=\-]+)*;base64,(.*)$/is', $rawAvatar, $matches)) {
                    $rawType = strtolower($matches[1]);
                    $base64Data = $matches[2];
                } else {
                    $commaPos = strpos($rawAvatar, ',');
                    $header = substr($rawAvatar, 0, $commaPos);
                    $base64Data = substr($rawAvatar, $commaPos + 1);
                    preg_match('/data:image\/([a-zA-Z0-9\+\-\.]+)/i', $header, $typeMatch);
                    $rawType = strtolower($typeMatch[1] ?? 'png');
                }

                $extMap = [
                    'jpeg' => 'jpg',
                    'jpg' => 'jpg',
                    'png' => 'png',
                    'webp' => 'webp',
                    'gif' => 'gif',
                    'svg+xml' => 'svg',
                    'svg' => 'svg',
                    'avif' => 'avif',
                ];
                $ext = $extMap[$rawType] ?? 'png';

                $base64Data = str_replace(' ', '+', trim($base64Data));
                $decoded = base64_decode($base64Data);

                if ($decoded !== false && strlen($decoded) > 0) {
                    Storage::disk('public')->makeDirectory('karigars/avatars');
                    $fileName = 'karigars/avatars/karigar_' . ($karigarId ?: uniqid()) . '_' . time() . '.' . $ext;
                    Storage::disk('public')->put($fileName, $decoded);

                    try {
                        $publicStorageDir = public_path('storage/karigars/avatars');
                        if (!file_exists($publicStorageDir)) {
                            @mkdir($publicStorageDir, 0755, true);
                        }
                        @file_put_contents(public_path('storage/' . $fileName), $decoded);
                    } catch (\Exception $e) {
                        Log::warning('Failed saving karigar avatar to public storage: ' . $e->getMessage());
                    }

                    return '/storage/' . $fileName;
                }
            } catch (\Exception $e) {
                Log::error('Karigar avatar base64 processing error: ' . $e->getMessage());
            }
        }

        // 3. If it's already a saved relative path or URL
        if (str_starts_with($rawAvatar, '/storage/') || str_starts_with($rawAvatar, 'storage/')) {
            return str_starts_with($rawAvatar, '/') ? $rawAvatar : '/' . $rawAvatar;
        }

        if (filter_var($rawAvatar, FILTER_VALIDATE_URL)) {
            return $rawAvatar;
        }

        return $rawAvatar;
    }

    /**
     * Store a newly created karigar in storage.
     */
    public function store(Request $request)
    {
        if ($request->has('primary_phone')) {
            $request->merge(['primary_phone' => $this->sanitizePhone($request->primary_phone)]);
        }
        if ($request->has('secondary_phone')) {
            $request->merge(['secondary_phone' => $this->sanitizePhone($request->secondary_phone)]);
        }

        $validator = Validator::make($request->all(), [
            'karigar_code' => 'required|string|unique:karigars,karigar_code',
            'name' => ['required', 'string', 'max:255', 'regex:/^[\p{L}\s.\'-]+$/u'],
            'primary_phone' => ['required', 'string', 'regex:/^[6-9]\d{9}$/'],
            'secondary_phone' => ['nullable', 'string', 'regex:/^[6-9]\d{9}$/'],
            'email' => 'nullable|email|max:255',
            'specialization' => 'required|string|max:100',
            'experience_years' => 'nullable|integer|min:0',
            'workshop_name' => 'nullable|string|max:255',
            'workshop_address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'zip_code' => ['nullable', 'string', 'regex:/^[1-9][0-9]{5}$/'],
            'pan_number' => ['nullable', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
            'aadhar_number' => ['nullable', 'string', 'regex:/^\d{12}$/'],
            'bank_name' => 'nullable|string|max:100',
            'account_number' => ['nullable', 'string', 'regex:/^\d{9,18}$/'],
            'ifsc_code' => ['nullable', 'string', 'regex:/^[A-Z]{4}0[A-Z0-9]{6}$/i'],
            'upi_id' => 'nullable|string|max:100',
            'standard_wastage_percent' => 'nullable|numeric|min:0|max:100',
            'making_charge_per_gram' => 'nullable|numeric|min:0',
            'current_gold_balance_grams' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:active,on_leave,inactive',
            'avatar' => 'nullable',
            'avatar_url' => 'nullable',
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
        if (!empty($data['email'])) {
            $data['email'] = strtolower(trim($data['email']));
        }

        // Process avatar: write image to disk and save only public URL path in database
        if ($request->has('avatar_url') || $request->has('avatar') || $request->hasFile('avatar_url') || $request->hasFile('avatar')) {
            $rawAvatar = $request->input('avatar_url') ?? $request->input('avatar');
            $data['avatar_url'] = $this->processAvatarInput($request, $rawAvatar);
        }

        unset($data['avatar']);

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

        if ($request->has('primary_phone')) {
            $request->merge(['primary_phone' => $this->sanitizePhone($request->primary_phone)]);
        }
        if ($request->has('secondary_phone')) {
            $request->merge(['secondary_phone' => $this->sanitizePhone($request->secondary_phone)]);
        }

        $validator = Validator::make($request->all(), [
            'karigar_code' => 'required|string|unique:karigars,karigar_code,' . $id,
            'name' => ['required', 'string', 'max:255', 'regex:/^[\p{L}\s.\'-]+$/u'],
            'primary_phone' => ['required', 'string', 'regex:/^[6-9]\d{9}$/'],
            'secondary_phone' => ['nullable', 'string', 'regex:/^[6-9]\d{9}$/'],
            'email' => 'nullable|email|max:255',
            'specialization' => 'required|string|max:100',
            'experience_years' => 'nullable|integer|min:0',
            'workshop_name' => 'nullable|string|max:255',
            'workshop_address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'zip_code' => ['nullable', 'string', 'regex:/^[1-9][0-9]{5}$/'],
            'pan_number' => ['nullable', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
            'aadhar_number' => ['nullable', 'string', 'regex:/^\d{12}$/'],
            'bank_name' => 'nullable|string|max:100',
            'account_number' => ['nullable', 'string', 'regex:/^\d{9,18}$/'],
            'ifsc_code' => ['nullable', 'string', 'regex:/^[A-Z]{4}0[A-Z0-9]{6}$/i'],
            'upi_id' => 'nullable|string|max:100',
            'standard_wastage_percent' => 'nullable|numeric|min:0|max:100',
            'making_charge_per_gram' => 'nullable|numeric|min:0',
            'current_gold_balance_grams' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:active,on_leave,inactive',
            'avatar' => 'nullable',
            'avatar_url' => 'nullable',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Validation error',
                'errors' => $validator->errors(),
            ], 422);
        }

        $validatedData = $validator->validated();
        if (!empty($validatedData['email'])) {
            $validatedData['email'] = strtolower(trim($validatedData['email']));
        }

        // Process avatar: write image to disk and save only public URL path in database
        if ($request->has('avatar_url') || $request->has('avatar') || $request->hasFile('avatar_url') || $request->hasFile('avatar')) {
            $rawAvatar = $request->input('avatar_url') ?? $request->input('avatar');
            $newAvatar = $this->processAvatarInput($request, $rawAvatar, $karigar->id);
            if ($karigar->avatar_url && $newAvatar !== $karigar->avatar_url && str_starts_with($karigar->avatar_url, '/storage/karigars/')) {
                $oldRel = str_replace('/storage/', '', $karigar->avatar_url);
                @Storage::disk('public')->delete($oldRel);
                @unlink(public_path('storage/' . $oldRel));
            }
            $validatedData['avatar_url'] = $newAvatar;
        }

        unset($validatedData['avatar']);

        $karigar->update($validatedData);

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
     * Get active and completed works assigned to a specific karigar
     */
    public function works(Request $request, $id)
    {
        $karigar = Karigar::with('user')->findOrFail($id);

        $activeWorks = \App\Models\WorkOrder::where('karigar_id', $id)
            ->whereNotIn('status', ['completed', 'cancelled', 'final_received'])
            ->with(['jobOrder', 'timelines', 'client', 'category', 'subcategory'])
            ->latest('id')
            ->get();

        $completedWorks = \App\Models\WorkOrder::where('karigar_id', $id)
            ->whereIn('status', ['completed', 'final_received'])
            ->with(['jobOrder', 'timelines', 'client', 'category', 'subcategory'])
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

    /**
     * Get consolidated Metal Hisab (Settlement) summary and balance sheet for a Karigar.
     */
    public function hisabSummary(Request $request, $id)
    {
        $karigar = Karigar::findOrFail($id);

        // 1. Raw Material Issues & Returns
        $transactions = \App\Models\KarigarMaterialTransaction::where('karigar_id', $id)
            ->with('rawMaterial')
            ->latest('transaction_date')
            ->get();

        $totalIssuedGold = (float) $transactions->where('transaction_type', 'issue')->where('material_type', 'gold')->sum('quantity');
        $totalReturnedGold = (float) $transactions->where('transaction_type', 'return')->where('material_type', 'gold')->sum('quantity');
        $totalIssuedSilver = (float) $transactions->where('transaction_type', 'issue')->where('material_type', 'silver')->sum('quantity');
        $totalReturnedSilver = (float) $transactions->where('transaction_type', 'return')->where('material_type', 'silver')->sum('quantity');

        // 2. Finished Physical Pieces Received
        $pieces = \App\Models\WorkOrderReceivedPiece::where('karigar_id', $id)
            ->orWhereHas('workOrder', fn ($q) => $q->where('karigar_id', $id))
            ->with(['workOrder:id,work_order_number,status', 'product:id,name,product_code'])
            ->latest('received_at')
            ->get();

        $totalPiecesCount = $pieces->count();
        $totalFinishedGross = (float) $pieces->sum('gross_weight');
        $totalFinishedNetGold = (float) $pieces->sum('net_gold_weight');
        $standardWastagePct = (float) ($karigar->standard_wastage_percent ?: 3.50);
        $totalAllowedWastageGold = round($totalFinishedNetGold * ($standardWastagePct / 100), 3);
        $totalMakingChargesEarned = round((float) $pieces->sum('total_making_charge'), 2);

        // 3. Current Live Net Metal Balance Formula:
        // Net Balance = (Issued Gold) - (Finished Pieces Net Gold + Direct Metal Returned + Allowed Wastage)
        $accountedGold = round($totalFinishedNetGold + $totalReturnedGold + $totalAllowedWastageGold, 3);
        $calculatedGoldBalance = round($totalIssuedGold - $accountedGold, 3);

        // Fallback to model's live field if transactions are legacy
        $liveGoldBalance = round((float) ($karigar->current_gold_balance_grams ?: $calculatedGoldBalance), 3);

        return response()->json([
            'status' => 'success',
            'karigar' => [
                'id' => $karigar->id,
                'name' => $karigar->name,
                'karigar_code' => $karigar->karigar_code,
                'workshop_name' => $karigar->workshop_name,
                'primary_phone' => $karigar->primary_phone,
                'standard_wastage_percent' => $standardWastagePct,
                'making_charge_per_gram' => (float) $karigar->making_charge_per_gram,
                'current_gold_balance_grams' => $liveGoldBalance,
            ],
            'summary' => [
                'total_issued_gold_grams' => round($totalIssuedGold, 3),
                'total_returned_gold_grams' => round($totalReturnedGold, 3),
                'total_pieces_produced' => $totalPiecesCount,
                'total_finished_gross_weight' => round($totalFinishedGross, 3),
                'total_finished_net_gold_grams' => round($totalFinishedNetGold, 3),
                'total_allowed_wastage_grams' => $totalAllowedWastageGold,
                'total_accounted_gold_grams' => $accountedGold,
                'net_gold_balance_grams' => $liveGoldBalance,
                'total_making_charges_earned' => $totalMakingChargesEarned,
                'total_issued_silver_grams' => round($totalIssuedSilver, 3),
                'total_returned_silver_grams' => round($totalReturnedSilver, 3),
            ],
            'recent_pieces' => $pieces->take(15)->values(),
            'recent_transactions' => $transactions->take(15)->values(),
        ]);
    }
}
