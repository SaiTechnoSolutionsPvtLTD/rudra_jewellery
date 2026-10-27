<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseEntry;
use App\Models\Product;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PurchaseEntryController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = PurchaseEntry::with(['supplier', 'category', 'product.category', 'product.subcategory', 'rawMaterial']);

            if ($request->has('supplier_id') && !empty($request->supplier_id)) {
                $query->where('supplier_id', $request->supplier_id);
            }

            if ($request->has('product_id') && !empty($request->product_id)) {
                $query->where('product_id', $request->product_id);
            }

            if ($request->has('raw_material_id') && !empty($request->raw_material_id)) {
                $query->where('raw_material_id', $request->raw_material_id);
            }

            if ($request->has('purchase_type') && !empty($request->purchase_type)) {
                $query->where('purchase_type', $request->purchase_type);
            }

            $entries = $query->orderBy('id', 'desc')->get();
            return response()->json($entries);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error fetching purchase entries: ' . $e->getMessage());
            return response()->json(['message' => 'Unable to fetch purchase entries (500). Please try again later.'], 500);
        }
    }

    public function rawMaterials()
    {
        $materials = \App\Models\RawMaterial::orderBy('id', 'asc')->get();
        return response()->json($materials);
    }

    public function generateNo()
    {
        $latest = PurchaseEntry::orderBy('id', 'desc')->first();
        $nextNum = $latest ? ($latest->id + 1001) : 1001;
        $purchaseNo = 'PUR-' . $nextNum;

        while (PurchaseEntry::where('purchase_no', $purchaseNo)->exists()) {
            $nextNum++;
            $purchaseNo = 'PUR-' . $nextNum;
        }

        return response()->json(['purchase_no' => $purchaseNo]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'purchase_no' => 'nullable|string|max:50',
            'supplier_id' => 'required|exists:suppliers,id',
            'product_id' => 'nullable|exists:products,id',
            'raw_material_id' => 'nullable|exists:raw_materials,id',
            'category_id' => 'nullable|exists:categories,id',
            'is_new_product' => 'nullable|boolean',
            'purchase_type' => 'nullable|string|in:raw_material,finished_product',
            'metal_type' => 'nullable|string|max:50',
            'purity' => 'nullable|string|max:50',
            'stamp' => 'nullable|string|max:100',
            'item_name' => 'nullable|string|max:255',
            'product_code' => 'nullable|string|max:100',
            'design_no' => 'nullable|string|max:100',
            'subcategory_id' => 'nullable|exists:subcategories,id',
            'gold_karat' => 'nullable|string|max:50',
            'gold_stamp' => 'nullable|string|max:50',
            'setting_type' => 'nullable|string|max:100',
            'diamond_weight' => 'nullable|numeric|min:0',
            'diamond_count' => 'nullable|numeric|min:0',
            'diamond_stamp' => 'nullable|string|max:100',
            'diamond_clarity' => 'nullable|string|max:50',
            'diamond_color' => 'nullable|string|max:50',
            'color_stone_weight' => 'nullable|numeric|min:0',
            'color_stone_count' => 'nullable|numeric|min:0',
            'color_stone_stamp' => 'nullable|string|max:100',
            'qty' => 'nullable|numeric|min:0',
            'count_qty' => 'nullable|numeric|min:0',
            'unit' => 'nullable|string|max:20',
            'weight' => 'required|numeric|min:0.001',
            'less_weight' => 'nullable|numeric|min:0',
            'net_weight' => 'nullable|numeric|min:0',
            'touch' => 'nullable|numeric|min:0|max:100',
            'wastage_percent' => 'nullable|numeric|min:0|max:100',
            'fine_weight' => 'nullable|numeric|min:0',
            'stone_weight' => 'nullable|numeric|min:0',
            'rate' => 'nullable|numeric|min:0',
            'making_charge' => 'nullable|numeric|min:0',
            'stone_cost' => 'nullable|numeric|min:0',
            'cgst_percent' => 'nullable|numeric|min:0|max:100',
            'cgst_amount' => 'nullable|numeric|min:0',
            'sgst_percent' => 'nullable|numeric|min:0|max:100',
            'sgst_amount' => 'nullable|numeric|min:0',
            'igst_percent' => 'nullable|numeric|min:0|max:100',
            'igst_amount' => 'nullable|numeric|min:0',
            'total_tax_amount' => 'nullable|numeric|min:0',
            'credit_days' => 'nullable|integer|min:0',
            'due_date' => 'nullable|date',
            'payment_status' => 'nullable|string|in:unpaid,partial,paid,fully paid',
            'paid_amount' => 'nullable|numeric|min:0',
            'total_amount' => 'nullable|numeric|min:0',
            'purchase_date' => 'required|date',
            'notes' => 'nullable|string',
            'image' => 'nullable',
            'components' => 'nullable|array',
            'components.*.stamp' => 'nullable|string|max:100',
            'components.*.sieve_size' => 'nullable|string|max:100',
            'components.*.diamond_type' => 'nullable|string|max:100',
            'components.*.stones_count' => 'nullable|numeric|min:0',
            'components.*.stone_count' => 'nullable|numeric|min:0',
            'components.*.weight_carats' => 'nullable|numeric|min:0',
            'components.*.total_weight' => 'nullable|numeric|min:0',
            'components.*.rate_per_carat' => 'nullable|numeric|min:0',
            'components.*.row_value' => 'nullable|numeric|min:0',
            'components.*.notes' => 'nullable|string|max:500',
        ]);

        try {
            return DB::transaction(function () use ($validated, $request) {
                // Generate purchase number if missing
                if (empty($validated['purchase_no'])) {
                    $latest = PurchaseEntry::orderBy('id', 'desc')->first();
                    $nextNum = $latest ? ($latest->id + 1001) : 1001;
                    $purchaseNo = 'PUR-' . $nextNum;
                    while (PurchaseEntry::where('purchase_no', $purchaseNo)->exists()) {
                        $nextNum++;
                        $purchaseNo = 'PUR-' . $nextNum;
                    }
                    $validated['purchase_no'] = $purchaseNo;
                }

                // Handle Image File Upload or URL string
                $imagePath = null;
                if ($request->hasFile('image')) {
                    $imagePath = $request->file('image')->store('products/images', 'public');
                } elseif (!empty($validated['image']) && is_string($validated['image'])) {
                    $imagePath = $validated['image'];
                }
                $validated['image'] = $imagePath;

                $purchaseType = $validated['purchase_type'] ?? (!empty($validated['product_id']) ? 'finished_product' : 'raw_material');
                $validated['purchase_type'] = $purchaseType;

                $rawMat = null;
                if (!empty($validated['raw_material_id'])) {
                    $rawMat = \App\Models\RawMaterial::find($validated['raw_material_id']);
                    if ($rawMat) {
                        if (empty($validated['metal_type'])) {
                            $validated['metal_type'] = $rawMat->material_type;
                        }
                        if (empty($validated['unit'])) {
                            $validated['unit'] = $rawMat->unit;
                        }
                    }
                }

                $metalTypeRaw = strtolower($validated['metal_type'] ?? '');
                $rawMatType = strtolower($rawMat?->material_type ?? '');
                $rawMatName = strtolower($rawMat?->name ?? '');

                $isStone = in_array($metalTypeRaw, ['stone', 'colour_stone', 'color_stone', 'gemstone'])
                    || str_contains($rawMatType, 'stone')
                    || str_contains($rawMatName, 'stone')
                    || str_contains($rawMatName, 'ruby')
                    || str_contains($rawMatName, 'emerald')
                    || str_contains($rawMatName, 'sapphire')
                    || str_contains($rawMatName, 'gem');

                $isDiamond = !$isStone && (
                    $metalTypeRaw === 'diamond'
                    || str_contains($rawMatType, 'diamond')
                    || str_contains($rawMatName, 'diamond')
                    || strtolower($validated['unit'] ?? '') === 'ct'
                );

                if ($isDiamond) {
                    $validated['metal_type'] = 'diamond';
                    if (empty($validated['unit'])) {
                        $validated['unit'] = 'ct';
                    }
                } elseif ($isStone) {
                    $validated['metal_type'] = 'stone';
                    if (empty($validated['unit'])) {
                        $validated['unit'] = $rawMat?->unit ?: 'ct';
                    }
                }

                // Repeatable Diamond / Material Components Processing
                $rawComponents = $request->input('components');
                $cleanedComponents = [];
                $compTotalCarats = 0.0;
                $compTotalStones = 0;
                $compTotalAmount = 0.0;
                $stampNames = [];

                if (is_string($rawComponents)) {
                    $rawComponents = json_decode($rawComponents, true);
                }

                if (is_array($rawComponents) && count($rawComponents) > 0) {
                    foreach ($rawComponents as $row) {
                        $st = trim((string)($row['stamp'] ?? $row['diamond_stamp'] ?? $row['color_stone_stamp'] ?? $row['sieve_size'] ?? ''));
                        $stones = intval($row['stones_count'] ?? $row['stone_count'] ?? $row['no_of_pieces'] ?? $row['pieces'] ?? $row['count'] ?? 0);
                        $cts = floatval($row['weight_carats'] ?? $row['total_weight'] ?? $row['weight'] ?? $row['carat_weight'] ?? $row['gross_wt'] ?? 0);
                        $rowRate = floatval($row['rate_per_carat'] ?? $row['rate'] ?? 0);
                        $rowVal = floatval($row['row_value'] ?? ($cts > 0 && $rowRate > 0 ? round($cts * $rowRate, 2) : 0));
                        $rowNotes = trim((string)($row['notes'] ?? ''));
                        $catName = trim((string)($row['category_name'] ?? ($isDiamond ? 'Diamond' : ($isStone ? 'Color Stone' : 'Component'))));
                        $diaType = trim((string)($row['diamond_type'] ?? $row['stone_type'] ?? $row['shape'] ?? 'Round'));

                        if ($cts > 0 || $stones > 0 || !empty($st)) {
                            $cleanedComponents[] = [
                                'category_name' => $catName,
                                'item_name' => $st ?: $catName,
                                'stamp' => $st,
                                'sieve_size' => $st,
                                'diamond_type' => $diaType ?: 'Round',
                                'stone_type' => $diaType ?: 'Round',
                                'stones_count' => $stones,
                                'no_of_pieces' => $stones,
                                'weight_carats' => $cts,
                                'gross_wt' => $cts,
                                'rate_per_carat' => $rowRate,
                                'row_value' => $rowVal,
                                'notes' => $rowNotes,
                            ];
                            $compTotalCarats += $cts;
                            $compTotalStones += $stones;
                            $compTotalAmount += $rowVal;

                            if (!empty($st)) {
                                $stampNames[] = $st;
                                if (!\App\Models\Stamp::whereRaw('LOWER(name) = ?', [strtolower($st)])->exists()) {
                                    try {
                                        $applicableFor = (stripos($catName, 'stone') !== false) ? 'Stone' : 'Diamond';
                                        $code = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $st), 0, 10)) ?: ($applicableFor === 'Stone' ? 'STN' : 'DIA');
                                        $maxOrder = \App\Models\Stamp::max('sort_order') ?? 0;
                                        \App\Models\Stamp::create([
                                            'name' => $st,
                                            'code' => $code,
                                            'applicable_for' => $applicableFor,
                                            'sort_order' => $maxOrder + 1,
                                            'description' => "Auto-registered from {$applicableFor} purchase entry",
                                        ]);
                                        \Illuminate\Support\Facades\Cache::flush();
                                    } catch (\Throwable $e) {}
                                }
                            }
                        }
                    }
                }

                if ($isDiamond && count($cleanedComponents) > 0) {
                    $validated['components'] = $cleanedComponents;
                    $validated['weight'] = round($compTotalCarats, 3);
                    $validated['net_weight'] = round($compTotalCarats, 3);
                    $validated['less_weight'] = 0.0;
                    $validated['count_qty'] = $compTotalStones;
                    $validated['qty'] = $compTotalStones > 0 ? $compTotalStones : 1;
                    if ($compTotalAmount > 0) {
                        if ($compTotalCarats > 0 && (empty($validated['rate']) || floatval($validated['rate']) <= 0)) {
                            $validated['rate'] = round($compTotalAmount / $compTotalCarats, 2);
                        }
                    }
                    $uniqueStampsList = array_values(array_unique(array_filter($stampNames)));
                    if (count($uniqueStampsList) > 0) {
                        $validated['stamp'] = implode(', ', $uniqueStampsList);
                        $validated['diamond_stamp'] = $validated['stamp'];
                        $validated['purity'] = $validated['stamp'];
                    }
                } elseif (!empty($cleanedComponents)) {
                    $validated['components'] = $cleanedComponents;
                }

                if (!$isDiamond || empty($validated['stamp'])) {
                    $stampVal = trim((string)($request->input('stamp', $request->input('diamond_stamp', $request->input('color_stone_stamp', '')))));
                    if (!empty($stampVal)) {
                        $validated['stamp'] = $stampVal;
                        if ($isDiamond) {
                            $validated['diamond_stamp'] = $stampVal;
                            if (empty($validated['purity'])) {
                                $validated['purity'] = $stampVal;
                            }
                        } elseif ($isStone) {
                            $validated['color_stone_stamp'] = $stampVal;
                            if (empty($validated['purity'])) {
                                $validated['purity'] = $stampVal;
                            }
                        }

                        // Auto-register any new Stamp in Master table if it doesn't already exist
                        if (!\App\Models\Stamp::whereRaw('LOWER(name) = ?', [strtolower($stampVal)])->exists()) {
                            try {
                                $applicableFor = $isDiamond ? 'Diamond' : ($isStone ? 'Stone' : 'All');
                                $code = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $stampVal), 0, 10)) ?: 'STAMP';
                                $maxOrder = \App\Models\Stamp::max('sort_order') ?? 0;
                                \App\Models\Stamp::create([
                                    'name' => $stampVal,
                                    'code' => $code,
                                    'applicable_for' => $applicableFor,
                                    'sort_order' => $maxOrder + 1,
                                    'description' => "Auto-registered from {$applicableFor} purchase entry",
                                ]);
                                \Illuminate\Support\Facades\Cache::flush();
                            } catch (\Throwable $e) {
                                \Illuminate\Support\Facades\Log::warning("Could not auto-create stamp: " . $e->getMessage());
                            }
                        }
                    }
                }

                $weight = floatval($validated['weight'] ?? 0);
                $lessWeight = floatval($validated['less_weight'] ?? 0);
                // For Diamonds and Stones in Carats (ct), less weight is already in ct
                $lessWeightGrams = ($isDiamond || $isStone) ? $lessWeight : ($lessWeight * 0.2);
                $netWeight = isset($validated['net_weight']) && floatval($validated['net_weight']) > 0
                    ? floatval($validated['net_weight'])
                    : max(0, $weight - $lessWeightGrams);

                $touch = ($isDiamond || $isStone) ? 100.0 : floatval($validated['touch'] ?? 100);
                $wastage = ($isDiamond || $isStone) ? 0.0 : floatval($validated['wastage_percent'] ?? 0);
                $effectiveTouch = ($isDiamond || $isStone) ? 100.0 : ($touch + $wastage);

                // Fine Weight: For diamonds and stones, fine weight in carats/units is net weight. For gold/metal, convert to 24K pure gold equivalent.
                $baseWeight = $netWeight > 0 ? $netWeight : $weight;
                $purityInput = $validated['purity'] ?? $validated['gold_karat'] ?? null;
                if ($isDiamond || $isStone) {
                    $fineWeight = $baseWeight;
                } elseif ($metalTypeRaw === 'silver') {
                    $fineWeight = ($touch > 0 && $touch < 100) ? round($baseWeight * ($touch / 100.0), 3) : $baseWeight;
                } else {
                    $fineWeight = \App\Helpers\GoldConversionHelper::convertTo24kPureWeight(
                        $baseWeight,
                        $purityInput,
                        $touch,
                        $wastage
                    );
                }
                if (!($isDiamond || $isStone) && $metalTypeRaw !== 'silver' && isset($validated['fine_weight']) && floatval($validated['fine_weight']) > 0) {
                    $purityStr = strtoupper(trim((string)$purityInput));
                    if (!preg_match('/(24|22|20|18|14|10)\s*K/i', $purityStr) && !in_array($purityStr, ['24', '22', '18', '14'])) {
                        $fineWeight = floatval($validated['fine_weight']);
                    }
                }

                $rate = floatval($validated['rate'] ?? 0);
                $qty = intval($validated['qty'] ?? 1);
                $qty = $qty > 0 ? $qty : 1;
                $countQty = floatval($validated['count_qty'] ?? 0);
                if ($countQty <= 0 && $qty > 0) {
                    $countQty = floatval($qty);
                }

                // Base calculation
                if ($isDiamond && $compTotalAmount > 0) {
                    $baseAmount = $compTotalAmount;
                } elseif ($netWeight > 0 && $rate > 0) {
                    $baseAmount = $netWeight * $rate;
                } elseif ($qty > 0 && $rate > 0) {
                    $baseAmount = $qty * $rate;
                } else {
                    $baseAmount = floatval($validated['total_amount'] ?? 0);
                }

                $stoneWeight = isset($validated['stone_weight']) && $validated['stone_weight'] !== null && $validated['stone_weight'] !== ''
                    ? floatval($validated['stone_weight'])
                    : 0.0;
                $makingCharge = isset($validated['making_charge']) && $validated['making_charge'] !== null && $validated['making_charge'] !== ''
                    ? floatval($validated['making_charge'])
                    : 0.0;
                $stoneCost = isset($validated['stone_cost']) && $validated['stone_cost'] !== null && $validated['stone_cost'] !== ''
                    ? floatval($validated['stone_cost'])
                    : 0.0;

                // Taxes calculation (CGST, SGST, IGST)
                $subtotal = $baseAmount + $makingCharge + $stoneCost;
                $cgstPercent = floatval($validated['cgst_percent'] ?? 0);
                $cgstAmount = isset($validated['cgst_amount']) && floatval($validated['cgst_amount']) > 0
                    ? floatval($validated['cgst_amount'])
                    : ($cgstPercent > 0 ? round(($subtotal * $cgstPercent) / 100, 2) : 0);

                $sgstPercent = floatval($validated['sgst_percent'] ?? 0);
                $sgstAmount = isset($validated['sgst_amount']) && floatval($validated['sgst_amount']) > 0
                    ? floatval($validated['sgst_amount'])
                    : ($sgstPercent > 0 ? round(($subtotal * $sgstPercent) / 100, 2) : 0);

                $igstPercent = floatval($validated['igst_percent'] ?? 0);
                $igstAmount = isset($validated['igst_amount']) && floatval($validated['igst_amount']) > 0
                    ? floatval($validated['igst_amount'])
                    : ($igstPercent > 0 ? round(($subtotal * $igstPercent) / 100, 2) : 0);

                $totalTax = round($cgstAmount + $sgstAmount + $igstAmount, 2);

                $computedGrandTotal = round($subtotal + $totalTax, 2);
                if (isset($validated['total_amount']) && floatval($validated['total_amount']) > 0) {
                    $reqTotal = floatval($validated['total_amount']);
                    // If client submitted grand total that accidentally only matched base row valuation while having making charges or tax, use full computed grand total
                    if (($isDiamond || $purchaseType === 'raw_material') && abs($reqTotal - $baseAmount) < 0.01 && ($makingCharge > 0 || $stoneCost > 0 || $totalTax > 0)) {
                        $totalAmount = $computedGrandTotal;
                    } else {
                        $totalAmount = $reqTotal;
                    }
                } else {
                    $totalAmount = $computedGrandTotal;
                }

                // Credit Days & Due Date calculation
                $creditDays = intval($validated['credit_days'] ?? 0);
                $dueDate = $validated['due_date'] ?? null;
                if ($creditDays > 0 && empty($dueDate) && !empty($validated['purchase_date'])) {
                    $dueDate = date('Y-m-d', strtotime($validated['purchase_date'] . " + {$creditDays} days"));
                }

                // Payment Status & Paid Amount
                $paidAmount = floatval($validated['paid_amount'] ?? 0);
                $paymentStatus = strtolower($validated['payment_status'] ?? 'unpaid');
                if ($paidAmount >= $totalAmount && $totalAmount > 0) {
                    $paymentStatus = 'paid';
                } elseif ($paidAmount > 0 && $paidAmount < $totalAmount) {
                    $paymentStatus = 'partial';
                } elseif ($paidAmount <= 0) {
                    $paymentStatus = 'unpaid';
                }

                $validated['qty'] = $qty;
                $validated['count_qty'] = $countQty;
                $validated['weight'] = $weight;
                $validated['less_weight'] = round($lessWeight, 3);
                $validated['net_weight'] = round($netWeight, 3);
                $validated['stone_weight'] = round($stoneWeight, 3);
                $validated['making_charge'] = round($makingCharge, 2);
                $validated['stone_cost'] = round($stoneCost, 2);
                $validated['touch'] = $touch;
                $validated['wastage_percent'] = round($wastage, 2);
                $validated['fine_weight'] = round($fineWeight, 3);
                $validated['rate'] = $rate;
                $validated['cgst_percent'] = $cgstPercent;
                $validated['cgst_amount'] = $cgstAmount;
                $validated['sgst_percent'] = $sgstPercent;
                $validated['sgst_amount'] = $sgstAmount;
                $validated['igst_percent'] = $igstPercent;
                $validated['igst_amount'] = $igstAmount;
                $validated['total_tax_amount'] = $totalTax;
                $validated['credit_days'] = $creditDays;
                $validated['due_date'] = $dueDate;
                $validated['payment_status'] = $paymentStatus;
                $validated['paid_amount'] = round($paidAmount, 2);
                $validated['total_amount'] = round($totalAmount, 2);

                $product = null;
                $updatedRawMat = null;
                $isNewProduct = !empty($request->input('is_new_product')) || ($purchaseType === 'finished_product' && empty($validated['product_id']));

                if ($purchaseType === 'finished_product') {
                    $designNo = !empty($validated['design_no']) ? trim($validated['design_no']) : null;
                    $diaWtVal = floatval($validated['diamond_weight'] ?? 0);
                    $diaCountVal = intval($validated['diamond_count'] ?? 0);
                    $stoneWtVal = floatval($validated['color_stone_weight'] ?? $validated['stone_weight'] ?? 0);
                    $stoneCountVal = intval($validated['color_stone_count'] ?? 0);

                    // Build standard components array for diamonds & color stones
                    $components = !empty($cleanedComponents) ? $cleanedComponents : [];
                    if (empty($components)) {
                        if ($diaWtVal > 0 || $diaCountVal > 0) {
                            $diaStampVal = trim((string)($validated['diamond_stamp'] ?? ''));
                            if (!empty($diaStampVal) && !\App\Models\Stamp::whereRaw('LOWER(name) = ?', [strtolower($diaStampVal)])->exists()) {
                                try {
                                    $code = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $diaStampVal), 0, 10)) ?: 'DIA';
                                    $maxOrder = \App\Models\Stamp::max('sort_order') ?? 0;
                                    \App\Models\Stamp::create([
                                        'name' => $diaStampVal,
                                        'code' => $code,
                                        'applicable_for' => 'Diamond',
                                        'sort_order' => $maxOrder + 1,
                                        'description' => "Auto-registered from finished product diamond purchase",
                                    ]);
                                    \Illuminate\Support\Facades\Cache::flush();
                                } catch (\Throwable $e) {}
                            }

                            $components[] = [
                                'category_name' => 'Diamond',
                                'item_name' => 'Diamond',
                                'gross_wt' => $diaWtVal,
                                'no_of_pieces' => $diaCountVal,
                                'stamp' => $validated['diamond_stamp'] ?? null,
                                'clarity' => $validated['diamond_clarity'] ?? null,
                                'color' => $validated['diamond_color'] ?? null,
                            ];
                        }
                        if ($stoneWtVal > 0 || $stoneCountVal > 0) {
                            $stoneStampVal = trim((string)($validated['color_stone_stamp'] ?? ''));
                            if (!empty($stoneStampVal) && !\App\Models\Stamp::whereRaw('LOWER(name) = ?', [strtolower($stoneStampVal)])->exists()) {
                                try {
                                    $code = strtoupper(substr(preg_replace('/[^a-zA-Z0-9]/', '', $stoneStampVal), 0, 10)) ?: 'STONE';
                                    $maxOrder = \App\Models\Stamp::max('sort_order') ?? 0;
                                    \App\Models\Stamp::create([
                                        'name' => $stoneStampVal,
                                        'code' => $code,
                                        'applicable_for' => 'Stone',
                                        'sort_order' => $maxOrder + 1,
                                        'description' => "Auto-registered from finished product stone purchase",
                                    ]);
                                    \Illuminate\Support\Facades\Cache::flush();
                                } catch (\Throwable $e) {}
                            }

                            $components[] = [
                                'category_name' => 'Color Stone',
                                'item_name' => $validated['color_stone_stamp'] ?: 'Color Stone',
                                'gross_wt' => $stoneWtVal,
                                'no_of_pieces' => $stoneCountVal,
                                'stamp' => $validated['color_stone_stamp'] ?? null,
                            ];
                        }
                    }

                    $karatVal = $validated['gold_karat'] ?? '22K';
                    $stampVal = $validated['gold_stamp'] ?? '916';
                    $purityVal = !empty($validated['purity']) ? $validated['purity'] : "{$karatVal} ({$stampVal})";

                    if ($isNewProduct) {
                        // Create a NEW Finished Jewellery Product directly from Purchase Entry
                        $itemName = !empty($validated['item_name']) ? $validated['item_name'] : 'Purchased Jewellery ' . date('dM-Y');
                        $productCode = !empty($validated['product_code']) ? strtoupper(trim($validated['product_code'])) : ($designNo ? $designNo : 'RJ-PUR-' . strtoupper(Str::random(6)));

                        // Ensure SKU uniqueness
                        $uniqueCode = $productCode;
                        $counter = 1;
                        while (Product::where('product_code', $uniqueCode)->exists()) {
                            $uniqueCode = $productCode . '-' . $counter;
                            $counter++;
                        }

                        $product = Product::create([
                            'name' => $itemName,
                            'product_code' => $uniqueCode,
                            'design_no' => $designNo ?: $uniqueCode,
                            'category_id' => $validated['category_id'] ?? null,
                            'subcategory_id' => $validated['subcategory_id'] ?? null,
                            'opening_stock_qty' => $qty,
                            'current_stock_qty' => $qty,
                            'opening_stock_weight' => round($netWeight > 0 ? $netWeight : $weight, 3),
                            'opening_touch' => $touch,
                            'opening_fine_weight' => round($fineWeight, 3),
                            'opening_stock_rate' => $rate,
                            'opening_stock_date' => $validated['purchase_date'],
                            'image' => $imagePath,
                            'status' => 'active',
                            'attributes' => [
                                'design_no' => $designNo ?: $uniqueCode,
                                'purity' => $purityVal,
                                'gold_purity' => $purityVal,
                                'karat' => $karatVal,
                                'gold_karat' => $karatVal,
                                'stamp' => $stampVal,
                                'gold_stamp' => $stampVal,
                                'metal_type' => $validated['metal_type'] ?? 'gold',
                                'gross_wt' => $weight,
                                'gross_weight' => $weight,
                                'less_weight' => $lessWeight,
                                'net_wt' => $netWeight > 0 ? $netWeight : $weight,
                                'net_weight' => $netWeight > 0 ? $netWeight : $weight,
                                'gold_weight' => $netWeight > 0 ? $netWeight : $weight,
                                'making_charge' => floatval($validated['making_charge'] ?? 0),
                                'dia_wt_ct' => $diaWtVal,
                                'diamond_wt' => $diaWtVal,
                                'diamond_weight' => $diaWtVal,
                                'diamond_count' => $diaCountVal,
                                'no_of_diamonds' => $diaCountVal,
                                'diamond_stamp' => $validated['diamond_stamp'] ?? null,
                                'diamond_clarity' => $validated['diamond_clarity'] ?? null,
                                'diamond_color' => $validated['diamond_color'] ?? null,
                                'stone_weight' => $stoneWtVal,
                                'color_stone_weight' => $stoneWtVal,
                                'stone_count' => $stoneCountVal,
                                'color_stone_count' => $stoneCountVal,
                                'color_stone_stamp' => $validated['color_stone_stamp'] ?? null,
                                'setting_style' => $validated['setting_type'] ?? 'Prong',
                                'setting_type' => $validated['setting_type'] ?? 'Prong',
                                'stone_cost' => floatval($validated['stone_cost'] ?? 0),
                                'purchase_rate' => $rate,
                                'supplier_id' => $validated['supplier_id'],
                                'components' => $components,
                                'is_inventory' => true,
                                'source' => 'purchase_entry',
                            ]
                        ]);

                        $validated['product_id'] = $product->id;

                        // Also sync to product_designs so Work Orders find it authoritative
                        if (!empty($designNo)) {
                            try {
                                \App\Models\ProductDesign::updateOrCreate(
                                    ['design_no' => $designNo],
                                    [
                                        'category' => $product->category?->name ?? 'Jewellery',
                                        'dia_wt_ct' => $diaWtVal,
                                        'net_wt' => $netWeight > 0 ? $netWeight : $weight,
                                        'purity' => $purityVal,
                                        'setting_style' => $validated['setting_type'] ?? 'Prong',
                                        'stamp' => $stampVal,
                                        'image_path' => $imagePath ? [$imagePath] : [],
                                        'status' => 'active',
                                    ]
                                );
                            } catch (\Throwable $e) {
                                // Silently log if product_designs table format differs
                            }
                        }
                    } elseif (!empty($validated['product_id'])) {
                        // Update existing product in finished stock
                        $product = Product::findOrFail($validated['product_id']);
                        $currentWeight = floatval($product->opening_stock_weight ?? 0);
                        $addWeight = $netWeight > 0 ? $netWeight : $weight;
                        $product->opening_stock_weight = round($currentWeight + $addWeight, 3);
                        $product->current_stock_qty = intval($product->current_stock_qty ?? 0) + $qty;

                        if ($touch > 0) {
                            $product->opening_touch = $touch;
                        }
                        if ($fineWeight > 0) {
                            $currentFineWeight = floatval($product->opening_fine_weight ?? 0);
                            $product->opening_fine_weight = round($currentFineWeight + $fineWeight, 3);
                        }
                        if ($rate > 0) {
                            $product->opening_stock_rate = $rate;
                        }
                        if (!empty($validated['purchase_date'])) {
                            $product->opening_stock_date = $validated['purchase_date'];
                        }
                        if ($imagePath && empty($product->image)) {
                            $product->image = $imagePath;
                        }
                        if (!empty($designNo) && empty($product->design_no)) {
                            $product->design_no = $designNo;
                        }
                        if (!empty($validated['subcategory_id']) && empty($product->subcategory_id)) {
                            $product->subcategory_id = $validated['subcategory_id'];
                        }

                        // Merge into attributes JSON
                        $curAttrs = is_array($product->attributes) ? $product->attributes : [];
                        if (!empty($designNo)) $curAttrs['design_no'] = $designNo;
                        if ($diaWtVal > 0) {
                            $curAttrs['dia_wt_ct'] = $diaWtVal;
                            $curAttrs['diamond_weight'] = $diaWtVal;
                        }
                        if ($diaCountVal > 0) {
                            $curAttrs['diamond_count'] = $diaCountVal;
                            $curAttrs['no_of_diamonds'] = $diaCountVal;
                        }
                        if (!empty($validated['diamond_stamp'])) $curAttrs['diamond_stamp'] = $validated['diamond_stamp'];
                        if (!empty($validated['diamond_clarity'])) $curAttrs['diamond_clarity'] = $validated['diamond_clarity'];
                        if (!empty($validated['diamond_color'])) $curAttrs['diamond_color'] = $validated['diamond_color'];
                        if ($stoneWtVal > 0) $curAttrs['stone_weight'] = $stoneWtVal;
                        if ($stoneCountVal > 0) $curAttrs['stone_count'] = $stoneCountVal;
                        if (!empty($validated['color_stone_stamp'])) $curAttrs['color_stone_stamp'] = $validated['color_stone_stamp'];
                        if (!empty($validated['setting_type'])) $curAttrs['setting_style'] = $validated['setting_type'];
                        if (!empty($validated['gold_karat'])) $curAttrs['karat'] = $validated['gold_karat'];
                        if (!empty($validated['gold_stamp'])) $curAttrs['stamp'] = $validated['gold_stamp'];
                        $curAttrs['net_wt'] = $product->opening_stock_weight;
                        $curAttrs['gross_wt'] = $product->opening_stock_weight;
                        $curAttrs['components'] = $components;
                        $product->attributes = $curAttrs;
                        $product->save();
                    }

                    // Create individual piece tags in WorkOrderReceivedPiece for full Inventory parity
                    $productTags = [];
                    for ($i = 0; $i < $qty; $i++) {
                        $codeBase = !empty($product->product_code) ? $product->product_code : ($product->design_no ?: 'RJ-JW');
                        $tagCode = $codeBase . ($qty > 1 ? '-' . ($i + 1) : '');
                        $tagNumber = $tagCode;
                        $tCounter = 1;
                        while (\App\Models\WorkOrderReceivedPiece::where('tag_number', $tagNumber)->exists()) {
                            $tagNumber = $tagCode . '-T' . $tCounter;
                            $tCounter++;
                        }
                        $productTags[] = $tagNumber;

                        $rwoCode = ($validated['purchase_no'] ?? ('PUR-' . date('Ymd'))) . ($qty > 1 ? '-P' . ($i + 1) : '');
                        $rwoNumber = $rwoCode;
                        $rCounter = 1;
                        while (\App\Models\WorkOrderReceivedPiece::where('receive_order_number', $rwoNumber)->exists()) {
                            $rwoNumber = $rwoCode . '-' . $rCounter;
                            $rCounter++;
                        }

                        \App\Models\WorkOrderReceivedPiece::create([
                            'product_id' => $product->id,
                            'piece_number' => $i + 1,
                            'tag_number' => $tagNumber,
                            'design_no' => $product->design_no ?: $product->product_code,
                            'product_name' => $product->name,
                            'receive_order_number' => $rwoNumber,
                            'gross_weight' => round($weight / $qty, 3),
                            'net_gold_weight' => round(($netWeight > 0 ? $netWeight : $weight) / $qty, 3),
                            'pure_24k_weight' => round($fineWeight / $qty, 3),
                            'gold_karat' => $karatVal,
                            'purity' => is_numeric($purityVal) ? floatval($purityVal) : ($touch > 0 ? $touch : 91.60),
                            'diamond_weight' => round($diaWtVal / $qty, 3),
                            'diamond_count' => intval(ceil($diaCountVal / $qty)),
                            'diamond_details' => $validated['diamond_stamp'] ?? null,
                            'color_stone_weight' => round($stoneWtVal / $qty, 3),
                            'color_stone_count' => intval(ceil($stoneCountVal / $qty)),
                            'making_charge_type' => $request->input('making_charge_type', 'total'),
                            'making_charge_per_gram' => floatval($request->input('making_charge_rate', 0)),
                            'total_making_charge' => round($makingCharge / $qty, 2),
                            'purchase_value' => round($totalAmount / $qty, 2),
                            'components' => $components,
                            'huid' => 'H-' . str_pad($product->id, 6, '0', STR_PAD_LEFT),
                            'status' => 'in_stock',
                            'is_inventory_posted' => true,
                            'received_at' => !empty($validated['purchase_date']) ? \Carbon\Carbon::parse($validated['purchase_date']) : now(),
                            'image_path' => $imagePath,
                        ]);
                    }

                    $curAttrs = is_array($product->attributes) ? $product->attributes : [];
                    $curAttrs['tags'] = array_values(array_unique(array_merge($curAttrs['tags'] ?? [], $productTags)));
                    $product->attributes = $curAttrs;
                    $product->save();
                } else {
                    // Update Raw Material Vault Inventory for raw material purchase
                    $rawMatId = $validated['raw_material_id'] ?? null;
                    $matType = strtolower($validated['metal_type'] ?? 'gold');
                    // For gold bullion, inventory is tracked in 24K Pure Fine Weight
                    $creditWeight = ($matType === 'gold' || $matType === 'metal' || empty($matType)) && $fineWeight > 0
                        ? $fineWeight
                        : ($netWeight > 0 ? $netWeight : $weight);
                    $purchaseUnit = $validated['unit'] ?? null;

                    if ($isDiamond || $matType === 'diamond') {
                        $canonicalDia = \App\Models\RawMaterial::where('material_type', 'diamond')->first();
                        if ($canonicalDia) {
                            $rawMatId = $canonicalDia->id;
                        }
                    }

                    $updatedRawMat = \App\Models\RawMaterial::creditPurchase(
                        $rawMatId ?: $matType,
                        $creditWeight,
                        $countQty,
                        $purchaseUnit
                    );

                    if ($updatedRawMat) {
                        $validated['raw_material_id'] = $updatedRawMat->id;
                        if (empty($validated['metal_type'])) {
                            $validated['metal_type'] = $updatedRawMat->material_type;
                        }
                        if (empty($validated['unit'])) {
                            $validated['unit'] = $updatedRawMat->unit;
                        }
                    }
                }

                // Update Supplier Ledger (Metal Ledger vs Cash Ledger)
                if (!empty($validated['supplier_id'])) {
                    $supplier = \App\Models\Supplier::find($validated['supplier_id']);
                    if ($supplier) {
                        $matType = strtolower($validated['metal_type'] ?? 'gold');
                        if ($rate <= 0) {
                            // Unfixed / Unpriced Bullion Purchase: Metal payable to supplier in pure 24K fine weight
                            // Negative balance indicates payable to supplier (credit)
                            $purePayable = $fineWeight > 0 ? $fineWeight : ($netWeight > 0 ? $netWeight : $weight);
                            if ($matType === 'gold' || $matType === 'metal' || empty($matType)) {
                                $supplier->gold_balance_grams = round((float) $supplier->gold_balance_grams - $purePayable, 3);
                            } elseif ($matType === 'silver') {
                                $supplier->silver_balance_grams = round((float) $supplier->silver_balance_grams - $purePayable, 3);
                            }
                            $supplier->save();
                        } else {
                            // Priced purchase: Cash payable balance
                            $unpaidCash = max(0, $totalAmount - $paidAmount);
                            if ($unpaidCash > 0) {
                                $supplier->current_balance = round((float) $supplier->current_balance - $unpaidCash, 2);
                                $supplier->save();
                            }
                        }
                    }
                }

                // Create Purchase Entry record
                $purchaseEntry = PurchaseEntry::create($validated);
                $purchaseEntry->load(['supplier', 'category', 'product.category', 'product.subcategory', 'rawMaterial']);

                // Record InventoryMovement
                if ($purchaseType === 'finished_product' && $product) {
                    \App\Models\InventoryMovement::create([
                        'product_id' => $product->id,
                        'purchase_entry_id' => $purchaseEntry->id,
                        'movement_type' => 'purchase',
                        'quantity' => $qty,
                        'weight' => $netWeight > 0 ? $netWeight : $weight,
                        'unit_cost' => $rate,
                        'notes' => "Finished product purchase entry {$purchaseEntry->purchase_no}",
                        'created_by' => auth()->id() ?? null,
                    ]);
                } elseif ($updatedRawMat) {
                    \App\Models\InventoryMovement::create([
                        'raw_material_id' => $updatedRawMat->id,
                        'purchase_entry_id' => $purchaseEntry->id,
                        'movement_type' => 'purchase',
                        'quantity' => $countQty > 0 ? $countQty : $qty,
                        'weight' => $creditWeight,
                        'unit_cost' => $rate,
                        'notes' => "Raw material purchase entry {$purchaseEntry->purchase_no} ({$updatedRawMat->name})" . ($rate <= 0 ? " [Unfixed Rate - Fine Wt: {$creditWeight}g]" : ""),
                        'created_by' => auth()->id() ?? null,
                    ]);
                }

                NotificationService::notifyPurchaseCreated(
                    $purchaseEntry->id,
                    $purchaseEntry->purchase_no,
                    $purchaseEntry->supplier?->name ?? 'Supplier',
                    (float) ($purchaseEntry->total_amount ?? 0),
                    auth()->id()
                );

                return response()->json([
                    'status' => 'success',
                    'message' => 'Purchase entry recorded & inventory updated successfully!',
                    'purchase_entry' => $purchaseEntry,
                    'updated_product' => $product,
                    'updated_raw_material' => $updatedRawMat
                ], 201);
            });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to save purchase entry: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to save purchase entry (500). Please try again later.'], 500);
        }
    }

    public function show($id)
    {
        $entry = PurchaseEntry::with(['supplier', 'category', 'product.category', 'product.subcategory', 'rawMaterial'])->find($id);
        if (!$entry) {
            return response()->json(['message' => 'Purchase entry not found'], 404);
        }
        $data = $entry->toArray();
        $data['purchase_entry'] = $entry;
        return response()->json($data);
    }

    public function destroy($id)
    {
        try {
            return DB::transaction(function () use ($id) {
                $entry = PurchaseEntry::find($id);
                if (!$entry) {
                    return response()->json(['message' => 'Purchase entry not found'], 404);
                }

                if ($entry->purchase_type === 'finished_product' && $entry->product_id) {
                    $product = Product::find($entry->product_id);
                    if ($product) {
                        $deductWeight = floatval($entry->net_weight) > 0 ? floatval($entry->net_weight) : floatval($entry->weight);
                        $currentWeight = floatval($product->opening_stock_weight ?? 0);
                        $product->opening_stock_weight = max(0, round($currentWeight - $deductWeight, 3));
                        
                        $currentFineWt = floatval($product->opening_fine_weight ?? 0);
                        $product->opening_fine_weight = max(0, round($currentFineWt - floatval($entry->fine_weight), 3));

                        $newQty = max(0, intval($product->current_stock_qty ?? 0) - intval($entry->qty));
                        $product->current_stock_qty = $newQty;
                        $product->save();
                    }
                } else {
                    $matType = strtolower($entry->metal_type ?? 'gold');
                    $deductWeight = ($matType === 'gold' || $matType === 'metal' || empty($matType)) && floatval($entry->fine_weight) > 0
                        ? floatval($entry->fine_weight)
                        : (floatval($entry->net_weight) > 0 ? floatval($entry->net_weight) : floatval($entry->weight));
                    $deductCount = floatval($entry->count_qty ?? 0);
                    $rawMatRef = $entry->raw_material_id ?: strtolower($entry->metal_type ?? 'gold');
                    \App\Models\RawMaterial::debitPurchaseReversal($rawMatRef, $deductWeight, $deductCount, $entry->unit);
                }

                // Reverse Supplier Balance (Metal or Cash)
                if (!empty($entry->supplier_id)) {
                    $supplier = \App\Models\Supplier::find($entry->supplier_id);
                    if ($supplier) {
                        $rate = floatval($entry->rate ?? 0);
                        $matType = strtolower($entry->metal_type ?? 'gold');
                        $fineWt = floatval($entry->fine_weight ?? 0) > 0
                            ? floatval($entry->fine_weight)
                            : (floatval($entry->net_weight) > 0 ? floatval($entry->net_weight) : floatval($entry->weight));

                        if ($rate <= 0) {
                            if ($matType === 'gold' || $matType === 'metal' || empty($matType)) {
                                $supplier->gold_balance_grams = round((float) $supplier->gold_balance_grams + $fineWt, 3);
                            } elseif ($matType === 'silver') {
                                $supplier->silver_balance_grams = round((float) $supplier->silver_balance_grams + $fineWt, 3);
                            }
                            $supplier->save();
                        } else {
                            $unpaidCash = max(0, floatval($entry->total_amount) - floatval($entry->paid_amount));
                            if ($unpaidCash > 0) {
                                $supplier->current_balance = round((float) $supplier->current_balance + $unpaidCash, 2);
                                $supplier->save();
                            }
                        }
                    }
                }

                // Delete associated Inventory Movements & Settlements
                \App\Models\InventoryMovement::where('purchase_entry_id', $entry->id)->delete();
                \App\Models\SupplierSettlement::where('purchase_entry_id', $entry->id)->delete();
                \Illuminate\Support\Facades\Cache::forget('masters_suppliers_all');

                $entry->delete();

                return response()->json([
                    'status' => 'success',
                    'message' => 'Purchase entry deleted and inventory reversed successfully.'
                ]);
            });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error deleting purchase entry: ' . $e->getMessage());
            return response()->json(['message' => 'Unable to delete purchase entry (500). Please try again later.'], 500);
        }
    }

    /**
     * Update payment status and paid amount for a purchase entry.
     */
    public function updatePaymentStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'payment_status' => 'required|string|in:unpaid,partial,paid,fully paid',
            'paid_amount' => 'required|numeric|min:0',
        ]);

        try {
            $entry = PurchaseEntry::with('supplier')->findOrFail($id);
            $totalAmount = floatval($entry->total_amount ?? 0);
            $oldPaid = floatval($entry->paid_amount ?? 0);
            $paidAmount = floatval($validated['paid_amount']);
            $status = strtolower($validated['payment_status']);

            if ($paidAmount >= $totalAmount && $totalAmount > 0) {
                $status = 'paid';
            } elseif ($paidAmount > 0 && $paidAmount < $totalAmount) {
                $status = 'partial';
            } elseif ($paidAmount <= 0) {
                $status = 'unpaid';
            }

            $deltaPaid = round($paidAmount - $oldPaid, 2);
            if ($deltaPaid != 0 && $entry->supplier_id) {
                $supplier = \App\Models\Supplier::find($entry->supplier_id);
                if ($supplier) {
                    $supplier->current_balance = round((float) $supplier->current_balance + $deltaPaid, 2);
                    $supplier->save();
                    \Illuminate\Support\Facades\Cache::forget('masters_suppliers_all');
                }

                if ($deltaPaid > 0) {
                    \App\Models\SupplierSettlement::create([
                        'supplier_id' => $entry->supplier_id,
                        'purchase_entry_id' => $entry->id,
                        'settlement_type' => 'cash',
                        'amount' => $deltaPaid,
                        'payment_mode' => 'cash',
                        'settlement_date' => now()->toDateString(),
                        'notes' => "Payment update on purchase {$entry->purchase_no}",
                        'created_by' => auth()->id() ?? null,
                    ]);
                }
            }

            $entry->paid_amount = round($paidAmount, 2);
            $entry->payment_status = $status;
            $entry->save();

            $remainingBalance = max(0, round($totalAmount - $paidAmount, 2));

            // Dispatch notification
            NotificationService::notifyPurchasePaymentStatusChanged(
                $entry->id,
                $entry->purchase_no,
                $entry->supplier?->name ?? 'Supplier',
                $status,
                $paidAmount,
                $remainingBalance,
                auth()->id()
            );

            return response()->json([
                'status' => 'success',
                'message' => "Payment status updated to {$status} successfully.",
                'purchase_entry' => $entry,
                'remaining_balance' => $remainingBalance,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error updating purchase payment status: ' . $e->getMessage());
            return response()->json(['message' => 'Unable to connect to the server. Please try again later.'], 500);
        }
    }

    /**
     * Check upcoming and overdue credit purchase due dates and trigger reminders.
     */
    public function dueReminders(Request $request)
    {
        try {
            $today = \Carbon\Carbon::today();
            $unpaidEntries = PurchaseEntry::with('supplier')
                ->where('payment_status', '!=', 'paid')
                ->whereNotNull('due_date')
                ->get();

            $reminded = [];

            foreach ($unpaidEntries as $entry) {
                $dueDate = \Carbon\Carbon::parse($entry->due_date)->startOfDay();
                $diffDays = $today->diffInDays($dueDate, false); // Negative if overdue

                $totalAmount = floatval($entry->total_amount ?? 0);
                $paidAmount = floatval($entry->paid_amount ?? 0);
                $balance = max(0, $totalAmount - $paidAmount);

                if ($balance <= 0) {
                    $entry->payment_status = 'paid';
                    $entry->save();
                    continue;
                }

                // Notify if exactly 7 days before, 2 days before, or on/after due date (0 or negative)
                if ($diffDays === 7 || $diffDays === 2 || $diffDays <= 0) {
                    NotificationService::notifyPurchaseDueReminder(
                        $entry->id,
                        $entry->purchase_no,
                        $entry->supplier?->name ?? 'Supplier',
                        $balance,
                        intval($diffDays),
                        $dueDate->toDateString()
                    );

                    $reminded[] = [
                        'purchase_id' => $entry->id,
                        'purchase_no' => $entry->purchase_no,
                        'supplier' => $entry->supplier?->name ?? 'Supplier',
                        'days_remaining' => $diffDays,
                        'due_date' => $dueDate->toDateString(),
                        'balance' => $balance,
                    ];
                }
            }

            return response()->json([
                'status' => 'success',
                'count' => count($reminded),
                'reminded' => $reminded,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error in purchase due reminders: ' . $e->getMessage());
            return response()->json(['message' => 'Error checking due reminders'], 500);
        }
    }

    /**
     * Convert payment mode for a purchase entry.
     * E.g. Convert unpriced gold payable to monetary payable (Fix Rate) or vice versa.
     * Synchronizes supplier balances and records audit settlement.
     */
    public function convertPaymentMode(Request $request, $id)
    {
        $purchase = PurchaseEntry::with('supplier')->findOrFail($id);

        $validated = $request->validate([
            'target_mode' => 'required|string|in:monetary,gold,priced_money',
            'rate' => 'nullable|numeric|min:0',
            'calculation_basis' => 'nullable|string|in:net_weight,fine_weight,custom',
            'total_amount' => 'nullable|numeric|min:0',
            'paid_amount' => 'nullable|numeric|min:0',
            'payment_status' => 'nullable|string|in:unpaid,partial,paid,gold_payable',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($validated['target_mode'] === 'priced_money') {
            $validated['target_mode'] = 'monetary';
        }

        try {
            return \Illuminate\Support\Facades\DB::transaction(function () use ($purchase, $validated, $request) {
                $targetMode = $validated['target_mode'];
                $supplier = $purchase->supplier;
                $notes = $validated['notes'] ?? null;

                $weight = (float) $purchase->weight;
                $netWeight = (float) ($purchase->total_net_weight ?? $purchase->net_weight ?? $weight);
                $fineWeight = (float) ($purchase->fine_weight ?: $purchase->fine_weight_24k ?: $weight);
                $matType = strtolower($purchase->metal_type ?? 'gold');

                $wasUnpriced = (float) ($purchase->rate ?? 0) <= 0;

                if ($targetMode === 'monetary') {
                    $rate = round(floatval($validated['rate'] ?? 0), 2);
                    if ($rate <= 0) {
                        return response()->json(['message' => 'Rate per gram must be greater than zero when converting to money payable.'], 422);
                    }

                    $basis = $validated['calculation_basis'] ?? 'net_weight';
                    $calcWeight = match ($basis) {
                        'fine_weight' => $fineWeight,
                        default => $netWeight,
                    };

                    $totalAmount = isset($validated['total_amount']) && floatval($validated['total_amount']) > 0
                        ? round(floatval($validated['total_amount']), 2)
                        : round($calcWeight * $rate, 2);

                    $paidAmount = isset($validated['paid_amount']) ? round(floatval($validated['paid_amount']), 2) : (float) ($purchase->paid_amount ?? 0);
                    $paymentStatus = $validated['payment_status'] ?? ($paidAmount >= $totalAmount ? 'paid' : ($paidAmount > 0 ? 'partial' : 'unpaid'));

                    if ($supplier) {
                        if ($wasUnpriced) {
                            // Reverse gold liability on supplier (add back pure gold)
                            if ($matType === 'gold' || $matType === 'metal' || empty($matType)) {
                                $supplier->gold_balance_grams = round((float) $supplier->gold_balance_grams + $fineWeight, 3);
                            } elseif ($matType === 'silver') {
                                $supplier->silver_balance_grams = round((float) $supplier->silver_balance_grams + $fineWeight, 3);
                            }
                        } else {
                            // Reverse old unpaid cash liability
                            $oldUnpaid = max(0, (float) $purchase->total_amount - (float) $purchase->paid_amount);
                            $supplier->current_balance = round((float) $supplier->current_balance + $oldUnpaid, 2);
                        }

                        // Apply new unpaid cash liability
                        $newUnpaid = max(0, $totalAmount - $paidAmount);
                        $supplier->current_balance = round((float) $supplier->current_balance - $newUnpaid, 2);
                        $supplier->save();
                    }

                    // Update purchase entry
                    $purchase->rate = $rate;
                    $purchase->total_amount = $totalAmount;
                    $purchase->paid_amount = $paidAmount;
                    $purchase->payment_status = $paymentStatus;
                    if ($notes) {
                        $purchase->notes = trim(($purchase->notes ? $purchase->notes . "\n" : '') . "[Mode converted to Cash @ ₹" . number_format($rate, 2) . "/g: {$notes}]");
                    }
                    $purchase->save();

                    // Audit settlement
                    if ($supplier) {
                        \App\Models\SupplierSettlement::create([
                            'supplier_id' => $supplier->id,
                            'purchase_entry_id' => $purchase->id,
                            'settlement_type' => 'rate_conversion',
                            'amount' => $totalAmount,
                            'fine_weight' => $fineWeight,
                            'settlement_date' => now()->toDateString(),
                            'notes' => "Rate fixed for purchase {$purchase->purchase_no}: Converted from {$fineWeight}g 24K gold due to monetary payable ₹" . number_format($totalAmount, 2) . " at rate ₹{$rate}/g." . ($notes ? " Notes: {$notes}" : ''),
                            'created_by' => auth()->id() ?? null,
                        ]);
                    }
                } else {
                    // Converting to Gold Payable (Unpriced)
                    if ($supplier && !$wasUnpriced) {
                        // Reverse cash payable liability
                        $oldUnpaid = max(0, (float) $purchase->total_amount - (float) $purchase->paid_amount);
                        $supplier->current_balance = round((float) $supplier->current_balance + $oldUnpaid, 2);

                        // Add gold payable liability
                        if ($matType === 'gold' || $matType === 'metal' || empty($matType)) {
                            $supplier->gold_balance_grams = round((float) $supplier->gold_balance_grams - $fineWeight, 3);
                        } elseif ($matType === 'silver') {
                            $supplier->silver_balance_grams = round((float) $supplier->silver_balance_grams - $fineWeight, 3);
                        }
                        $supplier->save();
                    }

                    $purchase->rate = 0;
                    $purchase->total_amount = 0;
                    $purchase->paid_amount = 0;
                    $purchase->payment_status = 'gold_payable';
                    if ($notes) {
                        $purchase->notes = trim(($purchase->notes ? $purchase->notes . "\n" : '') . "[Mode converted to 24K Gold Payable: {$notes}]");
                    }
                    $purchase->save();

                    if ($supplier) {
                        \App\Models\SupplierSettlement::create([
                            'supplier_id' => $supplier->id,
                            'purchase_entry_id' => $purchase->id,
                            'settlement_type' => 'rate_conversion',
                            'amount' => 0,
                            'fine_weight' => $fineWeight,
                            'settlement_date' => now()->toDateString(),
                            'notes' => "Purchase {$purchase->purchase_no} converted to unpriced 24K pure gold due ({$fineWeight}g)." . ($notes ? " Notes: {$notes}" : ''),
                            'created_by' => auth()->id() ?? null,
                        ]);
                    }
                }

                \Illuminate\Support\Facades\Cache::forget('masters_suppliers_all');

                return response()->json([
                    'status' => 'success',
                    'message' => "Purchase {$purchase->purchase_no} payment mode successfully converted to " . ($targetMode === 'monetary' ? 'Cash/Money' : 'Pure Gold') . "!",
                    'purchase' => $purchase->fresh(['supplier', 'category', 'product', 'rawMaterial']),
                    'supplier' => $supplier ? $supplier->fresh() : null,
                ]);
            });
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error converting purchase payment mode: ' . $e->getMessage());
            return response()->json(['message' => 'Failed to convert payment mode: ' . $e->getMessage()], 500);
        }
    }
}
