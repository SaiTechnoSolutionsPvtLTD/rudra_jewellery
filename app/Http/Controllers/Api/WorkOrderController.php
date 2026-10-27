<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkOrder;
use App\Models\WorkOrderTimeline;
use App\Models\Karigar;
use App\Models\Product;
use App\Models\Client;
use App\Models\Category;
use App\Models\Subcategory;
use App\Models\WorkOrderNotification;
use App\Models\WorkOrderItem;
use App\Models\WorkOrderReceivedPiece;
use App\Models\User;
use App\Services\NotificationService;
use App\Helpers\GoldConversionHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Auth;
use Barryvdh\DomPDF\Facade\Pdf;
use Carbon\Carbon;

class WorkOrderController extends Controller
{
    /**
     * Stage progression order mapping (index represents step rank)
     */
    protected array $stageOrder = [
        'created' => 1,
        'assigned' => 2,
        'allocated' => 2,
        'received_by_artisan' => 3,
        'work_started' => 4,
        'work_in_progress' => 5,
        'in_progress' => 5,
        'delayed' => 5,
        'on_hold' => 5,
        'work_completed' => 6,
        'submitted' => 7,
        'resubmitted' => 7,
        'sent_for_approval' => 7,
        'quality_check' => 8,
        'approved' => 9,
        'ready' => 10,
        'delivered' => 11,
        'final_received' => 12,
        'completed' => 12,
    ];

    /**
     * Generate next sequential work order number
     */
    public function generateOrderNumber()
    {
        $year = date('Y');
        $latest = WorkOrder::withTrashed()
            ->where('work_order_number', 'like', "WO-{$year}-%")
            ->orderBy('id', 'desc')
            ->first();

        if ($latest && preg_match("/WO-{$year}-(\d+)/", $latest->work_order_number, $matches)) {
            $nextNum = str_pad((int)$matches[1] + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $count = WorkOrder::withTrashed()->count();
            $nextNum = str_pad($count + 1, 4, '0', STR_PAD_LEFT);
        }

        return response()->json([
            'work_order_number' => "WO-{$year}-{$nextNum}"
        ]);
    }

    /**
     * Generate next sequential Job Order number (e.g. JO-2026-0001)
     */
    public function generateJobOrderNumber()
    {
        $year = date('Y');
        $latest = \App\Models\JobOrder::withTrashed()
            ->where('job_order_number', 'like', "JO-{$year}-%")
            ->orderBy('id', 'desc')
            ->first();

        if ($latest && preg_match("/JO-{$year}-(\d+)/", $latest->job_order_number, $matches)) {
            $nextNum = str_pad((int)$matches[1] + 1, 4, '0', STR_PAD_LEFT);
        } else {
            $count = \App\Models\JobOrder::withTrashed()->count();
            $nextNum = str_pad($count + 1, 4, '0', STR_PAD_LEFT);
        }

        return response()->json([
            'job_order_number' => "JO-{$year}-{$nextNum}"
        ]);
    }

    /**
     * List work orders with tab/filter support
     */
    public function index(Request $request)
    {
        $query = WorkOrder::with([
            'jobOrder', 'karigar', 'product', 'category', 'subcategory', 
            'client', 'creator', 'items.product.category', 'items.category', 'items.subcategory', 'receivedPieces', 'delayUpdater',
            'certificationUpdater', 'hallmarkingUpdater'
        ]);

        // Search filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('work_order_number', 'like', "%{$search}%")
                  ->orWhere('job_number', 'like', "%{$search}%")
                  ->orWhere('product_name', 'like', "%{$search}%")
                  ->orWhere('karigar_name', 'like', "%{$search}%")
                  ->orWhere('material_type', 'like', "%{$search}%")
                  ->orWhereHas('items', function($iq) use ($search) {
                      $iq->where('design_no', 'like', "%{$search}%")
                         ->orWhere('product_name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('jobOrder', function($jq) use ($search) {
                      $jq->where('job_order_number', 'like', "%{$search}%");
                  });
            });
        }

        // Job Order ID filter
        if ($request->filled('job_order_id') && $request->job_order_id !== 'all') {
            $query->where('job_order_id', $request->job_order_id);
        }

        // Artisan / Karigar filter
        if ($request->filled('karigar_id') && $request->karigar_id !== 'all') {
            $query->where('karigar_id', $request->karigar_id);
        }

        // Category filter
        if ($request->filled('category_id') && $request->category_id !== 'all') {
            $query->where('category_id', $request->category_id);
        }

        // Delayed only filter flag
        if ($request->boolean('delayed_only')) {
            $query->where(function($q) {
                $q->where('is_delayed', true)
                  ->orWhere(function($sq) {
                      $sq->where('delivery_date', '<', Carbon::today()->toDateString())
                         ->whereNotIn('status', ['completed', 'final_received']);
                  });
            });
        }

        // Tab views
        $tab = $request->input('tab', 'all');
        $today = Carbon::today()->toDateString();

        switch ($tab) {
            case 'ongoing':
                $query->whereNotIn('status', ['completed', 'cancelled', 'final_received']);
                break;

            case 'in_progress':
                $query->where(function($q) {
                    $q->whereIn('current_stage', ['work_started', 'work_in_progress', 'received_by_artisan', 'assigned', 'rework', 'reworking'])
                      ->orWhereIn('status', ['in_progress', 'returned'])
                      ->orWhere('rework_qty', '>', 0)
                      ->orWhereRaw('completed_qty < required_qty');
                })->whereNotIn('status', ['completed', 'cancelled', 'final_received']);
                break;

            case 'delayed':
                $query->where(function($q) use ($today) {
                    $q->where('is_delayed', true)
                      ->orWhere(function($sq) use ($today) {
                          $sq->where('delivery_date', '<', $today)
                             ->whereNotIn('status', ['completed', 'final_received']);
                      });
                });
                break;

            case 'quality_check':
                $query->where(function($q) {
                    $q->where('qc_pending_qty', '>', 0)
                      ->orWhereIn('current_stage', ['work_completed', 'sent_for_approval', 'quality_check'])
                      ->orWhere('status', 'pending_approval');
                })->whereNotIn('status', ['completed', 'cancelled']);
                break;

            case 'ready':
                $query->where(function($q) {
                    $q->where(function($rq) {
                        $rq->where('ready_qty', '>', 0)
                           ->whereRaw('received_qty < ready_qty');
                    })->orWhere(function($rq) {
                        $rq->where('qc_approved_qty', '>', 0)
                           ->whereRaw('received_qty < qc_approved_qty');
                    })->orWhere(function($rq) {
                        $rq->whereIn('current_stage', ['ready'])
                           ->whereRaw('received_qty < required_qty');
                    });
                })->whereNotIn('status', ['completed', 'cancelled', 'final_received']);
                break;

            case 'final_receive':
            case 'receive':
                $query->where(function($q) {
                    $q->where('ready_qty', '>', 0)
                      ->whereRaw('received_qty < ready_qty');
                })->whereNotIn('status', ['completed', 'cancelled', 'final_received']);
                break;

            case 'certification':
                $query->where('received_qty', '>', 0)
                    ->where(function($q) {
                        $q->whereNull('certification_status')
                          ->orWhere('certification_status', 'pending')
                          ->orWhereRaw('certified_qty < received_qty');
                    })
                    ->whereNotIn('status', ['completed', 'cancelled', 'final_received']);
                break;

            case 'hallmarking':
                $query->where('received_qty', '>', 0)
                    ->where(function($q) {
                        $q->whereIn('certification_status', ['completed', 'skipped', 'not_required'])
                          ->orWhereRaw('certified_qty >= received_qty');
                    })
                    ->where(function($q) {
                        $q->whereNull('hallmarking_status')
                          ->orWhere('hallmarking_status', 'pending')
                          ->orWhereRaw('hallmarked_qty < received_qty');
                    })
                    ->whereNotIn('status', ['completed', 'cancelled', 'final_received']);
                break;

            case 'history':
                $query->whereIn('status', ['completed', 'final_received']);
                break;

            case 'completed_approval':
                $query->where('status', 'pending_approval');
                break;

            default:
                break;
        }

        $orders = $query->latest()->get();

        // Compute delay information dynamically for each order
        $orders->transform(function ($order) use ($today) {
            $isDelayed = (bool) $order->is_delayed;
            $delayDays = (int) ($order->delay_days ?: 0);

            $dDateStr = null;
            if (!empty($order->delivery_date)) {
                $dDateStr = is_object($order->delivery_date) 
                    ? $order->delivery_date->toDateString() 
                    : (string) $order->delivery_date;
            }

            if ($dDateStr && substr($dDateStr, 0, 10) < $today && !in_array($order->status, ['completed', 'final_received'])) {
                $isDelayed = true;
                if ($delayDays <= 0) {
                    try {
                        $delayDays = (int) Carbon::parse($dDateStr)->diffInDays(Carbon::now());
                    } catch (\Exception $e) {
                        $delayDays = 0;
                    }
                }
            }
            $order->is_delayed = $isDelayed;
            $order->delay_days = $delayDays;

            // Calculated scrap / wastage
            $order->calc_wastage_weight = max(0, $order->allotted_weight - $order->completed_weight);
            return $order;
        });

        return response()->json([
            'status' => 'success',
            'data' => $orders,
            'total' => $orders->count()
        ]);
    }

    /**
     * Store new work order (Page 15 Add Row / Form)
     */
    public function store(Request $request)
    {
        try {
            // Handle multi-job work order creation
            $items = $request->input('items');
            if (is_array($items) && count($items) > 0) {
                $totalGoldWeight = 0;
                foreach ($items as $itm) {
                    $rowWeight = (float) ($itm['total_gross_wt'] ?? $itm['total_weight'] ?? $itm['allotted_weight'] ?? 0);
                    if ($rowWeight <= 0) {
                        $rowWeight = ((float) ($itm['gold_weight'] ?? 0)) * max(1, (int) ($itm['need_pcs'] ?? 1));
                    }
                    $totalGoldWeight += $rowWeight;
                }
                if (!$request->filled('allotted_weight')) {
                    $request->merge(['allotted_weight' => max(0.001, round($totalGoldWeight, 3))]);
                }
                if (!$request->filled('product_name')) {
                    $count = count($items);
                    $firstVariant = $items[0]['variant'] ?? $items[0]['product_name'] ?? 'Jewelry Piece';
                    $prodName = $count > 1 ? "{$firstVariant} + " . ($count - 1) . " More Items" : $firstVariant;
                    $request->merge(['product_name' => $prodName]);
                }
                if (!$request->filled('allotted_date')) {
                    $request->merge(['allotted_date' => $items[0]['ordered_date'] ?? now()->toDateString()]);
                }
                if (!$request->filled('delivery_date')) {
                    $request->merge(['delivery_date' => $items[0]['delivery_date'] ?? now()->addDays(7)->toDateString()]);
                }
                if (!$request->filled('material_type') && !empty($items[0]['material_type'])) {
                    $request->merge(['material_type' => $items[0]['material_type']]);
                }
                if (!$request->filled('image_url') && !empty($items[0]['image'])) {
                    $request->merge(['image_url' => $items[0]['image']]);
                }
            }

            // BUSINESS RULE: Rudra Jewellery supplies Gold, Silver, Platinum and Diamonds for WorkOrders, but loose colour stones are not company-supplied.
            if ($request->filled('material_type')) {
                $mat = strtolower($request->input('material_type'));
                if (str_contains($mat, 'colour_stone') || str_contains($mat, 'loose_stone')) {
                    throw \Illuminate\Validation\ValidationException::withMessages([
                        'material_type' => ['Loose Stone Allocation Prohibited: Karigars procure loose colour stones independently. Metals and certified Diamonds can be allocated to work orders.']
                    ]);
                }
            }

            $validated = $request->validate([
                'product_name' => 'required|string|max:255',
                'allotted_date' => 'required|date',
                'delivery_date' => 'nullable|date',
                'allotted_weight' => 'required|numeric|min:0.001',
                'karigar_id' => 'nullable|exists:karigars,id',
                'client_id' => 'nullable|exists:clients,id',
                'customer_name' => 'nullable|string|max:255',
                'product_id' => 'nullable|exists:products,id',
                'category_id' => 'nullable|exists:categories,id',
                'subcategory_id' => 'nullable|exists:subcategories,id',
                'material_type' => 'nullable|string|max:100',
                'priority' => 'nullable|string|max:50',
                'wastage_allowed_percent' => 'nullable|numeric|min:0',
                'making_charge_per_gram' => 'nullable|numeric|min:0',
                'stone_details' => 'nullable|array',
                'checklist' => 'nullable|array',
                'pricing_details' => 'nullable|array',
                'notes' => 'nullable|string',
                'image_url' => 'nullable|string',
            ]);

            return DB::transaction(function () use ($request, $validated, $items) {
                $year = date('Y');

                // Determine safe creator user ID and name
                $creatorUserId = Auth::id() ?: (\App\Models\User::where('status', 'active')->value('id') ?? \App\Models\User::value('id') ?? null);
                $creatorUserName = Auth::user()?->name ?: (\App\Models\User::find($creatorUserId)?->name ?? 'Admin');

                // Generate or verify Parent Job Order Number
                $jobOrderNumber = $request->input('job_order_number');
                if (empty($jobOrderNumber) || \App\Models\JobOrder::withTrashed()->where('job_order_number', $jobOrderNumber)->exists()) {
                    $latestJo = \App\Models\JobOrder::withTrashed()
                        ->where('job_order_number', 'like', "JO-{$year}-%")
                        ->orderBy('id', 'desc')
                        ->first();
                    $num = 1;
                    if ($latestJo && preg_match("/JO-{$year}-(\d+)/", $latestJo->job_order_number, $matches)) {
                        $num = (int)$matches[1] + 1;
                    } else {
                        $num = \App\Models\JobOrder::withTrashed()->count() + 1;
                    }
                    do {
                        $jobOrderNumber = "JO-{$year}-" . str_pad($num++, 4, '0', STR_PAD_LEFT);
                    } while (\App\Models\JobOrder::withTrashed()->where('job_order_number', $jobOrderNumber)->exists());
                }

                // Calculate total allotted weight across items or single order
                $jobItemsList = (is_array($items) && count($items) > 0) ? $items : [[
                    'product_name' => $validated['product_name'],
                    'category_id' => $validated['category_id'] ?? null,
                    'subcategory_id' => $validated['subcategory_id'] ?? null,
                    'karigar_id' => $validated['karigar_id'] ?? null,
                    'material_type' => $validated['material_type'] ?? 'Gold 22K (916)',
                    'gold_weight' => $validated['allotted_weight'],
                    'making_charge_per_gram' => $validated['making_charge_per_gram'] ?? 0,
                    'wastage_allowed_percent' => $validated['wastage_allowed_percent'] ?? 0,
                    'design_number' => $request->input('design_code', 'DES-' . rand(1000, 9999)),
                    'image' => $validated['image_url'] ?? null,
                    'delivery_date' => $validated['delivery_date'] ?? null,
                ]];

                $totalAllotted = 0;
                foreach ($jobItemsList as $itm) {
                    $rowGross = (float) ($itm['total_gross_wt'] ?? $itm['total_weight'] ?? 0);
                    if ($rowGross > 0) {
                        $totalAllotted += $rowGross;
                    } else {
                        $pcs = max(1, (int) ($itm['need_pcs'] ?? $itm['qty'] ?? 1));
                        $perPiece = (float) ($itm['gold_weight'] ?? $itm['allotted_weight'] ?? 0);
                        $totalAllotted += ($perPiece * $pcs);
                    }
                }

                // Validate and sanitize client_id
                $clientId = $validated['client_id'] ?? null;
                if ($clientId && !\App\Models\Client::where('id', $clientId)->exists()) {
                    $clientId = null;
                }

                // Create Parent JobOrder
                $jobOrder = \App\Models\JobOrder::create([
                    'job_order_number' => $jobOrderNumber,
                    'client_id' => $clientId,
                    'customer_name' => $validated['customer_name'] ?? null,
                    'order_date' => $validated['allotted_date'],
                    'delivery_date' => $validated['delivery_date'] ?? null,
                    'status' => 'ongoing',
                    'total_jobs_count' => count($jobItemsList),
                    'total_allotted_weight' => round($totalAllotted, 3),
                    'total_completed_weight' => 0,
                    'total_pending_weight' => round($totalAllotted, 3),
                    'notes' => $validated['notes'] ?? null,
                    'created_by' => $creatorUserId,
                ]);

                // Determine unique Work Order number
                $workOrderNumber = $request->input('work_order_number');
                if (empty($workOrderNumber) || WorkOrder::withTrashed()->where('work_order_number', $workOrderNumber)->exists()) {
                    $latestWo = WorkOrder::withTrashed()
                        ->where('work_order_number', 'like', "WO-{$year}-%")
                        ->orderBy('id', 'desc')
                        ->first();
                    $num = 1;
                    if ($latestWo && preg_match("/WO-{$year}-(\d+)/", $latestWo->work_order_number, $matches)) {
                        $num = (int)$matches[1] + 1;
                    } else {
                        $num = WorkOrder::withTrashed()->count() + 1;
                    }
                    do {
                        $workOrderNumber = "WO-{$year}-" . str_pad($num++, 4, '0', STR_PAD_LEFT);
                    } while (WorkOrder::withTrashed()->where('work_order_number', $workOrderNumber)->exists());
                }

                // Resolve Karigar safely
                $itemKarigarId = $validated['karigar_id'] ?? null;
                $itemKarigarName = null;
                if (!empty($itemKarigarId)) {
                    $k = Karigar::find($itemKarigarId);
                    if ($k) {
                        $itemKarigarName = $k->name;
                    } else {
                        $itemKarigarId = null;
                    }
                }

                // Ensure all items carry the correct work_order_no and calculate totals
                $totalGoldWeight = 0;
                $totalMakingCharges = 0;
                $totalPrice = 0;
                foreach ($jobItemsList as &$itm) {
                    $itm['work_order_no'] = $workOrderNumber;
                    $w = (float) ($itm['total_gross_wt'] ?? $itm['total_weight'] ?? $itm['allotted_weight'] ?? 0);
                    if ($w <= 0) {
                        $w = ((float) ($itm['gold_weight'] ?? 0)) * max(1, (int) ($itm['need_pcs'] ?? 1));
                    }
                    $mc = (float) ($itm['making_charge_per_gram'] ?? $validated['making_charge_per_gram'] ?? 0);
                    $totalGoldWeight += $w;
                    $totalMakingCharges += ($w * $mc);
                    $totalPrice += (float) ($itm['total_price'] ?? ($w * $mc));
                }
                unset($itm);

                if ($totalGoldWeight <= 0) {
                    $totalGoldWeight = (float) ($validated['allotted_weight'] ?? 10.0);
                }

                $firstItem = $jobItemsList[0] ?? [];
                $itemMaterial = $validated['material_type'] ?? ($firstItem['material_type'] ?? 'Gold 22K (916)');
                $itemProductName = $request->input('product_name') ?: ($firstItem['variant'] ?? $firstItem['product_name'] ?? $validated['product_name']);
                $imageUrl = $request->input('image_url') ?: ($firstItem['reference_image'] ?? $firstItem['design_file'] ?? $firstItem['image'] ?? $validated['image_url'] ?? null);

                // Clean up any large Base64 strings in image_url, items, and documents to prevent MySQL 2006 max_allowed_packet error
                $imageUrl = $this->processBase64Data($imageUrl);

                foreach ($jobItemsList as &$itm) {
                    if (!empty($itm['reference_image'])) {
                        $itm['reference_image'] = $this->processBase64Data($itm['reference_image']);
                    }
                    if (!empty($itm['design_file'])) {
                        $itm['design_file'] = $this->processBase64Data($itm['design_file']);
                    }
                    if (!empty($itm['image'])) {
                        $itm['image'] = $this->processBase64Data($itm['image']);
                    }
                    if (!empty($itm['reference_image'])) {
                        $itm['image'] = $itm['reference_image'];
                    }
                }
                unset($itm);

                $documents = $request->input('documents', []);
                if (is_array($documents)) {
                    foreach ($documents as &$doc) {
                        if (is_array($doc) && !empty($doc['url'])) {
                            $doc['url'] = $this->processBase64Data($doc['url']);
                        } elseif (is_string($doc)) {
                            $doc = $this->processBase64Data($doc);
                        }
                    }
                    unset($doc);
                }

                $pricingDetails = $validated['pricing_details'] ?? [];
                $detectedPurity = $request->input('gold_purity') ?? $request->input('purity') ?? $request->input('karat') ?? ($firstItem['gold_purity'] ?? $firstItem['purity'] ?? null);
                if (!$detectedPurity && preg_match('/(24\s*k(?:arat|t)?|22\s*k(?:arat|t)?|18\s*k(?:arat|t)?|14\s*k(?:arat|t)?|999|916|750)/i', $itemMaterial, $pm)) {
                    $v = strtoupper(trim($pm[1]));
                    $detectedPurity = $v === '999' ? '24K' : ($v === '916' ? '22K' : ($v === '750' ? '18K' : $v));
                }
                if (!$detectedPurity) {
                    $detectedPurity = '22K';
                }
                $pricingDetails['required_gold_weight'] = round($totalGoldWeight, 3);
                $pricingDetails['gold_purity'] = $detectedPurity;
                $pricingDetails['purity'] = $detectedPurity;
                $pricingDetails['karat'] = $detectedPurity;
                $pricingDetails['items'] = $jobItemsList;
                $pricingDetails['documents'] = $documents;
                $pricingDetails['job_summary'] = $request->input('job_summary', []);
                $pricingDetails['material_breakdown'] = $request->input('material_breakdown', []);
                $pricingDetails['worker_allocation'] = $request->input('worker_allocation', []);

                $totalRequiredQty = 0;
                $totalDiamondCaratsRequired = 0;
                $totalDiamondPiecesRequired = 0;
                $totalStonesCountRequired = 0;
                $stampDetailsSummary = [];
                foreach ($jobItemsList as $itm) {
                    $pcs = max(1, (int)($itm['need_pcs'] ?? $itm['quantity'] ?? $itm['qty'] ?? 1));
                    $totalRequiredQty += $pcs;
                    $diaWt = (float)($itm['diamond_weight'] ?? 0);
                    $diaCount = (int)($itm['no_of_diamonds'] ?? $itm['diamond_count'] ?? 0);
                    $stoneCount = (int)($itm['no_of_colour_stones'] ?? $itm['color_stone_count'] ?? 0);
                    $totalDiamondCaratsRequired += ($diaWt * $pcs);
                    $totalDiamondPiecesRequired += ($diaCount * $pcs);
                    $totalStonesCountRequired += ($stoneCount * $pcs);
                    if (!empty($itm['stamp_and_no'])) {
                        $stampDetailsSummary[] = $itm['stamp_and_no'];
                    } elseif (!empty($itm['diamond_stamp'])) {
                        $stampDetailsSummary[] = $itm['diamond_stamp'] . '-' . $diaCount;
                    }
                }
                if ($totalRequiredQty <= 0) $totalRequiredQty = 1;
                $allStampsText = implode(', ', array_unique(array_filter($stampDetailsSummary)));

                // Validate Diamond Stock in RawMaterial vault
                $diamondShortageNotice = null;
                if (($totalDiamondCaratsRequired > 0 || $totalDiamondPiecesRequired > 0) && !$request->boolean('allow_shortage')) {
                    \App\Models\RawMaterial::recalculateAllocations();

                    // Tally authoritative stock across diamond vault
                    $diaBalance = (float) \App\Models\RawMaterial::where('material_type', 'diamond')->sum('current_balance');
                    $diaCountBalance = (int) \App\Models\RawMaterial::where('material_type', 'diamond')->sum('current_count');

                    // Shortage in diamond carat weight
                    $shortageCarats = max(0.0, round($totalDiamondCaratsRequired - $diaBalance, 3));

                    // Diamond Piece Count Logic:
                    // In diamond jewellery manufacturing, diamonds are frequently stocked as parcel/bulk lots by carat weight.
                    // When the vault holds sufficient diamond carat weight to cover the required weight ($shortageCarats <= 0),
                    // the required pieces are physically available and drawn from the diamond parcel stock.
                    if ($shortageCarats <= 0) {
                        $shortageCount = 0;
                        $effectiveAvailableCount = max($diaCountBalance, $totalDiamondPiecesRequired);
                    } else {
                        // Genuine shortage of diamonds in the vault (insufficient carats)
                        $shortageCount = max(0, $totalDiamondPiecesRequired - $diaCountBalance);
                        $effectiveAvailableCount = $diaCountBalance;
                    }

                    if ($shortageCarats > 0) {
                        $msg = "Vault has {$shortageCarats} ct low stock: Required {$totalDiamondCaratsRequired} ct ({$totalDiamondPiecesRequired} pcs), but available vault balance is {$diaBalance} ct ({$diaCountBalance} pcs).";
                        throw new \Illuminate\Http\Exceptions\HttpResponseException(response()->json([
                            'status' => 'error',
                            'error_type' => 'INSUFFICIENT_DIAMOND_STOCK',
                            'message' => $msg,
                            'errors' => ['diamond_stock' => [$msg]],
                            'required_carats' => round($totalDiamondCaratsRequired, 3),
                            'available_carats' => round($diaBalance, 3),
                            'shortage_carats' => $shortageCarats,
                            'required_count' => $totalDiamondPiecesRequired,
                            'available_count' => $effectiveAvailableCount,
                            'shortage_count' => $shortageCount,
                            'stamp_details' => $allStampsText,
                        ], 422));
                    }
                }

                // Validate Colour-Stone Stock in RawMaterial vault (cannot be negative)
                if ($totalStonesCountRequired > 0 && !$request->boolean('allow_shortage')) {
                    $stoneVault = \App\Models\RawMaterial::where('material_type', 'stone')->first();
                    $stoneBalance = $stoneVault ? (float)$stoneVault->current_balance : 0;
                    if ($stoneBalance < $totalStonesCountRequired) {
                        $shortageStones = max(0, $totalStonesCountRequired - (int)$stoneBalance);
                        $msg = "Vault has {$shortageStones} units low stock: Required {$totalStonesCountRequired} colour-stone units, but available vault balance is {$stoneBalance} units.";
                        throw new \Illuminate\Http\Exceptions\HttpResponseException(response()->json([
                            'status' => 'error',
                            'error_type' => 'INSUFFICIENT_DIAMOND_STOCK',
                            'message' => $msg,
                            'errors' => ['stone_stock' => [$msg]],
                            'required_carats' => 0,
                            'available_carats' => 0,
                            'shortage_carats' => 0,
                            'required_count' => $totalStonesCountRequired,
                            'available_count' => (int)$stoneBalance,
                            'shortage_count' => $shortageStones,
                            'stamp_details' => 'Colour Stones',
                        ], 422));
                    }
                }

                $firstDesignNo = $firstItem['design_number'] ?? $firstItem['design_no'] ?? null;
                $resolvedProductId = $validated['product_id'] ?? ($firstItem['product_id'] ?? null);
                if (!$resolvedProductId && !empty($firstDesignNo)) {
                    $p = Product::where('design_no', $firstDesignNo)->orWhere('product_code', $firstDesignNo)->first();
                    $resolvedProductId = $p?->id;
                }
                if ($resolvedProductId && !Product::where('id', $resolvedProductId)->exists()) {
                    $resolvedProductId = null;
                }

                $workOrder = WorkOrder::create([
                    'job_order_id' => $jobOrder->id,
                    'job_number' => $jobOrderNumber,
                    'work_order_number' => $workOrderNumber,
                    'client_id' => $clientId,
                    'customer_name' => $validated['customer_name'] ?? null,
                    'product_id' => $resolvedProductId,
                    'product_name' => $itemProductName,
                    'category_id' => $validated['category_id'] ?? null,
                    'subcategory_id' => $validated['subcategory_id'] ?? null,
                    'karigar_id' => $itemKarigarId,
                    'karigar_name' => $itemKarigarName,
                    'material_type' => $itemMaterial,
                    'priority' => $validated['priority'] ?? 'Normal',
                    'required_qty' => $totalRequiredQty,
                    'completed_qty' => 0,
                    'qc_pending_qty' => 0,
                    'qc_approved_qty' => 0,
                    'rework_qty' => 0,
                    'ready_qty' => 0,
                    'received_qty' => 0,
                    'allotted_date' => $validated['allotted_date'],
                    'delivery_date' => $firstItem['delivery_date'] ?? $validated['delivery_date'] ?? null,
                    'allotted_weight' => 0.000,
                    'completed_weight' => 0,
                    'pending_weight' => 0.000,
                    'expected_return_weight' => round($totalGoldWeight, 3),
                    'wastage_allowed_percent' => (float) ($firstItem['wastage_allowed_percent'] ?? $validated['wastage_allowed_percent'] ?? 0),
                    'wastage_weight' => 0,
                    'making_charge_per_gram' => (float) ($validated['making_charge_per_gram'] ?? 0),
                    'total_making_charges' => round($totalMakingCharges, 2),
                    'total_price' => round($totalPrice, 2),
                    'current_stage' => !empty($itemKarigarId) ? 'assigned' : 'created',
                    'status' => !empty($itemKarigarId) ? 'assigned' : 'ongoing',
                    'checklist' => $validated['checklist'] ?? [
                        'product_received' => false,
                        'weight_verified' => false,
                        'stone_verified' => false,
                        'design_verified' => false,
                        'work_completed' => false,
                        'quality_checked' => false,
                        'documents_verified' => false,
                    ],
                    'stone_details' => $validated['stone_details'] ?? [],
                    'pricing_details' => $pricingDetails,
                    'design_code' => $firstItem['design_number'] ?? $request->input('design_code', 'DES-' . rand(1000, 9999)),
                    'image_url' => $imageUrl,
                    'notes' => $validated['notes'] ?? null,
                    'created_by' => $creatorUserId,
                ]);

                // Persist individual jobs as WorkOrderItem records
                foreach ($jobItemsList as $jIdx => $jItm) {
                    $jDesignNo = $jItm['design_number'] ?? $jItm['design_no'] ?? ($workOrder->design_code ?: 'DES-' . (rand(1000, 9999) + $jIdx));
                    $jReqQty = max(1, (int)($jItm['need_pcs'] ?? $jItm['quantity'] ?? $jItm['qty'] ?? 1));
                    $jWeight = (float) ($jItm['gold_weight'] ?? $jItm['allotted_weight'] ?? 0);
                    $jMc = (float) ($jItm['making_charge_per_gram'] ?? $validated['making_charge_per_gram'] ?? 0);

                    $jProdId = $jItm['product_id'] ?? null;
                    if (!$jProdId && !empty($jDesignNo)) {
                        $p = Product::where('design_no', $jDesignNo)->orWhere('product_code', $jDesignNo)->first();
                        $jProdId = $p?->id;
                    }
                    if ($jProdId && !Product::where('id', $jProdId)->exists()) {
                        $jProdId = null;
                    }

                    $jCatId = $jItm['category_id'] ?? $workOrder->category_id;
                    if ($jCatId && !\App\Models\Category::where('id', $jCatId)->exists()) {
                        $jCatId = null;
                    }

                    $jSubCatId = $jItm['subcategory_id'] ?? $workOrder->subcategory_id;
                    if ($jSubCatId && !\App\Models\Subcategory::where('id', $jSubCatId)->exists()) {
                        $jSubCatId = null;
                    }

                    WorkOrderItem::create([
                        'work_order_id' => $workOrder->id,
                        'job_order_id' => $jobOrder->id,
                        'product_id' => $jProdId,
                        'design_no' => $jDesignNo,
                        'product_name' => $jItm['product_name'] ?? $jItm['variant'] ?? ($jItm['name'] ?? $workOrder->product_name),
                        'category_id' => $jCatId,
                        'subcategory_id' => $jSubCatId,
                        'item_code' => $jDesignNo,
                        'required_qty' => $jReqQty,
                        'completed_qty' => 0,
                        'qc_pending_qty' => 0,
                        'qc_approved_qty' => 0,
                        'rework_qty' => 0,
                        'ready_qty' => 0,
                        'received_qty' => 0,
                        'allotted_weight' => 0.000,
                        'completed_weight' => 0,
                        'making_charge_per_gram' => $jMc,
                        'total_making_charges' => round($jWeight * $jMc, 2),
                        'stone_details' => $jItm['stone_details'] ?? null,
                        'pricing_details' => $jItm,
                        'status' => 'pending',
                    ]);
                }

                // Initial Timeline Events
                WorkOrderTimeline::create([
                    'work_order_id' => $workOrder->id,
                    'stage' => 'created',
                    'stage_label' => "Work Order Created ({$workOrderNumber})",
                    'completed_weight_at_step' => 0,
                    'pending_weight_at_step' => 0,
                    'status' => 'completed',
                    'notes' => "Work Order {$workOrderNumber} with " . count($jobItemsList) . " jobs (Required Gold: " . round($totalGoldWeight, 3) . "g, Total Qty: {$totalRequiredQty}) created under Job Order {$jobOrderNumber}. Materials pending allocation from vault.",
                    'user_id' => $creatorUserId,
                    'action_by_name' => $creatorUserName,
                    'created_at' => now(),
                ]);

                if (!empty($itemKarigarId)) {
                    WorkOrderTimeline::create([
                        'work_order_id' => $workOrder->id,
                        'stage' => 'assigned',
                        'stage_label' => "Assigned to Artisan ({$itemKarigarName})",
                        'completed_weight_at_step' => 0,
                        'pending_weight_at_step' => 0,
                        'status' => 'completed',
                        'notes' => "Work Order {$workOrderNumber} assigned to artisan {$itemKarigarName}. Materials pending allocation from vault.",
                        'user_id' => $creatorUserId,
                        'action_by_name' => $creatorUserName,
                        'created_at' => now()->addSecond(),
                    ]);
                }

                // Dispatch business notifications safely
                try {
                    if (!empty($itemKarigarId)) {
                        NotificationService::notifyWorkOrderAssigned($workOrder, $creatorUserId);
                    }
                    NotificationService::notifyWorkOrderCreated($workOrder, $creatorUserId);
                } catch (\Throwable $e) {
                    Log::warning('Work order notification dispatch warning: ' . $e->getMessage());
                }

                // Material allocation is handled exclusively through Karigar Management -> Material Allocation
                // Work order creation does not automatically debit gold, diamonds, or stones from the vault.

                // Synchronize Karigar balance safely
                if (!empty($itemKarigarId)) {
                    try {
                        $this->syncKarigarGoldBalance($itemKarigarId);
                    } catch (\Throwable $e) {
                        Log::warning('syncKarigarGoldBalance warning: ' . $e->getMessage());
                    }
                }

                // Update Parent Job Order totals & status safely
                try {
                    $jobOrder->updateDerivedStatus();
                } catch (\Throwable $e) {
                    Log::warning('updateDerivedStatus warning: ' . $e->getMessage());
                }

                return response()->json([
                    'status' => 'success',
                    'message' => 'Work Order created successfully.',
                    'job_order' => $jobOrder->load('jobs'),
                    'data' => $workOrder->load(['karigar', 'product', 'category', 'subcategory', 'client', 'timelines', 'jobOrder', 'items'])
                ], 201);
            });
        } catch (\Illuminate\Validation\ValidationException $ve) {
            throw $ve;
        } catch (\Illuminate\Http\Exceptions\HttpResponseException $he) {
            throw $he;
        } catch (\Throwable $e) {
            Log::error('WorkOrderController::store failure: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString(),
            ]);

            $isDatabaseError = $e instanceof \Illuminate\Database\QueryException || $e instanceof \PDOException;
            $userSafeMsg = $isDatabaseError
                ? 'Unable to create work order. Please verify your inputs and try again.'
                : ('Unable to create work order: ' . $e->getMessage());

            return response()->json([
                'status' => 'error',
                'message' => $userSafeMsg,
            ], 400);
        }
    }

    /**
     * Synchronize a Karigar's material balances:
     * - current_gold_balance_grams: Actual company-owned physical gold on bench (>= 0).
     *   Formula: Sum of (allotted_weight + additional_allocated_weight - completed_weight - wastage_weight - returned_weight) for non-completed orders.
     * - karigar_gold_balance_grams: Karigar-owned gold contributions.
     * - settlement_balance_grams: Signed balance (+ = karigar holds company gold, - = company owes karigar).
     */
    public function syncKarigarGoldBalance($karigarId)
    {
        if (!$karigarId) return;

        $karigar = Karigar::find($karigarId);
        if (!$karigar) return;

        // Update pending_weight on all work orders for this Karigar
        $orders = WorkOrder::where('karigar_id', $karigarId)->with('receivedPieces')->get();

        foreach ($orders as $wo) {
            $piecesSum = (float) $wo->receivedPieces->whereNotNull('received_at')->sum('gross_weight');
            $updated = false;
            if ($piecesSum > 0 && abs((float)$wo->completed_weight - $piecesSum) > 0.0001) {
                $wo->completed_weight = round($piecesSum, 3);
                $updated = true;
            }
            if (\App\Models\KarigarMaterialTransaction::where('work_order_id', $wo->id)->where('material_type', 'gold')->exists()) {
                $recon = \App\Services\WorkOrderGoldReconciliationService::calculateForWorkOrder($wo);
                $pending = (float) ($recon['unused_fine_gold'] ?? 0);
            } else {
                $allotted = (float)$wo->allotted_weight + (float)($wo->additional_allocated_weight ?? 0);
                $completed = (float)$wo->completed_weight;
                $wastage = (float)$wo->wastage_weight;
                $returned = (float)($wo->returned_weight ?? 0);
                $pending = max(0.0, round($allotted - $completed - $wastage - $returned, 3));
            }
            if (abs((float)$wo->pending_weight - $pending) > 0.0001) {
                $wo->pending_weight = $pending;
                $updated = true;
            }
            if ($updated) {
                $wo->saveQuietly();
            }
        }

        // Authoritatively synchronize persistent running balances on Karigar model
        app(\App\Http\Controllers\Api\KarigarMaterialController::class)->syncKarigarBalances($karigar);
    }

    /**
     * Show single work order
     */
    public function show($id)
    {
        $order = WorkOrder::with([
            'karigar', 'product', 'category', 'subcategory', 'client',
            'creator', 'qualityChecker', 'approver', 'timelines',
            'items.product.category', 'items.category', 'items.subcategory',
            'receivedPieces', 'delayUpdater', 'certificationUpdater', 'hallmarkingUpdater'
        ])->findOrFail($id);

        self::ensurePiecesInitialized($order);
        $order->load('receivedPieces');

        if ($order->receivedPieces && $order->receivedPieces->isNotEmpty()) {
            foreach ($order->items as $it) {
                $itemPiecesSum = (float) $order->receivedPieces
                    ->where('work_order_item_id', $it->id)
                    ->where('gross_weight', '>', 0)
                    ->sum('gross_weight');
                if ($itemPiecesSum > 0 && abs((float)$it->completed_weight - $itemPiecesSum) > 0.001) {
                    $it->completed_weight = round($itemPiecesSum, 3);
                    $it->saveQuietly();
                }
            }

            $orderPiecesSum = (float) $order->receivedPieces
                ->where('gross_weight', '>', 0)
                ->sum('gross_weight');
            if ($orderPiecesSum > 0 && abs((float)$order->completed_weight - $orderPiecesSum) > 0.001) {
                $order->completed_weight = round($orderPiecesSum, 3);
                $order->pending_weight = max(0, round((float)$order->allotted_weight - (float)$order->completed_weight, 3));
                $order->saveQuietly();
            }
        }

        return response()->json([
            'status' => 'success',
            'data' => $order
        ]);
    }

    /**
     * Update receiver work with strict business validation rules (Page 16)
     */
    public function updateReceiver(Request $request, $id)
    {
        $order = WorkOrder::findOrFail($id);

        // Security check: Receiver CANNOT edit allotted_weight
        if ($request->has('allotted_weight')) {
            $attemptedAllotted = (float) $request->input('allotted_weight');
            if (abs($attemptedAllotted - $order->allotted_weight) > 0.0001) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Unauthorized: Allotted Weight is locked and cannot be modified by receiver.'
                ], 422);
            }
        }

        $validated = $request->validate([
            'completed_weight' => 'nullable|numeric|min:0',
            'pending_weight' => 'nullable|numeric|min:0',
            'current_stage' => 'nullable|string',
            'checklist' => 'nullable|array',
            'stone_details' => 'nullable|array',
            'pricing_details' => 'nullable|array',
            'return_reason' => 'nullable|string',
            'returned_by' => 'nullable|string',
            'return_date' => 'nullable|date',
            'returned_weight' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
            'action_note' => 'nullable|string',
        ]);

        // RULE: Completed weight can ONLY increase
        if ($request->filled('completed_weight')) {
            $newCompleted = round((float) $request->input('completed_weight'), 3);
            $currentCompleted = round((float) $order->completed_weight, 3);

            if ($newCompleted < $currentCompleted) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Validation Error: Completed Weight can ONLY increase. Current value is {$currentCompleted}g, but {$newCompleted}g was provided."
                ], 422);
            }
            $order->completed_weight = $newCompleted;
        }

        // RULE: Pending weight can ONLY decrease
        if ($request->filled('pending_weight')) {
            $newPending = round((float) $request->input('pending_weight'), 3);
            $currentPending = round((float) $order->pending_weight, 3);

            if ($newPending > $currentPending) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Validation Error: Pending Weight can ONLY decrease. Current value is {$currentPending}g, but {$newPending}g was provided."
                ], 422);
            }
            $order->pending_weight = $newPending;
        } else if ($request->filled('completed_weight')) {
            // Auto-calculate pending weight if not explicitly provided
            $order->pending_weight = max(0, round($order->allotted_weight - $order->completed_weight, 3));
        }

        // RULE: Tracking stage can ONLY move forward
        if ($request->filled('current_stage') && $request->current_stage !== $order->current_stage) {
            $newStage = $request->current_stage;
            $currentStage = $order->current_stage;

            $currentRank = $this->stageOrder[$currentStage] ?? 0;
            $newRank = $this->stageOrder[$newStage] ?? 0;

            if ($newRank < $currentRank) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Validation Error: Workflow tracking can only move forward. You cannot revert stage from '{$currentStage}' to '{$newStage}'."
                ], 422);
            }

            $order->current_stage = $newStage;

            // Auto-update status when reaching completed / approval stage
            if (in_array($newStage, ['work_completed', 'sent_for_approval', 'quality_check'])) {
                $order->status = 'pending_approval';
                $order->quality_status = 'pending';
            } elseif ($newStage === 'approved') {
                $order->status = 'approved';
                $order->quality_status = 'passed';
            } elseif ($newStage === 'ready') {
                $order->status = 'ready';
            } elseif (in_array($newStage, ['delivered', 'final_received'])) {
                if ($order->receivedPieces()->exists()) {
                    $this->syncInventoryPosting($order);
                } else {
                    $order->status = 'completed';
                    $this->creditWorkOrderToInventory($order);
                }
            }

            // Log timeline step
            WorkOrderTimeline::create([
                'work_order_id' => $order->id,
                'stage' => $newStage,
                'stage_label' => WorkOrder::STAGES[$newStage] ?? ucfirst(str_replace('_', ' ', $newStage)),
                'completed_weight_at_step' => $order->completed_weight,
                'pending_weight_at_step' => $order->pending_weight,
                'status' => 'completed',
                'notes' => $request->input('action_note', "Tracking advanced to " . (WorkOrder::STAGES[$newStage] ?? $newStage)),
                'user_id' => Auth::id() ?? 1,
                'action_by_name' => Auth::user()?->name ?? 'Receiver',
                'created_at' => now(),
            ]);
        }

        // Update other fields
        if ($request->has('delivery_date')) $order->delivery_date = $request->delivery_date;
        if ($request->has('allotted_weight')) $order->allotted_weight = (float) $request->allotted_weight;
        if ($request->has('checklist')) $order->checklist = $request->checklist;
        if ($request->has('stone_details')) $order->stone_details = $request->stone_details;
        if ($request->has('pricing_details')) $order->pricing_details = $request->pricing_details;
        if ($request->has('return_reason')) $order->return_reason = $request->return_reason;
        if ($request->has('returned_by')) $order->returned_by = $request->returned_by;
        if ($request->has('return_date')) $order->return_date = $request->return_date;
        if ($request->has('returned_weight')) $order->returned_weight = (float) $request->returned_weight;
        if ($request->has('notes')) $order->notes = $request->notes;
        if ($request->has('karigar_data')) {
            $kd = $order->karigar_data ?? [];
            $order->karigar_data = array_merge($kd, (array) $request->karigar_data);
        }

        $order->save();

        NotificationService::notifyWorkOrderUpdated($order, 'Progress updated: ' . ucfirst(str_replace('_', ' ', $order->current_stage ?? 'In Progress')), Auth::id());

        return response()->json([
            'status' => 'success',
            'message' => 'Receiver work updated successfully.',
            'data' => $order->load(['karigar', 'product', 'category', 'subcategory', 'timelines'])
        ]);
    }

    /**
     * Quality Check: Approve work order (Moves to COMPLETED & frees Karigar)
     */
    public function approve(Request $request, $id)
    {
        $order = WorkOrder::findOrFail($id);

        $alreadyApproved = $order->quality_status === 'passed'
            || in_array($order->status, ['completed', 'approved', 'ready', 'final_received'])
            || $order->timelines()->where('stage', 'approved')->exists();

        if ($alreadyApproved) {
            return response()->json([
                'status' => 'success',
                'message' => 'Work order is already approved.',
                'data' => $order->load(['karigar', 'product', 'category', 'timelines'])
            ]);
        }

        return DB::transaction(function () use ($request, $order) {
            $order->status = 'ready';
            $order->current_stage = 'ready';
            $order->quality_status = 'passed';
            $order->ready_qty = max((int)$order->ready_qty, max((int)$order->completed_qty, (int)$order->required_qty));
            $order->qc_approved_qty = $order->ready_qty;
            $order->qc_pending_qty = 0;
            $order->quality_notes = $request->input('quality_notes', 'Quality check passed and approved.');
            $order->quality_checked_by = Auth::id() ?? 1;
            $order->quality_checked_at = now();
            $order->approved_by = Auth::id() ?? 1;
            $order->approved_at = now();
            $order->save();

            // Mark unreceived pieces as ready/passed
            self::ensurePiecesInitialized($order);
            foreach ($order->receivedPieces()->whereNull('received_at')->get() as $p) {
                $p->status = 'ready';
                $p->qc_status = 'passed';
                $p->qc_checked_at = now();
                $p->qc_checked_by = Auth::id() ?? 1;
                $p->save();
            }

            WorkOrderTimeline::create([
                'work_order_id' => $order->id,
                'stage' => 'approved',
                'stage_label' => 'Quality Check Approved — Ready for Receiving',
                'completed_weight_at_step' => $order->completed_weight,
                'pending_weight_at_step' => $order->pending_weight,
                'status' => 'completed',
                'notes' => $order->quality_notes,
                'user_id' => Auth::id() ?? 1,
                'action_by_name' => Auth::user()?->name ?? 'Admin',
                'created_at' => now(),
            ]);

            // Sync Karigar Gold Balance on Bench
            $this->syncKarigarGoldBalance($order->karigar_id);

            // Update parent JobOrder derived status if present
            if ($order->jobOrder) {
                $order->jobOrder->updateDerivedStatus();
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Work order approved and marked COMPLETED.',
                'data' => $order->load(['karigar', 'product', 'category', 'timelines', 'jobOrder'])
            ]);
        });
    }

    /**
     * Quality Check: Reject / Return work order to artisan for rework
     */
    public function returnOrReject(Request $request, $id)
    {
        $request->validate([
            'return_reason' => 'required|string',
        ]);

        $order = WorkOrder::findOrFail($id);

        $reworkUnits = max(1, (int)$order->qc_pending_qty ?: 1);
        $order->rework_qty = (int)$order->rework_qty + $reworkUnits;
        $order->qc_pending_qty = 0;
        $order->status = 'returned';
        $order->current_stage = 'rework';
        $order->quality_status = 'returned';
        $order->return_reason = $request->return_reason;
        $order->return_count = ($order->return_count ?? 0) + 1;
        $order->returned_by = Auth::user()?->name ?? 'Quality Head';
        $order->return_date = now()->toDateString();
        $order->returned_weight = (float) $request->input('returned_weight', $order->completed_weight);
        $order->quality_notes = $request->return_reason;
        $order->checklist = [
            'product_received' => false,
            'weight_verified' => false,
            'stone_verified' => false,
            'design_verified' => false,
            'work_completed' => false,
            'quality_checked' => false,
            'documents_verified' => false,
        ];
        $order->save();

        foreach ($order->items as $it) {
            $it->status = 'rework';
            $it->rework_qty = (int)$it->rework_qty + max(1, (int)$it->qc_pending_qty ?: 1);
            $it->qc_pending_qty = 0;
            $it->return_reason = $request->return_reason;
            $it->save();
        }

        foreach ($order->receivedPieces()->whereNull('received_at')->get() as $p) {
            $p->status = 'rework';
            $p->qc_status = 'rejected';
            $p->qc_notes = $request->return_reason;
            $p->save();
        }

        if ($order->jobOrder) {
            $order->jobOrder->updateDerivedStatus();
        }

        WorkOrderTimeline::create([
            'work_order_id' => $order->id,
            'stage' => 'reworking',
            'stage_label' => "Reworking in Progress (Cycle #{$order->return_count})",
            'completed_weight_at_step' => $order->completed_weight,
            'pending_weight_at_step' => $order->pending_weight,
            'status' => 'returned',
            'notes' => "Order returned to artisan for rework. Reason: " . $request->return_reason,
            'user_id' => Auth::id() ?? 1,
            'action_by_name' => Auth::user()?->name ?? 'Quality Head',
            'created_at' => now(),
        ]);

        // Dispatch rework notification
        NotificationService::notifyQcReworkReturned($order, null, null, $request->return_reason ?? 'Rework required', 1, Auth::id());

        return response()->json([
            'status' => 'success',
            'message' => "Work order returned for rework (Cycle #{$order->return_count}).",
            'data' => $order->load(['karigar', 'product', 'timelines'])
        ]);
    }

    /**
     * Karigar updates work progress or submits work for approval
     */
    public function karigarUpdate(Request $request, $id)
    {
        $order = WorkOrder::findOrFail($id);
        $currentUser = Auth::user();

        if (in_array($order->status, ['completed', 'cancelled', 'final_received'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'This work order has already been completed and cannot be modified.'
            ], 422);
        }

        $action = $request->input('action', 'save'); // 'save' | 'submit'

        if ($action === 'submit') {
            $request->validate([
                'completed_weight' => 'required|numeric|min:0.001',
            ]);
        }

        return DB::transaction(function () use ($request, $order, $action, $currentUser) {
            if ($request->has('completed_weight')) {
                $newCompleted = (float)$request->completed_weight;
                $currentCompleted = (float)$order->completed_weight;

                if ($newCompleted < $currentCompleted && !in_array($order->status, ['returned', 'rework'])) {
                    return response()->json([
                        'status' => 'error',
                        'message' => "Validation Error: Completed weight can ONLY increase. Current value is {$currentCompleted}g, but {$newCompleted}g was provided."
                    ], 422);
                }
                $order->completed_weight = $newCompleted;
                $order->pending_weight = max(0, round($order->allotted_weight - $order->completed_weight, 3));
            }
            if ($request->has('scrap_weight')) {
                $order->wastage_weight = (float)$request->scrap_weight;
            }
            if ($request->has('stone_details')) {
                $order->stone_details = $request->stone_details;
            }
            if ($request->has('notes') || $request->has('karigar_notes')) {
                $order->karigar_notes = $request->input('karigar_notes', $request->input('notes'));
            }

            if ($request->has('delivery_date')) {
                $order->delivery_date = $request->delivery_date;
            } elseif ($request->has('delay_date')) {
                $order->delivery_date = $request->delay_date;
            }

            // Save detailed karigar progress data in karigar_data JSON
            $karigarData = $order->karigar_data ?? [];
            if ($request->has('completed_qty')) $karigarData['completed_qty'] = $request->completed_qty;
            if ($request->has('gold_used')) $karigarData['gold_used'] = (float)$request->gold_used;
            if ($request->has('scrap_weight')) $karigarData['scrap_weight'] = (float)$request->scrap_weight;
            if ($request->has('reference_image')) $karigarData['reference_image'] = $request->reference_image;
            if ($request->has('design_file')) $karigarData['design_file'] = $request->design_file;
            if ($request->has('remarks')) $karigarData['remarks'] = $request->remarks;
            if ($request->has('delay_reason')) $karigarData['delay_reason'] = $request->delay_reason;
            if ($request->has('delay_date')) $karigarData['delay_date'] = $request->delay_date;
            $karigarData['last_updated_at'] = now()->toDateTimeString();
            $order->karigar_data = $karigarData;

            // Strict forward-only timeline stage progression validation
            if ($request->filled('current_stage') && $request->current_stage !== $order->current_stage) {
                $newStage = $request->current_stage;
                $currentStage = $order->current_stage;

                $currentRank = $this->stageOrder[$currentStage] ?? 0;
                $newRank = $this->stageOrder[$newStage] ?? 0;

                if ($newRank < $currentRank && !in_array($order->status, ['returned', 'rework'])) {
                    return response()->json([
                        'status' => 'error',
                        'message' => "Validation Error: Workflow tracking can only move forward. You cannot revert stage from '{$currentStage}' to '{$newStage}'."
                    ], 422);
                }

                $order->current_stage = $newStage;
            }

            $previousStatus = $order->status;

            if ($action === 'submit') {
                $isRework = in_array($previousStatus, ['returned', 'rework']);
                $newStatus = $isRework ? 'resubmitted' : 'submitted';
                $newStage = 'work_completed';

                $order->status = $newStatus;
                $order->current_stage = $newStage;
                $order->quality_status = 'pending';
                $order->karigar_submitted_at = now();
                $order->save();

                $timelineEvent = $isRework ? 'Corrected Work Resubmitted for Approval' : 'Work Completed & Submitted for Review';
                WorkOrderTimeline::create([
                    'work_order_id' => $order->id,
                    'stage' => $isRework ? 'resubmitted' : 'sent_for_approval',
                    'stage_label' => $timelineEvent,
                    'completed_weight_at_step' => $order->completed_weight,
                    'pending_weight_at_step' => $order->pending_weight,
                    'status' => 'submitted',
                    'notes' => $order->karigar_notes ?: ($isRework ? 'Artisan corrected work and resubmitted for admin review.' : 'Artisan completed work and submitted for admin review.'),
                    'user_id' => $currentUser?->id ?? 1,
                    'action_by_name' => $currentUser?->name ?? ($order->karigar_name ?: 'Karigar'),
                    'created_at' => now(),
                ]);

                // Dispatch notification
                if ($isRework) {
                    NotificationService::notifyQcReworkResubmitted($order, null, null, 1, Auth::id());
                } else {
                    NotificationService::notifyQcSubmitted($order, null, null, 1, Auth::id());
                }

                $msg = $isRework ? 'Corrected work order resubmitted for admin approval!' : 'Work order submitted for admin approval!';
            } else {
                // Save draft progress
                if (in_array($order->status, ['assigned', 'allocated', 'ongoing'])) {
                    $order->status = 'in_progress';
                    $order->current_stage = 'work_in_progress';
                }
                $order->save();

                $timelineNotes = $order->karigar_notes ?: ('Artisan updated work progress (Completed: ' . $order->completed_weight . 'g)');
                WorkOrderTimeline::create([
                    'work_order_id' => $order->id,
                    'stage' => 'work_in_progress',
                    'stage_label' => 'Progress Update',
                    'completed_weight_at_step' => $order->completed_weight,
                    'pending_weight_at_step' => $order->pending_weight,
                    'status' => 'in_progress',
                    'notes' => $timelineNotes,
                    'user_id' => $currentUser?->id ?? 1,
                    'action_by_name' => $currentUser?->name ?? ($order->karigar_name ?: 'Karigar'),
                    'created_at' => now(),
                ]);

                // Dispatch progress notification
                $firstItem = $order->items()->first();
                if ($firstItem) {
                    NotificationService::notifyProductionProgress($order, $firstItem, 1, Auth::id());
                }

                $msg = 'Work progress saved successfully.';
            }

            if ($order->jobOrder) {
                $order->jobOrder->updateDerivedStatus();
            }

            return response()->json([
                'status' => 'success',
                'message' => $msg,
                'data' => $order->load(['karigar', 'product', 'category', 'subcategory', 'timelines', 'jobOrder'])
            ]);
        });
    }

    /**
     * Alias for karigarUpdate for Manager Work Workbench
     */
    public function managerUpdate(Request $request, $id)
    {
        return $this->karigarUpdate($request, $id);
    }

    /**
     * Add timeline update or change progress directly from Work in Progress page
     */
    public function addTimelineUpdate(Request $request, $id)
    {
        $order = WorkOrder::findOrFail($id);

        $request->validate([
            'completed_weight' => 'nullable|numeric|min:0',
            'status' => 'nullable|string',
            'current_stage' => 'nullable|string',
            'update_type' => 'nullable|string',
            'details' => 'nullable|string',
            'notes' => 'nullable|string',
            'remarks' => 'nullable|string',
            'expected_completion_date' => 'nullable|date',
            'delay_date' => 'nullable|date',
            'delay_reason' => 'nullable|string',
        ]);

        if ($request->filled('completed_weight')) {
            $order->completed_weight = (float)$request->completed_weight;
            $order->pending_weight = max(0, round($order->allotted_weight - $order->completed_weight, 3));
        }

        if ($request->filled('current_stage')) {
            $order->current_stage = $request->current_stage;
            if (in_array($request->current_stage, ['work_completed', 'quality_check', 'sent_for_approval'])) {
                $order->status = 'pending_approval';
                $order->quality_status = 'pending';
            }
        }

        if ($request->filled('status')) {
            $order->status = $request->status;
        }

        if ($request->filled('expected_completion_date')) {
            $order->delivery_date = $request->expected_completion_date;
        } elseif ($request->filled('delay_date')) {
            $order->delivery_date = $request->delay_date;
        }

        if ($request->filled('remarks') || $request->filled('notes')) {
            $order->karigar_notes = $request->input('remarks', $request->input('notes'));
        }

        $kd = $order->karigar_data ?? [];
        if ($request->filled('delay_reason')) {
            $kd['delay_reason'] = $request->delay_reason;
        }
        if ($request->filled('delay_date')) {
            $kd['delay_date'] = $request->delay_date;
        }
        $order->karigar_data = $kd;

        $order->save();

        $updateType = $request->input('update_type', 'Progress Update');
        $detailsText = $request->input('details', $request->input('notes', $request->input('remarks', 'Work progress update recorded')));

        WorkOrderTimeline::create([
            'work_order_id' => $order->id,
            'stage' => $order->current_stage ?? 'work_in_progress',
            'stage_label' => $updateType,
            'completed_weight_at_step' => $order->completed_weight,
            'pending_weight_at_step' => $order->pending_weight,
            'status' => 'completed',
            'notes' => $detailsText,
            'user_id' => Auth::id() ?? 1,
            'action_by_name' => Auth::user()?->name ?? ($order->karigar_name ?: 'Manikandan'),
            'created_at' => now(),
        ]);

        $firstItem = $order->items()->first();
        if ($firstItem) {
            NotificationService::notifyProductionProgress($order, $firstItem, 1, Auth::id());
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Work progress and timeline updated successfully.',
            'data' => $order->load(['karigar', 'product', 'category', 'subcategory', 'client', 'timelines'])
        ]);
    }

    /**
     * Update delay or hold status, recalculate expected date, and log history entry
     */
    public function delayUpdate(Request $request, $id)
    {
        $order = WorkOrder::findOrFail($id);

        $validated = $request->validate([
            'delay_status' => 'required|string',
            'delay_reason' => 'required|string',
            'delay_days' => 'required|numeric|min:0',
            'expected_date' => 'required|date',
            'remarks' => 'required|string',
            'attachment' => 'nullable|file|max:5120',
        ]);

        $fromDate = $order->delivery_date ? Carbon::parse($order->delivery_date)->format('d M Y') : Carbon::now()->format('d M Y');
        $toDate = Carbon::parse($validated['expected_date'])->format('d M Y');

        $attachmentPath = null;
        if ($request->hasFile('attachment')) {
            try {
                $attachmentPath = $request->file('attachment')->store('work_order_delays', 'public');
            } catch (\Exception $e) {
                // If storage fails, continue gracefully
            }
        }

        // Update work order fields
        $order->delivery_date = Carbon::parse($validated['expected_date'])->toDateString();
        $statusLower = strtolower(trim($validated['delay_status']));
        if ($statusLower === 'hold') {
            $order->status = 'on_hold';
        } elseif ($statusLower === 'active' || str_contains($statusLower, 'resume')) {
            $order->status = 'ongoing';
        } else {
            $order->status = 'delayed';
        }

        // Maintain delay_history array inside pricing_details
        $pricing = $order->pricing_details ?? [];
        $existingHistory = $pricing['delay_history'] ?? [];

        // If currently empty, ensure initial history is preserved
        if (empty($existingHistory)) {
            $initialFrom = $order->allotted_date ? Carbon::parse($order->allotted_date)->addDays(13)->format('d M Y') : '28 Apr 2024';
            $existingHistory = [
                [
                    'id' => 'hist_base_1',
                    'status' => 'Delay',
                    'reason' => 'Stone not available',
                    'delay_days' => 5,
                    'from_date' => $initialFrom,
                    'to_date' => '03 May 2024',
                    'remarks' => 'Waiting for new stock',
                    'updated_by' => 'Arshad (Admin)',
                ]
            ];
        }

        $currentUser = Auth::user();
        $updatedByName = $currentUser ? "{$currentUser->name} (" . ($currentUser->role ?? 'Admin') . ")" : 'Arshad (Admin)';

        $newEntry = [
            'id' => 'delay_' . time() . '_' . rand(100, 999),
            'status' => $validated['delay_status'],
            'reason' => $validated['delay_reason'],
            'delay_days' => (int)$validated['delay_days'],
            'from_date' => $fromDate,
            'to_date' => $toDate,
            'remarks' => $validated['remarks'],
            'updated_by' => $updatedByName,
            'attachment' => $attachmentPath ? asset('storage/' . $attachmentPath) : null,
            'created_at' => now()->toDateTimeString(),
        ];

        // Prepend new history record
        array_unshift($existingHistory, $newEntry);
        $pricing['delay_history'] = $existingHistory;
        $order->pricing_details = $pricing;

        // Keep karigar_data in sync
        $kd = $order->karigar_data ?? [];
        $kd['delay_reason'] = $validated['delay_reason'];
        $kd['delay_days'] = (int)$validated['delay_days'];
        $kd['delay_date'] = Carbon::parse($validated['expected_date'])->toDateString();
        $kd['delay_status'] = $validated['delay_status'];
        $kd['remarks'] = $validated['remarks'];
        $order->karigar_data = $kd;

        $order->save();

        // Create timeline entry
        WorkOrderTimeline::create([
            'work_order_id' => $order->id,
            'stage' => $order->current_stage ?: 'work_in_progress',
            'stage_label' => "Delay / Hold: {$validated['delay_status']}",
            'completed_weight_at_step' => $order->completed_weight,
            'pending_weight_at_step' => $order->pending_weight,
            'status' => $order->status,
            'notes' => "{$validated['delay_reason']} — {$validated['remarks']} (+{$validated['delay_days']} days, new expected date: {$toDate})",
            'user_id' => Auth::id() ?? 1,
            'action_by_name' => Auth::user()?->name ?? 'Admin',
            'created_at' => now(),
        ]);

        // Dispatch delay notification
        NotificationService::notifyWorkOrderDelayed($order, $validated['delay_reason'], (int)$validated['delay_days'], Auth::id());

        return response()->json([
            'status' => 'success',
            'message' => 'Delay / Hold details updated successfully.',
            'data' => $order->load(['karigar', 'product', 'category', 'subcategory', 'client', 'timelines'])
        ]);
    }

    /**
     * Authorize user for manager/supervisor/admin operations
     */
    protected function authorizeAction()
    {
        $user = Auth::user();
        if (!$user) {
            abort(401, 'Unauthenticated');
        }
        if ($user->isSuperAdmin()) {
            return true;
        }
        $role = strtolower(str_replace(' ', '_', $user->role ?? ''));
        if (in_array($role, ['admin', 'super_admin', 'manager', 'supervisor', 'staff'])) {
            return true;
        }
        abort(403, 'Unauthorized access to Work Order operations.');
    }

    /**
     * Manager/Supervisor updates work progress, partial completion, delay, and queues units for QC
     */
    public function wipUpdate(Request $request, $id)
    {
        $this->authorizeAction();

        $validated = $request->validate([
            'completed_now' => 'nullable|integer|min:0',
            'quantity' => 'nullable|integer|min:0',
            'work_order_item_id' => 'nullable|exists:work_order_items,id',
            'actual_weight' => 'nullable|numeric|min:0',
            'completed_weight' => 'nullable|numeric|min:0',
            'gold_wastage' => 'nullable|numeric|min:0',
            'wastage_weight' => 'nullable|numeric|min:0',
            'wastage' => 'nullable|numeric|min:0',
            'old_weight' => 'nullable|numeric|min:0',
            'new_gold_weight' => 'nullable|numeric|min:0',
            'purity' => 'nullable',
            'colour_stone' => 'nullable|numeric|min:0',
            'color_stone_weight' => 'nullable|numeric|min:0',
            'colour_stone_count' => 'nullable|integer|min:0',
            'color_stone_count' => 'nullable|integer|min:0',
            'no_of_colour_stones' => 'nullable|integer|min:0',
            'silver' => 'nullable|numeric|min:0',
            'silver_weight' => 'nullable|numeric|min:0',
            'diamond' => 'nullable|numeric|min:0',
            'diamond_weight' => 'nullable|numeric|min:0',
            'no_of_diamonds' => 'nullable|integer|min:0',
            'diamond_count' => 'nullable|integer|min:0',
            'remarks' => 'nullable|string',
            'delay' => 'nullable', // boolean or 'yes'/'no'
            'delay_reason' => 'nullable|string',
            'delay_remarks' => 'nullable|string',
            'delay_days' => 'nullable|integer|min:0',
            'expected_delivery_date' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($request, $validated, $id) {
            $order = WorkOrder::lockForUpdate()->findOrFail($id);

            $completedNow = (int)($request->input('completed_now') ?? $request->input('quantity') ?? $request->input('completed_qty') ?? 0);
            $pendingProduction = max(0, (int)$order->required_qty - (int)$order->completed_qty);

            $pieceReworkCount = WorkOrderReceivedPiece::where('work_order_id', $order->id)
                ->where(function ($q) {
                    $q->where('status', 'rework')
                      ->orWhere('status', 'returned')
                      ->orWhere('qc_status', 'rejected')
                      ->orWhere('qc_status', 'rework');
                })->count();

            $orderReworkQty = max((int)$order->rework_qty, $pieceReworkCount);
            if ($orderReworkQty === 0 && (in_array($order->status, ['returned', 'rework', 'rejected']) || in_array($order->current_stage, ['rework', 'returned']) || in_array($order->quality_status, ['returned', 'rejected', 'partial_rework']))) {
                $orderReworkQty = 1;
            }
            $maxAllowed = $orderReworkQty + $pendingProduction;
            if ($request->filled('piece_id')) {
                $maxAllowed = max(1, $maxAllowed);
            }

            if ($completedNow > $maxAllowed) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Completed Now ({$completedNow}) cannot exceed remaining production and rework quantity ({$maxAllowed})."
                ], 422);
            }

            // Item resolution
            $item = null;
            if (!empty($validated['work_order_item_id'])) {
                $item = WorkOrderItem::lockForUpdate()->where('work_order_id', $order->id)->find($validated['work_order_item_id']);
                if ($item) {
                    $itemPending = max(0, (int)$item->required_qty - (int)$item->completed_qty);
                    $itemPieceRework = WorkOrderReceivedPiece::where('work_order_item_id', $item->id)
                        ->where(function ($q) {
                            $q->where('status', 'rework')
                              ->orWhere('status', 'returned')
                              ->orWhere('qc_status', 'rejected')
                              ->orWhere('qc_status', 'rework');
                        })->count();
                    $itemReworkQty = max((int)$item->rework_qty, $itemPieceRework);
                    if ($itemReworkQty === 0 && ($orderReworkQty > 0 || in_array($item->status, ['rework', 'returned', 'rejected', 'qc_rejected']))) {
                        $itemReworkQty = 1;
                    }
                    $itemMaxAllowed = $itemReworkQty + $itemPending;
                    if ($request->filled('piece_id')) {
                        $itemMaxAllowed = max(1, $itemMaxAllowed);
                    }
                    if ($completedNow > $itemMaxAllowed) {
                        return response()->json([
                            'status' => 'error',
                            'message' => "Completed Now ({$completedNow}) exceeds job item remaining quantity ({$itemMaxAllowed})."
                        ], 422);
                    }
                }
            }

            $targetPieces = collect();
            if ($completedNow > 0) {
                $reworkToClearOrder = min((int)$order->rework_qty, $completedNow);
                $newQtyForOrder = $completedNow - $reworkToClearOrder;

                $order->rework_qty = max(0, (int)$order->rework_qty - $reworkToClearOrder);
                $order->completed_qty = (int)$order->completed_qty + $newQtyForOrder;
                $order->qc_pending_qty = (int)$order->qc_pending_qty + $completedNow;

                if ($item) {
                    $reworkToClearItem = min((int)$item->rework_qty, $completedNow);
                    $newQtyForItem = $completedNow - $reworkToClearItem;

                    $item->rework_qty = max(0, (int)$item->rework_qty - $reworkToClearItem);
                    $item->completed_qty = (int)$item->completed_qty + $newQtyForItem;
                    $item->qc_pending_qty = (int)$item->qc_pending_qty + $completedNow;
                    $item->status = 'in_progress';
                    $item->save();
                }

                $addWeight = (float)($validated['actual_weight'] ?? $validated['completed_weight'] ?? 0);
                $weightPerPiece = $addWeight > 0 ? round($addWeight / max(1, $completedNow), 3) : null;
                $purityVal = (float)($validated['purity'] ?? 91.60);
                $oldWeightVal = (float)($validated['old_weight'] ?? 0);
                $diaVal = (float)($request->input('diamond_weight') ?? $request->input('diamond') ?? 0);
                $diaCountVal = (int)($request->input('diamond_count') ?? $request->input('no_of_diamonds') ?? 0);
                $colorStoneVal = (float)($request->input('color_stone_weight') ?? $request->input('colour_stone') ?? 0);
                $colorStoneCountVal = (int)($request->input('color_stone_count') ?? $request->input('colour_stone_count') ?? $request->input('no_of_colour_stones') ?? 0);
                $silverVal = (float)($request->input('silver_weight') ?? $request->input('silver') ?? 0);

                $targetPieces = collect();
                if ($request->filled('piece_id')) {
                    $foundP = WorkOrderReceivedPiece::where('work_order_id', $order->id)->find($request->piece_id);
                    if ($foundP) {
                        $targetPieces->push($foundP);
                    }
                }

                // If more pieces are needed, prioritize reusing existing rework/rejected pieces
                $neededToFulfill = $completedNow - $targetPieces->count();
                if ($neededToFulfill > 0) {
                    $reworkPiecesQuery = WorkOrderReceivedPiece::where('work_order_id', $order->id)
                        ->where(function ($q) {
                            $q->where('status', 'rework')
                              ->orWhere('qc_status', 'rejected')
                              ->orWhere('qc_status', 'rework');
                        })
                        ->whereNotIn('id', $targetPieces->pluck('id'));
                    if ($item) {
                        $reworkPiecesQuery->where('work_order_item_id', $item->id);
                    }
                    $reworkToReuse = $reworkPiecesQuery->orderBy('piece_number', 'asc')->take($neededToFulfill)->get();
                    foreach ($reworkToReuse as $rp) {
                        $targetPieces->push($rp);
                    }
                }

                // Next, reuse any existing unreceived pieces in 'in_progress' or uninspected state
                $neededStill = $completedNow - $targetPieces->count();
                if ($neededStill > 0) {
                    $inProgQuery = WorkOrderReceivedPiece::where('work_order_id', $order->id)
                        ->whereNull('received_at')
                        ->where(function ($q) {
                            $q->where('status', 'in_progress')
                              ->orWhereNull('qc_status');
                        })
                        ->whereNotIn('id', $targetPieces->pluck('id'));
                    if ($item) {
                        $inProgQuery->where('work_order_item_id', $item->id);
                    }
                    $inProgToReuse = $inProgQuery->orderBy('piece_number', 'asc')->take($neededStill)->get();
                    foreach ($inProgToReuse as $ip) {
                        $targetPieces->push($ip);
                    }
                }

                // Only create brand new piece records if total pieces for scope is strictly below required_qty
                $existingPieceRows = WorkOrderReceivedPiece::where('work_order_id', $order->id);
                if ($item) {
                    $existingPieceRows->where('work_order_item_id', $item->id);
                }
                $existingCountForScope = $existingPieceRows->count();
                $maxAllowedForScope = $item ? (int)$item->required_qty : (int)$order->required_qty;

                $stillNeeded = $completedNow - $targetPieces->count();
                $existingTotalCount = WorkOrderReceivedPiece::where('work_order_id', $order->id)->count();
                for ($pIdx = 0; $pIdx < $stillNeeded; $pIdx++) {
                    if ($existingCountForScope >= $maxAllowedForScope) {
                        break;
                    }
                    $pieceNum = $existingTotalCount + 1 + $pIdx;
                    $newPiece = WorkOrderReceivedPiece::create([
                        'work_order_id' => $order->id,
                        'work_order_item_id' => $item?->id,
                        'piece_number' => $pieceNum,
                        'design_no' => $item?->design_no ?: $order->design_code ?: ('DES-' . str_pad($order->id, 4, '0', STR_PAD_LEFT)),
                        'product_id' => $item?->product_id ?: $order->product_id,
                        'product_name' => self::cleanProductName($item?->product_name ?: $order->product_name, $item?->design_no ?: $order->design_code),
                        'client_id' => $order->client_id,
                        'karigar_id' => $order->karigar_id,
                        'status' => 'in_progress',
                        'qc_status' => 'pending',
                        'certification_status' => 'pending',
                        'hallmarking_status' => 'pending',
                        'is_inventory_posted' => false,
                    ]);
                    $targetPieces->push($newPiece);
                    $existingCountForScope++;
                }

                foreach ($targetPieces as $tp) {
                    $pieceGross = $weightPerPiece ?: ((float)$tp->gross_weight ?: ((float)$tp->allotted_weight ?: 0));
                    $pieceNet = round(max(0, $pieceGross - ($diaVal * 0.2) - ($colorStoneVal * 0.2) - $oldWeightVal - $silverVal), 3);
                    if ($pieceNet <= 0) $pieceNet = $pieceGross;

                    $tp->gross_weight = $pieceGross;
                    $tp->net_gold_weight = $pieceNet;
                    $tp->old_weight = $oldWeightVal;
                    $tp->purity = $purityVal;
                    $tp->diamond_weight = $diaVal;
                    $tp->diamond_count = $diaCountVal;
                    $tp->color_stone_weight = $colorStoneVal;
                    $tp->color_stone_count = $colorStoneCountVal;
                    $tp->silver_weight = $silverVal;

                    $wasInRework = (
                        $tp->qc_status === 'rejected' ||
                        $tp->status === 'rework' ||
                        $tp->status === 'returned' ||
                        !empty($tp->qc_submission_data['is_returned'])
                    );

                    $tp->status = 'qc_pending';
                    $tp->qc_status = 'pending';
                    $tp->qc_checked_at = null;
                    $tp->qc_checked_by = null;
                    $tp->qc_notes = $validated['remarks'] ?? null;

                    $existingSubData = is_array($tp->qc_submission_data) ? $tp->qc_submission_data : [];
                    $tp->qc_submission_data = array_merge($existingSubData, [
                        'work_order_number' => $order->work_order_number,
                        'work_order_item_id' => $tp->work_order_item_id ?: $item?->id,
                        'piece_number' => $tp->piece_number,
                        'piece_id' => $tp->id,
                        'product_id' => $tp->product_id ?: $item?->product_id ?: $order->product_id,
                        'product_name' => $tp->product_name ?: $item?->product_name ?: $order->product_name,
                        'design_no' => $tp->design_no ?: $item?->design_no ?: $order->design_code,
                        'allotted_weight' => (float)($tp->item?->allotted_weight ?: $item?->allotted_weight ?: $order->allotted_weight),
                        'completed_weight' => $pieceGross,
                        'gross_weight' => $pieceGross,
                        'net_gold_weight' => $pieceNet,
                        'old_weight' => $oldWeightVal,
                        'purity' => $purityVal,
                        'gold_karat' => $tp->gold_karat ?: ($order->karat ?: '22K'),
                        'diamond_weight' => $diaVal,
                        'diamond_count' => $diaCountVal,
                        'color_stone_weight' => $colorStoneVal,
                        'color_stone_count' => $colorStoneCountVal,
                        'silver_weight' => $silverVal,
                        'remarks' => $validated['remarks'] ?? null,
                        'submitted_at' => now()->toDateTimeString(),
                        'submitted_by' => Auth::id() ?? 1,
                        'is_resubmitted' => $wasInRework,
                        'is_returned' => false,
                        'resubmitted_at' => $wasInRework ? now()->toDateTimeString() : ($existingSubData['resubmitted_at'] ?? null),
                    ]);
                    $tp->save();

                    if ($wasInRework) {
                        if ($order->rework_qty > 0) {
                            $order->rework_qty = max(0, (int)$order->rework_qty - 1);
                        }
                        if ($item && $item->rework_qty > 0) {
                            $item->rework_qty = max(0, (int)$item->rework_qty - 1);
                            $item->save();
                        }
                    }
                }

                // Update stone details on order and item for fast retrieval
                $currentStoneDetails = is_array($order->stone_details) ? $order->stone_details : (json_decode($order->stone_details ?? '[]', true) ?: []);
                $currentStoneDetails['color_stone_weight'] = $colorStoneVal;
                $currentStoneDetails['color_stone_count'] = $colorStoneCountVal;
                $currentStoneDetails['diamond_weight'] = $diaVal;
                $currentStoneDetails['diamond_count'] = $diaCountVal;
                $currentStoneDetails['silver_weight'] = $silverVal;
                $order->stone_details = $currentStoneDetails;

                if ($item) {
                    $itemStoneDetails = is_array($item->stone_details) ? $item->stone_details : (json_decode($item->stone_details ?? '[]', true) ?: []);
                    $itemStoneDetails['color_stone_weight'] = $colorStoneVal;
                    $itemStoneDetails['color_stone_count'] = $colorStoneCountVal;
                    $itemStoneDetails['diamond_weight'] = $diaVal;
                    $itemStoneDetails['diamond_count'] = $diaCountVal;
                    $itemStoneDetails['silver_weight'] = $silverVal;
                    $item->stone_details = $itemStoneDetails;
                    $item->save();
                }
            }

            // Weight updates
            $addWeight = (float)($validated['actual_weight'] ?? $validated['completed_weight'] ?? 0);
            if ($addWeight > 0 || $targetPieces->isNotEmpty()) {
                $hasPieceTracking = $targetPieces->isNotEmpty() || WorkOrderReceivedPiece::where('work_order_id', $order->id)->exists();

                if ($hasPieceTracking) {
                    if ($item) {
                        $itemPiecesSum = (float) WorkOrderReceivedPiece::where('work_order_item_id', $item->id)
                            ->where('gross_weight', '>', 0)
                            ->sum('gross_weight');
                        $item->completed_weight = round($itemPiecesSum > 0 ? $itemPiecesSum : $addWeight, 3);
                        $item->save();
                    }

                    $orderPiecesSum = (float) WorkOrderReceivedPiece::where('work_order_id', $order->id)
                        ->where('gross_weight', '>', 0)
                        ->sum('gross_weight');
                    $order->completed_weight = round($orderPiecesSum > 0 ? $orderPiecesSum : $addWeight, 3);
                } else {
                    $reworkToClearOrder = min((int)$order->rework_qty, $completedNow);
                    $newQtyForOrder = $completedNow - $reworkToClearOrder;
                    if ($newQtyForOrder > 0 && $completedNow > 0) {
                        $weightIncrement = round(($addWeight / $completedNow) * $newQtyForOrder, 3);
                        $order->completed_weight = round((float)$order->completed_weight + $weightIncrement, 3);
                        if ($item) {
                            $item->completed_weight = round((float)$item->completed_weight + $weightIncrement, 3);
                            $item->save();
                        }
                    } elseif ($completedNow > 0 && $reworkToClearOrder > 0) {
                        $order->completed_weight = max($addWeight, (float)$order->completed_weight);
                        if ($item) {
                            $item->completed_weight = max($addWeight, (float)$item->completed_weight);
                            $item->save();
                        }
                    } else {
                        $order->completed_weight = round((float)$order->completed_weight + $addWeight, 3);
                        if ($item) {
                            $item->completed_weight = round((float)$item->completed_weight + $addWeight, 3);
                            $item->save();
                        }
                    }
                }

                $order->pending_weight = max(0, round((float)$order->allotted_weight - (float)$order->completed_weight, 3));

                $pricing = $order->pricing_details ?? [];
                if (!empty($pricing['items']) && is_array($pricing['items'])) {
                    foreach ($pricing['items'] as &$pItm) {
                        if (($item && ($pItm['id'] ?? null) == $item->id) || ($pItm['design_number'] ?? $pItm['design_no'] ?? '') == ($item->design_no ?? $order->design_code)) {
                            $pItm['completed_weight'] = $item ? $item->completed_weight : $order->completed_weight;
                            $pItm['completed_qty'] = $item ? $item->completed_qty : $order->completed_qty;
                        }
                    }
                    unset($pItm);
                    $order->pricing_details = $pricing;
                }
            }

            // Wastage handling: persist workbench gold wastage
            $wastageInput = null;
            if ($request->has('gold_wastage')) {
                $wastageInput = $request->input('gold_wastage');
            } elseif ($request->has('wastage_weight')) {
                $wastageInput = $request->input('wastage_weight');
            } elseif ($request->has('wastage')) {
                $wastageInput = $request->input('wastage');
            }

            if ($wastageInput !== null && $wastageInput !== '') {
                $wastageVal = max(0.0, round((float)$wastageInput, 3));
                $order->wastage_weight = $wastageVal;

                $orderPricing = is_array($order->pricing_details) ? $order->pricing_details : (json_decode($order->pricing_details ?? '[]', true) ?: []);
                $orderPricing['wastage_weight'] = $wastageVal;
                $orderPricing['gold_wastage'] = $wastageVal;
                $order->pricing_details = $orderPricing;

                if ($item) {
                    $itemPricing = is_array($item->pricing_details) ? $item->pricing_details : (json_decode($item->pricing_details ?? '[]', true) ?: []);
                    $itemPricing['wastage_weight'] = $wastageVal;
                    $itemPricing['gold_wastage'] = $wastageVal;
                    $item->pricing_details = $itemPricing;
                    $item->save();
                }

                if (isset($targetPieces) && $targetPieces->isNotEmpty()) {
                    foreach ($targetPieces as $tp) {
                        $tpQc = is_array($tp->qc_submission_data) ? $tp->qc_submission_data : [];
                        $tpQc['wastage_weight'] = $wastageVal;
                        $tpQc['gold_wastage'] = $wastageVal;
                        $tp->qc_submission_data = $tpQc;
                        $tp->save();
                    }
                } elseif ($completedNow === 0) {
                    $existingPiecesQuery = WorkOrderReceivedPiece::where('work_order_id', $order->id);
                    if ($item) {
                        $existingPiecesQuery->where('work_order_item_id', $item->id);
                    }
                    foreach ($existingPiecesQuery->get() as $ep) {
                        $epQc = is_array($ep->qc_submission_data) ? $ep->qc_submission_data : [];
                        $epQc['wastage_weight'] = $wastageVal;
                        $epQc['gold_wastage'] = $wastageVal;
                        $ep->qc_submission_data = $epQc;
                        $ep->save();
                    }
                }
            }

            // Delay handling
            $isDelay = false;
            if (isset($validated['delay'])) {
                $dVal = $validated['delay'];
                $isDelay = ($dVal === true || $dVal === 1 || $dVal === '1' || strtolower((string)$dVal) === 'yes');
            }
            if ($isDelay || !empty($validated['delay_reason'])) {
                $order->is_delayed = true;
                $order->delay_days = (int)($validated['delay_days'] ?? 1);
                $order->delay_reason = $validated['delay_reason'] ?? 'Production delay';
                $order->delay_remarks = $validated['delay_remarks'] ?? $validated['remarks'] ?? null;
                $order->delay_updated_by = Auth::id() ?? 1;
                $order->delay_updated_at = now();

                if (!empty($validated['expected_delivery_date'])) {
                    $order->delivery_date = $validated['expected_delivery_date'];
                }

                // Add to delay_history
                $pricing = $order->pricing_details ?? [];
                $existingHist = $pricing['delay_history'] ?? [];
                array_unshift($existingHist, [
                    'id' => 'delay_' . time() . '_' . rand(100, 999),
                    'status' => 'Delayed',
                    'reason' => $order->delay_reason,
                    'delay_days' => $order->delay_days,
                    'from_date' => $order->allotted_date ? Carbon::parse($order->allotted_date)->format('d M Y') : now()->format('d M Y'),
                    'to_date' => $order->delivery_date ? Carbon::parse($order->delivery_date)->format('d M Y') : now()->addDays($order->delay_days)->format('d M Y'),
                    'remarks' => $order->delay_remarks,
                    'updated_by' => Auth::user()?->name ?? 'Manager',
                    'created_at' => now()->toDateTimeString(),
                ]);
                $pricing['delay_history'] = $existingHist;
                $order->pricing_details = $pricing;
            }

            if (!empty($validated['remarks'])) {
                $order->notes = $validated['remarks'];
            }

            // Update status & current stage
            if ($completedNow > 0) {
                if ($order->completed_qty >= $order->required_qty || ($reworkToClearOrder > 0 && (int)$order->rework_qty === 0)) {
                    $order->current_stage = 'quality_check';
                    $order->status = 'pending_approval';
                    $order->quality_status = 'pending';
                    $order->return_reason = null;
                    $order->karigar_submitted_at = now();
                } elseif ($order->rework_qty > 0) {
                    $order->current_stage = 'rework';
                    $order->status = 'returned';
                } else {
                    $order->current_stage = 'work_in_progress';
                    $order->status = 'in_progress';
                    $order->karigar_submitted_at = now();
                }

                if ($item && (int)$item->rework_qty === 0 && (int)$item->qc_pending_qty > 0) {
                    $item->status = 'quality_check';
                    $item->save();
                }
            }

            $order->save();

            // Timeline log
            WorkOrderTimeline::create([
                'work_order_id' => $order->id,
                'stage' => $order->current_stage ?: 'work_in_progress',
                'stage_label' => $completedNow > 0 ? "Completed {$completedNow} Unit(s) — Sent to QC" : "Work Progress Updated",
                'completed_weight_at_step' => $order->completed_weight,
                'pending_weight_at_step' => $order->pending_weight,
                'status' => 'completed',
                'notes' => ($completedNow > 0 ? "Completed {$completedNow} pcs (Total Completed: {$order->completed_qty}/{$order->required_qty}, QC Pending: {$order->qc_pending_qty}). " : "") . ($validated['remarks'] ?? ''),
                'user_id' => Auth::id() ?? 1,
                'action_by_name' => Auth::user()?->name ?? 'Manager',
                'created_at' => now(),
            ]);

            if ($order->jobOrder) {
                $order->jobOrder->updateDerivedStatus();
            }

            // Dispatch production and QC notifications
            if ($completedNow > 0) {
                if ($item) {
                    NotificationService::notifyProductionProgress($order, $item, $completedNow, Auth::id());
                }
                NotificationService::notifyQcSubmitted($order, $item, null, $completedNow, Auth::id());
            } else {
                NotificationService::notifyWorkOrderUpdated($order, 'Work update recorded: ' . ($validated['remarks'] ?? 'In Progress'), Auth::id());
            }

            return response()->json([
                'status' => 'success',
                'message' => $completedNow > 0 ? "Successfully recorded {$completedNow} completed unit(s) and queued for QC." : "Work update saved.",
                'data' => $order->fresh(['items', 'receivedPieces', 'karigar', 'product', 'timelines', 'delayUpdater'])
            ]);
        });
    }

    /**
     * Get operations list for a work order
     */
    public function getOperations(Request $request, $id)
    {
        $this->authorizeAction();

        $order = WorkOrder::findOrFail($id);
        $query = \App\Models\WorkOrderOperation::where('work_order_id', $order->id);

        if ($request->filled('work_order_item_id')) {
            $query->where('work_order_item_id', $request->work_order_item_id);
        }

        $operations = $query->orderBy('created_at', 'asc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $operations,
        ]);
    }

    /**
     * Record manufacturing operation for a work order / item
     */
    public function recordOperation(Request $request, $id)
    {
        $this->authorizeAction();

        $validated = $request->validate([
            'work_order_item_id' => 'nullable|exists:work_order_items,id',
            'operation_name' => 'required|string|max:100',
            'status' => 'required|in:pending,in_progress,completed,on_hold',
            'processed_qty' => 'nullable|integer|min:0',
            'weight_measurement' => 'nullable|numeric|min:0',
            'assigned_staff' => 'nullable|string|max:255',
            'remarks' => 'nullable|string',
            'started_at' => 'nullable|date',
            'completed_at' => 'nullable|date',
        ]);

        return DB::transaction(function () use ($validated, $id) {
            $order = WorkOrder::lockForUpdate()->findOrFail($id);

            $item = null;
            if (!empty($validated['work_order_item_id'])) {
                $item = WorkOrderItem::lockForUpdate()->where('work_order_id', $order->id)->find($validated['work_order_item_id']);
            }

            $operation = \App\Models\WorkOrderOperation::where('work_order_id', $order->id)
                ->where('work_order_item_id', $item?->id)
                ->where('operation_name', $validated['operation_name'])
                ->first();

            if ($operation) {
                $operation->update([
                    'status' => $validated['status'],
                    'processed_qty' => $validated['processed_qty'] ?? $operation->processed_qty,
                    'weight_measurement' => $validated['weight_measurement'] ?? $operation->weight_measurement,
                    'assigned_staff' => $validated['assigned_staff'] ?? $operation->assigned_staff,
                    'remarks' => $validated['remarks'] ?? $operation->remarks,
                    'started_at' => $validated['started_at'] ?? ($validated['status'] === 'in_progress' ? now() : $operation->started_at),
                    'completed_at' => $validated['completed_at'] ?? ($validated['status'] === 'completed' ? now() : $operation->completed_at),
                ]);
            } else {
                $operation = \App\Models\WorkOrderOperation::create([
                    'work_order_id' => $order->id,
                    'work_order_item_id' => $item?->id,
                    'operation_name' => $validated['operation_name'],
                    'status' => $validated['status'],
                    'processed_qty' => $validated['processed_qty'] ?? 0,
                    'weight_measurement' => $validated['weight_measurement'] ?? 0,
                    'assigned_staff' => $validated['assigned_staff'] ?? null,
                    'remarks' => $validated['remarks'] ?? null,
                    'started_at' => $validated['started_at'] ?? ($validated['status'] === 'in_progress' ? now() : null),
                    'completed_at' => $validated['completed_at'] ?? ($validated['status'] === 'completed' ? now() : null),
                    'created_by' => Auth::id() ?? 1,
                ]);
            }

            WorkOrderTimeline::create([
                'work_order_id' => $order->id,
                'stage' => 'work_in_progress',
                'stage_label' => "Operation '{$validated['operation_name']}' set to " . strtoupper(str_replace('_', ' ', $validated['status'])),
                'completed_weight_at_step' => $order->completed_weight,
                'pending_weight_at_step' => $order->pending_weight,
                'status' => 'in_progress',
                'notes' => $validated['remarks'] ?? "Recorded manufacturing operation: {$validated['operation_name']} ({$validated['status']})",
                'user_id' => Auth::id() ?? 1,
                'action_by_name' => Auth::user()?->name ?? 'Manager',
                'created_at' => now(),
            ]);

            $allOperations = \App\Models\WorkOrderOperation::where('work_order_id', $order->id)->get();

            return response()->json([
                'status' => 'success',
                'message' => "Operation '{$validated['operation_name']}' recorded successfully.",
                'data' => $operation,
                'operations' => $allOperations,
            ]);
        });
    }

    /**
     * Batch submit selected completed products / items to Quality Check
     */
    public function batchSubmitQc(Request $request)
    {
        $this->authorizeAction();

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.work_order_id' => 'required|exists:work_orders,id',
            'items.*.work_order_item_id' => 'nullable|exists:work_order_items,id',
            'items.*.completed_now' => 'nullable|integer|min:0',
            'items.*.actual_weight' => 'nullable|numeric|min:0',
            'items.*.remarks' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated) {
            $submittedItemsCount = 0;
            $updatedOrders = [];

            foreach ($validated['items'] as $itemData) {
                $order = WorkOrder::lockForUpdate()->findOrFail($itemData['work_order_id']);
                $completedNow = max(1, (int)($itemData['completed_now'] ?? 1));
                $addWeight = (float)($itemData['actual_weight'] ?? 0);

                $item = null;
                if (!empty($itemData['work_order_item_id'])) {
                    $item = WorkOrderItem::lockForUpdate()->where('work_order_id', $order->id)->find($itemData['work_order_item_id']);
                }

                if ($item) {
                    $reworkToClear = min((int)$item->rework_qty, $completedNow);
                    $item->rework_qty = max(0, (int)$item->rework_qty - $reworkToClear);

                    // Check if completed_qty already covers completedNow
                    if ((int)$item->completed_qty < $completedNow) {
                        $needed = $completedNow - (int)$item->completed_qty;
                        $item->completed_qty = (int)$item->completed_qty + $needed;
                    }

                    if ((int)$item->qc_pending_qty < $completedNow) {
                        $item->qc_pending_qty = $completedNow;
                    }

                    if ($addWeight > 0 && (float)$item->completed_weight == 0) {
                        $item->completed_weight = round((float)$addWeight, 3);
                    }
                    $item->status = 'in_progress';
                    $item->save();
                }

                $reworkToClearOrder = min((int)$order->rework_qty, $completedNow);
                $order->rework_qty = max(0, (int)$order->rework_qty - $reworkToClearOrder);

                if ((int)$order->completed_qty < $completedNow) {
                    $neededOrder = $completedNow - (int)$order->completed_qty;
                    $order->completed_qty = (int)$order->completed_qty + $neededOrder;
                }

                if ((int)$order->qc_pending_qty < $completedNow) {
                    $order->qc_pending_qty = $completedNow;
                }

                if ($addWeight > 0 && (float)$order->completed_weight == 0) {
                    $order->completed_weight = round((float)$addWeight, 3);
                    $order->pending_weight = max(0, round((float)$order->allotted_weight - (float)$order->completed_weight, 3));
                }
                $order->current_stage = 'quality_check';
                $order->status = 'pending_approval';
                $order->karigar_submitted_at = now();
                $order->save();

                // Initialize pieces and record individual piece QC submission data
                self::ensurePiecesInitialized($order);

                $targetPieces = collect();
                if (!empty($itemData['piece_id'])) {
                    $foundP = WorkOrderReceivedPiece::where('work_order_id', $order->id)->find($itemData['piece_id']);
                    if ($foundP) $targetPieces->push($foundP);
                }
                if ($targetPieces->isEmpty()) {
                    $pq = WorkOrderReceivedPiece::where('work_order_id', $order->id)
                        ->whereNull('received_at')
                        ->where(function ($q) {
                            $q->whereIn('status', ['in_progress', 'rework', 'returned', 'qc_pending'])
                              ->orWhereIn('qc_status', ['rejected', 'rework', 'pending'])
                              ->orWhereNull('qc_status');
                        });
                    if ($item) $pq->where('work_order_item_id', $item->id);
                    $targetPieces = $pq->orderBy('piece_number', 'asc')->take($completedNow)->get();
                }

                $weightPerPiece = $addWeight > 0 ? round($addWeight / max(1, $completedNow), 3) : null;

                foreach ($targetPieces as $tp) {
                    $pieceGross = $weightPerPiece ?: ((float)$tp->gross_weight ?: ((float)$tp->allotted_weight ?: 0));
                    $tp->gross_weight = $pieceGross;
                    $tp->net_gold_weight = $pieceGross;

                    $wasInRework = (
                        $tp->qc_status === 'rejected' ||
                        $tp->status === 'rework' ||
                        $tp->status === 'returned' ||
                        !empty($tp->qc_submission_data['is_returned'])
                    );

                    $tp->status = 'qc_pending';
                    $tp->qc_status = 'pending';
                    $tp->qc_notes = $itemData['remarks'] ?? null;

                    $existingSubData = is_array($tp->qc_submission_data) ? $tp->qc_submission_data : [];
                    $tp->qc_submission_data = array_merge($existingSubData, [
                        'work_order_number' => $order->work_order_number,
                        'work_order_item_id' => $tp->work_order_item_id ?: $item?->id,
                        'piece_number' => $tp->piece_number,
                        'piece_id' => $tp->id,
                        'product_id' => $tp->product_id ?: $item?->product_id ?: $order->product_id,
                        'product_name' => $tp->product_name ?: $item?->product_name ?: $order->product_name,
                        'design_no' => $tp->design_no ?: $item?->design_no ?: $order->design_code,
                        'allotted_weight' => (float)($tp->item?->allotted_weight ?: $item?->allotted_weight ?: $order->allotted_weight),
                        'completed_weight' => $pieceGross,
                        'gross_weight' => $pieceGross,
                        'net_gold_weight' => $pieceGross,
                        'remarks' => $itemData['remarks'] ?? null,
                        'submitted_at' => now()->toDateTimeString(),
                        'submitted_by' => Auth::id() ?? 1,
                        'is_resubmitted' => $wasInRework,
                        'is_returned' => false,
                        'resubmitted_at' => $wasInRework ? now()->toDateTimeString() : ($existingSubData['resubmitted_at'] ?? null),
                    ]);
                    $tp->save();

                    if ($wasInRework) {
                        if ($order->rework_qty > 0) {
                            $order->rework_qty = max(0, (int)$order->rework_qty - 1);
                        }
                        if ($item && $item->rework_qty > 0) {
                            $item->rework_qty = max(0, (int)$item->rework_qty - 1);
                            $item->save();
                        }
                    }
                }

                WorkOrderTimeline::create([
                    'work_order_id' => $order->id,
                    'stage' => 'sent_for_approval',
                    'stage_label' => "Partial Production Submitted to QC ({$completedNow} pc(s))",
                    'completed_weight_at_step' => $order->completed_weight,
                    'pending_weight_at_step' => $order->pending_weight,
                    'status' => 'submitted',
                    'notes' => $itemData['remarks'] ?? "Submitted {$completedNow} piece(s) to Quality Check.",
                    'user_id' => Auth::id() ?? 1,
                    'action_by_name' => Auth::user()?->name ?? 'Artisan',
                    'created_at' => now(),
                ]);

                if ($order->jobOrder) {
                    $order->jobOrder->updateDerivedStatus();
                }

                // Dispatch QC submission notification
                NotificationService::notifyQcSubmitted($order, $item, null, $completedNow, Auth::id());

                $submittedItemsCount += $completedNow;
                $updatedOrders[] = $order->work_order_number;
            }

            return response()->json([
                'status' => 'success',
                'message' => "Successfully submitted {$submittedItemsCount} product item(s) to Quality Check!",
                'submitted_count' => $submittedItemsCount,
                'orders_count' => count(array_unique($updatedOrders)),
            ]);
        });
    }

    /**
     * Quality Check decision: Pass units to Ready, or return units for Rework
     */
    public function qcAction(Request $request, $id)
    {
        $this->authorizeAction();

        if ($request->has('qc_action') && !$request->has('action')) {
            $request->merge(['action' => $request->input('qc_action')]);
        }

        $validated = $request->validate([
            'action' => 'required|in:pass,approve,rework,partial,update_remarks',
            'approved_qty' => 'nullable|integer|min:0',
            'rework_qty' => 'nullable|integer|min:0',
            'quantity' => 'nullable|integer|min:0',
            'piece_id' => 'nullable|exists:work_order_received_pieces,id',
            'reason' => 'nullable|string',
            'rework_reason' => 'nullable|string',
            'notes' => 'nullable|string',
            'remarks' => 'nullable|string',
            'work_order_item_id' => 'nullable|exists:work_order_items,id',
            'actual_weight' => 'nullable|numeric|min:0',
            'gross_weight' => 'nullable|numeric|min:0',
            'completed_weight' => 'nullable|numeric|min:0',
            'diamond_weight' => 'nullable|numeric|min:0',
            'diamond_count' => 'nullable|integer|min:0',
            'gold_wastage' => 'nullable|numeric|min:0',
            'wastage_weight' => 'nullable|numeric|min:0',
            'wastage' => 'nullable|numeric|min:0',
        ]);

        return DB::transaction(function () use ($request, $validated, $id) {
            $order = WorkOrder::lockForUpdate()->findOrFail($id);

            $qcPiece = null;
            if ($request->filled('piece_id') && $validated['action'] !== 'update_remarks') {
                $qcPiece = WorkOrderReceivedPiece::where('work_order_id', $order->id)
                    ->lockForUpdate()
                    ->find($request->input('piece_id'));
                if (!$qcPiece) {
                    return response()->json(['status' => 'error', 'message' => 'Specified piece does not belong to this Work Order.'], 422);
                }
                if (!empty($validated['work_order_item_id']) && (int)$qcPiece->work_order_item_id !== (int)$validated['work_order_item_id']) {
                    return response()->json(['status' => 'error', 'message' => 'Specified piece does not belong to the selected job item.'], 422);
                }
                if (!empty($qcPiece->received_at) || ($qcPiece->qc_status === 'passed' && $qcPiece->status === 'ready')) {
                    return response()->json(['status' => 'error', 'message' => 'This piece is no longer awaiting Quality Check.'], 422);
                }
            }

            if ($validated['action'] === 'update_remarks') {
                $noteText = $validated['notes'] ?? $validated['remarks'] ?? '';
                $order->quality_notes = $noteText;

                $submittedGross = null;
                if ($request->filled('actual_weight')) $submittedGross = (float)$request->input('actual_weight');
                elseif ($request->filled('gross_weight')) $submittedGross = (float)$request->input('gross_weight');
                elseif ($request->filled('completed_weight')) $submittedGross = (float)$request->input('completed_weight');

                $submittedDiaWt = $request->filled('diamond_weight') ? (float)$request->input('diamond_weight') : null;
                $submittedDiaCount = $request->filled('diamond_count') ? (int)$request->input('diamond_count') : null;

                $submittedWastage = null;
                if ($request->filled('gold_wastage')) $submittedWastage = (float)$request->input('gold_wastage');
                elseif ($request->filled('wastage_weight')) $submittedWastage = (float)$request->input('wastage_weight');
                elseif ($request->filled('wastage')) $submittedWastage = (float)$request->input('wastage');

                $orderPricing = is_array($order->pricing_details) ? $order->pricing_details : (json_decode($order->pricing_details ?? '[]', true) ?: []);
                if ($submittedGross !== null && $submittedGross > 0) {
                    $order->completed_weight = $submittedGross;
                }
                if ($submittedDiaWt !== null) {
                    $orderPricing['diamond_weight'] = $submittedDiaWt;
                }
                if ($submittedDiaCount !== null) {
                    $orderPricing['diamond_count'] = $submittedDiaCount;
                }
                if ($submittedWastage !== null) {
                    $order->wastage_weight = $submittedWastage;
                    $orderPricing['wastage_weight'] = $submittedWastage;
                    $orderPricing['gold_wastage'] = $submittedWastage;
                }
                $order->pricing_details = $orderPricing;
                $order->save();

                if ($request->filled('piece_id')) {
                    $remarksPiece = WorkOrderReceivedPiece::where('work_order_id', $order->id)
                        ->lockForUpdate()
                        ->findOrFail($request->input('piece_id'));
                    $remarksPiece->qc_notes = $noteText;

                    if ($submittedGross !== null && $submittedGross > 0) {
                        $remarksPiece->gross_weight = $submittedGross;
                        $diaG = ((float)($submittedDiaWt ?? $remarksPiece->diamond_weight ?? 0)) * 0.2;
                        $remarksPiece->net_gold_weight = max(0.0, $submittedGross - $diaG);
                    }
                    if ($submittedDiaWt !== null) {
                        $remarksPiece->diamond_weight = $submittedDiaWt;
                        if ((float)$remarksPiece->gross_weight > 0) {
                            $remarksPiece->net_gold_weight = max(0.0, (float)$remarksPiece->gross_weight - ($submittedDiaWt * 0.2));
                        }
                    }
                    if ($submittedDiaCount !== null) {
                        $remarksPiece->diamond_count = $submittedDiaCount;
                    }
                    if ($submittedWastage !== null) {
                        $rQc = is_array($remarksPiece->qc_submission_data) ? $remarksPiece->qc_submission_data : [];
                        $rQc['wastage_weight'] = $submittedWastage;
                        $rQc['gold_wastage'] = $submittedWastage;
                        $remarksPiece->qc_submission_data = $rQc;
                    }
                    $remarksPiece->save();
                }

                if (!empty($validated['work_order_item_id'])) {
                    $item = WorkOrderItem::lockForUpdate()->where('work_order_id', $order->id)->find($validated['work_order_item_id']);
                    if ($item) {
                        $item->remarks = $noteText;
                        if ($submittedGross !== null && $submittedGross > 0) {
                            $item->completed_weight = $submittedGross;
                        }
                        $item->save();
                    }
                }

                return response()->json([
                    'status' => 'success',
                    'message' => 'QC inspection details and weights updated successfully.',
                    'data' => $order->fresh(['items', 'client', 'karigar', 'receivedPieces']),
                ]);
            }

            $action = ($validated['action'] === 'approve') ? 'pass' : $validated['action'];
            $passQty = (int)($validated['approved_qty'] ?? $request->input('pass_qty') ?? ($action === 'pass' ? ($validated['quantity'] ?? 0) : 0));
            $reworkQty = (int)($validated['rework_qty'] ?? ($action === 'rework' ? ($validated['quantity'] ?? 0) : 0));

            if ($action === 'pass' && $reworkQty == 0) {
                $passQty = $passQty > 0 ? $passQty : max(1, (int)$order->qc_pending_qty);
            } elseif ($action === 'rework' && $passQty == 0) {
                $reworkQty = $reworkQty > 0 ? $reworkQty : max(1, (int)$order->qc_pending_qty);
            }

            $totalInspected = $passQty + $reworkQty;
            if ($qcPiece && $totalInspected !== 1) {
                return response()->json(['status' => 'error', 'message' => 'A piece-specific QC decision must apply to exactly one piece.'], 422);
            }
            if ($totalInspected <= 0) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Please specify a quantity for QC inspection.'
                ], 422);
            }

            $isReworkPiece = $qcPiece && in_array($qcPiece->qc_status, ['rejected', 'rework']);
            if ($isReworkPiece) {
                if ($totalInspected > (int)$order->rework_qty) {
                    return response()->json([
                        'status' => 'error',
                        'message' => "Inspected rework quantity ({$totalInspected}) exceeds quantity awaiting rework resolution ({$order->rework_qty})."
                    ], 422);
                }
            } else {
                if ($totalInspected > $order->qc_pending_qty) {
                    $availQc = max($order->qc_pending_qty, max($order->completed_qty, $order->required_qty) - ($order->qc_approved_qty + $order->rework_qty));
                    if ($totalInspected > $availQc) {
                        return response()->json([
                            'status' => 'error',
                            'message' => "Inspected quantity ({$totalInspected}) exceeds quantity awaiting QC ({$availQc})."
                        ], 422);
                    }
                    $order->qc_pending_qty = $availQc;
                }
            }

            $item = null;
            if (!empty($validated['work_order_item_id'])) {
                $item = WorkOrderItem::lockForUpdate()->where('work_order_id', $order->id)->find($validated['work_order_item_id']);
            }

            // Apply Pass
            if ($passQty > 0) {
                if ($isReworkPiece) {
                    $order->rework_qty = max(0, (int)$order->rework_qty - $passQty);
                } else {
                    $order->qc_pending_qty = max(0, (int)$order->qc_pending_qty - $passQty);
                }
                $order->qc_approved_qty = (int)$order->qc_approved_qty + $passQty;
                $order->ready_qty = (int)$order->ready_qty + $passQty;

                if ($item) {
                    if ($isReworkPiece) {
                        $item->rework_qty = max(0, (int)$item->rework_qty - $passQty);
                    } else {
                        $item->qc_pending_qty = max(0, (int)$item->qc_pending_qty - $passQty);
                    }
                    $item->qc_approved_qty = (int)$item->qc_approved_qty + $passQty;
                    $item->ready_qty = (int)$item->ready_qty + $passQty;
                    if ((int)$item->rework_qty > 0) {
                        $item->status = 'rework';
                    } elseif ((int)$item->qc_pending_qty > 0) {
                        $item->status = 'quality_check';
                    } elseif ((int)$item->ready_qty > (int)$item->received_qty) {
                        $item->status = 'ready';
                    } elseif ($item->received_qty >= $item->required_qty) {
                        $item->status = 'completed';
                    } else {
                        $item->status = 'in_progress';
                    }
                    $item->save();
                }

                // Apply Pass to individual pieces
                $passPieces = collect();
                if ($qcPiece) {
                    $passPieces->push($qcPiece);
                }
                if ($passPieces->isEmpty()) {
                    $pq = WorkOrderReceivedPiece::where('work_order_id', $order->id)
                        ->whereNull('received_at')
                        ->where(function ($q) {
                            $q->where('qc_status', 'pending')
                              ->orWhere('status', 'qc_pending')
                              ->orWhereNull('qc_status');
                        });
                    if ($item) $pq->where('work_order_item_id', $item->id);
                    $passPieces = $pq->orderBy('piece_number', 'asc')->take($passQty)->get();
                }
                // Persist any updated weights from QC inspection form
                $submittedGross = null;
                if ($request->filled('actual_weight')) $submittedGross = (float)$request->input('actual_weight');
                elseif ($request->filled('gross_weight')) $submittedGross = (float)$request->input('gross_weight');
                elseif ($request->filled('completed_weight')) $submittedGross = (float)$request->input('completed_weight');

                $submittedDiaWt = $request->filled('diamond_weight') ? (float)$request->input('diamond_weight') : null;
                $submittedDiaCount = $request->filled('diamond_count') ? (int)$request->input('diamond_count') : null;

                $submittedWastage = null;
                if ($request->filled('gold_wastage')) $submittedWastage = (float)$request->input('gold_wastage');
                elseif ($request->filled('wastage_weight')) $submittedWastage = (float)$request->input('wastage_weight');
                elseif ($request->filled('wastage')) $submittedWastage = (float)$request->input('wastage');

                $orderPricing = is_array($order->pricing_details) ? $order->pricing_details : (json_decode($order->pricing_details ?? '[]', true) ?: []);
                if ($submittedGross !== null && $submittedGross > 0) {
                    $order->completed_weight = $submittedGross;
                }
                if ($submittedDiaWt !== null) {
                    $orderPricing['diamond_weight'] = $submittedDiaWt;
                }
                if ($submittedDiaCount !== null) {
                    $orderPricing['diamond_count'] = $submittedDiaCount;
                }
                if ($submittedWastage !== null) {
                    $order->wastage_weight = $submittedWastage;
                    $orderPricing['wastage_weight'] = $submittedWastage;
                    $orderPricing['gold_wastage'] = $submittedWastage;
                }
                $order->pricing_details = $orderPricing;

                foreach ($passPieces as $pp) {
                    $pp->qc_status = 'passed';
                    $pp->status = 'ready';
                    $pp->qc_notes = $validated['notes'] ?? 'QC Passed';
                    $pp->qc_checked_at = now();
                    $pp->qc_checked_by = Auth::id() ?? 1;

                    if ($submittedGross !== null && $submittedGross > 0) {
                        $pp->gross_weight = $submittedGross;
                        $diaG = ((float)($submittedDiaWt ?? $pp->diamond_weight ?? 0)) * 0.2;
                        $pp->net_gold_weight = max(0.0, $submittedGross - $diaG);
                    }
                    if ($submittedDiaWt !== null) {
                        $pp->diamond_weight = $submittedDiaWt;
                        if ((float)$pp->gross_weight > 0) {
                            $pp->net_gold_weight = max(0.0, (float)$pp->gross_weight - ($submittedDiaWt * 0.2));
                        }
                    }
                    if ($submittedDiaCount !== null) {
                        $pp->diamond_count = $submittedDiaCount;
                    }

                    $ppQc = is_array($pp->qc_submission_data) ? $pp->qc_submission_data : [];
                    if ($submittedWastage !== null) {
                        $ppQc['wastage_weight'] = $submittedWastage;
                        $ppQc['gold_wastage'] = $submittedWastage;
                    }
                    $ppQc['wastage_approved'] = true;
                    $ppQc['approved_wastage_weight'] = (float)($submittedWastage ?? $ppQc['wastage_weight'] ?? $order->wastage_weight ?? 0);
                    $pp->qc_submission_data = $ppQc;
                    $pp->save();
                }
            }

            // Apply Rework
            if ($reworkQty > 0) {
                $order->qc_pending_qty = max(0, (int)$order->qc_pending_qty - $reworkQty);
                $order->rework_qty = (int)$order->rework_qty + $reworkQty;
                $order->return_count = ($order->return_count ?? 0) + 1;
                $order->return_reason = $validated['reason'] ?? $validated['notes'] ?? 'QC Failed: rework required';
                $order->returned_by = Auth::user()?->name ?? 'QC Inspector';
                $order->return_date = now()->toDateString();

                if ($item) {
                    $item->qc_pending_qty = max(0, (int)$item->qc_pending_qty - $reworkQty);
                    $item->rework_qty = (int)$item->rework_qty + $reworkQty;
                    $item->status = 'rework';
                    $item->return_reason = $order->return_reason;
                    $item->save();
                }

                // Apply Rework to individual pieces
                $reworkPieces = collect();
                if ($qcPiece) {
                    $reworkPieces->push($qcPiece);
                }
                if ($reworkPieces->isEmpty()) {
                    $rq = WorkOrderReceivedPiece::where('work_order_id', $order->id)
                        ->whereNull('received_at')
                        ->where(function ($q) {
                            $q->where('qc_status', 'pending')
                              ->orWhere('status', 'qc_pending')
                              ->orWhereNull('qc_status');
                        });
                    if ($item) $rq->where('work_order_item_id', $item->id);
                    $reworkPieces = $rq->orderBy('piece_number', 'asc')->take($reworkQty)->get();
                }
                foreach ($reworkPieces as $rp) {
                    $rp->qc_status = 'rejected';
                    $rp->status = 'rework';
                    $rp->qc_notes = $order->return_reason;
                    $rp->qc_checked_at = now();
                    $rp->qc_checked_by = Auth::id() ?? 1;

                    $rpQc = is_array($rp->qc_submission_data) ? $rp->qc_submission_data : [];
                    $rpQc['wastage_approved'] = false;
                    $rpQc['is_returned'] = true;
                    $rpQc['return_reason'] = $order->return_reason;
                    $rpQc['return_count'] = ($rpQc['return_count'] ?? 0) + 1;
                    $rpQc['is_resubmitted'] = false;
                    $rp->qc_submission_data = $rpQc;
                    $rp->save();
                }
            }

            // Stage updates
            if ($order->rework_qty > 0 && $order->ready_qty == 0) {
                $order->current_stage = 'rework';
                $order->status = 'returned';
                $order->quality_status = 'returned';
            } elseif ($order->rework_qty > 0 && $order->ready_qty > 0) {
                $order->current_stage = 'rework';
                $order->status = 'returned';
                $order->quality_status = 'partial_rework';
            } elseif ($order->ready_qty > 0) {
                $order->current_stage = 'ready';
                $order->status = 'ready';
                $order->quality_status = 'passed';
            }

            $order->quality_checked_by = Auth::id() ?? 1;
            $order->quality_checked_at = now();
            $order->quality_notes = $validated['notes'] ?? ($passQty > 0 ? 'QC Passed' : 'Rework required');
            $order->save();

            // Timeline log
            $stageLabel = ($passQty > 0 && $reworkQty > 0) 
                ? "QC Partial: {$passQty} Passed, {$reworkQty} Rework"
                : ($passQty > 0 ? "QC Passed: {$passQty} Unit(s) Approved" : "QC Rejected: {$reworkQty} Unit(s) sent for Rework");

            WorkOrderTimeline::create([
                'work_order_id' => $order->id,
                'stage' => $reworkQty > 0 ? 'reworking' : 'quality_check',
                'stage_label' => $stageLabel,
                'completed_weight_at_step' => $order->completed_weight,
                'pending_weight_at_step' => $order->pending_weight,
                'status' => 'completed',
                'notes' => $order->quality_notes . ($reworkQty > 0 ? " (Reason: {$order->return_reason})" : ''),
                'user_id' => Auth::id() ?? 1,
                'action_by_name' => Auth::user()?->name ?? 'QC Inspector',
                'created_at' => now(),
            ]);

            if ($order->jobOrder) {
                $order->jobOrder->updateDerivedStatus();
            }

            // Dispatch QC decision notifications
            if ($passQty > 0) {
                NotificationService::notifyQcPassed($order, $item, null, $passQty, Auth::id());
                NotificationService::notifyReadyForReceiving($order, $item, null, $passQty, Auth::id());
            }
            if ($reworkQty > 0) {
                NotificationService::notifyQcReworkReturned($order, $item, null, $order->return_reason ?? 'QC Failed', $reworkQty, Auth::id());
            }

            return response()->json([
                'status' => 'success',
                'message' => "QC completed successfully. Approved: {$passQty}, Rework: {$reworkQty}.",
                'data' => $order->fresh(['items', 'receivedPieces', 'karigar', 'product', 'timelines'])
            ]);
        });
    }

    /**
     * Authoritative backend service method to check and perform final inventory posting for received pieces
     */
    public function syncInventoryPosting(WorkOrder $order, ?WorkOrderItem $item = null)
    {
        return DB::transaction(function () use ($order, $item) {
            $order = WorkOrder::lockForUpdate()->find($order->id);
            if (!$order) {
                return 0;
            }

            // Fetch unposted received pieces
            $unpostedPieces = WorkOrderReceivedPiece::where('work_order_id', $order->id)
                ->where('is_inventory_posted', false)
                ->whereNotNull('received_at')
                ->lockForUpdate()
                ->get()
                ->filter(fn ($piece) => $piece->isEligibleForInventory())
                ->values();

            if ($unpostedPieces->isEmpty()) {
                // Check if order is complete
                if ($order->finalized_qty >= $order->required_qty && $order->received_qty >= $order->required_qty) {
                    if (!in_array($order->status, ['completed', 'cancelled'])) {
                        $order->status = 'completed';
                        $order->current_stage = 'completed';
                        $order->save();
                    }
                }
                return 0;
            }

            $postedCount = 0;
            foreach ($unpostedPieces as $piece) {
                if ($piece->is_inventory_posted) {
                    continue;
                }

                $designNo = $piece->design_no ?: $order->design_code ?: 'DES-' . str_pad($order->id, 4, '0', STR_PAD_LEFT);
                $rawProductName = $piece->product_name ?: $order->product_name ?: 'Jewellery Product';
                $productName = self::cleanProductName($rawProductName, $designNo);
                $grossWeight = (float)$piece->gross_weight;
                $pure24kWeight = (float)$piece->pure_24k_weight;
                $purity = (float)$piece->purity;
                $dynamicStamp = $piece->diamond_stamp ?: ($order->stamp ?? null);

                $product = null;
                if (!empty($piece->product_id)) {
                    $product = Product::find($piece->product_id);
                }
                if (!$product && $piece->work_order_item_id) {
                    $woItem = WorkOrderItem::find($piece->work_order_item_id);
                    if ($woItem && $woItem->product_id) {
                        $product = Product::find($woItem->product_id);
                    }
                }
                // Only fall back to parent order product if this is a single-job work order
                if (!$product && $order->items()->count() <= 1 && !empty($order->product_id)) {
                    $product = Product::find($order->product_id);
                }
                if (!$product && !empty($designNo)) {
                    $product = Product::where('design_no', $designNo)
                        ->orWhere('product_code', $designNo)
                        ->first();
                }
                if (!$product && !empty($productName)) {
                    $product = Product::where('name', $productName)->first();
                }

                if ($product) {
                    $product = Product::lockForUpdate()->find($product->id);
                }

                if ($product) {
                    // Concurrency & idempotency guard: Do not duplicate if this piece tag was already posted in InventoryMovement
                    $alreadyMoved = \App\Models\InventoryMovement::where('product_id', $product->id)
                        ->where('notes', 'like', "%(Tag: {$piece->tag_number})%")
                        ->exists();

                    if ($alreadyMoved) {
                        $piece->is_inventory_posted = true;
                        $piece->posted_at = now();
                        $piece->posted_by = Auth::id() ?? 1;
                        $piece->save();
                        continue;
                    }

                    $product->current_stock_qty = (int)($product->current_stock_qty ?? 0) + 1;
                    $product->opening_stock_weight = round((float)($product->opening_stock_weight ?? 0) + $grossWeight, 3);
                    $product->opening_fine_weight = round((float)($product->opening_fine_weight ?? 0) + $pure24kWeight, 3);

                    // Synchronize product attributes (per-product gross weight, net weight, pieces, stones, tags)
                    $attrs = is_array($product->attributes) ? $product->attributes : (json_decode($product->attributes ?? '[]', true) ?: []);
                    $attrs['unit_gross_wt'] = round($grossWeight, 3);
                    $attrs['unit_net_wt'] = round((float)$piece->net_gold_weight, 3);
                    $attrs['gross_wt'] = round($grossWeight, 3);
                    $attrs['net_wt'] = round((float)$piece->net_gold_weight, 3);
                    $attrs['total_stock_weight'] = round((float)$product->opening_stock_weight, 3);
                    $attrs['purity'] = (string)($piece->purity ?? $attrs['purity'] ?? '91.6');
                    $attrs['gold_karat'] = (string)($piece->gold_karat ?? $attrs['gold_karat'] ?? '22K');
                    $attrs['no_of_pieces'] = (string)$product->current_stock_qty;
                    if (!empty($piece->diamond_weight) && (float)$piece->diamond_weight > 0) {
                        if (empty($attrs['dia_wt_ct']) && empty($attrs['diamond_weight'])) {
                            $attrs['dia_wt_ct'] = round((float)$piece->diamond_weight, 3);
                            $attrs['diamond_weight'] = round((float)$piece->diamond_weight, 3);
                            $attrs['diamond_count'] = (int)($piece->diamond_count ?: ($attrs['diamond_count'] ?? 1));
                        }
                        if (!empty($piece->diamond_stamp) || !empty($dynamicStamp)) {
                            $attrs['diamond_stamp'] = $piece->diamond_stamp ?: $dynamicStamp;
                        }
                    }
                    if (!empty($piece->color_stone_weight) && (float)$piece->color_stone_weight > 0) {
                        if (empty($attrs['stone_weight'])) {
                            $attrs['stone_weight'] = round((float)$piece->color_stone_weight, 3);
                            $attrs['stone_count'] = (int)($piece->color_stone_count ?: ($attrs['stone_count'] ?? 1));
                        }
                    }
                    if ($piece->tag_number) {
                        $tags = is_array($attrs['tags'] ?? null) ? $attrs['tags'] : [];
                        if (!in_array($piece->tag_number, $tags)) {
                            $tags[] = $piece->tag_number;
                        }
                        $attrs['tags'] = $tags;
                        $attrs['last_tag_number'] = $piece->tag_number;
                    }

                    // Preserve diamond components and purchase rates/values from work order if not already present
                    $woItem = $piece->work_order_item_id ? WorkOrderItem::find($piece->work_order_item_id) : $order->items()->first();
                    $itemPricing = is_array($woItem?->pricing_details) ? $woItem->pricing_details : (json_decode($woItem?->pricing_details ?? '[]', true) ?: []);
                    $sieves = $itemPricing['diamond_sieves'] ?? [];
                    if (empty($sieves)) {
                        $orderPricing = is_array($order->pricing_details) ? $order->pricing_details : (json_decode($order->pricing_details ?? '[]', true) ?: []);
                        $sieves = $orderPricing['diamond_sieves'] ?? [];
                    }
                    if (!empty($sieves) && is_array($sieves)) {
                        $existingComponents = is_array($attrs['components'] ?? null) ? $attrs['components'] : [];
                        $hasExistingDiamondComp = collect($existingComponents)->contains(function ($c) {
                            $cName = strtolower($c['category_name'] ?? $c['item_name'] ?? $c['component_type'] ?? '');
                            return !empty($c['is_diamond']) || str_contains($cName, 'diamond') || str_contains($cName, 'dia');
                        });
                        if (!$hasExistingDiamondComp) {
                            foreach ($sieves as $sieve) {
                                $existingComponents[] = [
                                    'component_type' => 'diamond',
                                    'category_name' => 'Diamond',
                                    'stamp' => $sieve['stamp'] ?? '',
                                    'size' => $sieve['stamp'] ?? '',
                                    'no_of_pieces' => (int)($sieve['count'] ?? 1),
                                    'quantity' => (int)($sieve['count'] ?? 1),
                                    'stone_weight' => (float)($sieve['weight'] ?? 0),
                                    'gross_wt' => (float)($sieve['weight'] ?? 0),
                                    'unit' => 'ct',
                                    'purchase_rate' => (float)($sieve['rate'] ?? 0),
                                    'purchase_value' => round(((float)($sieve['weight'] ?? 0)) * ((float)($sieve['rate'] ?? 0)), 2),
                                ];
                            }
                            $attrs['components'] = $existingComponents;
                        }
                    }

                    $product->attributes = $attrs;
                    $product->save();
                } else {
                    $catId = $order->category_id;
                    $subcatId = $order->subcategory_id;
                    if (empty($catId) || !Category::where('id', $catId)->exists()) {
                        $firstCat = Category::first();
                        $catId = $firstCat ? $firstCat->id : null;
                    }
                    $woItem = $piece->work_order_item_id ? WorkOrderItem::find($piece->work_order_item_id) : $order->items()->first();
                    $itemPricing = is_array($woItem?->pricing_details) ? $woItem->pricing_details : (json_decode($woItem?->pricing_details ?? '[]', true) ?: []);
                    $sieves = $itemPricing['diamond_sieves'] ?? [];
                    if (empty($sieves)) {
                        $orderPricing = is_array($order->pricing_details) ? $order->pricing_details : (json_decode($order->pricing_details ?? '[]', true) ?: []);
                        $sieves = $orderPricing['diamond_sieves'] ?? [];
                    }
                    $initialComponents = [];
                    if (!empty($sieves) && is_array($sieves)) {
                        foreach ($sieves as $sieve) {
                            $initialComponents[] = [
                                'component_type' => 'diamond',
                                'category_name' => 'Diamond',
                                'stamp' => $sieve['stamp'] ?? '',
                                'size' => $sieve['stamp'] ?? '',
                                'no_of_pieces' => (int)($sieve['count'] ?? 1),
                                'quantity' => (int)($sieve['count'] ?? 1),
                                'stone_weight' => (float)($sieve['weight'] ?? 0),
                                'gross_wt' => (float)($sieve['weight'] ?? 0),
                                'unit' => 'ct',
                                'purchase_rate' => (float)($sieve['rate'] ?? 0),
                                'purchase_value' => round(((float)($sieve['weight'] ?? 0)) * ((float)($sieve['rate'] ?? 0)), 2),
                            ];
                        }
                    }

                    $initialAttrs = [
                        'design_no' => $designNo,
                        'gross_wt' => round($grossWeight, 3),
                        'net_wt' => round((float)$piece->net_gold_weight, 3),
                        'unit_gross_wt' => round($grossWeight, 3),
                        'unit_net_wt' => round((float)$piece->net_gold_weight, 3),
                        'purity' => (string)($piece->purity ?? '91.6'),
                        'gold_karat' => (string)($piece->gold_karat ?? '22K'),
                        'no_of_pieces' => '1',
                        'dia_wt_ct' => !empty($piece->diamond_weight) ? round((float)$piece->diamond_weight, 3) : 0,
                        'diamond_count' => !empty($piece->diamond_count) ? (int)$piece->diamond_count : 0,
                        'diamond_stamp' => $piece->diamond_stamp ?: $dynamicStamp ?: null,
                        'stone_weight' => !empty($piece->color_stone_weight) ? round((float)$piece->color_stone_weight, 3) : 0,
                        'stone_count' => !empty($piece->color_stone_count) ? (int)$piece->color_stone_count : 0,
                        'tags' => $piece->tag_number ? [$piece->tag_number] : [],
                        'last_tag_number' => $piece->tag_number,
                        'components' => $initialComponents,
                    ];
                    $product = Product::create([
                        'category_id' => $catId,
                        'subcategory_id' => $subcatId,
                        'name' => $productName,
                        'product_code' => $designNo,
                        'design_no' => $designNo,
                        'current_stock_qty' => 1,
                        'opening_stock_weight' => round($grossWeight, 3),
                        'opening_touch' => round($purity, 2),
                        'opening_fine_weight' => round($pure24kWeight, 3),
                        'attributes' => $initialAttrs,
                        'status' => 'active',
                    ]);
                }

                if (!$piece->product_id) {
                    $piece->product_id = $product->id;
                }

                try {
                    \App\Models\InventoryMovement::create([
                        'product_id' => $product->id,
                        'movement_type' => 'receipt',
                        'quantity' => 1,
                        'weight' => round($grossWeight, 3),
                        'notes' => "Finalized Inventory Posting (Tag: {$piece->tag_number}) from Work Order {$order->work_order_number} (Job: {$designNo})",
                        'created_by' => Auth::id() ?? 1,
                    ]);
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::warning('Inventory movement log notice: ' . $e->getMessage());
                }

                $piece->is_inventory_posted = true;
                $piece->status = 'in_stock';
                $piece->posted_at = now();
                $piece->posted_by = Auth::id() ?? 1;
                $piece->save();

                NotificationService::notifyInventoryPosted($order, $piece, $product, Auth::id());

                $postedCount++;
            }

            // Update finalized_qty
            $totalPosted = WorkOrderReceivedPiece::where('work_order_id', $order->id)
                ->where('is_inventory_posted', true)
                ->count();

            $order->finalized_qty = $totalPosted;

            if ($order->items()->exists()) {
                foreach ($order->items as $it) {
                    $itemPosted = WorkOrderReceivedPiece::where('work_order_item_id', $it->id)
                        ->where('is_inventory_posted', true)
                        ->count();
                    $it->finalized_qty = $itemPosted;
                    if ($it->finalized_qty >= $it->required_qty && $it->received_qty >= $it->required_qty) {
                        $it->status = 'completed';
                    }
                    $it->save();
                }
            }

            // Evaluate overall Work Order completion status strictly against all completion rules
            $reqQty = max(1, (int)$order->required_qty);
            $isAllReceived = ((int)$order->received_qty >= $reqQty);
            $isAllFinalized = ((int)$order->finalized_qty >= $reqQty);
            $noQcPending = ((int)$order->qc_pending_qty === 0);
            $noReworkPending = ((int)$order->rework_qty === 0);

            $certStatus = strtolower($order->certification_status ?? 'pending');
            $certOK = in_array($certStatus, ['completed', 'skipped', 'not_required']);

            $hallStatus = strtolower($order->hallmarking_status ?? 'pending');
            $hallOK = in_array($hallStatus, ['completed', 'skipped', 'not_required']);

            if ($isAllReceived && $isAllFinalized && $noQcPending && $noReworkPending && $certOK && $hallOK) {
                $order->status = 'completed';
                $order->current_stage = 'completed';
                NotificationService::notifyWorkOrderCompleted($order, Auth::id());
            } elseif ($isAllReceived) {
                if (!$certOK) {
                    $order->status = 'received';
                    $order->current_stage = 'certification';
                } elseif (!$hallOK) {
                    $order->status = 'received';
                    $order->current_stage = 'hallmarking';
                } else {
                    $order->status = 'ready';
                    $order->current_stage = 'ready';
                }
            } else {
                if ($order->received_qty > 0) {
                    $order->status = 'partially_received';
                    $order->current_stage = 'partially_received';
                }
            }
            $order->save();

            if ($order->karigar_id) {
                $this->syncKarigarGoldBalance($order->karigar_id);
            }

            return $postedCount;
        });
    }

    /**
     * API endpoint to explicitly finalize inventory for a Work Order
     */
    public function finalizeInventory(Request $request, $id)
    {
        $this->authorizeAction();

        $order = WorkOrder::findOrFail($id);
        $postedCount = $this->syncInventoryPosting($order);

        $freshOrder = $order->fresh(['items', 'receivedPieces', 'karigar', 'product', 'timelines']);

        return response()->json([
            'status' => 'success',
            'message' => $postedCount > 0 
                ? "Successfully posted {$postedCount} received piece(s) to Store Inventory." 
                : "No pending eligible pieces to post for this Work Order.",
            'posted_count' => $postedCount,
            'data' => $freshOrder,
            'order' => $freshOrder,
        ]);
    }

    /**
     * Certification Action: Add certification or Skip
     */
    public function certificationAction(Request $request, $id)
    {
        $this->authorizeAction();

        $validated = $request->validate([
            'work_order_item_id' => 'nullable|exists:work_order_items,id',
            'work_order_received_piece_id' => 'nullable|exists:work_order_received_pieces,id',
            'piece_id' => 'nullable|exists:work_order_received_pieces,id',
            'tag_number' => 'nullable|string|max:50',
            'action' => 'nullable|in:add,skip,not_required',
            'certification_no' => 'nullable|string|max:255',
            'agency' => 'nullable|string|max:255',
            'certification_agency' => 'nullable|string|max:255',
            'details' => 'nullable|string',
            'move_to_hallmarking' => 'nullable|boolean',
        ]);

        $order = WorkOrder::findOrFail($id);
        $action = $validated['action'] ?? ($request->boolean('move_to_hallmarking') ? 'add' : 'add');
        
        $item = null;
        if (!empty($validated['work_order_item_id'])) {
            $item = WorkOrderItem::where('work_order_id', $order->id)->find($validated['work_order_item_id']);
        }

        $certStatus = in_array($action, ['skip', 'not_required']) ? 'skipped' : 'completed';
        $agency = $validated['certification_agency'] ?? $validated['agency'] ?? 'BIS Certified';
        $certNo = ($certStatus === 'skipped') ? null : ($validated['certification_no'] ?? null);

        if ($item) {
            $pricing = $item->pricing_details ?? [];
            $pricing['certification_no'] = $certNo;
            $pricing['certification_agency'] = ($certStatus === 'skipped') ? null : $agency;
            $pricing['certification_status'] = $certStatus;
            $item->pricing_details = $pricing;
            $item->save();
        }

        $order->certification_status = $certStatus;
        $order->certification_details = [
            'action' => $action,
            'work_order_item_id' => $item?->id,
            'certification_no' => $certNo,
            'agency' => ($certStatus === 'skipped') ? null : $agency,
            'details' => $validated['details'] ?? null,
            'updated_by' => Auth::user()?->name ?? 'Admin',
            'updated_at' => now()->toDateTimeString(),
        ];
        $order->certification_updated_by = Auth::id() ?? 1;
        $order->certification_updated_at = now();
        $order->certified_qty = max((int)$order->certified_qty, max((int)$order->ready_qty, (int)$order->received_qty));

        $pricing = $order->pricing_details ?? [];
        $pricing['certification_no'] = $certNo;
        $pricing['certification_agency'] = ($certStatus === 'skipped') ? null : $agency;
        $pricing['certification_status'] = $order->certification_status;
        $order->pricing_details = $pricing;

        $order->save();

        $targetPiece = null;
        if (!empty($validated['work_order_received_piece_id'])) {
            $targetPiece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->find($validated['work_order_received_piece_id']);
        } elseif (!empty($validated['piece_id'])) {
            $targetPiece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->find($validated['piece_id']);
        } elseif (!empty($validated['tag_number'])) {
            $targetPiece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->where('tag_number', $validated['tag_number'])->first();
        }

        if ($targetPiece && empty($targetPiece->received_at)) {
            return response()->json([
                'status' => 'error',
                'message' => "Piece #{$targetPiece->piece_number} must be physically received before proceeding to certification."
            ], 422);
        }

        // Propagate certification status to the exact physical received piece(s)
        $piecesQuery = WorkOrderReceivedPiece::where('work_order_id', $order->id);
        if (!empty($validated['work_order_received_piece_id'])) {
            $piecesQuery->where('id', $validated['work_order_received_piece_id']);
        } elseif (!empty($validated['piece_id'])) {
            $piecesQuery->where('id', $validated['piece_id']);
        } elseif (!empty($validated['tag_number'])) {
            $piecesQuery->where('tag_number', $validated['tag_number']);
        } elseif ($item) {
            $piecesQuery->where('work_order_item_id', $item->id);
        }

        $hasSpecificPiece = !empty($validated['work_order_received_piece_id']) || !empty($validated['piece_id']) || !empty($validated['tag_number']);
        if (!$hasSpecificPiece) {
            if ($action === 'add') {
                $piecesQuery->whereNotNull('received_at');
            }
            $pendingCount = (clone $piecesQuery)->where('certification_status', 'pending')->count();
            if ($pendingCount > 0) {
                $piecesQuery->where('certification_status', 'pending');
            }
        }

        $piecesQuery->update([
            'certification_status' => $certStatus,
            'certificate_no' => $certNo,
            'certification_agency' => ($certStatus === 'skipped') ? null : $agency,
            'certified_at' => now(),
            'certified_by' => Auth::id() ?? 1,
        ]);

        $actualCertified = WorkOrderReceivedPiece::where('work_order_id', $order->id)
            ->whereIn('certification_status', ['completed', 'skipped', 'not_required'])
            ->count();
        $order->certified_qty = max((int)$order->certified_qty, $actualCertified);
        if ($hasSpecificPiece) {
            $order->certification_status = ($order->certified_qty >= $order->required_qty) ? $certStatus : 'in_progress';
        } else {
            $order->certification_status = $certStatus;
        }
        $order->save();

        WorkOrderTimeline::create([
            'work_order_id' => $order->id,
            'stage' => 'certification',
            'stage_label' => ($certStatus === 'skipped') ? 'Certification Skipped' : 'Certification Completed',
            'completed_weight_at_step' => $order->completed_weight,
            'pending_weight_at_step' => $order->pending_weight,
            'status' => 'completed',
            'notes' => ($certStatus === 'skipped') 
                ? 'Certification step explicitly marked as skipped / not required.' 
                : "Certificate No: " . ($certNo ?? 'N/A') . " (" . ($agency ?? 'BIS') . ").",
            'user_id' => Auth::id() ?? 1,
            'action_by_name' => Auth::user()?->name ?? 'Admin',
            'created_at' => now(),
        ]);

        // Attempt inventory finalization if physical receiving was already recorded
        $this->syncInventoryPosting($order);

        if ($certStatus !== 'skipped') {
            NotificationService::notifyCertificationCompleted($order, null, $certNo ?? '', Auth::id());
        }

        return response()->json([
            'status' => 'success',
            'message' => ($certStatus === 'skipped') ? 'Certification skipped.' : 'Certification details recorded successfully.',
            'data' => $order->fresh(['karigar', 'product', 'items', 'receivedPieces', 'timelines'])
        ]);
    }

    /**
     * Hallmarking Action: Add HUID/Hallmark or Skip
     */
    public function hallmarkingAction(Request $request, $id)
    {
        $this->authorizeAction();

        $validated = $request->validate([
            'work_order_item_id' => 'nullable|exists:work_order_items,id',
            'work_order_received_piece_id' => 'nullable|exists:work_order_received_pieces,id',
            'piece_id' => 'nullable|exists:work_order_received_pieces,id',
            'tag_number' => 'nullable|string|max:50',
            'action' => 'nullable|in:add,skip,not_required',
            'huid' => 'nullable|string|max:50',
            'huid_number' => 'nullable|string|max:50',
            'hallmark_center' => 'nullable|string|max:255',
            'center_name' => 'nullable|string|max:255',
            'details' => 'nullable|string',
        ]);

        $order = WorkOrder::findOrFail($id);
        $action = $validated['action'] ?? 'add';
        $hallStatus = in_array($action, ['skip', 'not_required']) ? 'skipped' : 'completed';

        // Target piece resolution and receiving validation
        $targetPiece = null;
        if (!empty($validated['work_order_received_piece_id'])) {
            $targetPiece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->find($validated['work_order_received_piece_id']);
        } elseif (!empty($validated['piece_id'])) {
            $targetPiece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->find($validated['piece_id']);
        } elseif (!empty($validated['tag_number'])) {
            $targetPiece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->where('tag_number', $validated['tag_number'])->first();
        }

        if ($targetPiece) {
            if (empty($targetPiece->received_at)) {
                return response()->json([
                    'status' => 'error',
                    'message' => "Piece #{$targetPiece->piece_number} must be physically received before proceeding to hallmarking."
                ], 422);
            }

            $pieceCertStatus = strtolower($targetPiece->certification_status ?? '');
            if (!in_array($pieceCertStatus, ['completed', 'skipped', 'not_required'])) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'certification_status' => ["Piece #{$targetPiece->piece_number} certification must be completed, skipped, or marked not required before proceeding to hallmarking."]
                ]);
            }
        } else {
            // Whole-order hallmarking: enforce that order certification is completed, skipped, or not required
            $certStatus = strtolower($order->certification_status ?? '');
            if (!in_array($certStatus, ['completed', 'skipped', 'not_required', 'in_progress'])) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'certification_status' => ['Certification must be completed, skipped, or marked not required before proceeding to hallmarking.']
                ]);
            }
        }

        $huid = $validated['huid'] ?? $validated['huid_number'] ?? null;
        $hallmarkCenter = $validated['hallmark_center'] ?? $validated['center_name'] ?? null;

        if ($action === 'add' && empty($huid)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'huid' => ['HUID / Hallmark reference number is required to complete hallmarking.']
            ]);
        }

        $item = null;
        if (!empty($validated['work_order_item_id'])) {
            $item = WorkOrderItem::where('work_order_id', $order->id)->find($validated['work_order_item_id']);
        }

        if ($item) {
            $pricing = $item->pricing_details ?? [];
            $pricing['huid'] = ($hallStatus === 'skipped') ? null : $huid;
            $pricing['hallmark_center'] = $hallmarkCenter;
            $pricing['hallmarking_status'] = $hallStatus;
            $item->pricing_details = $pricing;
            $item->save();
        }

        $order->hallmarking_status = $hallStatus;
        $order->hallmarking_details = [
            'action' => $action,
            'work_order_item_id' => $item?->id,
            'huid' => ($hallStatus === 'skipped') ? null : $huid,
            'hallmark_center' => $hallmarkCenter,
            'details' => $validated['details'] ?? null,
            'updated_by' => Auth::user()?->name ?? 'Admin',
            'updated_at' => now()->toDateTimeString(),
        ];
        $order->hallmarking_updated_by = Auth::id() ?? 1;
        $order->hallmarking_updated_at = now();
        $order->hallmarked_qty = max((int)$order->hallmarked_qty, max((int)$order->ready_qty, (int)$order->received_qty));

        $pricing = $order->pricing_details ?? [];
        $pricing['huid'] = ($hallStatus === 'skipped') ? null : $huid;
        $pricing['hallmark_center'] = $hallmarkCenter;
        $pricing['hallmarking_status'] = $order->hallmarking_status;
        $order->pricing_details = $pricing;

        $order->save();

        // Propagate hallmarking status to the exact physical received piece(s)
        $piecesQuery = WorkOrderReceivedPiece::where('work_order_id', $order->id);
        if (!empty($validated['work_order_received_piece_id'])) {
            $piecesQuery->where('id', $validated['work_order_received_piece_id']);
        } elseif (!empty($validated['piece_id'])) {
            $piecesQuery->where('id', $validated['piece_id']);
        } elseif (!empty($validated['tag_number'])) {
            $piecesQuery->where('tag_number', $validated['tag_number']);
        } elseif ($item) {
            $piecesQuery->where('work_order_item_id', $item->id);
        }

        $hasSpecificPiece = !empty($validated['work_order_received_piece_id']) || !empty($validated['piece_id']) || !empty($validated['tag_number']);
        if (!$hasSpecificPiece) {
            if ($action === 'add') {
                $piecesQuery->whereNotNull('received_at');
            }
            $pendingCount = (clone $piecesQuery)->where('hallmarking_status', 'pending')->count();
            if ($pendingCount > 0) {
                $piecesQuery->where('hallmarking_status', 'pending');
            }
        }

        $piecesQuery->update([
            'hallmarking_status' => $hallStatus,
            'huid' => ($hallStatus === 'skipped') ? null : $huid,
            'hallmarked_at' => now(),
            'hallmarked_by' => Auth::id() ?? 1,
        ]);

        $actualHallmarked = WorkOrderReceivedPiece::where('work_order_id', $order->id)
            ->whereIn('hallmarking_status', ['completed', 'skipped', 'not_required'])
            ->count();
        $order->hallmarked_qty = max((int)$order->hallmarked_qty, $actualHallmarked);
        if ($hasSpecificPiece) {
            $order->hallmarking_status = ($order->hallmarked_qty >= $order->required_qty) ? $hallStatus : 'in_progress';
        } else {
            $order->hallmarking_status = $hallStatus;
        }
        $order->save();

        WorkOrderTimeline::create([
            'work_order_id' => $order->id,
            'stage' => 'hallmarking',
            'stage_label' => ($hallStatus === 'skipped') ? 'Hallmarking Skipped' : 'Hallmarking & HUID Completed',
            'completed_weight_at_step' => $order->completed_weight,
            'pending_weight_at_step' => $order->pending_weight,
            'status' => 'completed',
            'notes' => ($hallStatus === 'skipped') 
                ? 'Hallmarking step explicitly marked as skipped / not required.' 
                : "HUID: " . ($huid ?? 'N/A') . " (Center: " . ($validated['hallmark_center'] ?? 'BIS') . ").",
            'user_id' => Auth::id() ?? 1,
            'action_by_name' => Auth::user()?->name ?? 'Admin',
            'created_at' => now(),
        ]);

        // Attempt inventory finalization if physical receiving was already recorded
        $this->syncInventoryPosting($order);

        if ($hallStatus !== 'skipped') {
            NotificationService::notifyHallmarkingCompleted($order, null, $huid, Auth::id());
        }

        return response()->json([
            'status' => 'success',
            'message' => ($hallStatus === 'skipped') ? 'Hallmarking skipped.' : 'Hallmarking recorded successfully.',
            'data' => $order->fresh(['karigar', 'product', 'items', 'receivedPieces', 'timelines'])
        ]);
    }

    /**
     * Receive single physical piece individually with unique Tag Number (Without premature inventory posting)
     */
    public function receivePiece(Request $request, $id)
    {
        $this->authorizeAction();

        // Harmonize field names
        if ($request->has('weight') && !$request->has('gross_weight')) {
            $request->merge(['gross_weight' => $request->input('weight')]);
        }
        if ($request->has('weight') && !$request->has('net_gold_weight')) {
            $request->merge(['net_gold_weight' => $request->input('weight')]);
        }
        if ($request->has('gold_weight') && !$request->has('net_gold_weight')) {
            $request->merge(['net_gold_weight' => $request->input('gold_weight')]);
        }
        if ($request->has('touch') && !$request->has('purity')) {
            $request->merge(['purity' => $request->input('touch')]);
        }
        if ($request->has('making_charge') && !$request->has('making_charge_per_gram')) {
            $request->merge(['making_charge_per_gram' => $request->input('making_charge')]);
        }

        $validated = $request->validate([
            'work_order_item_id' => 'nullable|exists:work_order_items,id',
            'gross_weight' => 'required|numeric|min:0.0001',
            'old_weight' => 'nullable|numeric|min:0',
            'net_gold_weight' => 'nullable|numeric|min:0',
            'purity' => 'nullable|numeric|min:1|max:100', // e.g. 91.60
            'gold_karat' => 'nullable|string|max:20',
            'silver_weight' => 'nullable|numeric|min:0',
            'diamond_weight' => 'nullable|numeric|min:0',
            'diamond_count' => 'nullable|integer|min:0',
            'diamond_stamp' => 'nullable|string|max:50',
            'stamp' => 'nullable|string|max:50',
            'diamond_details' => 'nullable|string|max:100',
            'diamond_sieves' => 'nullable|array',
            'color_stone_weight' => 'nullable|numeric|min:0',
            'color_stone_count' => 'nullable|integer|min:0',
            'making_charge_type' => 'nullable|string|in:per_gram,percentage,fixed',
            'making_charge_per_gram' => 'nullable|numeric|min:0',
            'total_making_charge' => 'nullable|numeric|min:0',
            'given_metal_qty' => 'nullable|numeric|min:0',
            'given_cash' => 'nullable|numeric|min:0',
            'wastage_weight' => 'nullable|numeric|min:0',
            'karigar_gold_weight' => 'nullable|numeric|min:0',
            'returned_gold_weight' => 'nullable|numeric|min:0',
            'huid' => 'nullable|string|max:50',
            'certificate_no' => 'nullable|string|max:50',
            'description' => 'nullable|string',
            'image' => 'nullable',
            'completion_image' => 'nullable',
            'delivery_date' => 'nullable|date',
        ]);

        // Process completion image file upload if uploaded as file
        if ($request->hasFile('image') || $request->hasFile('completion_image')) {
            $file = $request->file('image') ?? $request->file('completion_image');
            $extension = $file->getClientOriginalExtension() ?: 'jpg';
            $filename = 'completion_' . time() . '_' . \Illuminate\Support\Str::random(10) . '.' . $extension;
            $file->storeAs('public/work_orders', $filename);
            $validated['image'] = asset("storage/work_orders/{$filename}");
        } elseif ($request->filled('completion_image') && empty($validated['image'])) {
            $validated['image'] = $request->input('completion_image');
        }

        return DB::transaction(function () use ($request, $validated, $id) {
            $order = WorkOrder::lockForUpdate()->findOrFail($id);

            // Item resolution
            $item = null;
            if (!empty($validated['work_order_item_id'])) {
                $item = WorkOrderItem::lockForUpdate()->where('work_order_id', $order->id)->find($validated['work_order_item_id']);
            }
            if (!$item && !$request->filled('piece_id') && $order->items()->exists()) {
                $item = $order->items()->whereRaw('received_qty < ready_qty')->first() ?: $order->items()->first();
            }

            // Check if receivable
            $receivable = max(0, (int)$order->ready_qty - (int)$order->received_qty);
            if ($receivable <= 0 && !$request->filled('piece_id')) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'No ready pieces pending for receiving on this Work Order.'
                ], 422);
            }

            $grossWeight = (float)$validated['gross_weight'];
            $oldWeight = (float)($validated['old_weight'] ?? 0);
            $diamondWeightCt = (float)($validated['diamond_weight'] ?? 0);
            $diamondWeightGrams = round($diamondWeightCt * 0.2, 3);
            
            // Colour stone weight: in jewellery formula 1 ct = 0.2g if entered in carats
            $colorStoneWeight = (float)($validated['color_stone_weight'] ?? 0);
            $colorStoneGrams = round($colorStoneWeight * 0.2, 3);
            if ($colorStoneGrams > $grossWeight) {
                $colorStoneGrams = $colorStoneWeight;
            }

            // Formula: Net Weight = Total Weight - (Diamond Wt * 0.2) - (Colour Stone Wt * 0.2) - Old Weight
            $calculatedNet = round($grossWeight - $diamondWeightGrams - $colorStoneGrams - $oldWeight, 3);
            
            // If explicit net_gold_weight was provided and is positive, accept it
            if ($request->filled('net_gold_weight') && (float)$request->input('net_gold_weight') > 0) {
                $calculatedNet = (float)$request->input('net_gold_weight');
            } elseif ($calculatedNet <= 0 && $grossWeight > 0) {
                // Low-weight jewellery protection: if diamond count & stone count are 0, or diamond weight exceeded gross weight,
                // ensure net gold equals gross weight minus old weight
                $diaCount = (int)($validated['diamond_count'] ?? 0);
                $stoneCount = (int)($validated['color_stone_count'] ?? 0);
                if ($diaCount === 0 && $stoneCount === 0) {
                    $calculatedNet = max(0.001, round($grossWeight - $oldWeight, 3));
                }
            }

            if ($calculatedNet <= 0) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Calculated Net Gold Weight must be greater than zero. Please verify Gross Weight, Stone weights, and Old Weight.'
                ], 422);
            }
            $netGoldWeight = $calculatedNet;

            $purity = (float)($validated['purity'] ?? 91.60);
            
            // Dynamic Pure 24K Calculation: Net Gold * Touch / 100
            $pure24kWeight = round(($netGoldWeight * ($purity / 100)), 3);

            // Target piece resolution: reuse existing piece record if already in DB
            $targetPiece = null;
            if ($request->filled('piece_id')) {
                $targetPiece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->lockForUpdate()->find($request->piece_id);
                if (!$targetPiece) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Specified piece not found in this Work Order.'
                    ], 404);
                }
                if (!empty($targetPiece->received_at)) {
                    return response()->json([
                        'status' => 'error',
                        'message' => "Piece #{$targetPiece->piece_number} has already been received (Tag: {$targetPiece->tag_number})."
                    ], 422);
                }
                if ($targetPiece->qc_status !== 'passed' && $targetPiece->status !== 'ready') {
                    return response()->json([
                        'status' => 'error',
                        'message' => "Piece #{$targetPiece->piece_number} has not passed Quality Check (Current QC status: {$targetPiece->qc_status})."
                    ], 422);
                }
                if ($targetPiece->work_order_item_id) {
                    if ($item && (int)$item->id !== (int)$targetPiece->work_order_item_id) {
                        return response()->json(['status' => 'error', 'message' => 'Selected job item does not match the receiving piece.'], 422);
                    }
                    $item = WorkOrderItem::lockForUpdate()->where('work_order_id', $order->id)->find($targetPiece->work_order_item_id);
                }
            }

            if (!$targetPiece) {
                // Find next ready unreceived piece
                $targetPiece = WorkOrderReceivedPiece::where('work_order_id', $order->id)
                    ->where(function ($q) {
                        $q->where('qc_status', 'passed')->orWhere('status', 'ready');
                    })
                    ->whereNull('received_at')
                    ->orderBy('piece_number', 'asc')
                    ->lockForUpdate()
                    ->first();
            }

            $receiveOrderNumber = $request->input('receive_order_number') ?: ($targetPiece?->receive_order_number ?: WorkOrderReceivedPiece::generateReceiveOrderNumber());
            $tagNumber = $request->input('tag_number') ?: ($targetPiece?->tag_number ?: WorkOrderReceivedPiece::generateTagNumber());
            $pieceNumber = (int)($request->input('piece_number') ?: ($targetPiece?->piece_number ?: ((int)$order->received_qty + 1)));

            $designNo = $item?->design_no ?: $order->design_code ?: 'DES-' . str_pad($order->id, 4, '0', STR_PAD_LEFT);
            $rawProductName = $item?->product_name ?: $order->product_name ?: 'Jewellery Product';
            $productName = self::cleanProductName($rawProductName, $designNo);

            // Making Charge calculation
            $mcType = $validated['making_charge_type'] ?? 'per_gram';
            $mcRate = (float)($validated['making_charge_per_gram'] ?? $order->making_charge_per_gram ?? 0);
            if ($request->filled('total_making_charge') && (float)$request->input('total_making_charge') > 0) {
                $totalMakingCharge = round((float)$request->input('total_making_charge'), 2);
            } else {
                if ($mcType === 'per_gram') {
                    $totalMakingCharge = round($mcRate * $netGoldWeight, 2);
                } elseif ($mcType === 'percentage') {
                    $goldRate = 7200;
                    $totalMakingCharge = round(($mcRate / 100) * ($netGoldWeight * $goldRate), 2);
                } else {
                    $totalMakingCharge = round($mcRate, 2);
                }
            }

            // Resolve Product and dynamic stamp / diamond count from inventory product details
            $resolvedProduct = $item?->product ?: ($order->product ?: Product::where('design_no', $designNo)->orWhere('product_code', $designNo)->first());
            if (!$resolvedProduct && !empty($productName)) {
                $resolvedProduct = Product::where('name', $productName)->first();
            }
            if (!$resolvedProduct) {
                $catId = $order->category_id;
                $subcatId = $order->subcategory_id;
                if (empty($catId) || !Category::where('id', $catId)->exists()) {
                    $firstCat = Category::first();
                    $catId = $firstCat ? $firstCat->id : null;
                }
                $resolvedProduct = Product::create([
                    'category_id' => $catId,
                    'subcategory_id' => $subcatId,
                    'name' => $productName,
                    'product_code' => $designNo,
                    'design_no' => $designNo,
                    'current_stock_qty' => 0,
                    'opening_stock_weight' => 0,
                    'opening_touch' => round($purity, 2),
                    'opening_fine_weight' => 0,
                    'attributes' => [
                        'design_no' => $designNo,
                        'purity' => (string)($purity ?? '91.6'),
                        'gold_karat' => $validated['gold_karat'] ?? '22K',
                    ],
                    'status' => 'active',
                ]);
            }

            $resolvedAttributes = is_array($resolvedProduct?->attributes) 
                ? $resolvedProduct->attributes 
                : (is_string($resolvedProduct?->attributes) ? json_decode($resolvedProduct->attributes, true) : []);

            $dynamicStamp = $validated['diamond_stamp'] ?? $validated['stamp'] ?? null;
            if (!$dynamicStamp) {
                $dynamicStamp = $resolvedAttributes['stamp'] ?? $resolvedProduct?->stamp ?? $resolvedAttributes['diamond_stamp'] ?? null;
            }
            if (!$dynamicStamp && !empty($resolvedAttributes['components']) && is_array($resolvedAttributes['components'])) {
                foreach ($resolvedAttributes['components'] as $comp) {
                    $name = strtolower($comp['category_name'] ?? $comp['item_name'] ?? '');
                    if ((str_contains($name, 'diamond') || str_contains($name, 'dia')) && !empty($comp['stamp'])) {
                        $dynamicStamp = $comp['stamp'];
                        break;
                    }
                }
            }
            $cleanStamp = $dynamicStamp ? ltrim($dynamicStamp, '+') : '0';

            $diaCount = isset($validated['diamond_count']) && $validated['diamond_count'] !== '' 
                ? (int)$validated['diamond_count'] 
                : 0;
            if ($diaCount === 0) {
                if (isset($resolvedAttributes['diamond_count'])) {
                    $diaCount = (int)$resolvedAttributes['diamond_count'];
                } elseif (isset($resolvedAttributes['dia_count'])) {
                    $diaCount = (int)$resolvedAttributes['dia_count'];
                } elseif (isset($resolvedAttributes['stone_count'])) {
                    $diaCount = (int)$resolvedAttributes['stone_count'];
                } elseif (!empty($resolvedAttributes['components']) && is_array($resolvedAttributes['components'])) {
                    foreach ($resolvedAttributes['components'] as $comp) {
                        $name = strtolower($comp['category_name'] ?? $comp['item_name'] ?? '');
                        if (str_contains($name, 'diamond') || str_contains($name, 'dia')) {
                            $diaCount = (int)($comp['no_of_pieces'] ?? $comp['quantity'] ?? 0);
                            break;
                        }
                    }
                }
            }

            // Dynamic diamond details format: Dia-0.00/+stamp/count
            $diamondDetails = $validated['diamond_details'] ?? null;
            if (!$diamondDetails) {
                $diaWtFloat = (float)$diamondWeightCt;
                $formattedDiaWt = ($diaWtFloat == round($diaWtFloat, 1) && $diaWtFloat != 0) 
                    ? (string)$diaWtFloat 
                    : number_format($diamondWeightCt, 2);
                $diamondDetails = "Dia-{$formattedDiaWt}/+{$cleanStamp}/{$diaCount}";
            }

            // Build structured components list and compute exact piece purchase value
            $diamondSievesInput = $request->input('diamond_sieves', $validated['diamond_sieves'] ?? null);
            $components = [];
            $diamondPurchaseTotal = 0.0;
            if (!empty($diamondSievesInput) && is_array($diamondSievesInput)) {
                foreach ($diamondSievesInput as $sieve) {
                    $count = (int)($sieve['count'] ?? 1);
                    $wt = (float)($sieve['weight'] ?? 0);
                    $rate = (float)($sieve['rate'] ?? 0);
                    $val = (float)($sieve['value'] ?? ($rate > 0 ? round($wt * $rate, 2) : 0));
                    $diamondPurchaseTotal += $val;
                    $components[] = [
                        'component_type' => 'diamond',
                        'category_name' => 'Diamond',
                        'stamp' => $sieve['stamp'] ?? '',
                        'size' => $sieve['stamp'] ?? '',
                        'sieve' => $sieve['stamp'] ?? '',
                        'no_of_pieces' => $count,
                        'quantity' => $count,
                        'stone_weight' => $wt,
                        'weight' => $wt,
                        'gross_wt' => $wt,
                        'unit' => 'ct',
                        'purchase_rate' => $rate,
                        'purchase_value' => $val,
                    ];
                }
            }

            $stonePurchaseTotal = 0.0;
            if ($colorStoneWeight > 0 || !empty($validated['color_stone_count'])) {
                $stoneCount = (int)($validated['color_stone_count'] ?? 1);
                $stoneRate = (float)($request->input('color_stone_rate', 0));
                $stoneVal = (float)($request->input('color_stone_value', $stoneRate > 0 ? round($colorStoneWeight * $stoneRate, 2) : 0));
                $stonePurchaseTotal += $stoneVal;
                $components[] = [
                    'component_type' => 'color_stone',
                    'category_name' => 'Color Stone',
                    'stamp' => $request->input('color_stone_type', 'Stone'),
                    'size' => '',
                    'no_of_pieces' => $stoneCount,
                    'quantity' => $stoneCount,
                    'stone_weight' => $colorStoneWeight,
                    'weight' => $colorStoneWeight,
                    'gross_wt' => $colorStoneWeight,
                    'unit' => 'ct',
                    'purchase_rate' => $stoneRate,
                    'purchase_value' => $stoneVal,
                ];
            }

            $woItem = $item ?: ($order->items()->first());
            $itemPricing = is_array($woItem?->pricing_details) ? $woItem->pricing_details : (json_decode($woItem?->pricing_details ?? '[]', true) ?: []);
            $orderPricing = is_array($order->pricing_details) ? $order->pricing_details : (json_decode($order->pricing_details ?? '[]', true) ?: []);
            
            $goldPurchaseRate = (float)($itemPricing['gold_rate'] ?? $orderPricing['gold_rate'] ?? 0);
            if ($goldPurchaseRate <= 0) {
                $todayRate = \App\Models\GoldRate::where('rate_date', now()->toDateString())->first() ?: \App\Models\GoldRate::latest('rate_date')->first();
                if ($purity >= 99.0) {
                    $goldPurchaseRate = (float)($todayRate?->rate_24k ?? 7500);
                } elseif ($purity >= 88.0) {
                    $goldPurchaseRate = (float)($todayRate?->rate_22k ?? 6875);
                } elseif ($purity >= 70.0) {
                    $goldPurchaseRate = (float)($todayRate?->rate_18k ?? 5625);
                } else {
                    $goldPurchaseRate = (float)($todayRate?->rate_14k ?? 4375);
                }
            }
            $goldPurchaseTotal = round($netGoldWeight * $goldPurchaseRate, 2);
            $piecePurchaseValue = round($goldPurchaseTotal + $diamondPurchaseTotal + $stonePurchaseTotal + $totalMakingCharge, 2);

            $piecePayload = [
                'work_order_id' => $order->id,
                'work_order_item_id' => $item?->id,
                'receive_order_number' => $receiveOrderNumber,
                'tag_number' => $tagNumber,
                'piece_number' => $pieceNumber,
                'design_no' => $designNo,
                'product_id' => $resolvedProduct->id,
                'product_name' => $productName,
                'client_id' => $order->client_id,
                'karigar_id' => $order->karigar_id,
                'gross_weight' => round($grossWeight, 3),
                'old_weight' => isset($validated['old_weight']) ? round((float)$validated['old_weight'], 3) : null,
                'net_gold_weight' => round($netGoldWeight, 3),
                'purity' => round($purity, 2),
                'gold_karat' => $validated['gold_karat'] ?? '22K',
                'pure_24k_weight' => round($pure24kWeight, 3),
                'silver_weight' => round((float)($validated['silver_weight'] ?? 0), 3),
                'diamond_weight' => round($diamondWeightCt, 3),
                'diamond_count' => $diaCount,
                'diamond_details' => $diamondDetails,
                'color_stone_weight' => round($colorStoneWeight, 3),
                'color_stone_count' => (int)($validated['color_stone_count'] ?? 0),
                'making_charge_type' => $mcType,
                'making_charge_per_gram' => round($mcRate, 2),
                'total_making_charge' => round($totalMakingCharge, 2),
                'purchase_value' => $piecePurchaseValue,
                'components' => $components,
                'given_metal_qty' => round((float)($validated['given_metal_qty'] ?? 0), 3),
                'given_cash' => round((float)($validated['given_cash'] ?? 0), 2),
                'huid' => !empty($validated['huid']) 
                    ? $validated['huid'] 
                    : (($targetPiece && $targetPiece->hallmarking_status === 'completed') ? $targetPiece->huid : null),
                'certificate_no' => !empty($validated['certificate_no']) 
                    ? $validated['certificate_no'] 
                    : (($targetPiece && $targetPiece->certification_status === 'completed') ? $targetPiece->certificate_no : null),
                'certification_status' => !empty($validated['certificate_no'])
                    ? 'completed'
                    : (($targetPiece && !in_array($targetPiece->certification_status, ['pending', null], true)) 
                        ? $targetPiece->certification_status 
                        : (in_array(strtolower($order->certification_status ?? ''), ['skipped', 'not_required'], true) ? $order->certification_status : 'pending')),
                'hallmarking_status' => !empty($validated['huid'])
                    ? 'completed'
                    : (($targetPiece && !in_array($targetPiece->hallmarking_status, ['pending', null], true)) 
                        ? $targetPiece->hallmarking_status 
                        : (in_array(strtolower($order->hallmarking_status ?? ''), ['skipped', 'not_required'], true) ? $order->hallmarking_status : 'pending')),
                'description' => $validated['description'] ?? null,
                'image_path' => $this->processBase64Data($validated['image'] ?? null) ?: $targetPiece?->image_path,
                'status' => 'received',
                'is_inventory_posted' => false,
                'posted_at' => null,
                'posted_by' => null,
                'received_at' => $validated['delivery_date'] ?? now(),
                'received_by' => Auth::id() ?? 1,
            ];

            // Persist structured diamond sieves and gold reconciliations
            $existingQcData = is_array($targetPiece?->qc_submission_data) ? $targetPiece->qc_submission_data : [];
            if (!empty($diamondSievesInput) && is_array($diamondSievesInput)) {
                $existingQcData['diamond_sieves'] = $diamondSievesInput;
            }
            if (isset($validated['wastage_weight'])) {
                $existingQcData['wastage_weight'] = (float)$validated['wastage_weight'];
            }
            if (isset($validated['karigar_gold_weight'])) {
                $existingQcData['karigar_gold_weight'] = (float)$validated['karigar_gold_weight'];
            }
            if (isset($validated['returned_gold_weight'])) {
                $existingQcData['returned_gold_weight'] = (float)$validated['returned_gold_weight'];
            }
            $existingQcData['purchase_value'] = $piecePurchaseValue;
            $existingQcData['components'] = $components;
            $piecePayload['qc_submission_data'] = $existingQcData;

            if ($targetPiece) {
                $targetPiece->update($piecePayload);
                $receivedPiece = $targetPiece;
            } else {
                $receivedPiece = WorkOrderReceivedPiece::create($piecePayload);
            }

            // Update work order quantities
            $order->received_qty = (int)$order->received_qty + 1;
            if ($item) {
                $item->received_qty = (int)$item->received_qty + 1;
                if ($item->received_qty >= $item->required_qty) {
                    $item->status = 'completed';
                } elseif ((int)$item->rework_qty > 0) {
                    $item->status = 'rework';
                } elseif ((int)$item->qc_pending_qty > 0) {
                    $item->status = 'quality_check';
                } elseif ((int)$item->ready_qty > (int)$item->received_qty) {
                    $item->status = 'ready';
                } else {
                    $item->status = 'in_progress';
                }
                $item->save();
            }

            // Update completed and reconciliation weights
            $recGross = (float)$grossWeight;
            $actualGrossReceived = (float) WorkOrderReceivedPiece::where('work_order_id', $order->id)
                ->whereNotNull('received_at')
                ->sum('gross_weight');
            $order->completed_weight = round($actualGrossReceived > 0 ? $actualGrossReceived : $recGross, 3);

            if (isset($validated['wastage_weight']) && (float)$validated['wastage_weight'] > 0) {
                $order->wastage_weight = round((float)$order->wastage_weight + (float)$validated['wastage_weight'], 3);
            }
            if (isset($validated['karigar_gold_weight']) && (float)$validated['karigar_gold_weight'] > 0) {
                $order->karigar_gold_weight = round((float)$order->karigar_gold_weight + (float)$validated['karigar_gold_weight'], 3);
            }
            if (isset($validated['returned_gold_weight']) && (float)$validated['returned_gold_weight'] > 0) {
                $order->returned_weight = round((float)$order->returned_weight + (float)$validated['returned_gold_weight'], 3);
            }

            $order->pending_weight = max(0.0, round(
                (float)$order->allotted_weight + (float)($order->additional_allocated_weight ?? 0)
                - (float)$order->completed_weight
                - (float)$order->wastage_weight
                - (float)$order->returned_weight,
                3
            ));

            // Status progression based on pieces and downstream gates (Image 4 fix)
            if ($order->received_qty < $order->required_qty) {
                $order->status = 'partially_received';
                $order->current_stage = 'partially_received';
            } else {
                // All required pieces have completed receiving
                $certStatus = strtolower($order->certification_status ?? 'pending');
                $certDone = in_array($certStatus, ['completed', 'skipped', 'not_required']) || ((int)$order->certified_qty >= (int)$order->required_qty);
                $hallStatus = strtolower($order->hallmarking_status ?? 'pending');
                $hallDone = in_array($hallStatus, ['completed', 'skipped', 'not_required']) || ((int)$order->hallmarked_qty >= (int)$order->required_qty);

                if ($certDone && $hallDone) {
                    $order->status = ($order->finalized_qty >= $order->required_qty) ? 'completed' : 'ready';
                    $order->current_stage = ($order->finalized_qty >= $order->required_qty) ? 'completed' : 'ready';
                } elseif (!$certDone) {
                    $order->status = 'received';
                    $order->current_stage = 'certification';
                } else {
                    $order->status = 'received';
                    $order->current_stage = 'hallmarking';
                }
            }
            $order->save();

            // Resolve Karigar profile if not set on order
            if (empty($order->karigar_id)) {
                $workerName = $order->karigar_name ?? $order->artisan_name ?? $order->worker_allocation['worker_name'] ?? null;
                if ($workerName) {
                    $foundK = \App\Models\Karigar::where('name', $workerName)->first();
                    if ($foundK) {
                        $order->karigar_id = $foundK->id;
                        $order->saveQuietly();
                    }
                }
            }

            // Record transaction in KarigarMaterialTransaction ledger and create automatic Karigar payable
            try {
                if (!empty($order->karigar_id)) {
                    \App\Models\KarigarMaterialTransaction::create([
                        'karigar_id' => $order->karigar_id,
                        'work_order_id' => $order->id,
                        'transaction_type' => 'finished_received',
                        'material_type' => 'gold',
                        'material_item' => $productName,
                    'purity' => $validated['gold_karat'] ?? ($purity . '%'),
                    'touch' => $purity,
                    'unit' => 'g',
                    'pieces' => 1,
                    'gross_weight' => $grossWeight,
                    'net_weight' => $netGoldWeight,
                    'fine_weight' => $pure24kWeight,
                    'stamp' => $dynamicStamp,
                    'transaction_date' => now(),
                    'weight' => $grossWeight,
                    'company_gold_weight' => $pure24kWeight,
                    'karigar_gold_weight' => 0,
                    'signed_change' => -$pure24kWeight,
                    'settlement_balance_after' => 0,
                    'bench_balance_after' => $order->pending_weight,
                    'reason' => "Received piece #{$pieceNumber} (Tag: {$tagNumber}) for WO {$order->work_order_number}",
                    'created_by' => Auth::id() ?? 1,
                    'action_by_name' => Auth::user()?->name ?? 'Receiver',
                ]);

                // Record diamond return / piece receipt in ledger if present
                if ($diamondWeightCt > 0 || $diaCount > 0) {
                    \App\Models\KarigarMaterialTransaction::create([
                        'karigar_id' => $order->karigar_id,
                        'work_order_id' => $order->id,
                        'transaction_type' => 'finished_received',
                        'material_type' => 'diamond',
                        'stamp' => $dynamicStamp,
                        'unit' => 'ct',
                        'pieces' => $diaCount,
                        'gross_weight' => $diamondWeightCt,
                        'net_weight' => $diamondWeightCt,
                        'fine_weight' => 0,
                        'transaction_date' => now(),
                        'weight' => $diamondWeightCt,
                        'company_gold_weight' => 0,
                        'karigar_gold_weight' => 0,
                        'signed_change' => -$diamondWeightCt,
                        'reason' => "Diamond received with piece #{$pieceNumber} ({$diamondWeightCt}ct, {$diaCount} pcs)",
                        'created_by' => Auth::id() ?? 1,
                        'action_by_name' => Auth::user()?->name ?? 'Receiver',
                    ]);
                }

                // Record color stone return / piece receipt in ledger if present
                if ($colorStoneWeight > 0 || ($validated['color_stone_count'] ?? 0) > 0) {
                    $stCount = (int)($validated['color_stone_count'] ?? 0);
                    \App\Models\KarigarMaterialTransaction::create([
                        'karigar_id' => $order->karigar_id,
                        'work_order_id' => $order->id,
                        'transaction_type' => 'finished_received',
                        'material_type' => 'colour_stone',
                        'unit' => 'g',
                        'pieces' => $stCount,
                        'gross_weight' => $colorStoneWeight,
                        'net_weight' => $colorStoneWeight,
                        'fine_weight' => 0,
                        'transaction_date' => now(),
                        'weight' => $colorStoneWeight,
                        'company_gold_weight' => 0,
                        'karigar_gold_weight' => 0,
                        'signed_change' => -$colorStoneWeight,
                        'reason' => "Stone received with piece #{$pieceNumber} ({$colorStoneWeight}g, {$stCount} pcs)",
                        'created_by' => Auth::id() ?? 1,
                        'action_by_name' => Auth::user()?->name ?? 'Receiver',
                    ]);
                }

                if (isset($validated['returned_gold_weight']) && (float)$validated['returned_gold_weight'] > 0) {
                    $retWt = (float)$validated['returned_gold_weight'];
                    $retFine = round($retWt * ($purity / 100), 3);
                    \App\Models\KarigarMaterialTransaction::create([
                        'karigar_id' => $order->karigar_id,
                        'work_order_id' => $order->id,
                        'source' => 'vault',
                        'transaction_type' => 'unused_returned',
                        'material_type' => 'gold',
                        'unit' => 'g',
                        'gross_weight' => $retWt,
                        'net_weight' => $retWt,
                        'fine_weight' => $retFine,
                        'transaction_date' => now(),
                        'weight' => $retWt,
                        'company_gold_weight' => $retFine,
                        'karigar_gold_weight' => 0,
                        'signed_change' => -$retFine,
                        'reason' => "Unused gold returned ({$retWt}g, Fine: {$retFine}g) upon receiving piece #{$pieceNumber}",
                        'created_by' => Auth::id() ?? 1,
                        'action_by_name' => Auth::user()?->name ?? 'Receiver',
                    ]);
                    \App\Models\RawMaterial::creditAllocation('gold', $retFine);
                }

                if (isset($validated['wastage_weight']) && (float)$validated['wastage_weight'] > 0) {
                    $wWt = (float)$validated['wastage_weight'];
                    $alreadyHasWastageTx = \App\Models\KarigarMaterialTransaction::where('work_order_id', $order->id)
                        ->where('transaction_type', 'approved_wastage')
                        ->where('is_reversed', false)
                        ->exists();

                    if (!$alreadyHasWastageTx) {
                        \App\Models\KarigarMaterialTransaction::create([
                            'karigar_id' => $order->karigar_id,
                            'work_order_id' => $order->id,
                            'transaction_type' => 'approved_wastage',
                            'material_type' => 'gold',
                            'purity' => $order->pricing_details['purity'] ?? $order->material_type ?? ($purity >= 99 ? '24K' : ($purity >= 90 ? '22K' : '22K')),
                            'touch' => (float)$purity,
                            'unit' => 'g',
                            'gross_weight' => $wWt,
                            'net_weight' => $wWt,
                            'fine_weight' => round($wWt * ($purity / 100), 3),
                            'wastage_weight' => $wWt,
                            'transaction_date' => now(),
                            'weight' => $wWt,
                            'company_gold_weight' => $wWt,
                            'karigar_gold_weight' => 0,
                            'signed_change' => -$wWt,
                            'settlement_balance_after' => 0,
                            'bench_balance_after' => $order->pending_weight,
                            'reason' => "Approved wastage of {$wWt}g upon receiving piece #{$pieceNumber}",
                            'created_by' => Auth::id() ?? 1,
                            'action_by_name' => Auth::user()?->name ?? 'Receiver',
                        ]);
                    }
                }

                // Automatic Karigar Payable for Making Charges (Idempotent by received_piece_id)
                if ($totalMakingCharge > 0 && !empty($order->karigar_id)) {
                    \App\Models\KarigarPayment::updateOrCreate(
                        [
                            'received_piece_id' => $receivedPiece->id,
                            'transaction_type' => 'payable',
                        ],
                        [
                            'karigar_id' => $order->karigar_id,
                            'work_order_id' => $order->id,
                            'amount' => $totalMakingCharge,
                            'payment_mode' => 'auto_payable',
                            'reference_no' => "MC-WO-{$order->id}-PC-{$receivedPiece->id}",
                            'transaction_date' => now()->toDateString(),
                            'notes' => "Making charges earned for piece #{$pieceNumber} (Tag: {$tagNumber}) of WO #{$order->work_order_number}",
                            'created_by' => Auth::id() ?? 1,
                            'action_by_name' => Auth::user()?->name ?? 'Store Manager',
                        ]
                    );
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('KarigarMaterial/Payable record warning: ' . $e->getMessage());
        }

        // Recalculate Karigar Bench Balance & Raw Material Allocations so everything tallies immediately
        if (!empty($order->karigar_id)) {
            $this->syncKarigarGoldBalance($order->karigar_id);
            $kModel = \App\Models\Karigar::find($order->karigar_id);
            if ($kModel) {
                app(\App\Http\Controllers\Api\KarigarMaterialController::class)->syncKarigarBalances($kModel);
            }
        }
        \App\Models\RawMaterial::recalculateAllocations();

            // Audit Timeline Log
            WorkOrderTimeline::create([
                'work_order_id' => $order->id,
                'stage' => 'physical_receiving',
                'stage_label' => "Physical Piece #{$pieceNumber} Received ({$receiveOrderNumber} / {$tagNumber})",
                'completed_weight_at_step' => $order->completed_weight,
                'pending_weight_at_step' => max(0, round($order->allotted_weight - $order->completed_weight, 3)),
                'status' => 'completed',
                'notes' => "Physically received piece #{$pieceNumber} (RWO: {$receiveOrderNumber}, Tag: {$tagNumber}, Design: {$designNo}, Gross: {$grossWeight}g, Net: {$netGoldWeight}g, Pure 24K: {$pure24kWeight}g). Pending final inventory posting.",
                'user_id' => Auth::id() ?? 1,
                'action_by_name' => Auth::user()?->name ?? 'Store Manager',
                'created_at' => now(),
            ]);

            if ($order->jobOrder) {
                $order->jobOrder->updateDerivedStatus();
            }

            // Trigger syncInventoryPosting if piece has already been covered by certification & hallmarking gates
            $this->syncInventoryPosting($order);

            $loadedPiece = $receivedPiece->fresh(['product', 'item.product', 'client', 'karigar', 'receiver', 'workOrder.jobOrder', 'workOrder.items.product']);
            $freshOrder = $order->fresh(['items', 'receivedPieces', 'karigar', 'product', 'timelines']);

            // Dispatch receiving notification
            NotificationService::notifyPieceReceived($order, $loadedPiece, Auth::id());

            return response()->json([
                'status' => 'success',
                'message' => "Piece #{$pieceNumber} physically received with RWO #{$receiveOrderNumber} and Tag #{$tagNumber}.",
                'receive_order_number' => $receiveOrderNumber,
                'tag_number' => $tagNumber,
                'piece' => $loadedPiece,
                'order' => $freshOrder,
                'data' => [
                    'receive_order_number' => $receiveOrderNumber,
                    'tag_number' => $tagNumber,
                    'piece' => $loadedPiece,
                    'received_piece' => $loadedPiece,
                    'order' => $freshOrder,
                ],
            ]);
        });
    }

    /**
     * Backward-compatible alias for receive / final-receive
     */
    public function finalReceive(Request $request, $id)
    {
        if ($request->filled('gross_weight') || $request->filled('net_gold_weight')) {
            return $this->receivePiece($request, $id);
        }

        $order = WorkOrder::findOrFail($id);
        $this->syncInventoryPosting($order);

        $freshOrder = $order->fresh(['karigar', 'product', 'items', 'receivedPieces', 'timelines']);

        return response()->json([
            'status' => 'success',
            'message' => 'Inventory finalization check completed.',
            'data' => $freshOrder
        ]);
    }

    /**
     * Backward-compatible alias for /receive endpoint
     */
    public function receive(Request $request, $id)
    {
        return $this->receivePiece($request, $id);
    }

    /**
     * Search and fetch receivable production information for Receive Order page
     */
    public function searchReceiving(Request $request)
    {
        $query = WorkOrder::with([
            'jobOrder', 'karigar', 'product', 'category', 'subcategory', 
            'client', 'creator', 'items', 'receivedPieces'
        ])
        ->where('ready_qty', '>', 0)
        ->whereRaw('received_qty < ready_qty');

        if ($request->filled('work_order_number')) {
            $won = $request->work_order_number;
            $query->where('work_order_number', 'like', "%{$won}%");
        }

        if ($request->filled('receive_order_number')) {
            $ron = $request->receive_order_number;
            $query->whereHas('receivedPieces', function ($rq) use ($ron) {
                $rq->where('receive_order_number', 'like', "%{$ron}%");
            });
        }

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('work_order_number', 'like', "%{$search}%")
                  ->orWhere('karigar_name', 'like', "%{$search}%")
                  ->orWhere('product_name', 'like', "%{$search}%")
                  ->orWhereHas('items', function ($iq) use ($search) {
                      $iq->where('design_no', 'like', "%{$search}%");
                  })
                  ->orWhereHas('receivedPieces', function ($rq) use ($search) {
                      $rq->where('receive_order_number', 'like', "%{$search}%")
                        ->orWhere('tag_number', 'like', "%{$search}%");
                  });
            });
        }

        $orders = $query->latest()->get();

        return response()->json([
            'status' => 'success',
            'data' => $orders,
            'total' => $orders->count(),
        ]);
    }

    /**
     * Authoritative helper to ensure all physical pieces are initialized for a Work Order
     */
    public static function ensurePiecesInitialized(WorkOrder $order): void
    {
        $items = $order->items()->get();
        if ($items->isNotEmpty()) {
            foreach ($items as $item) {
                $required = max(1, (int)$item->required_qty);
                $existingPieces = WorkOrderReceivedPiece::where('work_order_item_id', $item->id)->orderBy('piece_number')->get();
                $existingCount = $existingPieces->count();
                if ($existingCount < $required) {
                    for ($p = $existingCount + 1; $p <= $required; $p++) {
                        WorkOrderReceivedPiece::create([
                            'work_order_id' => $order->id,
                            'work_order_item_id' => $item->id,
                            'piece_number' => $p,
                            'design_no' => $item->design_no ?: $order->design_code ?: ('DES-' . str_pad($order->id, 4, '0', STR_PAD_LEFT)),
                            'product_id' => $item->product_id ?: $order->product_id,
                            'product_name' => self::cleanProductName($item->product_name ?: $order->product_name, $item->design_no ?: $order->design_code),
                            'client_id' => $order->client_id,
                            'karigar_id' => $order->karigar_id,
                            'gross_weight' => $item->completed_weight ? round((float)$item->completed_weight / $required, 3) : ($item->allotted_weight ? round((float)$item->allotted_weight / $required, 3) : 0.000),
                            'status' => 'in_progress',
                            'qc_status' => 'pending',
                            'certification_status' => 'pending',
                            'hallmarking_status' => 'pending',
                            'is_inventory_posted' => false,
                        ]);
                    }
                }
            }
        } else {
            $required = max(1, (int)$order->required_qty);
            $existingPieces = WorkOrderReceivedPiece::where('work_order_id', $order->id)->whereNull('work_order_item_id')->orderBy('piece_number')->get();
            $existingCount = $existingPieces->count();
            if ($existingCount < $required) {
                for ($p = $existingCount + 1; $p <= $required; $p++) {
                    WorkOrderReceivedPiece::create([
                        'work_order_id' => $order->id,
                        'work_order_item_id' => null,
                        'piece_number' => $p,
                        'design_no' => $order->design_code ?: ('DES-' . str_pad($order->id, 4, '0', STR_PAD_LEFT)),
                        'product_id' => $order->product_id,
                        'product_name' => self::cleanProductName($order->product_name, $order->design_code),
                        'client_id' => $order->client_id,
                        'karigar_id' => $order->karigar_id,
                        'gross_weight' => $order->completed_weight ? round((float)$order->completed_weight / $required, 3) : ($order->allotted_weight ? round((float)$order->allotted_weight / $required, 3) : 0.000),
                        'status' => 'in_progress',
                        'qc_status' => 'pending',
                        'certification_status' => 'pending',
                        'hallmarking_status' => 'pending',
                        'is_inventory_posted' => false,
                    ]);
                }
            }
        }
    }

    /**
     * Get individual physical pieces that have passed QC and are awaiting physical receiving
     */
    public function readyPieces(Request $request)
    {
        $this->authorizeAction();

        // Reconcile legacy aggregate QC counters into stable piece rows when their item counters
        // prove approval but the older flow did not persist the per-piece ready state.
        $legacyOrders = WorkOrder::where('ready_qty', '>', 0)
            ->whereRaw('received_qty < ready_qty')
            ->whereNotIn('status', ['completed', 'cancelled', 'final_received'])
            ->get();

        foreach ($legacyOrders as $lo) {
            self::ensurePiecesInitialized($lo);
            $items = WorkOrderItem::where('work_order_id', $lo->id)->get();
            $scopes = $items->isNotEmpty()
                ? $items->map(fn ($item) => [
                    'item_id' => $item->id,
                    'approved_qty' => max((int)$item->qc_approved_qty, (int)$item->ready_qty),
                    'completed_qty' => (int)$item->completed_qty,
                ])
                : collect([[
                    'item_id' => null,
                    'approved_qty' => max((int)$lo->qc_approved_qty, (int)$lo->ready_qty),
                    'completed_qty' => (int)$lo->completed_qty,
                ]]);

            foreach ($scopes as $scope) {
                $pieceQuery = WorkOrderReceivedPiece::where('work_order_id', $lo->id);
                $scope['item_id'] === null
                    ? $pieceQuery->whereNull('work_order_item_id')
                    : $pieceQuery->where('work_order_item_id', $scope['item_id']);

                $approvedPieceCount = (clone $pieceQuery)
                    ->where(function ($approvedQuery) {
                        $approvedQuery->where('qc_status', 'passed')
                            ->orWhere('status', 'ready')
                            ->orWhereNotNull('received_at');
                    })
                    ->count();
                $missingApprovedPieces = max(0, (int)$scope['approved_qty'] - $approvedPieceCount);
                if ($missingApprovedPieces === 0) {
                    continue;
                }

                $candidates = (clone $pieceQuery)
                    ->whereNull('received_at')
                    ->where(function ($candidateQuery) {
                        $candidateQuery->whereNull('qc_status')->orWhere('qc_status', 'pending');
                    })
                    ->whereNotIn('status', ['rework', 'qc_rework', 'rejected', 'received'])
                    ->when($scope['completed_qty'] > 0, fn ($candidateQuery) => $candidateQuery->where('piece_number', '<=', $scope['completed_qty']))
                    ->orderBy('piece_number')
                    ->limit($missingApprovedPieces)
                    ->get();

                foreach ($candidates as $piece) {
                    $piece->qc_status = 'passed';
                    $piece->status = 'ready';
                    $piece->qc_checked_at = $piece->qc_checked_at ?: now();
                    $piece->save();
                }
            }
        }

        $query = WorkOrderReceivedPiece::whereHas('workOrder')
            ->with([
                'workOrder.client', 'workOrder.karigar', 'workOrder.product', 'workOrder.jobOrder',
                'item', 'product', 'karigar', 'client', 'qcChecker'
            ])
            ->where(function ($readyQuery) {
                $readyQuery->where('qc_status', 'passed')
                    ->orWhere('status', 'ready');
            })
            ->whereNull('received_at');

        if ($request->filled('work_order_id')) {
            $query->where('work_order_id', $request->work_order_id);
        }

        if ($request->filled('search')) {
            $s = $request->search;
            $query->where(function ($sq) use ($s) {
                $sq->where('design_no', 'like', "%{$s}%")
                   ->orWhere('product_name', 'like', "%{$s}%")
                   ->orWhereHas('workOrder', function ($woq) use ($s) {
                       $woq->where('work_order_number', 'like', "%{$s}%");
                   });
            });
        }

        $pieces = $query->orderBy('work_order_id', 'desc')->orderBy('piece_number', 'asc')->get();

        $data = $pieces->map(function ($piece) {
            $wo = $piece->workOrder;
            $item = $piece->item;
            $product = $piece->product ?: $item?->product ?: $wo?->product;
            $designNo = $piece->design_no ?: $piece->item?->design_no ?: $wo?->design_code;
            $requiredQty = max(1, (int)($item?->required_qty ?? $wo?->required_qty ?? 1));
            $jobAllottedWeight = $item?->allotted_weight ?? $wo?->allotted_weight;
            return [
                'id' => $piece->id,
                'piece_id' => $piece->id,
                'piece_number' => $piece->piece_number,
                'work_order_id' => $piece->work_order_id,
                'work_order_item_id' => $piece->work_order_item_id,
                'ordered_date' => $wo?->allotted_date ?: $wo?->jobOrder?->order_date,
                'delivery_date' => $item?->delivery_date ?? $wo?->delivery_date,
                'work_order_number' => $wo?->work_order_number,
                'work_order_item' => $item,
                'product' => $product,
                'design_no' => $designNo,
                'product_id' => $piece->product_id ?: $piece->item?->product_id ?: $wo?->product_id,
                'product_name' => $piece->product_name ?: $piece->item?->product_name ?: $wo?->product_name,
                'artisan_name' => $piece->karigar?->name ?: $wo?->karigar_name ?: 'In-House Artisan',
                'client_name' => $piece->client?->name ?: $wo?->client?->name ?: '—',
                'gross_weight' => (float)$piece->gross_weight,
                'net_gold_weight' => (float)$piece->net_gold_weight,
                'allotted_weight' => $jobAllottedWeight !== null ? round((float)$jobAllottedWeight / $requiredQty, 3) : null,
                'job_allotted_weight' => $jobAllottedWeight !== null ? (float)$jobAllottedWeight : null,
                'job_required_qty' => $requiredQty,
                'image_url' => $product?->thumbnail_url ?: $product?->image_url ?: $wo?->reference_image,
                'diamond_weight' => (float)$piece->diamond_weight,
                'diamond_count' => (int)$piece->diamond_count,
                'color_stone_weight' => (float)$piece->color_stone_weight,
                'color_stone_count' => (int)($piece->color_stone_count ?? ($piece->qc_submission_data['color_stone_count'] ?? 0)),
                'silver_weight' => (float)$piece->silver_weight,
                'purity' => (float)$piece->purity ?: 91.60,
                'gold_karat' => $piece->gold_karat ?: '22K',
                'qc_status' => $piece->qc_status,
                'status' => $piece->status,
                'qc_checked_at' => $piece->qc_checked_at?->toDateTimeString(),
                'qc_notes' => $piece->qc_notes,
                'qc_submission_data' => $piece->qc_submission_data,
                'certification_status' => $piece->certification_status ?: $wo?->certification_status ?: 'pending',
                'hallmarking_status' => $piece->hallmarking_status ?: $wo?->hallmarking_status ?: 'pending',
                'is_inventory_posted' => (bool)$piece->is_inventory_posted,
            ];
        });

        return response()->json([
            'status' => 'success',
            'count' => $data->count(),
            'data' => $data,
        ]);
    }

    /**
     * Authoritative API endpoint to fetch prefilled data for Receive Work Order form
     * Loads persisted piece-specific QC measurements & related product/job metadata
     */
    public function receivingData(Request $request, $id)
    {
        $this->authorizeAction();

        $order = WorkOrder::with(['items.product', 'jobOrder', 'client', 'karigar', 'product'])->findOrFail($id);
        self::ensurePiecesInitialized($order);

        $piece = null;
        if ($request->filled('piece_id')) {
            $piece = WorkOrderReceivedPiece::where('work_order_id', $order->id)->find($request->piece_id);
            if (!$piece) {
                return response()->json(['status' => 'error', 'message' => 'Specified piece was not found in this Work Order.'], 404);
            }
        } else {
            $piece = WorkOrderReceivedPiece::where('work_order_id', $order->id)
                ->where(function ($q) {
                    $q->where('qc_status', 'passed')
                      ->orWhere('status', 'ready');
                })
                ->whereNull('received_at')
                ->orderBy('piece_number', 'asc')
                ->first();
        }

        if (!$piece) {
            return response()->json([
                'status' => 'error',
                'message' => 'No receivable piece found for this Work Order.'
            ], 404);
        }

        if ($piece->qc_status !== 'passed' && $piece->status !== 'ready' && empty($piece->received_at)) {
            return response()->json([
                'status' => 'error',
                'message' => "Piece #{$piece->piece_number} has not passed Quality Check (Current QC status: {$piece->qc_status})."
            ], 422);
        }

        if (!empty($piece->work_order_item_id) && $piece->work_order_id !== $order->id) {
            return response()->json(['status' => 'error', 'message' => 'Specified piece does not belong to this Work Order.'], 422);
        }

        $item = $piece->work_order_item_id ? WorkOrderItem::find($piece->work_order_item_id) : $order->items()->first();
        $product = $piece->product_id ? Product::find($piece->product_id) : ($item?->product ?: $order->product);
        $qcData = $piece->qc_submission_data ?: [];

        $productAttributes = is_array($product?->attributes) 
            ? $product->attributes 
            : (is_string($product?->attributes) ? json_decode($product->attributes, true) : []);

        $hasPhysicalReceipt = !empty($piece->received_at);
        $snapshotValue = function (string $field, $pieceValue) use ($qcData, $hasPhysicalReceipt) {
            if (!$hasPhysicalReceipt && array_key_exists($field, $qcData) && $qcData[$field] !== null && $qcData[$field] !== '') {
                return $qcData[$field];
            }
            return $pieceValue;
        };

        $dynamicStamp = $productAttributes['stamp'] ?? $product?->stamp ?? $productAttributes['diamond_stamp'] ?? $order->stamp ?? '0';
        $cleanStamp = ltrim((string)$dynamicStamp, '+');

        $diaCountValue = $snapshotValue('diamond_count', $piece->diamond_count);
        $diaWeightValue = $snapshotValue('diamond_weight', $piece->diamond_weight);
        $hasQcDiamondCount = !$hasPhysicalReceipt && array_key_exists('diamond_count', $qcData);
        $hasQcDiamondWeight = !$hasPhysicalReceipt && array_key_exists('diamond_weight', $qcData);
        $diaCount = $hasPhysicalReceipt
            ? (int)$piece->diamond_count
            : ($hasQcDiamondCount
                ? (int)$qcData['diamond_count']
                : (int)($diaCountValue ?: ($productAttributes['diamond_count'] ?? $productAttributes['dia_count'] ?? $order->diamond_count ?? 0)));
        $diaWt = $hasPhysicalReceipt
            ? (float)$piece->diamond_weight
            : ($hasQcDiamondWeight
                ? (float)$qcData['diamond_weight']
                : (float)($diaWeightValue ?: ($productAttributes['dia_wt_ct'] ?? $productAttributes['diamond_weight'] ?? $order->diamond_weight ?? 0)));
        $diaDetails = (!$hasPhysicalReceipt && !empty($qcData['diamond_details']))
            ? $qcData['diamond_details']
            : ($piece->diamond_details ?: "Dia-" . number_format($diaWt, 2) . "/+{$cleanStamp}/{$diaCount}");

        $savedGrossWeight = $snapshotValue('gross_weight', $piece->gross_weight);
        if (!$hasPhysicalReceipt && (float)$savedGrossWeight <= 0) {
            $savedGrossWeight = $qcData['completed_weight'] ?? $savedGrossWeight;
        }
        $grossWeight = $savedGrossWeight !== null ? (float)$savedGrossWeight : null;
        $oldWeight = (float)($snapshotValue('old_weight', $piece->old_weight) ?? 0);
        $stoneWeight = (float)($snapshotValue('color_stone_weight', $piece->color_stone_weight) ?? $order->stone_weight ?? 0);
        $stoneCount = (int)($snapshotValue('color_stone_count', $piece->color_stone_count) ?? 0);
        $silverWeight = (float)($snapshotValue('silver_weight', $piece->silver_weight) ?? 0);
        $savedPurity = $snapshotValue('purity', $piece->purity) ?? $order->purity;
        $purity = $savedPurity !== null ? (float)$savedPurity : null;
        $goldKarat = $snapshotValue('gold_karat', $piece->gold_karat) ?: $order->karat;

        $savedNetGold = $snapshotValue('net_gold_weight', $piece->net_gold_weight);
        $netGold = (float)($savedNetGold ?? 0);
        if ($netGold <= 0 && $grossWeight !== null) {
            $netGold = round(max(0, $grossWeight - ($diaWt * 0.2) - ($stoneWeight * 0.2) - $oldWeight), 3);
        }

        $fineGold = ($netGold > 0 && $purity > 0) ? round(($netGold * $purity) / 100, 3) : null;

        $woItem = $piece->work_order_item_id ? WorkOrderItem::find($piece->work_order_item_id) : $order->items()->first();
        $itemPricing = is_array($woItem?->pricing_details) ? $woItem->pricing_details : (json_decode($woItem?->pricing_details ?? '[]', true) ?: []);
        $diamondSieves = $itemPricing['diamond_sieves'] ?? [];

        // Resolve all diamond variant / sieve rows used in the work order
        if (!empty($order->pricing_details['items']) && is_array($order->pricing_details['items'])) {
            foreach ($order->pricing_details['items'] as $ordItm) {
                $isMatch = (
                    (!empty($woItem) && !empty($ordItm['id']) && (string)$ordItm['id'] === (string)$woItem->id) ||
                    (!empty($piece->design_no) && !empty($ordItm['design_number']) && (string)$ordItm['design_number'] === (string)$piece->design_no) ||
                    (!empty($woItem?->design_no) && !empty($ordItm['design_number']) && (string)$ordItm['design_number'] === (string)$woItem->design_no)
                );
                if ($isMatch && !empty($ordItm['diamond_sieves']) && is_array($ordItm['diamond_sieves'])) {
                    if (empty($diamondSieves) || count($ordItm['diamond_sieves']) >= count($diamondSieves)) {
                        $diamondSieves = $ordItm['diamond_sieves'];
                    }
                    break;
                }
            }
            if (empty($diamondSieves)) {
                foreach ($order->pricing_details['items'] as $ordItm) {
                    if (!empty($ordItm['diamond_sieves']) && is_array($ordItm['diamond_sieves'])) {
                        $diamondSieves = $ordItm['diamond_sieves'];
                        break;
                    }
                }
            }
        }

        if (empty($diamondSieves) && !empty($order->pricing_details['diamond_sieves']) && is_array($order->pricing_details['diamond_sieves'])) {
            $diamondSieves = $order->pricing_details['diamond_sieves'];
        }

        // Check stone_details if diamond_sieves not found
        if (empty($diamondSieves)) {
            $rawStones = $woItem?->stone_details ?: $order->stone_details;
            $stones = is_array($rawStones) ? $rawStones : (json_decode($rawStones ?? '[]', true) ?: []);
            if (!empty($stones) && is_array($stones)) {
                foreach ($stones as $st) {
                    $sType = strtolower($st['type'] ?? $st['category'] ?? $st['material_type'] ?? 'diamond');
                    if (str_contains($sType, 'diamond') || str_contains($sType, 'dia')) {
                        $diamondSieves[] = [
                            'stamp' => $st['stamp'] ?? $st['sieve'] ?? $st['sieve_size'] ?? '+0',
                            'count' => (int)($st['count'] ?? $st['pcs'] ?? $st['pieces'] ?? $st['quantity'] ?? 1),
                            'weight' => (float)($st['weight'] ?? $st['carats'] ?? $st['cts'] ?? 0),
                            'rate' => (float)($st['rate'] ?? 0),
                        ];
                    }
                }
            }
        }

        if (empty($diamondSieves) && !empty($productAttributes['components']) && is_array($productAttributes['components'])) {
            foreach ($productAttributes['components'] as $c) {
                $cType = strtolower($c['category_name'] ?? $c['component_type'] ?? '');
                if (str_contains($cType, 'diamond') || str_contains($cType, 'dia')) {
                    $diamondSieves[] = [
                        'stamp' => $c['stamp'] ?? $c['size'] ?? '',
                        'count' => (int)($c['no_of_pieces'] ?? $c['quantity'] ?? 1),
                        'weight' => (float)($c['stone_weight'] ?? $c['gross_wt'] ?? $c['weight'] ?? 0),
                        'rate' => (float)($c['purchase_rate'] ?? 0),
                    ];
                }
            }
        }

        $allocatedMaterials = \App\Models\KarigarMaterialTransaction::where('work_order_id', $order->id)
            ->whereIn('transaction_type', ['allocation', 'additional_allocation'])
            ->where('is_reversed', false)
            ->orderBy('transaction_date', 'asc')
            ->get();

        if (empty($diamondSieves) && $allocatedMaterials->isNotEmpty()) {
            foreach ($allocatedMaterials as $amat) {
                if (strtolower($amat->material_type) === 'diamond' && ((float)$amat->net_weight > 0 || (int)$amat->pieces > 0)) {
                    $diamondSieves[] = [
                        'stamp' => $amat->stamp ?: ($amat->sieve_size ?: "+{$cleanStamp}"),
                        'count' => (int)($amat->pieces ?: 1),
                        'weight' => (float)($amat->net_weight ?: $amat->gross_weight ?: $amat->weight ?: 0),
                        'rate' => 0,
                    ];
                }
            }
        }

        // If diamond weight or count was assigned in order/item/QC but sieves still empty, synthesize initial variant row
        if (empty($diamondSieves) && ($diaWt > 0 || $diaCount > 0)) {
            $diamondSieves[] = [
                'stamp' => "+{$cleanStamp}",
                'count' => (int)$diaCount,
                'weight' => (float)$diaWt,
                'rate' => 0,
            ];
        }

        $vaultAllottedGold = (float)\App\Models\KarigarMaterialTransaction::where('work_order_id', $order->id)
            ->where('material_type', 'gold')
            ->whereIn('transaction_type', ['allocation', 'additional_allocation'])
            ->where('is_reversed', false)
            ->sum('net_weight');

        $vaultAllottedDiamondPcs = (int)\App\Models\KarigarMaterialTransaction::where('work_order_id', $order->id)
            ->where('material_type', 'diamond')
            ->whereIn('transaction_type', ['allocation', 'additional_allocation'])
            ->where('is_reversed', false)
            ->sum('pieces');

        $vaultAllottedDiamondWeight = (float)\App\Models\KarigarMaterialTransaction::where('work_order_id', $order->id)
            ->where('material_type', 'diamond')
            ->whereIn('transaction_type', ['allocation', 'additional_allocation'])
            ->where('is_reversed', false)
            ->sum('net_weight');

        $totalOrderAllottedGold = (float)($order->allotted_weight > 0 ? $order->allotted_weight : $vaultAllottedGold);
        $pieceCount = max(1, (int)($item?->required_qty ?? $order->required_qty ?? 1));

        $savedAllottedWeight = (float)($piece->item?->allotted_weight ?? $item?->allotted_weight ?? 0);
        if ($savedAllottedWeight <= 0) {
            $savedAllottedWeight = $totalOrderAllottedGold;
        }

        $pieceAllotted = (float)($piece->allotted_weight ?: 0);
        if ($pieceAllotted <= 0) {
            $pieceAllotted = $savedAllottedWeight > 0 ? round($savedAllottedWeight / $pieceCount, 3) : 0;
        }

        $plannedGoldPerPiece = (float)($itemPricing['gold_weight'] ?? $itemPricing['total_gold_wt'] ?? ($order->expected_return_weight > 0 ? round($order->expected_return_weight / $pieceCount, 3) : 0));
        
        $allottedWeight = $pieceAllotted > 0 ? $pieceAllotted : ($totalOrderAllottedGold > 0 ? round($totalOrderAllottedGold / $pieceCount, 3) : $plannedGoldPerPiece);
        $assignedGoldWeight = $plannedGoldPerPiece > 0 ? $plannedGoldPerPiece : ($totalOrderAllottedGold > 0 ? $totalOrderAllottedGold : $allottedWeight);

        // Piece-level diamond requirements strictly from item/product design
        $assignedDiamondWeight = (float)($itemPricing['diamond_weight'] ?? ($productAttributes['diamond_weight'] ?? 2.0));
        $assignedDiamondCount = (int)($itemPricing['diamond_count'] ?? ($productAttributes['diamond_count'] ?? 2));

        $orderedDate = $order->allotted_date ?: $order->jobOrder?->order_date;
        $deliveryDate = $item?->delivery_date ?? $item?->pricing_details['delivery_date'] ?? $order->delivery_date;

        return response()->json([
            'status' => 'success',
            'data' => [
                'work_order' => $order,
                'work_order_item' => $item,
                'piece' => $piece,
                'product' => $product,
                'qc_submission' => $qcData,
                'allocated_materials' => $allocatedMaterials,
                'prefilled' => [
                    'piece_id' => $piece->id,
                    'piece_number' => $piece->piece_number,
                    'work_order_id' => $order->id,
                    'work_order_number' => $order->work_order_number,
                    'ordered_date' => $orderedDate ? Carbon::parse($orderedDate)->toDateString() : null,
                    'delivery_date' => $deliveryDate ? Carbon::parse($deliveryDate)->toDateString() : null,
                    'work_order_item_id' => $item?->id,
                    'product_id' => $product?->id,
                    'product_code' => $product?->product_code,
                    'product_name' => $piece->product_name ?: $item?->product_name ?: $order->product_name,
                    'design_no' => $piece->design_no ?: $item?->design_no ?: $order->design_code,
                    'category_id' => $order->category_id,
                    'subcategory_id' => $order->subcategory_id,
                    'allotted_weight' => $allottedWeight,
                    'job_allotted_weight' => $savedAllottedWeight,
                    'job_required_qty' => $pieceCount,
                    'total_vault_allotted_gold' => round($totalOrderAllottedGold, 3),
                    'total_vault_allotted_diamonds' => $vaultAllottedDiamondPcs,
                    'total_vault_allotted_diamond_weight' => round($vaultAllottedDiamondWeight, 3),
                    'piece_allotted_weight' => $allottedWeight,
                    'piece_required_diamonds' => $assignedDiamondCount,
                    'piece_required_diamond_weight' => $assignedDiamondWeight,
                    'assigned_gold_weight' => round($assignedGoldWeight, 3),
                    'assigned_diamond_weight' => round($assignedDiamondWeight, 3),
                    'assigned_diamond_count' => (int)$assignedDiamondCount,
                    'production_weight' => $grossWeight,
                    'gross_weight' => $grossWeight,
                    'net_gold_weight' => $netGold > 0 ? $netGold : null,
                    'fine_gold_weight' => $fineGold,
                    'pure_24k_weight' => $fineGold,
                    'old_weight' => $oldWeight,
                    'purity' => $purity,
                    'gold_karat' => $goldKarat,
                    'diamond_weight' => $diaWt,
                    'diamond_count' => $diaCount,
                    'diamond_stamp' => "+{$cleanStamp}",
                    'diamond_details' => $diaDetails,
                    'diamond_sieves' => $diamondSieves,
                    'color_stone_weight' => $stoneWeight,
                    'color_stone_count' => $stoneCount,
                    'silver_weight' => $silverWeight,
                    'wastage_weight' => (float)($snapshotValue('wastage_weight', $piece->qc_submission_data['wastage_weight'] ?? $piece->qc_submission_data['gold_wastage'] ?? null) ?? $itemPricing['wastage_weight'] ?? $itemPricing['gold_wastage'] ?? $order->wastage_weight ?? $order->pricing_details['wastage_weight'] ?? 0) ?: null,
                    'gold_wastage' => (float)($snapshotValue('wastage_weight', $piece->qc_submission_data['wastage_weight'] ?? $piece->qc_submission_data['gold_wastage'] ?? null) ?? $itemPricing['wastage_weight'] ?? $itemPricing['gold_wastage'] ?? $order->wastage_weight ?? $order->pricing_details['wastage_weight'] ?? 0) ?: null,
                    'remarks' => $piece->qc_notes ?: ($qcData['remarks'] ?? $order->quality_notes),
                    'image_path' => $piece->image_path ?: $order->reference_image,
                    'product_image_url' => $product?->thumbnail_url ?: $product?->image_url,
                    'work_order_item' => $item,
                    'product' => $product,
                    'work_order' => $order,
                    'receive_date' => now()->toDateString(),
                    'making_charge_type' => $piece->making_charge_type ?: 'per_gram',
                    'making_charge' => $piece->making_charge_per_gram ?? $order->making_charge_per_gram,
                    'is_already_received' => !empty($piece->received_at),
                    'receive_order_number' => $piece->receive_order_number,
                    'tag_number' => $piece->tag_number,
                    'allocated_materials' => $allocatedMaterials,
                ]
            ]
        ]);
    }

    /**
     * Get all physical pieces for a Work Order with full lifecycle status
     */
    public function getPieces(Request $request, $id)
    {
        $this->authorizeAction();

        $order = WorkOrder::findOrFail($id);
        self::ensurePiecesInitialized($order);

        $pieces = WorkOrderReceivedPiece::where('work_order_id', $order->id)
            ->with(['product', 'karigar', 'receiver', 'certifier', 'hallmarker', 'qcChecker'])
            ->orderBy('piece_number', 'asc')
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $pieces,
        ]);
    }

    /**
     * Get single tag details for a received jewellery piece
     */
    public function getTagDetails($tag)
    {
        $piece = WorkOrderReceivedPiece::where('tag_number', $tag)
            ->with(['product', 'workOrder.jobOrder', 'item', 'karigar', 'receiver'])
            ->firstOrFail();

        return response()->json([
            'status' => 'success',
            'data' => [
                'id' => $piece->id,
                'tag_number' => $piece->tag_number,
                'receive_order_number' => $piece->receive_order_number,
                'piece_number' => $piece->piece_number,
                'product_id' => $piece->product_id,
                'product_name' => $piece->product_name ?: $piece->product?->name,
                'design_no' => $piece->design_no,
                'gross_weight' => (float)$piece->gross_weight,
                'net_gold_weight' => (float)$piece->net_gold_weight,
                'pure_24k_weight' => (float)$piece->pure_24k_weight,
                'purity' => (float)$piece->purity,
                'gold_karat' => $piece->gold_karat,
                'diamond_weight' => (float)$piece->diamond_weight,
                'diamond_count' => (int)$piece->diamond_count,
                'diamond_stamp' => $piece->diamond_stamp,
                'components' => $piece->components ?: [],
                'status' => $piece->status,
                'is_sold' => $piece->status === 'sold',
                'is_inventory_posted' => (bool)$piece->is_inventory_posted,
                'work_order_id' => $piece->work_order_id,
                'work_order_number' => $piece->workOrder?->work_order_number,
            ]
        ]);
    }

    /**
     * Search and list received piece tags for Tag Printing page
     */
    public function getTags(Request $request)
    {
        DB::transaction(function () {
            $receivedPiecesWithoutTags = WorkOrderReceivedPiece::whereNotNull('received_at')
                ->where(function ($tagQuery) {
                    $tagQuery->whereNull('tag_number')->orWhere('tag_number', '');
                })
                ->orderBy('id')
                ->lockForUpdate()
                ->get();

            foreach ($receivedPiecesWithoutTags as $piece) {
                if (!$piece->tag_number) {
                    $piece->tag_number = WorkOrderReceivedPiece::generateTagNumber();
                    $piece->save();
                }
            }
        });

        $query = WorkOrderReceivedPiece::whereHas('workOrder')
            ->with(['workOrder.jobOrder', 'item.product', 'product', 'client', 'karigar', 'receiver'])
            ->whereNotNull('tag_number')
            ->where('tag_number', '!=', '');

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('tag_number', 'like', "%{$search}%")
                  ->orWhere('receive_order_number', 'like', "%{$search}%")
                  ->orWhere('design_no', 'like', "%{$search}%")
                  ->orWhere('product_name', 'like', "%{$search}%")
                  ->orWhere('huid', 'like', "%{$search}%")
                  ->orWhere('certificate_no', 'like', "%{$search}%")
                  ->orWhereHas('workOrder', function ($wq) use ($search) {
                      $wq->where('work_order_number', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('receive_order_number')) {
            $query->where('receive_order_number', 'like', "%{$request->receive_order_number}%");
        }

        if ($request->filled('work_order_number')) {
            $won = $request->work_order_number;
            $query->whereHas('workOrder', function ($wq) use ($won) {
                $wq->where('work_order_number', 'like', "%{$won}%");
            });
        }

        if ($request->filled('tag_number')) {
            $query->where('tag_number', 'like', "%{$request->tag_number}%");
        }

        $section = strtolower($request->get('section', $request->get('type', 'active')));

        $pieces = $query->latest('received_at')->get();

        // Categorize pieces by delivery status (using actual persisted work order and billing relationships)
        $isPieceDelivered = function ($piece) {
            if ($piece->status === 'sold') {
                return true;
            }
            if ($piece->workOrder) {
                $woStatus = strtolower($piece->workOrder->status ?? '');
                $woStage = strtolower($piece->workOrder->current_stage ?? '');
                if ($woStatus === 'delivered' || $woStage === 'delivered' || $piece->workOrder->isFullyDelivered()) {
                    return true;
                }
            }
            return false;
        };

        if ($section === 'history') {
            $pieces = $pieces->filter(fn($p) => $isPieceDelivered($p))->values();
        } elseif ($section === 'active') {
            $pieces = $pieces->filter(fn($p) => !$isPieceDelivered($p))->values();
        }

        $pieces->transform(function ($piece) use ($isPieceDelivered) {
            $piece->is_delivered = $isPieceDelivered($piece);
            $piece->product_name = self::cleanProductName($piece->product_name, $piece->design_no);
            
            // Attach dynamic product details if present
            $product = $piece->product ?: ($piece->design_no ? Product::where('design_no', $piece->design_no)->first() : null);
            $attrs = is_array($product?->attributes) 
                ? $product->attributes 
                : (is_string($product?->attributes) ? json_decode($product->attributes, true) : []);

            $stamp = $piece->diamond_stamp ?? $attrs['stamp'] ?? $product?->stamp ?? $attrs['diamond_stamp'] ?? null;
            if (!$stamp && !empty($attrs['components']) && is_array($attrs['components'])) {
                foreach ($attrs['components'] as $comp) {
                    $name = strtolower($comp['category_name'] ?? $comp['item_name'] ?? '');
                    if ((str_contains($name, 'diamond') || str_contains($name, 'dia')) && !empty($comp['stamp'])) {
                        $stamp = $comp['stamp'];
                        break;
                    }
                }
            }
            $cleanStamp = $stamp ? ltrim($stamp, '+') : '0';

            $count = (int)($piece->diamond_count ?? 0);
            if ($count === 0) {
                if (isset($attrs['diamond_count'])) $count = (int)$attrs['diamond_count'];
                elseif (isset($attrs['dia_count'])) $count = (int)$attrs['dia_count'];
                elseif (isset($attrs['stone_count'])) $count = (int)$attrs['stone_count'];
                elseif (!empty($attrs['components']) && is_array($attrs['components'])) {
                    foreach ($attrs['components'] as $comp) {
                        $name = strtolower($comp['category_name'] ?? $comp['item_name'] ?? '');
                        if (str_contains($name, 'diamond') || str_contains($name, 'dia')) {
                            $count = (int)($comp['no_of_pieces'] ?? $comp['quantity'] ?? 0);
                            break;
                        }
                    }
                }
            }
            // Authoritative stage statuses & true values for Tag Generation tables
            $rawCertStatus = strtolower($piece->certification_status ?? '');
            if (in_array($rawCertStatus, ['skipped', 'not_required'])) {
                $piece->certification_status = 'skipped';
                $piece->certificate_no = null;
            } elseif ($rawCertStatus === 'completed') {
                $piece->certification_status = 'completed';
                $piece->certificate_no = $piece->certificate_no ?: ($piece->workOrder?->pricing_details['certification_no'] ?? null);
            } else {
                $piece->certification_status = 'pending';
                $piece->certificate_no = null;
            }

            $rawHallStatus = strtolower($piece->hallmarking_status ?? '');
            if (in_array($rawHallStatus, ['skipped', 'not_required'])) {
                $piece->hallmarking_status = 'skipped';
                $piece->huid = null;
            } elseif ($rawHallStatus === 'completed') {
                $piece->hallmarking_status = 'completed';
                $piece->huid = $piece->huid ?: ($piece->workOrder?->pricing_details['huid'] ?? null);
            } else {
                $piece->hallmarking_status = 'pending';
                $piece->huid = null;
            }

            $piece->dynamic_stamp = $cleanStamp;
            $piece->dynamic_dia_count = $count;

            $qcData = is_array($piece->qc_submission_data) ? $piece->qc_submission_data : [];
            $piece->diamond_sieves = $qcData['diamond_sieves'] ?? $piece->item?->stone_details ?? [];
            $piece->wastage_weight = $qcData['wastage_weight'] ?? 0;
            $piece->karigar_gold_weight = $qcData['karigar_gold_weight'] ?? 0;
            $piece->returned_gold_weight = $qcData['returned_gold_weight'] ?? 0;
            return $piece;
        });

        return response()->json([
            'status' => 'success',
            'data' => $pieces,
            'total' => $pieces->count(),
        ]);
    }

    /**
     * Return all tags for a product for Inventory Product View
     */
    public function getProductTags($productId)
    {
        $product = Product::find($productId);
        $attrs = is_array($product?->attributes) 
            ? $product->attributes 
            : (is_string($product?->attributes) ? json_decode($product->attributes, true) : []);
        $knownTags = is_array($attrs['tags'] ?? null) ? $attrs['tags'] : [];

        $statusFilter = request()->query('status', 'available'); // 'available', 'sold', 'all'
        $includeSold = request()->boolean('include_sold', false);

        $piecesQuery = WorkOrderReceivedPiece::with([
                'workOrder.jobOrder', 'item.product', 'product', 'karigar', 'receiver', 'workOrder.receivedPieces', 'invoice'
            ])
            ->where(function ($q) use ($productId, $product, $knownTags) {
                $q->where('product_id', $productId);
                if ($product && !empty($product->design_no)) {
                    $q->orWhere('design_no', $product->design_no);
                }
                if ($product && !empty($product->product_code)) {
                    $q->orWhere('design_no', $product->product_code);
                }
                if (!empty($knownTags)) {
                    $q->orWhereIn('tag_number', $knownTags);
                }
            })
            ->whereNotNull('tag_number');

        $allPieces = $piecesQuery->latest('received_at')->get();

        // Categorize into available vs sold
        $isDeliveredOrSold = function ($piece) {
            if ($piece->status === 'sold' || !empty($piece->invoice_id)) {
                return true;
            }
            if ($piece->workOrder) {
                $woStatus = strtolower($piece->workOrder->status ?? '');
                $woStage = strtolower($piece->workOrder->current_stage ?? '');
                if ($woStatus === 'delivered' || $woStage === 'delivered' || $piece->workOrder->isFullyDelivered()) {
                    return true;
                }
            }
            return false;
        };

        $availPieces = $allPieces->filter(fn($p) => !$isDeliveredOrSold($p))->values();
        $soldPieces = $allPieces->filter(fn($p) => $isDeliveredOrSold($p))->values();

        // Filter based on requested status
        if ($statusFilter === 'sold') {
            $filteredPieces = $soldPieces;
        } elseif ($statusFilter === 'all' || $includeSold) {
            $filteredPieces = $allPieces;
        } else {
            // Default: 'available'
            $filteredPieces = $availPieces;
        }

        $filteredPieces->transform(function ($piece) use ($isDeliveredOrSold) {
            $piece->is_delivered = $isDeliveredOrSold($piece);
            $piece->product_name = self::cleanProductName($piece->product_name, $piece->design_no);
            $product = $piece->product ?: Product::find($piece->product_id);
            $attrs = is_array($product?->attributes) 
                ? $product->attributes 
                : (is_string($product?->attributes) ? json_decode($product->attributes, true) : []);

            $stamp = $piece->diamond_stamp ?? $attrs['stamp'] ?? $product?->stamp ?? $attrs['diamond_stamp'] ?? null;
            if (!$stamp && !empty($attrs['components']) && is_array($attrs['components'])) {
                foreach ($attrs['components'] as $comp) {
                    $name = strtolower($comp['category_name'] ?? $comp['item_name'] ?? '');
                    if ((str_contains($name, 'diamond') || str_contains($name, 'dia')) && !empty($comp['stamp'])) {
                        $stamp = $comp['stamp'];
                        break;
                    }
                }
            }
            $cleanStamp = $stamp ? ltrim($stamp, '+') : '0';

            $count = (int)($piece->diamond_count ?? 0);
            if ($count === 0 && isset($attrs['diamond_count'])) $count = (int)$attrs['diamond_count'];
            $piece->dynamic_stamp = $cleanStamp;
            $piece->dynamic_dia_count = $count;

            // Harmonize stages
            $rawCertStatus = strtolower($piece->certification_status ?? '');
            if (in_array($rawCertStatus, ['skipped', 'not_required'])) {
                $piece->certification_status = 'skipped';
                $piece->certificate_no = null;
            } elseif ($rawCertStatus === 'completed') {
                $piece->certification_status = 'completed';
                $piece->certificate_no = $piece->certificate_no ?: ($piece->workOrder?->pricing_details['certification_no'] ?? null);
            } else {
                $piece->certification_status = 'pending';
                $piece->certificate_no = null;
            }

            $rawHallStatus = strtolower($piece->hallmarking_status ?? '');
            if (in_array($rawHallStatus, ['skipped', 'not_required'])) {
                $piece->hallmarking_status = 'skipped';
                $piece->huid = null;
            } elseif ($rawHallStatus === 'completed') {
                $piece->hallmarking_status = 'completed';
                $piece->huid = $piece->huid ?: ($piece->workOrder?->pricing_details['huid'] ?? null);
            } else {
                $piece->hallmarking_status = 'pending';
                $piece->huid = null;
            }

            $qcData = is_array($piece->qc_submission_data) ? $piece->qc_submission_data : [];
            $components = is_array($piece->components) && !empty($piece->components) 
                ? $piece->components 
                : ($qcData['components'] ?? []);

            $diamondSieves = is_array($qcData['diamond_sieves'] ?? null) && !empty($qcData['diamond_sieves'])
                ? $qcData['diamond_sieves']
                : array_values(array_filter($components, fn($c) => ($c['component_type'] ?? '') === 'diamond'));

            $piece->diamond_sieves = $diamondSieves;
            $piece->components = $components;
            $piece->work_order_number = $piece->workOrder?->work_order_number ?: ($piece->work_order_id ? "WO-{$piece->work_order_id}" : '-');
            $piece->receive_order_number = $piece->receive_order_number ?: "RWO-{$piece->id}";
            $piece->receiver_name = $piece->receiver?->name ?: 'Store Manager';
            $piece->karigar_name = $piece->karigar?->name ?: ($piece->workOrder?->customer_name ?: 'Karigar In-House');
            $piece->invoice_no = $piece->invoice?->invoice_no;
            $piece->days_since_received = (int) max(0, now()->diffInDays($piece->received_at ?? $piece->created_at ?? now()));

            // Purchase value fallback calculation if 0
            if (empty($piece->purchase_value) || (float)$piece->purchase_value <= 0) {
                $goldRate = (float)($product->purchase_rate ?? 6875);
                $goldCost = round((float)$piece->net_gold_weight * $goldRate, 2);
                $diaCost = 0.0;
                foreach ($diamondSieves as $ds) {
                    $diaCost += ((float)($ds['weight'] ?? 0) * (float)($ds['rate'] ?? $ds['purchase_rate'] ?? 0));
                }
                $piece->purchase_value = round($goldCost + $diaCost + (float)$piece->total_making_charge, 2);
            }

            return $piece;
        });

        $summary = [
            'total_pieces' => $allPieces->count(),
            'available_count' => $availPieces->count(),
            'sold_count' => $soldPieces->count(),
            'available_gross_weight' => round($availPieces->sum('gross_weight'), 3),
            'available_net_weight' => round($availPieces->sum('net_gold_weight'), 3),
            'available_fine_weight' => round($availPieces->sum('pure_24k_weight'), 3),
            'available_diamond_weight' => round($availPieces->sum('diamond_weight'), 3),
            'available_stone_weight' => round($availPieces->sum('color_stone_weight'), 3),
            'available_purchase_value' => round($availPieces->sum(fn($p) => (float)$p->purchase_value), 2),
        ];

        return response()->json([
            'status' => 'success',
            'data' => $filteredPieces,
            'total' => $filteredPieces->count(),
            'summary' => $summary,
        ]);
    }

    /**
     * Get delayed work orders only for Delay page
     */
    public function delays(?Request $request = null)
    {
        $request = $request ?? request();
        $today = Carbon::today()->toDateString();
        $query = WorkOrder::with([
            'jobOrder', 'karigar', 'product', 'category', 'subcategory', 
            'client', 'creator', 'items', 'delayUpdater'
        ])
        ->where(function($q) use ($today) {
            $q->where('is_delayed', true)
              ->orWhere(function($sq) use ($today) {
                  $sq->where('delivery_date', '<', $today)
                     ->whereNotIn('status', ['completed', 'final_received']);
              });
        });

        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('work_order_number', 'like', "%{$search}%")
                  ->orWhere('karigar_name', 'like', "%{$search}%")
                  ->orWhere('delay_reason', 'like', "%{$search}%");
            });
        }

        $orders = $query->latest()->get();

        $orders->transform(function ($order) use ($today) {
            $delayDays = (int) ($order->delay_days ?: 0);
            $dDateStr = null;
            if (!empty($order->delivery_date)) {
                $dDateStr = is_object($order->delivery_date) 
                    ? $order->delivery_date->toDateString() 
                    : (string) $order->delivery_date;
            }

            if ($dDateStr && substr($dDateStr, 0, 10) < $today && $delayDays <= 0) {
                try {
                    $delayDays = (int) Carbon::parse($dDateStr)->diffInDays(Carbon::now());
                } catch (\Exception $e) {
                    $delayDays = 0;
                }
            }
            $order->is_delayed = true;
            $order->delay_days = $delayDays;
            return $order;
        });

        return response()->json([
            'status' => 'success',
            'data' => $orders,
            'total' => $orders->count(),
        ]);
    }

    /**
     * Mark work order as Ready
     */
    public function markReady(Request $request, $id)
    {
        $order = WorkOrder::findOrFail($id);

        if ($order->ready_qty <= 0) {
            $order->ready_qty = $order->completed_qty ?: $order->required_qty;
        }

        $order->status = 'ready';
        $order->current_stage = 'ready';
        $order->save();

        if (!$order->timelines()->where('stage', 'ready')->exists()) {
            WorkOrderTimeline::create([
                'work_order_id' => $order->id,
                'stage' => 'ready',
                'stage_label' => 'Item Marked Ready',
                'completed_weight_at_step' => $order->completed_weight,
                'pending_weight_at_step' => $order->pending_weight,
                'status' => 'completed',
                'notes' => $request->input('notes', 'Finished item ready for delivery / receiving.'),
                'user_id' => Auth::id() ?? 1,
                'action_by_name' => Auth::user()?->name ?? 'Admin',
                'created_at' => now(),
            ]);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Work order marked as Ready.',
            'data' => $order->load(['karigar', 'product', 'items', 'receivedPieces', 'timelines'])
        ]);
    }

    /**
     * Update certification details for a work order (backward compatible)
     */
    public function updateCertification(Request $request, $id)
    {
        return $this->certificationAction($request, $id);
    }

    /**
     * Update hallmarking details for a work order (backward compatible)
     */
    public function updateHallmarking(Request $request, $id)
    {
        return $this->hallmarkingAction($request, $id);
    }

    /**
     * Update certification details for a specific received piece
     */
    public function updatePieceCertification(Request $request, $id)
    {
        $this->authorizeAction();

        $validated = $request->validate([
            'action' => 'nullable|in:add,skip,not_required',
            'certification_no' => 'nullable|string|max:255',
            'agency' => 'nullable|string|max:255',
            'certification_agency' => 'nullable|string|max:255',
        ]);

        $piece = WorkOrderReceivedPiece::findOrFail($id);
        $action = $validated['action'] ?? 'add';
        $certStatus = in_array($action, ['skip', 'not_required']) ? 'skipped' : 'completed';
        $agency = $validated['certification_agency'] ?? $validated['agency'] ?? 'BIS Certified';
        $certNo = ($certStatus === 'skipped') ? null : ($validated['certification_no'] ?? null);

        $piece->update([
            'certification_status' => $certStatus,
            'certificate_no' => $certNo,
            'certification_agency' => ($certStatus === 'skipped') ? null : $agency,
            'certified_at' => now(),
            'certified_by' => Auth::id() ?? 1,
        ]);

        if ($piece->workOrder) {
            $order = $piece->workOrder;
            $allPieces = $order->receivedPieces;
            $allDone = $allPieces->every(fn($p) => in_array($p->certification_status, ['completed', 'skipped', 'not_required']));
            if ($allDone && count($allPieces) > 0) {
                $hasCompleted = $allPieces->contains(fn($p) => $p->certification_status === 'completed');
                $order->certification_status = $hasCompleted ? 'completed' : 'skipped';
                $order->certified_qty = max((int)$order->certified_qty, $allPieces->count());
                $order->save();
            }
            $this->syncInventoryPosting($order);
        }

        return response()->json([
            'status' => 'success',
            'message' => ($certStatus === 'skipped') ? 'Piece certification marked as skipped.' : 'Piece certification details saved.',
            'piece' => $piece->fresh(['workOrder', 'product'])
        ]);
    }

    /**
     * Update hallmarking details for a specific received piece
     */
    public function updatePieceHallmarking(Request $request, $id)
    {
        $this->authorizeAction();

        $validated = $request->validate([
            'action' => 'nullable|in:add,skip,not_required',
            'huid' => 'nullable|string|max:50',
            'huid_number' => 'nullable|string|max:50',
            'hallmark_center' => 'nullable|string|max:255',
        ]);

        $piece = WorkOrderReceivedPiece::findOrFail($id);
        
        // Enforce piece-level certification dependency
        $certStatus = strtolower($piece->certification_status ?? 'pending');
        if (!in_array($certStatus, ['completed', 'skipped', 'not_required'])) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'certification_status' => ['Certification must be completed or skipped for this piece before hallmarking.']
            ]);
        }

        $action = $validated['action'] ?? 'add';
        $hallStatus = in_array($action, ['skip', 'not_required']) ? 'skipped' : 'completed';
        $huid = $validated['huid'] ?? $validated['huid_number'] ?? null;

        if ($action === 'add' && empty($huid)) {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'huid' => ['HUID / Hallmark reference number is required to complete hallmarking.']
            ]);
        }

        $piece->update([
            'hallmarking_status' => $hallStatus,
            'huid' => ($hallStatus === 'skipped') ? null : $huid,
            'hallmarked_at' => now(),
            'hallmarked_by' => Auth::id() ?? 1,
        ]);

        if ($piece->workOrder) {
            $order = $piece->workOrder;
            $allPieces = $order->receivedPieces;
            $allDone = $allPieces->every(fn($p) => in_array($p->hallmarking_status, ['completed', 'skipped', 'not_required']));
            if ($allDone && count($allPieces) > 0) {
                $hasCompleted = $allPieces->contains(fn($p) => $p->hallmarking_status === 'completed');
                $order->hallmarking_status = $hasCompleted ? 'completed' : 'skipped';
                $order->hallmarked_qty = max((int)$order->hallmarked_qty, $allPieces->count());
                $order->save();
            }
            $this->syncInventoryPosting($order);
        }

        return response()->json([
            'status' => 'success',
            'message' => ($hallStatus === 'skipped') ? 'Piece hallmarking marked as skipped.' : 'Piece hallmarking details saved.',
            'piece' => $piece->fresh(['workOrder', 'product'])
        ]);
    }

    /**
     * Move work order directly to ready phase
     */
    public function moveToReady(Request $request, $id)
    {
        return $this->markReady($request, $id);
    }

    /**
     * Dashboard statistics for live job creation status & total materials allocated (Page 14)
     * All values computed directly from project database models.
     */
    public function dashboardStats(Request $request)
    {
        $today = Carbon::today()->toDateString();
        $page = (int) $request->input('page', 1);
        $perPage = (int) $request->input('per_page', 100);
        $range = strtolower($request->input('range') ?: $request->input('period') ?: 'all');

        $applyDateRange = function ($query) use ($range) {
            if (in_array($range, ['today', '1d'])) {
                $query->whereDate('created_at', Carbon::today());
            } elseif (in_array($range, ['week', 'this week', '7d', '1w'])) {
                $query->where('created_at', '>=', Carbon::now()->startOfWeek());
            } elseif (in_array($range, ['month', 'this month', '30d', '1m'])) {
                $query->where('created_at', '>=', Carbon::now()->startOfMonth());
            } elseif (in_array($range, ['quarter', 'this quarter', '3m'])) {
                $query->where('created_at', '>=', Carbon::now()->startOfQuarter());
            } elseif (in_array($range, ['year', 'this year', '1y'])) {
                $query->where('created_at', '>=', Carbon::now()->startOfYear());
            }
        };

        // 1. KPI Counts computed strictly from database with date range filter applied
        $activeArtisansCount = Karigar::where('status', 'active')->count() ?: Karigar::count();
        $activeArtisansNewThisMonth = Karigar::where('created_at', '>=', Carbon::now()->startOfMonth())->count();

        $activeOrdersQuery = WorkOrder::whereNotIn('status', ['completed', 'cancelled', 'final_received', 'delivered']);
        if ($range !== 'all') {
            $applyDateRange($activeOrdersQuery);
        }
        $totalActive = WorkOrder::whereNotIn('status', ['completed', 'cancelled', 'final_received', 'delivered'])->count();

        // Pending Orders (ALL active non-completed work orders in the system)
        $pendingOrdersCount = WorkOrder::whereNotIn('status', ['completed', 'cancelled', 'final_received', 'delivered'])->count();

        $overdueQuery = WorkOrder::where('delivery_date', '<', $today)
            ->whereNotIn('status', ['completed', 'final_received', 'delivered', 'cancelled']);
        $overdueCount = $overdueQuery->count();

        // QC Pending / Orders for Approval (ALL pending approval orders in system)
        $qcPendingQuery = WorkOrder::where(function ($q) {
            $q->where('status', 'pending_approval')
              ->orWhereIn('current_stage', ['work_completed', 'sent_for_approval', 'quality_check']);
        })->whereNotIn('status', ['completed', 'approved', 'delivered', 'final_received', 'cancelled']);
        $qcPendingCount = $qcPendingQuery->count();

        $trendLabel = match (true) {
            in_array($range, ['today', '1d']) => 'today',
            in_array($range, ['week', 'this week', '7d', '1w']) => 'this week',
            in_array($range, ['month', 'this month', '30d', '1m']) => 'this month',
            in_array($range, ['quarter', 'this quarter', '3m']) => 'this quarter',
            in_array($range, ['year', 'this year', '1y']) => 'this year',
            default => 'this period',
        };
        $qcPendingTrend = "{$qcPendingCount} pending";

        // Completed Jobs (ALL completed/ready/approved/delivered jobs in system)
        $completedQuery = WorkOrder::where(function ($q) {
            $q->whereIn('status', ['completed', 'ready', 'approved', 'delivered', 'final_received'])
              ->orWhereIn('current_stage', ['completed', 'ready', 'approved', 'delivered', 'final_received']);
        });
        $completedCount = $completedQuery->count();
        $completedValue = $completedQuery->sum('total_price') ?: ($completedQuery->sum('allotted_weight') * 7200);

        // 2. Real Material Weights across all active manufacturing runs
        $allActiveWorkOrders = WorkOrder::whereNotIn('status', ['completed', 'cancelled', 'final_received', 'delivered'])
            ->with(['karigar', 'product', 'items', 'receivedPieces'])
            ->latest()
            ->get();
        $activeOrders = $allActiveWorkOrders;

        $totalAllocatedWeight = (float) $activeOrders->sum('allotted_weight') + (float) $activeOrders->sum('additional_allocated_weight');
        $totalCompletedWeight = (float) $activeOrders->sum('completed_weight');
        $totalPendingWeight = (float) $activeOrders->sum(function ($wo) {
            return max(0.0, (float)$wo->allotted_weight + (float)($wo->additional_allocated_weight ?? 0) - (float)$wo->completed_weight - (float)$wo->wastage_weight - (float)($wo->returned_weight ?? 0));
        });

        $silverWeight = (float) $activeOrders->filter(function ($wo) {
            $m = strtolower($wo->material_type ?? '');
            return str_contains($m, 'silver');
        })->sum('allotted_weight');

        \App\Models\RawMaterial::recalculateAllocations();
        $diamondRaw = \App\Models\RawMaterial::where('material_type', 'diamond')->first();
        $diamondWeight = $diamondRaw ? (float)$diamondRaw->allocated_weight : 0.0;

        $goldWeight = (float) $activeOrders->filter(function ($wo) {
            $m = strtolower($wo->material_type ?? '');
            return !str_contains($m, 'silver') && !str_contains($m, 'diamond');
        })->sum('allotted_weight');

        // Fine Gold Conversion (Converting 22K, 18K, etc. to 24K Pure Gold equivalent)
        $fineGoldAllocatedWeight = 0.0;
        $fineGoldPendingWeight = 0.0;
        $totalDiamondPiecesAllocated = 0;
        $totalDiamondPiecesPending = 0;

        foreach ($activeOrders as $wo) {
            $mat = strtolower($wo->material_type ?? '');
            $allotted = (float)$wo->allotted_weight + (float)($wo->additional_allocated_weight ?? 0);
            $pending = max(0.0, $allotted - (float)$wo->completed_weight - (float)$wo->wastage_weight - (float)($wo->returned_weight ?? 0));

            if (!str_contains($mat, 'silver') && !str_contains($mat, 'diamond')) {
                $purity = $wo->purity ?? $wo->material_type ?? '22K Gold';
                $fineGoldAllocatedWeight += GoldConversionHelper::convertTo24kPureWeight($allotted, $purity);
                $fineGoldPendingWeight += GoldConversionHelper::convertTo24kPureWeight($pending, $purity);
            }

            // Diamond pieces tally across items
            $diaPcsInOrder = 0;
            if ($wo->relationLoaded('items') || $wo->items) {
                foreach ($wo->items as $itm) {
                    $p = $itm->pricing_details ?? [];
                    $st = $itm->stone_details ?? [];
                    $qty = max(1, (int)($itm->required_qty ?? 1));
                    $dC = (int)($p['no_of_diamonds'] ?? $p['diamond_count'] ?? $st['diamond_count'] ?? 0);
                    $diaPcsInOrder += ($dC * $qty);
                }
            }
            $diaPcsRec = (int) $wo->receivedPieces->whereNotNull('received_at')->sum('diamond_count');
            $totalDiamondPiecesAllocated += $diaPcsInOrder;
            $totalDiamondPiecesPending += max(0, $diaPcsInOrder - $diaPcsRec);
        }

        // 3. Real Material Allocations per active Artisan across ALL active work orders and Karigar bench balances
        $materialAllocations = [];
        $allKarigars = Karigar::all();
        $totalKarigarCashBalance = 0.0;

        // Optimized single-pass payment grouping to avoid N+1 queries in the loop
        $paymentSums = \App\Models\KarigarPayment::selectRaw('
            karigar_id,
            transaction_type,
            SUM(amount) as sum_amount
        ')->groupBy('karigar_id', 'transaction_type')->get()->groupBy('karigar_id');

        $calcFin = function($kId) use ($paymentSums) {
            $pays = $paymentSums->get($kId) ?? collect();
            $totalEarned = (float) ($pays->where('transaction_type', 'payable')->first()?->sum_amount ?? 0);
            $totalPaid = (float) ($pays->where('transaction_type', 'payment')->first()?->sum_amount ?? 0);
            $totalAdvances = (float) ($pays->where('transaction_type', 'advance')->first()?->sum_amount ?? 0);
            $totalAdjustments = (float) ($pays->where('transaction_type', 'adjustment')->first()?->sum_amount ?? 0);
            $netBalance = round(($totalEarned + $totalAdjustments) - ($totalPaid + $totalAdvances), 2);
            return [
                'net_balance' => $netBalance,
                'total_payable' => max(0.0, $netBalance),
            ];
        };

        foreach ($allKarigars as $k) {
            $fin = $calcFin($k->id);
            $karigarNetCash = (float)($fin['net_balance'] ?? 0);
            $totalKarigarCashBalance += $karigarNetCash;

            $orders = $allActiveWorkOrders->where('karigar_id', $k->id);
            $issued = (float) $orders->sum('allotted_weight') + (float) $orders->sum('additional_allocated_weight');
            $completed = (float) $orders->sum('completed_weight');
            $wastage = (float) $orders->sum('wastage_weight');
            $returned = (float) $orders->sum('returned_weight');
            $balance = max(0.0, round($issued - $completed - $wastage - $returned, 3));

            // If no active work orders found, check if Karigar has gold balance on bench
            if ($issued == 0 && (float)$k->current_gold_balance_grams > 0) {
                $issued = (float) $k->current_gold_balance_grams;
                $balance = (float) $k->current_gold_balance_grams;
            }

            if ($issued > 0 || $balance > 0 || abs($karigarNetCash) > 0) {
                $primaryMaterial = $orders->first()?->material_type ?? '22K Gold';
                $unit = 'g';
                if (stripos($primaryMaterial, 'diamond') !== false && stripos($primaryMaterial, 'gold') === false) {
                    $unit = 'ct';
                }

                $percent = $issued > 0 ? min(100, max(8, round((($issued - $balance) / $issued) * 100))) : 25;

                $color = '#78591e';
                if (stripos($primaryMaterial, 'silver') !== false) {
                    $color = '#5c4a40';
                } elseif (stripos($primaryMaterial, 'diamond') !== false) {
                    $color = '#38bdf8';
                }

                $fineGoldBal = GoldConversionHelper::convertTo24kPureWeight($balance, $primaryMaterial);

                $materialAllocations[] = [
                    'artisan_id' => $k->id,
                    'artisan_name' => $k->name,
                    'material_title' => str_contains($primaryMaterial, 'Issued') ? $primaryMaterial : ($primaryMaterial . ' Issued'),
                    'issued_weight' => round($issued, 3) . $unit,
                    'balance_weight' => 'Bal: ' . round($balance, 3) . $unit,
                    'issued_numeric' => round($issued, 3),
                    'balance_numeric' => round($balance, 3),
                    'fine_balance_numeric' => round($fineGoldBal, 3),
                    'cash_balance' => round($karigarNetCash, 2),
                    'unit' => $unit,
                    'color' => $color,
                    'percent' => $percent,
                ];
            }
        }

        // 4. Real Quality Check Queue (Awaiting Final Approval)
        $dbApprovalCardsQuery = WorkOrder::with(['karigar', 'product', 'items'])
            ->where(function ($q) {
                $q->where('qc_pending_qty', '>', 0)
                  ->orWhere(function ($sq) {
                      $sq->whereIn('current_stage', ['work_completed', 'sent_for_approval', 'quality_check'])
                         ->where('status', 'pending_approval');
                  });
            })
            ->whereNotIn('status', ['completed', 'approved', 'cancelled']);
        $dbApprovalCards = $dbApprovalCardsQuery
            ->latest()
            ->get()
            ->map(function ($order) {
                $itemsCollection = collect($order->items);
                $pendingItem = $itemsCollection->first(function ($it) {
                    return is_object($it) ? ((int)($it->qc_pending_qty ?? 0) > 0) : ((int)($it['qc_pending_qty'] ?? 0) > 0);
                }) ?: $itemsCollection->first();

                $rawImg = $order->reference_image
                    ?? $pendingItem?->reference_image
                    ?? $order->image_url
                    ?? $order->specifications['image']
                    ?? $order->product?->image_url
                    ?? null;

                if (!$rawImg && !empty($order->pricing_details['items'][0])) {
                    $firstItem = $order->pricing_details['items'][0];
                    $rawImg = $firstItem['reference_image'] ?? $firstItem['design_file'] ?? $firstItem['image'] ?? null;
                }
                if (!$rawImg) {
                    $rawImg = '/images/samples/peacock_choker.jpg';
                }

                return [
                    'id' => $order->id,
                    'work_order_id' => $order->id,
                    'work_order_item_id' => $pendingItem?->id ?? null,
                    'design_no' => $pendingItem?->design_no ?? $order->design_code,
                    'submitted_qty' => $pendingItem?->qc_pending_qty ?: ($order->qc_pending_qty ?: 1),
                    'qc_code' => 'QC-' . (440 + $order->id),
                    'work_order_number' => $order->work_order_number,
                    'product_name' => $order->product_name,
                    'artisan_name' => $order->karigar_name ?? $order->karigar?->name ?? 'Artisan',
                    'is_priority' => ($order->priority === 'High' || $order->priority === 'Urgent'),
                    'image_url' => $rawImg,
                    'allotted_weight' => round((float)$order->allotted_weight, 3),
                    'completed_weight' => round((float)$order->completed_weight, 3),
                    'pending_weight' => round((float)$order->pending_weight, 3),
                    'status' => $order->status,
                ];
            });

        // 5. Paginated Live Jobs from DB (All active work orders)
        $liveJobsQuery = WorkOrder::with(['karigar', 'product'])
            ->whereNotIn('status', ['completed', 'cancelled', 'delivered', 'final_received'])
            ->latest();

        $paginatedLiveJobs = $liveJobsQuery->paginate($perPage, ['*'], 'page', $page);

        $transformedLiveJobs = collect($paginatedLiveJobs->items())->map(function ($j, $idx) use ($today) {
            $artisanName = $j->karigar_name ?? $j->karigar?->name ?? 'Artisan';
            $words = explode(' ', trim($artisanName));
            $initials = count($words) >= 2 ? strtoupper(substr($words[0], 0, 1) . substr($words[1], 0, 1)) : strtoupper(substr($artisanName, 0, 2));

            $stageName = strtoupper(str_replace('_', ' ', $j->current_stage ?: 'IN PROGRESS'));
            $stageClass = 'bg-[#fef9c3] text-[#a16207]';
            if (stripos($stageName, 'POLISH') !== false) {
                $stageClass = 'bg-[#dcfce7] text-[#15803d]';
            } elseif (stripos($stageName, 'CAST') !== false) {
                $stageClass = 'bg-[#ffe4e6] text-[#e11d48]';
            } elseif (stripos($stageName, 'ENAMEL') !== false) {
                $stageClass = 'bg-[#ffedd5] text-[#c2410c]';
            } elseif (stripos($stageName, 'READY') !== false || stripos($stageName, 'APPROV') !== false) {
                $stageClass = 'bg-[#ecfdf5] text-[#059669]';
            }

            $avatarColors = [
                'bg-[#fce7e7] text-[#b01622]',
                'bg-[#fae8e0] text-[#c2410c]',
                'bg-[#fbeaf0] text-[#db2777]',
                'bg-[#fef3c7] text-[#d97706]',
            ];

            $dueDate = $j->delivery_date
                ? Carbon::parse($j->delivery_date)->format('M d, Y')
                : Carbon::parse($j->created_at)->addDays(7)->format('M d, Y');

            $isOverdue = ($j->delivery_date && Carbon::parse($j->delivery_date)->toDateString() < $today && !in_array($j->status, ['completed', 'final_received']));

            $imageUrl = $j->image_url;
            if (!$imageUrl && !empty($j->pricing_details['items']) && is_array($j->pricing_details['items'])) {
                $firstItem = $j->pricing_details['items'][0] ?? null;
                if ($firstItem) {
                    $imageUrl = $firstItem['reference_image'] ?? $firstItem['design_file'] ?? $firstItem['image'] ?? null;
                }
            }
            if (!$imageUrl && !empty($j->pricing_details['item_details']) && is_array($j->pricing_details['item_details'])) {
                $itm = $j->pricing_details['item_details'];
                $imageUrl = $itm['reference_image'] ?? $itm['design_file'] ?? $itm['image'] ?? null;
            }

                $diaAllotted = 0.0;
                $diaReceived = 0.0;
                $diaCount = 0;
                $diaStamp = null;
                foreach ($j->items as $itm) {
                    $p = $itm->pricing_details ?? [];
                    $st = $itm->stone_details ?? [];
                    $qty = max(1, (int)($itm->required_qty ?? 1));
                    $dW = (float)($p['diamond_weight'] ?? $st['diamond_weight'] ?? 0);
                    $dC = (int)($p['no_of_diamonds'] ?? $p['diamond_count'] ?? $st['diamond_count'] ?? 0);
                    $diaAllotted += ($dW * $qty);
                    $diaCount += ($dC * $qty);
                    if (empty($diaStamp)) {
                        $diaStamp = $p['diamond_stamp'] ?? $p['stamp'] ?? $st['diamond_stamp'] ?? $st['stamp'] ?? $itm->stamp ?? null;
                    }
                }
                if ($diaAllotted == 0 && str_contains(strtolower($j->material_type ?? ''), 'diamond')) {
                    $diaAllotted = (float)$j->allotted_weight;
                }
                if (empty($diaStamp)) {
                    $diaStamp = $j->stone_details['diamond_stamp'] ?? $j->stone_details['stamp'] ?? $j->pricing_details['diamond_stamp'] ?? $j->pricing_details['stamp'] ?? null;
                }
                if (empty($diaStamp) && !empty($j->product?->attributes)) {
                    $diaStamp = $j->product->attributes['diamond_stamp'] ?? $j->product->attributes['stamp'] ?? null;
                }
                $diaReceived = (float) $j->receivedPieces->whereNotNull('received_at')->sum('diamond_weight');
                $diaPending = max(0.0, round($diaAllotted - $diaReceived, 3));

                return [
                    'id' => $j->id,
                    'artisan_name' => $artisanName,
                    'karigar_name' => $artisanName,
                    'karigar_id' => $j->karigar_id,
                    'product_name' => $j->product_name ?: ($j->product?->name ?? '22K Gold Bangle Set'),
                    'initials' => $initials ?: 'AR',
                    'avatar_color' => $avatarColors[$idx % count($avatarColors)],
                    'work_order_number' => $j->work_order_number,
                    'item_type' => $j->product_name ?: ($j->product?->name ?? '22K Gold Bangle Set'),
                    'image_url' => $imageUrl ?: '/images/samples/peacock_choker.jpg',
                    'stage' => $stageName,
                    'current_stage' => $j->current_stage ?: 'Created',
                    'status' => $j->status ?: 'ongoing',
                    'stage_class' => $stageClass,
                    'due_date' => $dueDate,
                    'is_overdue' => $isOverdue,
                    'allotted_weight' => round((float) $j->allotted_weight, 3),
                    'completed_weight' => round((float) $j->completed_weight, 3),
                    'pending_weight' => round((float) $j->pending_weight, 3),
                    'diamond_allotted' => round($diaAllotted, 3),
                    'diamond_received' => round($diaReceived, 3),
                    'diamond_pending' => $diaPending,
                    'diamond_stamp' => $diaStamp,
                    'diamond_count' => $diaCount,
                    'has_diamonds' => ($diaAllotted > 0 || $diaPending > 0),
                    'material' => $j->material_type ?? '22K Gold',
                    'material_type' => $j->material_type ?? '22K Gold',
                    'purity' => $j->purity ?? $j->material_type ?? '22K Gold',
                    'fine_weight' => round(GoldConversionHelper::convertTo24kPureWeight((float)$j->allotted_weight, $j->material_type ?? '22K Gold'), 3),
                    'fine_pending_weight' => round(GoldConversionHelper::convertTo24kPureWeight((float)$j->pending_weight, $j->material_type ?? '22K Gold'), 3),
                ];
            });

        // 6. All Active Work Orders for full material allocation reporting (reuse eager-loaded collection)
        $allActiveJobs = $allActiveWorkOrders
            ->map(function ($j) use ($today) {
                $artisanName = $j->karigar_name ?? $j->karigar?->name ?? 'Artisan';
                $dueDate = $j->delivery_date
                    ? Carbon::parse($j->delivery_date)->format('M d, Y')
                    : Carbon::parse($j->created_at)->addDays(7)->format('M d, Y');

                $allotted = (float) $j->allotted_weight + (float) ($j->additional_allocated_weight ?? 0);
                $completed = (float) $j->completed_weight;
                $wastage = (float) $j->wastage_weight;
                $returned = (float) ($j->returned_weight ?? 0);
                $pending = max(0.0, round($allotted - $completed - $wastage - $returned, 3));

                $diaAllotted = 0.0;
                $diaReceived = 0.0;
                $diaCount = 0;
                $diaCountRec = 0;
                $diaStamp = null;
                foreach ($j->items as $itm) {
                    $p = $itm->pricing_details ?? [];
                    $st = $itm->stone_details ?? [];
                    $qty = max(1, (int)($itm->required_qty ?? 1));
                    $dW = (float)($p['diamond_weight'] ?? $st['diamond_weight'] ?? 0);
                    $dC = (int)($p['no_of_diamonds'] ?? $p['diamond_count'] ?? $st['diamond_count'] ?? 0);
                    $diaAllotted += ($dW * $qty);
                    $diaCount += ($dC * $qty);
                    if (empty($diaStamp)) {
                        $diaStamp = $p['diamond_stamp'] ?? $p['stamp'] ?? $st['diamond_stamp'] ?? $st['stamp'] ?? $itm->stamp ?? null;
                    }
                }
                if ($diaAllotted == 0 && str_contains(strtolower($j->material_type ?? ''), 'diamond')) {
                    $diaAllotted = (float)$j->allotted_weight;
                }
                if (empty($diaStamp)) {
                    $diaStamp = $j->stone_details['diamond_stamp'] ?? $j->stone_details['stamp'] ?? $j->pricing_details['diamond_stamp'] ?? $j->pricing_details['stamp'] ?? null;
                }
                if (empty($diaStamp) && !empty($j->product?->attributes)) {
                    $diaStamp = $j->product->attributes['diamond_stamp'] ?? $j->product->attributes['stamp'] ?? null;
                }
                $diaReceived = (float) $j->receivedPieces->whereNotNull('received_at')->sum('diamond_weight');
                $diaCountRec = (int) $j->receivedPieces->whereNotNull('received_at')->sum('diamond_count');
                $diaPending = max(0.0, round($diaAllotted - $diaReceived, 3));
                $diaCountPending = max(0, $diaCount - $diaCountRec);

                $purityLabel = $j->purity ?? $j->material_type ?? '22K Gold';
                $fineAllotted = GoldConversionHelper::convertTo24kPureWeight($allotted, $purityLabel);
                $finePending = GoldConversionHelper::convertTo24kPureWeight($pending, $purityLabel);

                return [
                    'id' => $j->id,
                    'artisan_name' => $artisanName,
                    'karigar_name' => $artisanName,
                    'karigar_id' => $j->karigar_id,
                    'product_name' => $j->product_name ?: ($j->product?->name ?? 'Jewellery Product'),
                    'work_order_number' => $j->work_order_number,
                    'item_type' => $j->product_name ?: ($j->product?->name ?? 'Jewellery Product'),
                    'current_stage' => $j->current_stage ?: 'Created',
                    'status' => $j->status ?: 'ongoing',
                    'due_date' => $dueDate,
                    'allotted_weight' => round($allotted, 3),
                    'completed_weight' => round($completed, 3),
                    'pending_weight' => round($pending, 3),
                    'fine_weight' => round($fineAllotted, 3),
                    'fine_pending_weight' => round($finePending, 3),
                    'diamond_allotted' => round($diaAllotted, 3),
                    'diamond_received' => round($diaReceived, 3),
                    'diamond_pending' => $diaPending,
                    'diamond_stamp' => $diaStamp,
                    'diamond_count' => $diaCount,
                    'diamond_pending_count' => $diaCountPending,
                    'has_diamonds' => ($diaAllotted > 0 || $diaPending > 0),
                    'material' => $j->material_type ?? '22K Gold',
                    'material_type' => $j->material_type ?? '22K Gold',
                    'purity' => $purityLabel,
                ];
            });

        // 7. Detailed Audit Log per Karigar from DB
        $auditLogs = $allKarigars->map(function ($k) {
            $orders = $k->workOrders;
            $allotted = (float) $orders->sum('allotted_weight');
            $completed = (float) $orders->sum('completed_weight');
            $loss = (float) $orders->sum('wastage_weight');
            $bal = (float) $orders->sum('pending_weight');

            return [
                'artisan_name' => $k->name,
                'material' => $orders->first()?->material_type ?? '22K Yellow Gold (916)',
                'issued' => round($allotted, 3) . 'g',
                'returned' => round($completed, 3) . 'g',
                'loss' => round($loss, 3) . 'g',
                'vault_balance' => round($bal, 3) . 'g',
            ];
        })->values();

        $data = [
            'total_active' => $totalActive,
            'active_artisans' => $activeArtisansCount,
            'active_artisans_growth' => $activeArtisansNewThisMonth > 0 ? "+{$activeArtisansNewThisMonth} New" : 'Active',
            'pending_orders' => $pendingOrdersCount,
            'overdue_count' => $overdueCount,
            'qc_pending' => $qcPendingCount,
            'qc_pending_trend' => $qcPendingTrend,
            'completed_jobs' => $completedCount,
            'completed_value' => $completedValue,
            'allocated_weight' => round($totalAllocatedWeight, 3),
            'completed_weight' => round($totalCompletedWeight, 3),
            'pending_weight' => round($totalPendingWeight, 3),
            'gold_weight' => round($goldWeight, 3),
            'fine_gold_weight' => round($fineGoldAllocatedWeight, 3),
            'fine_gold_pending_weight' => round($fineGoldPendingWeight, 3),
            'silver_weight' => round($silverWeight, 3),
            'diamond_weight' => round($diamondWeight, 3),
            'diamond_pieces' => $totalDiamondPiecesAllocated,
            'diamond_pieces_pending' => $totalDiamondPiecesPending,
            'total_karigar_cash_balance' => round($totalKarigarCashBalance, 2),
            'material_allocations' => $materialAllocations,
            'audit_logs' => $auditLogs,
            'approval_cards' => $dbApprovalCards,
            'all_active_jobs' => $allActiveJobs,
            'pagination' => [
                'current_page' => $paginatedLiveJobs->currentPage(),
                'last_page' => $paginatedLiveJobs->lastPage(),
                'per_page' => $paginatedLiveJobs->perPage(),
                'total' => $paginatedLiveJobs->total(),
                'from' => $paginatedLiveJobs->firstItem() ?? 0,
                'to' => $paginatedLiveJobs->lastItem() ?? 0,
            ],
            'live_jobs' => $transformedLiveJobs,
        ];

        return response()->json([
            'status' => 'success',
            'data' => $data,
            'summary' => $data,
            'live_jobs' => $transformedLiveJobs,
            'all_active_jobs' => $allActiveJobs,
            'approval_cards' => $dbApprovalCards,
            'pagination' => $data['pagination'],
        ]);
    }

    /**
     * Professional PDF Generation matching reference layout
     */
    public function exportPdf($id)
    {
        $order = WorkOrder::with([
            'karigar', 'product', 'category', 'subcategory', 'client', 'creator', 'timelines'
        ])->findOrFail($id);

        $pdf = Pdf::loadView('pdf.work-order', compact('order'))
                  ->setPaper('a4', 'portrait')
                  ->setOption(['isRemoteEnabled' => true, 'isHtml5ParserEnabled' => true]);

        return $pdf->stream("WorkOrder-{$order->work_order_number}.pdf");
    }

    /**
     * Helper to credit completed product to Inventory count & stock weight
     */
    protected function creditWorkOrderToInventory(WorkOrder $order)
    {
        try {
            $pricing = $order->pricing_details ?? [];
            if (!empty($pricing['inventory_credited'])) {
                return; // Avoid duplicate increments
            }

            // Guard: If individual pieces exist for this Work Order, inventory posting MUST only come through syncInventoryPosting
            if (WorkOrderReceivedPiece::where('work_order_id', $order->id)->exists()) {
                $pricing['inventory_credited'] = true;
                $pricing['inventory_credited_at'] = now()->toDateTimeString();
                $order->pricing_details = $pricing;
                $order->save();
                return;
            }

            $items = $pricing['items'] ?? [];
            if (empty($items) || !is_array($items)) {
                $items = [[
                    'product_name' => $order->product_name ?: 'Finished Jewelry Piece',
                    'design_number' => $order->design_code,
                    'gold_weight' => $order->completed_weight ?: ($order->allotted_weight ?: 28.5),
                    'need_pcs' => 1,
                    'total_price' => $order->total_price ?: 0,
                    'image' => $order->image_url,
                ]];
            }

            $certNo = $pricing['certification_no'] ?? $order->pricing_details['certification_no'] ?? null;
            $certAgency = $pricing['certification_agency'] ?? $order->pricing_details['certification_agency'] ?? null;
            $huid = $pricing['huid'] ?? $order->pricing_details['huid'] ?? null;
            $hallmarkCenter = $pricing['hallmark_center'] ?? $order->pricing_details['hallmark_center'] ?? null;

            foreach ($items as $itm) {
                $designNo = $itm['design_number'] ?? $order->design_code;
                $pName = $itm['product_name'] ?? $itm['variant'] ?? $order->product_name ?? 'Finished Jewelry Piece';
                $pcs = intval($itm['need_pcs'] ?? 1);
                if ($pcs < 1) $pcs = 1;
                $itemWeight = (float) ($itm['gold_weight'] ?? $itm['total_weight'] ?? $order->completed_weight ?: ($order->allotted_weight ?: 0));

                $product = null;
                if (!empty($designNo)) {
                    $product = Product::where('product_code', $designNo)
                        ->orWhere('design_no', $designNo)
                        ->first();
                }

                if (!$product && !empty($pName)) {
                    $product = Product::where('name', $pName)->first();
                }

                if ($product) {
                    $product->current_stock_qty = intval($product->current_stock_qty ?? 0) + $pcs;
                    $product->opening_stock_weight = round(floatval($product->opening_stock_weight ?? 0) + $itemWeight, 3);
                    $product->status = 'active';

                    $attrs = $product->attributes ?? [];
                    if ($certNo) $attrs['certification_no'] = $certNo;
                    if ($certAgency) $attrs['certification_agency'] = $certAgency;
                    if ($huid) $attrs['huid'] = $huid;
                    if ($hallmarkCenter) $attrs['hallmark_center'] = $hallmarkCenter;
                    $product->attributes = $attrs;

                    $product->save();
                } else {
                    $code = $designNo ?: ('PROD-' . strtoupper(\Illuminate\Support\Str::random(6)));

                    // Safely resolve category_id
                    $catId = $order->category_id;
                    if (empty($catId) || !\App\Models\Category::where('id', $catId)->exists()) {
                        $cat = \App\Models\Category::where('name', 'like', '%' . $pName . '%')->first()
                            ?: \App\Models\Category::first();
                        $catId = $cat ? $cat->id : null;
                    }

                    $img = $itm['reference_image'] ?? $itm['design_file'] ?? $itm['image'] ?? $order->image_url;

                    Product::create([
                        'name' => $pName,
                        'product_code' => $code,
                        'design_no' => $designNo,
                        'category_id' => $catId,
                        'subcategory_id' => $order->subcategory_id,
                        'current_stock_qty' => $pcs,
                        'opening_stock_weight' => round($itemWeight, 3),
                        'weight' => round($itemWeight, 3),
                        'purchase_price' => $itm['total_price'] ?? $order->total_price ?: 0,
                        'image' => $img,
                        'image_url' => $img,
                        'status' => 'active',
                        'attributes' => [
                            'source' => 'inventory',
                            'is_inventory' => true,
                            'gross_wt' => round($itemWeight, 3),
                            'from_work_order' => $order->work_order_number,
                            'karigar_name' => $order->karigar_name,
                            'certification_no' => $certNo,
                            'certification_agency' => $certAgency,
                            'huid' => $huid,
                            'hallmark_center' => $hallmarkCenter,
                        ],
                    ]);
                }
            }

            $pricing['inventory_credited'] = true;
            $pricing['inventory_credited_at'] = now()->toDateTimeString();
            $order->pricing_details = $pricing;
            $order->save();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to credit work order to inventory: ' . $e->getMessage());
        }
    }

    /**
     * Helper to process and convert base64 image data strings to real stored files
     */
    protected function processBase64Data($data, $folder = 'work_orders')
    {
        if (empty($data) || !is_string($data)) {
            return $data;
        }

        // If it's already an HTTP / asset URL or path without data URI prefix, return directly
        if (!str_starts_with($data, 'data:')) {
            return $data;
        }

        try {
            $commaPos = strpos($data, ',');
            if ($commaPos === false) {
                return $data;
            }

            $meta = substr($data, 0, $commaPos);
            $base64Str = substr($data, $commaPos + 1);

            $extension = 'jpg';
            if (preg_match('/data:([^;]+);base64/i', $meta, $mimeMatches)) {
                $mimeType = strtolower(trim($mimeMatches[1]));
                $extensionMap = [
                    'image/jpeg' => 'jpg',
                    'image/jpg' => 'jpg',
                    'image/png' => 'png',
                    'image/webp' => 'webp',
                    'image/gif' => 'gif',
                    'image/svg+xml' => 'svg',
                    'image/bmp' => 'bmp',
                    'application/pdf' => 'pdf',
                    'application/acad' => 'dwg',
                    'application/x-acad' => 'dwg',
                    'application/autocad_dwg' => 'dwg',
                    'image/vnd.dwg' => 'dwg',
                    'application/dxf' => 'dxf',
                    'model/stl' => 'stl',
                    'model/obj' => 'obj',
                ];
                $extension = $extensionMap[$mimeType] ?? (explode('/', $mimeType)[1] ?? 'jpg');
                $extension = preg_replace('/[^a-zA-Z0-9]/', '', $extension);
                if (empty($extension) || strlen($extension) > 5) {
                    $extension = 'bin';
                }
            }

            $decoded = base64_decode($base64Str, true);
            if ($decoded === false) {
                return $data;
            }

            $filename = 'wo_' . time() . '_' . \Illuminate\Support\Str::random(12) . '.' . $extension;
            $disk = \Illuminate\Support\Facades\Storage::disk('public');
            if (!$disk->exists($folder)) {
                $disk->makeDirectory($folder);
            }
            $disk->put("{$folder}/{$filename}", $decoded);

            return asset("storage/{$folder}/{$filename}");
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('processBase64Data warning: ' . $e->getMessage());
            return $data;
        }
    }



    /**
     * Helper to clean design codes appended to product names
     */
    public static function cleanProductName(?string $name, ?string $designNo = null): string
    {
        if (!$name) {
            return 'Jewellery Product';
        }
        $cleaned = trim($name);
        if ($designNo) {
            $d = trim($designNo);
            if ($d !== '') {
                $cleaned = preg_replace('/\s*\(?' . preg_quote($d, '/') . '\)?$/i', '', $cleaned);
                $cleaned = preg_replace('/\s*-\s*' . preg_quote($d, '/') . '$/i', '', $cleaned);
            }
        }
        $cleaned = preg_replace('/\s*\([A-Z0-9_-]+\)$/i', '', $cleaned);
        return trim($cleaned) ?: $name;
    }

    /**
     * Delete a work order and cascade deletion to related pieces, items, timelines, and operations
     */
    public function destroy($id)
    {
        $this->authorizeAction();

        $order = WorkOrder::findOrFail($id);
        $karigarId = $order->karigar_id;

        $order->delete();

        if ($karigarId) {
            $this->syncKarigarGoldBalance($karigarId);
        }

        \Illuminate\Support\Facades\Cache::flush();

        return response()->json([
            'status' => 'success',
            'message' => 'Work order and all associated records deleted successfully.'
        ]);
    }

    /**
     * Get authoritative 24K fine-gold and diamond material requirements for a work order
     */
    public function materialRequirements($id)
    {
        $order = WorkOrder::with(['items', 'product', 'karigar'])->findOrFail($id);
        $requirements = \App\Services\WorkOrderMaterialRequirementService::getWorkOrderMaterialRequirements($order);

        return response()->json([
            'status' => 'success',
            'data' => $requirements,
        ]);
    }

    /**
     * Get authoritative 24K fine-gold reconciliation for a work order or specific piece
     */
    public function goldReconciliation(Request $request, $id)
    {
        $order = WorkOrder::with(['items', 'receivedPieces', 'karigar'])->findOrFail($id);
        $pieceId = $request->input('piece_id');
        $reconciliation = \App\Services\WorkOrderGoldReconciliationService::calculateForWorkOrder($order, $pieceId);

        return response()->json([
            'status' => 'success',
            'data' => $reconciliation,
        ]);
    }
}
