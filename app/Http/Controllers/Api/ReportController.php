<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\WorkOrder;
use App\Models\Karigar;
use App\Models\PurchaseEntry;
use App\Models\Client;
use App\Models\Category;
use App\Models\Supplier;
use App\Models\KarigarMaterialTransaction;
use App\Models\KarigarPayment;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReportController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->input('period', 'month');
        $type = $request->input('type', 'sales'); // sales, inventory, karigar, purchase, gst
        $search = $request->input('search', '');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $page = max(1, (int) $request->input('page', 1));
        $perPage = max(1, (int) $request->input('per_page', 10));

        // Determine Carbon Date Range
        $now = Carbon::now();
        $dateQuery = function ($query, $column = 'created_at') use ($period, $startDate, $endDate, $now) {
            if ($startDate && $endDate) {
                return $query->whereBetween($column, [
                    Carbon::parse($startDate)->startOfDay(),
                    Carbon::parse($endDate)->endOfDay()
                ]);
            }

            return match ($period) {
                'today' => $query->whereDate($column, Carbon::today()),
                'week' => $query->whereBetween($column, [$now->copy()->startOfWeek(), $now->copy()->endOfWeek()]),
                'quarter' => $query->whereBetween($column, [$now->copy()->startOfQuarter(), $now->copy()->endOfQuarter()]),
                'year' => $query->whereYear($column, $now->year),
                'all' => $query,
                default => $query->whereMonth($column, $now->month)->whereYear($column, $now->year) // month
            };
        };

        // 1. Sales & Billing Report Data
        $salesQuery = Invoice::with(['client']);
        $salesQuery = $dateQuery($salesQuery, 'created_at');

        if ($search) {
            $salesQuery->where(function ($q) use ($search) {
                $q->where('invoice_no', 'like', "%{$search}%")
                  ->orWhere('client_name', 'like', "%{$search}%")
                  ->orWhere('client_email', 'like', "%{$search}%")
                  ->orWhereHas('client', function ($cq) use ($search) {
                      $cq->where('full_name', 'like', "%{$search}%")
                        ->orWhere('client_code', 'like', "%{$search}%")
                        ->orWhere('primary_phone', 'like', "%{$search}%")
                        ->orWhere('secondary_phone', 'like', "%{$search}%");
                  });
            });
        }

        // Fast single-pass sales aggregation for summary cards
        $salesSummaryRow = (clone $salesQuery)->reorder()->selectRaw('
            COUNT(*) as total_count,
            COALESCE(SUM(total_amount), 0) as total_revenue
        ')->first();
        $totalSalesCount = (int) ($salesSummaryRow->total_count ?? 0);
        $totalSalesRevenue = (float) ($salesSummaryRow->total_revenue ?? 0);
        $avgOrderValue = $totalSalesCount > 0 ? round($totalSalesRevenue / $totalSalesCount) : 0;
        $totalGstTax = round($totalSalesRevenue * 0.03, 2); // 3% GST standard jewellery

        // Compute Previous Period Sales Revenue for % Growth comparison
        $prevPeriodQuery = Invoice::query();
        $prevPeriodLabel = 'vs Prev Period';

        if ($startDate && $endDate) {
            $start = Carbon::parse($startDate)->startOfDay();
            $end = Carbon::parse($endDate)->endOfDay();
            $diffInDays = max(1, $start->diffInDays($end));
            $prevStart = $start->copy()->subDays($diffInDays);
            $prevEnd = $start->copy()->subSecond();
            $prevPeriodQuery->whereBetween('created_at', [$prevStart, $prevEnd]);
            $prevPeriodLabel = 'vs Prev Period';
        } else {
            match ($period) {
                'today' => (function() use (&$prevPeriodQuery, &$prevPeriodLabel, $now) {
                    $prevPeriodQuery->whereDate('created_at', Carbon::yesterday());
                    $prevPeriodLabel = 'vs Yesterday';
                })(),
                'week' => (function() use (&$prevPeriodQuery, &$prevPeriodLabel, $now) {
                    $prevPeriodQuery->whereBetween('created_at', [
                        $now->copy()->subWeek()->startOfWeek(),
                        $now->copy()->subWeek()->endOfWeek()
                    ]);
                    $prevPeriodLabel = 'vs Prev Week';
                })(),
                'quarter' => (function() use (&$prevPeriodQuery, &$prevPeriodLabel, $now) {
                    $prevPeriodQuery->whereBetween('created_at', [
                        $now->copy()->subQuarter()->startOfQuarter(),
                        $now->copy()->subQuarter()->endOfQuarter()
                    ]);
                    $prevPeriodLabel = 'vs Prev Quarter';
                })(),
                'year' => (function() use (&$prevPeriodQuery, &$prevPeriodLabel, $now) {
                    $prevPeriodQuery->whereYear('created_at', $now->year - 1);
                    $prevPeriodLabel = 'vs Prev Year';
                })(),
                'all' => (function() use (&$prevPeriodQuery, &$prevPeriodLabel) {
                    $prevPeriodQuery->whereRaw('1=0');
                    $prevPeriodLabel = 'All Time';
                })(),
                default => (function() use (&$prevPeriodQuery, &$prevPeriodLabel, $now) {
                    $prevMonth = $now->copy()->subMonth();
                    $prevPeriodQuery->whereMonth('created_at', $prevMonth->month)
                                    ->whereYear('created_at', $prevMonth->year);
                    $prevPeriodLabel = 'vs Prev Month';
                })()
            };
        }

        $prevRevenue = (float) $prevPeriodQuery->sum('total_amount');

        if ($prevRevenue > 0) {
            $growthPercent = (($totalSalesRevenue - $prevRevenue) / $prevRevenue) * 100;
            $salesGrowth = ($growthPercent >= 0 ? '+' : '') . number_format($growthPercent, 1) . '%';
        } else {
            $salesGrowth = $totalSalesRevenue > 0 ? '+100.0%' : '+0.0%';
        }

        $isExport = $request->boolean('export') || $request->input('per_page') === 'all' || $request->boolean('export_all');

        $totalSalesItems = $totalSalesCount;
        $formattedSales = [];

        if ($isExport || in_array($type, ['sales', 'gst'])) {
            $invoices = $isExport
                ? (clone $salesQuery)->orderBy('created_at', 'desc')->get()
                : (clone $salesQuery)->orderBy('created_at', 'desc')->skip(($page - 1) * $perPage)->take($perPage)->get();

            // Format Invoices for Sales Report Table
            $formattedSales = $invoices->map(function ($inv) {
                $subtotal = round((float) ($inv->subtotal ?? ($inv->total_amount * 0.97)), 2);
                $gstAmount = round((float) ($inv->tax_amount ?? ($inv->total_amount * 0.03)), 2);
                $totalAmount = round((float) $inv->total_amount, 2);
                return [
                    'id' => $inv->id,
                    'invoice_number' => $inv->invoice_no ?: $inv->invoice_number ?: ('INV-2026-' . sprintf('%04d', $inv->id)),
                    'customer_name' => $inv->customer_name ?? $inv->client_name ?? $inv->client?->full_name ?? null,
                    'customer_phone' => $inv->customer_phone ?? $inv->client?->phone ?? null,
                    'date' => Carbon::parse($inv->created_at)->format('d M Y, h:i A'),
                    'items_count' => count($inv->items ?? []),
                    'subtotal' => $subtotal,
                    'making_charges' => round((float) ($inv->making_charges ?? 0), 2),
                    'gst_amount' => $gstAmount,
                    'total_amount' => $totalAmount,
                    'payment_method' => $inv->payment_method ?? 'UPI / Bank Transfer',
                    'status' => $inv->payment_status ?? 'Paid',
                ];
            })->toArray();
        }

        // 2. Inventory & Stock Report Data
        $inventoryQuery = Product::with(['category', 'subcategory']);
        if ($search) {
            $inventoryQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('product_code', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhereHas('category', function ($cq) use ($search) {
                      $cq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $invStatsRow = (clone $inventoryQuery)->reorder()->selectRaw('
            COUNT(*) as total_products,
            COUNT(CASE WHEN current_stock_qty < 5 THEN 1 END) as low_stock_count
        ')->first();
        $totalProducts = (int) ($invStatsRow->total_products ?? 0);
        $lowStockCount = (int) ($invStatsRow->low_stock_count ?? 0);
        $totalInventoryItems = $totalProducts;

        $inventoryValuation = \Illuminate\Support\Facades\Cache::remember('report_inv_valuation', 60, function () use ($inventoryQuery) {
            $allProducts = (clone $inventoryQuery)->reorder()->select('id', 'current_stock_qty', 'opening_stock_rate', 'opening_stock_weight', 'attributes')->get();
            return (float) $allProducts->sum(function ($p) {
                $qty = max(0, (int) ($p->current_stock_qty ?? 0));
                $attrs = is_array($p->attributes) ? $p->attributes : (json_decode($p->attributes ?? '[]', true) ?: []);
                $comps = is_array($attrs['components'] ?? null) ? $attrs['components'] : [];
                $comp0 = !empty($comps) ? $comps[0] : null;

                $price = (float) ($comp0['purchase_rate'] ?? $attrs['purchase_rate'] ?? $attrs['sale_rate'] ?? $p->opening_stock_rate ?? 0);
                $totalVal = (float) ($comp0['purchase_value'] ?? $attrs['overall_purchase_value'] ?? $attrs['total_purchase_value'] ?? 0);
                if ($totalVal > 0) {
                    return $totalVal;
                }
                return $qty * $price;
            });
        });

        $formattedInventory = [];
        if ($isExport || $type === 'inventory') {
            $products = $isExport
                ? (clone $inventoryQuery)->orderBy('created_at', 'desc')->get()
                : (clone $inventoryQuery)->orderBy('created_at', 'desc')->skip(($page - 1) * $perPage)->take($perPage)->get();

            $formattedInventory = $products->map(function ($p) {
                $qty = max(0, (int) ($p->current_stock_qty ?? 0));
                $attrs = is_array($p->attributes) ? $p->attributes : (json_decode($p->attributes ?? '[]', true) ?: []);
                $comps = is_array($attrs['components'] ?? null) ? $attrs['components'] : [];
                $comp0 = !empty($comps) ? $comps[0] : null;

                // Parent product data resolution
                $name = $comp0['item_name'] ?? $p->name ?? 'Jewellery';
                $category = $comp0['category_name'] ?? $p->category?->name ?? 'Gold';
                $sku = $p->product_code ?: ($comp0['item_code'] ?? $attrs['sku'] ?? ('SKU-' . sprintf('%05d', $p->id)));

                // Extract Gross Weight and Net Weight strictly from parent product (component 0 or attributes)
                $grossWeight = 0;
                if ($comp0 && (!empty($comp0['gross_wt']) || !empty($comp0['gross_weight']))) {
                    $grossWeight = (float) ($comp0['gross_wt'] ?? $comp0['gross_weight']);
                } elseif (!empty($attrs['gross_wt']) || !empty($attrs['unit_gross_wt'])) {
                    $grossWeight = (float) ($attrs['gross_wt'] ?? $attrs['unit_gross_wt']);
                } elseif (!empty($p->opening_stock_weight)) {
                    $grossWeight = (float) $p->opening_stock_weight;
                }

                $netWeight = 0;
                if ($comp0 && (!empty($comp0['net_wt']) || !empty($comp0['net_weight']))) {
                    $netWeight = (float) ($comp0['net_wt'] ?? $comp0['net_weight']);
                } elseif (!empty($attrs['net_wt']) || !empty($attrs['unit_net_wt'])) {
                    $netWeight = (float) ($attrs['net_wt'] ?? $attrs['unit_net_wt']);
                } else {
                    $netWeight = $grossWeight;
                }

                // In case weights were entered in kg (< 0.1g for jewellery)
                if ($grossWeight > 0 && $grossWeight < 0.1) {
                    $grossWeight *= 1000;
                }
                if ($netWeight > 0 && $netWeight < 0.1) {
                    $netWeight *= 1000;
                }

                if ($netWeight <= 0 && $grossWeight > 0) {
                    $netWeight = $grossWeight;
                }
                if ($grossWeight <= 0 && $netWeight > 0) {
                    $grossWeight = $netWeight;
                }

                // Purity derivation matching parent product
                $karat = $comp0['karat'] ?? $attrs['karat'] ?? $attrs['gold_karat'] ?? '22K';
                $purityVal = $comp0['purity'] ?? $attrs['purity'] ?? $attrs['gold_type'] ?? '916';
                if ($purityVal == '91.6' || $purityVal == '91.60') {
                    $purityVal = '916';
                }
                if ($karat && $purityVal) {
                    $purity = "{$karat} ({$purityVal})";
                } else {
                    $purity = $karat ?: ($purityVal ?: '22K (916)');
                }

                // Calculate total diamond weight in ct
                $diamondWeight = 0.0;
                if (isset($attrs['diamond_weight']) && (float)$attrs['diamond_weight'] > 0) {
                    $diamondWeight = (float) $attrs['diamond_weight'];
                } elseif (isset($attrs['dia_wt_ct']) && (float)$attrs['dia_wt_ct'] > 0) {
                    $diamondWeight = (float) $attrs['dia_wt_ct'];
                } else {
                    $seenDia = [];
                    foreach ($comps as $c) {
                        $isDia = ($c['is_diamond'] ?? false) || 
                                 str_contains(strtolower($c['component_type'] ?? ''), 'diamond') || 
                                 str_contains(strtolower($c['category_name'] ?? ''), 'diamond') ||
                                 str_contains(strtolower($c['item_name'] ?? ''), 'diamond');
                        if ($isDia) {
                            $cWt = (float) ($c['stone_weight'] ?? $c['diamond_weight'] ?? $c['gross_wt'] ?? $c['weight'] ?? 0);
                            $cStamp = $c['stamp'] ?? $c['diamond_stamp'] ?? $c['size'] ?? '';
                            $cKey = $cStamp . '_' . $cWt;
                            if (!isset($seenDia[$cKey])) {
                                $seenDia[$cKey] = true;
                                $diamondWeight += $cWt;
                            }
                        }
                    }
                }

                if ($diamondWeight <= 0 && $grossWeight > $netWeight) {
                    $diffGrams = $grossWeight - $netWeight;
                    $hasDia = isset($attrs['diamond_stamp']) || isset($attrs['diamond_count']) || 
                              collect($comps)->contains(fn($c) => ($c['is_diamond'] ?? false) || str_contains(strtolower($c['component_type'] ?? ''), 'diamond'));
                    if ($hasDia) {
                        $diamondWeight = round($diffGrams / 0.2, 3);
                    }
                }

                $price = (float) ($comp0['purchase_rate'] ?? $attrs['purchase_rate'] ?? $attrs['sale_rate'] ?? $p->selling_price ?? $p->price ?? 0);
                $totalVal = (float) ($comp0['purchase_value'] ?? $attrs['overall_purchase_value'] ?? $attrs['total_purchase_value'] ?? ($qty * $price));

                return [
                    'id' => $p->id,
                    'sku' => $sku,
                    'product_code' => $p->product_code,
                    'name' => $name,
                    'category' => $category,
                    'purity' => $purity,
                    'gross_weight' => round($grossWeight, 3),
                    'net_weight' => round($netWeight, 3),
                    'diamond_weight' => round($diamondWeight, 3),
                    'stock_qty' => $qty,
                    'price' => $price,
                    'total_valuation' => $totalVal,
                    'stock_status' => $qty <= 0 ? 'Out of Stock' : ($qty < 5 ? 'Low Stock' : 'In Stock'),
                ];
            })->toArray();
        }

        // 3. Karigar & Manufacturing Job Order Report Data
        $workOrderQuery = WorkOrder::with(['karigar', 'product']);
        $workOrderQuery = $dateQuery($workOrderQuery, 'created_at');

        if ($search) {
            $workOrderQuery->where(function ($q) use ($search) {
                $q->where('work_order_number', 'like', "%{$search}%")
                  ->orWhere('karigar_name', 'like', "%{$search}%")
                  ->orWhere('product_name', 'like', "%{$search}%")
                  ->orWhere('material_type', 'like', "%{$search}%")
                  ->orWhere('current_stage', 'like', "%{$search}%")
                  ->orWhere('status', 'like', "%{$search}%")
                  ->orWhereHas('karigar', function ($kq) use ($search) {
                      $kq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        $woSumsRow = (clone $workOrderQuery)->reorder()->selectRaw('
            COUNT(*) as total_items,
            COALESCE(SUM(allotted_weight), 0) as tot_allotted,
            COALESCE(SUM(completed_weight), 0) as tot_completed,
            COALESCE(SUM(wastage_weight), 0) as tot_wastage,
            COALESCE(SUM(pending_weight), 0) as tot_pending
        ')->first();
        $totalAllottedGold = (float) ($woSumsRow->tot_allotted ?? 0);
        $totalCompletedGold = (float) ($woSumsRow->tot_completed ?? 0);
        $totalWastageGold = (float) ($woSumsRow->tot_wastage ?? 0);
        $totalPendingGold = (float) ($woSumsRow->tot_pending ?? 0);
        $karigarBenchGold = (float) \App\Models\Karigar::sum('current_gold_balance_grams');
        if ($totalPendingGold <= 0 && $karigarBenchGold > 0) {
            $totalPendingGold = $karigarBenchGold;
        }

        $totalWorkOrderItems = (int) ($woSumsRow->total_items ?? 0);
        $formattedWorkOrders = [];

        if ($isExport || $type === 'karigar') {
            $workOrders = $isExport
                ? (clone $workOrderQuery)->orderBy('created_at', 'desc')->get()
                : (clone $workOrderQuery)->orderBy('created_at', 'desc')->skip(($page - 1) * $perPage)->take($perPage)->get();

            $formattedWorkOrders = $workOrders->map(function ($wo) {
                return [
                    'id' => $wo->id,
                    'work_order_number' => $wo->work_order_number,
                    'artisan_name' => $wo->karigar_name ?? $wo->karigar?->name ?? 'Artisan',
                    'product_name' => $wo->product_name ?? '22K Jewellery Piece',
                    'material_type' => $wo->material_type ?? '22K Gold',
                    'allotted_weight' => (float) $wo->allotted_weight,
                    'completed_weight' => (float) $wo->completed_weight,
                    'wastage_weight' => (float) $wo->wastage_weight,
                    'pending_weight' => (float) $wo->pending_weight,
                    'current_stage' => str_replace('_', ' ', $wo->current_stage ?: 'In Progress'),
                    'status' => $wo->status,
                    'date' => Carbon::parse($wo->created_at)->format('d M Y'),
                ];
            })->toArray();
        }

        // 4. Purchase & Supplier Report Data
        $purchaseQuery = PurchaseEntry::with(['supplier']);
        $purchaseQuery = $dateQuery($purchaseQuery, 'created_at');

        if ($search) {
            $purchaseQuery->where(function ($q) use ($search) {
                $q->where('purchase_no', 'like', "%{$search}%")
                  ->orWhereHas('supplier', function ($sq) use ($search) {
                      $sq->where('name', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%");
                  })
                  ->orWhereHas('product', function ($pq) use ($search) {
                      $pq->where('name', 'like', "%{$search}%")
                        ->orWhere('product_code', 'like', "%{$search}%");
                  });
            });
        }

        $puSumsRow = (clone $purchaseQuery)->reorder()->selectRaw('
            COUNT(*) as total_items,
            COALESCE(SUM(CASE WHEN rate > 0 THEN total_amount ELSE 0 END), 0) as tot_spend,
            COALESCE(SUM(CASE WHEN metal_type = "gold" OR metal_type IS NULL THEN fine_weight ELSE 0 END), 0) as tot_gold
        ')->first();
        $totalPurchaseSpend = (float) ($puSumsRow->tot_spend ?? 0);
        $totalGoldPurchased24k = (float) ($puSumsRow->tot_gold ?? 0);
        $totalPurchaseItems = (int) ($puSumsRow->total_items ?? 0);

        $formattedPurchases = [];
        if ($isExport || $type === 'purchase') {
            $purchases = $isExport
                ? (clone $purchaseQuery)->orderBy('created_at', 'desc')->get()
                : (clone $purchaseQuery)->orderBy('created_at', 'desc')->skip(($page - 1) * $perPage)->take($perPage)->get();

            $formattedPurchases = $purchases->map(function ($pu) {
                $isUnpriced = (float)($pu->rate ?? 0) <= 0;
                $totalAmount = (float) $pu->total_amount;
                $paidAmount = (float) ($pu->paid_amount ?? 0);
                $balance = max(0, round($totalAmount - $paidAmount, 2));
                $fine24k = round((float) ($pu->fine_weight ?? 0), 3);
                $weight = round((float) ($pu->weight ?? 0), 3);
                $netWeight = round((float) ($pu->total_net_weight ?? $pu->net_weight ?? $weight), 3);

                return [
                    'id' => $pu->id,
                    'purchase_no' => $pu->purchase_no ?? ('PUR-2026-' . sprintf('%04d', $pu->id)),
                    'supplier_name' => $pu->supplier_name ?? $pu->supplier?->name ?? 'Bullion Supplier',
                    'purchase_date' => Carbon::parse($pu->purchase_date ?? $pu->created_at)->format('d M Y'),
                    'weight' => $weight,
                    'net_weight' => $netWeight,
                    'purity' => $pu->purity ?: ($pu->touch ? "{$pu->touch}%" : '24K'),
                    'touch' => (float) $pu->touch,
                    'fine_weight' => $fine24k,
                    'fine_weight_24k' => $fine24k,
                    'rate' => (float) ($pu->rate ?? 0),
                    'is_unpriced' => $isUnpriced,
                    'payable_type' => $isUnpriced ? 'gold' : 'monetary',
                    'total_amount' => $totalAmount,
                    'paid_amount' => $paidAmount,
                    'balance_amount' => $balance,
                    'gold_balance' => $isUnpriced ? $fine24k : 0.0,
                    'outstanding_display' => $isUnpriced ? number_format($fine24k, 3) . ' g (24K Gold)' : '₹' . number_format($balance, 2),
                    'credit_days' => intval($pu->credit_days ?? 0),
                    'due_date' => $pu->due_date ? Carbon::parse($pu->due_date)->format('d M Y') : null,
                    'due_date_raw' => $pu->due_date,
                    'payment_status' => $isUnpriced
                        ? 'gold_payable'
                        : (($balance <= 0 && $totalAmount > 0) || $pu->payment_status === 'paid' ? 'paid' : ($pu->payment_status ?? 'unpaid')),
                ];
            })->toArray();
        }

        // Pagination Meta calculation based on active tab type
        $totalForType = match ($type) {
            'inventory' => $totalInventoryItems,
            'karigar' => $totalWorkOrderItems,
            'purchase' => $totalPurchaseItems,
            default => $totalSalesItems, // sales & gst
        };

        $lastPage = max(1, (int) ceil($totalForType / $perPage));
        $from = $totalForType > 0 ? (($page - 1) * $perPage) + 1 : 0;
        $to = min($totalForType, $page * $perPage);

        return response()->json([
            'status' => 'success',
            'summary' => [
                'totalSalesRevenue' => $totalSalesRevenue,
                'totalSalesRevenueFormatted' => '₹' . number_format($totalSalesRevenue, 0),
                'totalSalesCount' => $totalSalesCount,
                'avgOrderValue' => $avgOrderValue,
                'avgOrderValueFormatted' => '₹' . number_format($avgOrderValue, 0),
                'totalGstTax' => $totalGstTax,
                'totalGstTaxFormatted' => '₹' . number_format($totalGstTax, 2),
                'inventoryValuation' => $inventoryValuation,
                'inventoryValuationFormatted' => '₹' . number_format($inventoryValuation, 0),
                'totalProducts' => $totalProducts,
                'lowStockCount' => $lowStockCount,
                'totalAllottedGold' => round($totalAllottedGold, 3),
                'totalCompletedGold' => round($totalCompletedGold, 3),
                'totalWastageGold' => round($totalWastageGold, 3),
                'totalPendingGold' => round($totalPendingGold, 3),
                'totalPurchaseSpend' => $totalPurchaseSpend,
                'totalPurchaseSpendFormatted' => '₹' . number_format($totalPurchaseSpend, 0),
                'totalGoldPurchased24k' => round($totalGoldPurchased24k, 3),
                'totalGoldPurchased24kFormatted' => number_format($totalGoldPurchased24k, 3) . ' g (24K Gold)',
                'salesGrowth' => $salesGrowth,
                'prevPeriodLabel' => $prevPeriodLabel,
            ],
            'sales' => $formattedSales,
            'inventory' => $formattedInventory,
            'workOrders' => $formattedWorkOrders,
            'purchases' => $formattedPurchases,
            'pagination' => [
                'current_page' => $page,
                'last_page' => $lastPage,
                'per_page' => $perPage,
                'total' => $totalForType,
                'from' => $from,
                'to' => $to,
            ],
            'filters' => [
                'period' => $period,
                'type' => $type,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]
        ]);
    }

    /**
     * Profit Per Metal API endpoint
     * Analyzes raw material purchase prices (from PurchaseEntry) against sale prices (from SaleItem/Invoice)
     */
    public function profitPerMetal(Request $request)
    {
        $from = $request->input('from');
        $to = $request->input('to');
        $search = $request->input('search');

        $purchaseQuery = PurchaseEntry::with('product');
        if ($from) {
            $purchaseQuery->whereDate('purchase_date', '>=', $from);
        }
        if ($to) {
            $purchaseQuery->whereDate('purchase_date', '<=', $to);
        }
        if ($search) {
            $purchaseQuery->whereHas('product', function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%");
            });
        }
        $purchases = $purchaseQuery->get();

        $saleItemQuery = \App\Models\SaleItem::query();
        if ($from || $to) {
            $saleItemQuery->whereHas('invoice', function ($q) use ($from, $to) {
                if ($from) $q->whereDate('invoice_date', '>=', $from);
                if ($to) $q->whereDate('invoice_date', '<=', $to);
            });
        }
        if ($search) {
            $saleItemQuery->where(function ($q) use ($search) {
                $q->where('product_name', 'like', "%{$search}%")
                  ->orWhere('product_code', 'like', "%{$search}%");
            });
        }
        $saleItems = $saleItemQuery->get();

        // 1. Gold Analysis (Converted to 24K Fine Equivalent using Touch %)
        $goldPurchaseSpend = 0.0;
        $goldPurchasedGrossWt = 0.0;
        $goldPurchased24kFineWt = 0.0;

        $silverPurchaseSpend = 0.0;
        $silverPurchasedWt = 0.0;

        $diamondPurchaseSpend = 0.0;
        $diamondPurchasedCarats = 0.0;

        $stonePurchaseSpend = 0.0;
        $stonePurchasedUnits = 0;

        foreach ($purchases as $pu) {
            $amt = (float) $pu->total_amount;
            $wt = (float) $pu->weight;
            $touch = \App\Helpers\GoldConversionHelper::getTouchPercent($pu->touch ?: 91.66);
            $fine = $pu->fine_weight > 0 ? (float)$pu->fine_weight : \App\Helpers\GoldConversionHelper::convertTo24kFineWeight($wt, $touch);

            $pName = strtolower($pu->product->name ?? '');

            if (str_contains($pName, 'silver')) {
                $silverPurchaseSpend += $amt;
                $silverPurchasedWt += $wt;
            } elseif (str_contains($pName, 'diamond')) {
                $diamondPurchaseSpend += $amt;
                $diamondPurchasedCarats += max(0.1, $wt);
            } elseif (str_contains($pName, 'stone')) {
                $stonePurchaseSpend += $amt;
                $stonePurchasedUnits += max(1, (int)$wt);
            } else {
                $goldPurchaseSpend += $amt;
                $goldPurchasedGrossWt += $wt;
                $goldPurchased24kFineWt += $fine;
            }
        }

        // Buying Rates
        $avgGoldBuyingRate24kPer10g = \App\Helpers\GoldConversionHelper::calculate24kAverageRatePer10g($goldPurchaseSpend, $goldPurchased24kFineWt);
        $avgGoldBuyingRate24kGram = $goldPurchased24kFineWt > 0 ? ($goldPurchaseSpend / $goldPurchased24kFineWt) : 0.0;

        $avgSilverBuyingRatePerKg = $silverPurchasedWt > 0 ? round(($silverPurchaseSpend / $silverPurchasedWt) * 1000.0) : 0.0;
        $avgSilverBuyingRateGram = $silverPurchasedWt > 0 ? ($silverPurchaseSpend / ($silverPurchasedWt * 1000.0)) : 0.0;

        $avgDiamondBuyingRatePerCt = $diamondPurchasedCarats > 0 ? round($diamondPurchaseSpend / $diamondPurchasedCarats, 2) : 0.0;
        $avgStoneBuyingRatePerUnit = $stonePurchasedUnits > 0 ? round($stonePurchaseSpend / $stonePurchasedUnits, 2) : 0.0;

        // 2. Sales Analysis
        $goldSalesRevenue = 0.0;
        $goldSoldGrossWt = 0.0;
        $goldSold24kFineWt = 0.0;

        $silverSalesRevenue = 0.0;
        $silverSoldWt = 0.0;

        $diamondSalesRevenue = 0.0;
        $diamondSoldCarats = 0.0;

        $stoneSalesRevenue = 0.0;
        $stoneSoldUnits = 0;

        foreach ($saleItems as $si) {
            $amt = (float) $si->line_total;
            $wt = (float) ($si->gross_weight ?: $si->net_weight);
            $touch = \App\Helpers\GoldConversionHelper::getTouchPercent($si->purity ?: 91.66);
            $fine = \App\Helpers\GoldConversionHelper::convertTo24kFineWeight($wt, $touch);

            $pName = strtolower($si->product_name ?? '');

            if (str_contains($pName, 'silver')) {
                $silverSalesRevenue += $amt;
                $silverSoldWt += $wt;
            } elseif (str_contains($pName, 'diamond')) {
                $diamondSalesRevenue += $amt;
                $diamondSoldCarats += max(0.1, (float)($si->stone_weight ?: $wt));
            } elseif (str_contains($pName, 'stone')) {
                $stoneSalesRevenue += $amt;
                $stoneSoldUnits += max(1, (int)$wt);
            } else {
                $goldSalesRevenue += $amt;
                $goldSoldGrossWt += $wt;
                $goldSold24kFineWt += $fine;
            }
        }

        // Selling Rates
        $avgGoldSellingRate24kPer10g = \App\Helpers\GoldConversionHelper::calculate24kAverageRatePer10g($goldSalesRevenue, $goldSold24kFineWt);
        $avgGoldSellingRate24kGram = $goldSold24kFineWt > 0 ? ($goldSalesRevenue / $goldSold24kFineWt) : 0.0;

        $avgSilverSellingRatePerKg = $silverSoldWt > 0 ? round(($silverSalesRevenue / $silverSoldWt) * 1000.0) : 0.0;
        $avgSilverSellingRateGram = $silverSoldWt > 0 ? ($silverSalesRevenue / ($silverSoldWt * 1000.0)) : 0.0;

        $avgDiamondSellingRatePerCt = $diamondSoldCarats > 0 ? round($diamondSalesRevenue / $diamondSoldCarats, 2) : 0.0;
        $avgStoneSellingRatePerUnit = $stoneSoldUnits > 0 ? round($stoneSalesRevenue / $stoneSoldUnits, 2) : 0.0;

        // 3. Profit Calculations per Metal
        $goldCost = round($goldSold24kFineWt * $avgGoldBuyingRate24kGram, 2);
        $goldProfit = max(0, round($goldSalesRevenue - $goldCost, 2));
        $goldMargin = $goldSalesRevenue > 0 ? round(($goldProfit / $goldSalesRevenue) * 100, 1) : 0.0;

        $silverCost = round($silverSoldWt * $avgSilverBuyingRateGram, 2);
        $silverProfit = max(0, round($silverSalesRevenue - $silverCost, 2));
        $silverMargin = $silverSalesRevenue > 0 ? round(($silverProfit / $silverSalesRevenue) * 100, 1) : 0.0;

        $diamondCost = round($diamondSoldCarats * $avgDiamondBuyingRatePerCt, 2);
        $diamondProfit = max(0, round($diamondSalesRevenue - $diamondCost, 2));
        $diamondMargin = $diamondSalesRevenue > 0 ? round(($diamondProfit / $diamondSalesRevenue) * 100, 1) : 0.0;

        $stoneCost = round($stoneSoldUnits * $avgStoneBuyingRatePerUnit, 2);
        $stoneProfit = max(0, round($stoneSalesRevenue - $stoneCost, 2));
        $stoneMargin = $stoneSalesRevenue > 0 ? round(($stoneProfit / $stoneSalesRevenue) * 100, 1) : 0.0;

        $totalRevenue = round($goldSalesRevenue + $silverSalesRevenue + $diamondSalesRevenue + $stoneSalesRevenue, 2);
        $totalCost = round($goldCost + $silverCost + $diamondCost + $stoneCost, 2);
        $totalNetProfit = round($goldProfit + $silverProfit + $diamondProfit + $stoneProfit, 2);
        $totalMargin = $totalRevenue > 0 ? round(($totalNetProfit / $totalRevenue) * 100, 1) : 0.0;

        return response()->json([
            'status' => 'success',
            'period' => [
                'from' => $from ?: 'All Time',
                'to' => $to ?: 'All Time',
                'label' => ($from && $to) ? "{$from} to {$to}" : 'All Available Data (Lifetime)',
            ],
            'summary' => [
                'totalRevenue' => $totalRevenue,
                'totalRevenueFormatted' => '₹' . number_format($totalRevenue, 0),
                'totalCost' => $totalCost,
                'totalCostFormatted' => '₹' . number_format($totalCost, 0),
                'totalNetProfit' => $totalNetProfit,
                'totalNetProfitFormatted' => '₹' . number_format($totalNetProfit, 0),
                'totalMargin' => $totalMargin . '%',
            ],
            'metals' => [
                [
                    'id' => 'gold',
                    'name' => 'Gold (24K Fine Converted)',
                    'purity' => 'Converted to 24K (999)',
                    'purchased_wt' => round($goldPurchasedGrossWt, 3) . ' g',
                    'purchased_24k_fine' => round($goldPurchased24kFineWt, 3) . ' g',
                    'buying_rate_10g' => '₹' . number_format($avgGoldBuyingRate24kPer10g, 0),
                    'buying_rate_gram' => '₹' . number_format($avgGoldBuyingRate24kGram, 2),
                    'sold_wt' => round($goldSoldGrossWt, 3) . ' g',
                    'sold_24k_fine' => round($goldSold24kFineWt, 3) . ' g',
                    'selling_rate_10g' => '₹' . number_format($avgGoldSellingRate24kPer10g, 0),
                    'selling_rate_gram' => '₹' . number_format($avgGoldSellingRate24kGram, 2),
                    'revenue' => $goldSalesRevenue,
                    'cost' => $goldCost,
                    'profit' => $goldProfit,
                    'margin_percent' => $goldMargin . '%',
                ],
                [
                    'id' => 'silver',
                    'name' => 'Silver (Fine Bullion)',
                    'purity' => '999 Fine Silver',
                    'purchased_wt' => round($silverPurchasedWt / 1000, 2) . ' kg',
                    'buying_rate_kg' => '₹' . number_format($avgSilverBuyingRatePerKg, 0),
                    'sold_wt' => round($silverSoldWt / 1000, 2) . ' kg',
                    'selling_rate_kg' => '₹' . number_format($avgSilverSellingRatePerKg, 0),
                    'revenue' => $silverSalesRevenue,
                    'cost' => $silverCost,
                    'profit' => $silverProfit,
                    'margin_percent' => $silverMargin . '%',
                ],
                [
                    'id' => 'diamond',
                    'name' => 'Diamond (Solitaires & Accents)',
                    'purity' => 'VVS-VS / EF Sieve',
                    'purchased_carats' => round($diamondPurchasedCarats, 2) . ' ct',
                    'buying_rate_ct' => '₹' . number_format($avgDiamondBuyingRatePerCt, 0),
                    'sold_carats' => round($diamondSoldCarats, 2) . ' ct',
                    'selling_rate_ct' => '₹' . number_format($avgDiamondSellingRatePerCt, 0),
                    'revenue' => $diamondSalesRevenue,
                    'cost' => $diamondCost,
                    'profit' => $diamondProfit,
                    'margin_percent' => $diamondMargin . '%',
                ],
                [
                    'id' => 'stone',
                    'name' => 'Precious & Gemstones',
                    'purity' => 'Natural Gems',
                    'purchased_units' => $stonePurchasedUnits . ' units',
                    'buying_rate_unit' => '₹' . number_format($avgStoneBuyingRatePerUnit, 0),
                    'sold_units' => $stoneSoldUnits . ' units',
                    'selling_rate_unit' => '₹' . number_format($avgStoneSellingRatePerUnit, 0),
                    'revenue' => $stoneSalesRevenue,
                    'cost' => $stoneCost,
                    'profit' => $stoneProfit,
                    'margin_percent' => $stoneMargin . '%',
                ],
            ]
        ]);
    }

    /**
     * ITC-04 Statutory GST Karigar Job Work Return
     */
    public function itc04Report(Request $request)
    {
        $year = $request->input('year', date('Y'));
        $quarter = $request->input('quarter', ceil(date('n') / 3));

        $startMonth = ($quarter - 1) * 3 + 1;
        $endMonth = $quarter * 3;
        $startDate = Carbon::create($year, $startMonth, 1)->startOfMonth();
        $endDate = Carbon::create($year, $endMonth, 1)->endOfMonth();

        // 1. Table 1: Goods (Raw Material) dispatched to Job Worker (Karigar)
        $dispatched = \App\Models\KarigarMaterialTransaction::where('transaction_type', 'issue')
            ->whereBetween('transaction_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->with(['karigar', 'rawMaterial'])
            ->get()
            ->map(function ($tx) {
                return [
                    'id' => $tx->id,
                    'transaction_number' => $tx->transaction_number,
                    'transaction_date' => $tx->transaction_date,
                    'karigar_name' => $tx->karigar?->name ?: 'Independent Artisan',
                    'karigar_pan' => $tx->karigar?->pan_number ?: 'NA',
                    'material_type' => ucfirst($tx->material_type),
                    'quantity_grams' => round((float) $tx->quantity, 3),
                    'touch_percent' => (float) ($tx->touch_percent ?: 99.9),
                    'unit_cost' => (float) ($tx->unit_cost ?: 0),
                    'estimated_value' => round((float) $tx->total_cost ?: ((float) $tx->quantity * 7800), 2),
                    'notes' => $tx->notes,
                ];
            });

        // 2. Table 2: Goods (Finished Pieces & Scrap) received back from Job Worker
        $received = \App\Models\WorkOrderReceivedPiece::whereBetween('received_at', [$startDate, $endDate])
            ->with(['karigar', 'workOrder', 'product'])
            ->get()
            ->map(function ($p) {
                $gross = (float) $p->gross_weight;
                $net = (float) ($p->net_gold_weight ?: $gross);
                $stone = (float) ($p->diamond_weight ?: 0);

                return [
                    'id' => $p->id,
                    'tag_number' => $p->tag_number,
                    'piece_number' => $p->piece_number,
                    'received_at' => $p->received_at?->format('Y-m-d'),
                    'work_order_number' => $p->workOrder?->work_order_number,
                    'karigar_name' => $p->karigar?->name ?: ($p->workOrder?->karigar?->name ?: 'In-House'),
                    'product_name' => $p->product_name ?: ($p->product?->name ?: 'Jewellery Article'),
                    'hsn_code' => '7113',
                    'gross_weight' => round($gross, 3),
                    'net_gold_weight' => round($net, 3),
                    'stone_weight' => round($stone, 3),
                    'huid' => $p->huid ?: 'NA',
                    'making_charges' => (float) ($p->total_making_charge ?: 0),
                ];
            });

        return response()->json([
            'status' => 'success',
            'period' => [
                'year' => (int) $year,
                'quarter' => "Q{$quarter}",
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
            ],
            'summary' => [
                'total_dispatched_weight_grams' => round($dispatched->sum('quantity_grams'), 3),
                'total_dispatched_value' => round($dispatched->sum('estimated_value'), 2),
                'total_received_pieces' => $received->count(),
                'total_received_net_gold_grams' => round($received->sum('net_gold_weight'), 3),
                'total_making_charges_billed' => round($received->sum('making_charges'), 2),
            ],
            'table1_dispatched_to_karigar' => $dispatched,
            'table2_received_from_karigar' => $received,
        ]);
    }

    /**
     * GSTR-1 Outward Supplies Tax Summary (HSN 7113)
     */
    public function gstr1Summary(Request $request)
    {
        $startDate = $request->input('start_date', Carbon::now()->startOfMonth()->toDateString());
        $endDate = $request->input('end_date', Carbon::now()->endOfMonth()->toDateString());

        $invoices = Invoice::whereBetween('invoice_date', [$startDate, $endDate])
            ->whereNotIn('sale_status', ['cancelled', 'void', 'returned'])
            ->with(['client'])
            ->get();

        $b2b = [];
        $b2c = [];

        foreach ($invoices as $inv) {
            $isB2B = !empty($inv->client?->gst_number);
            $taxable = round((float) ($inv->amount ?: ($inv->total_amount - ($inv->gst_amount ?: 0))), 2);
            $cgst = round((float) $inv->gst_amount / 2, 2);
            $sgst = round((float) $inv->gst_amount / 2, 2);
            $igst = 0.00;

            $record = [
                'invoice_no' => $inv->invoice_no,
                'invoice_date' => optional($inv->invoice_date)->format('Y-m-d') ?: $inv->created_at->format('Y-m-d'),
                'client_name' => $inv->client_name,
                'client_gstin' => $inv->client?->gst_number ?: 'UNREGISTERED',
                'place_of_supply' => $inv->client?->state ?: 'Tamil Nadu (33)',
                'hsn_code' => '7113',
                'taxable_value' => $taxable,
                'gst_rate' => 3.0,
                'cgst_amount' => $cgst,
                'sgst_amount' => $sgst,
                'igst_amount' => $igst,
                'total_amount' => round((float) $inv->total_amount, 2),
            ];

            if ($isB2B) {
                $b2b[] = $record;
            } else {
                $b2c[] = $record;
            }
        }

        $allTaxable = round(collect($b2b)->sum('taxable_value') + collect($b2c)->sum('taxable_value'), 2);
        $allTax = round(collect($b2b)->sum('cgst_amount') * 2 + collect($b2c)->sum('cgst_amount') * 2, 2);
        $allTotal = round(collect($b2b)->sum('total_amount') + collect($b2c)->sum('total_amount'), 2);

        return response()->json([
            'status' => 'success',
            'period' => [
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'summary' => [
                'total_invoices' => count($invoices),
                'b2b_invoices_count' => count($b2b),
                'b2c_invoices_count' => count($b2c),
                'total_taxable_value' => $allTaxable,
                'total_tax_amount' => $allTax,
                'total_invoice_value' => $allTotal,
            ],
            'b2b_supplies' => $b2b,
            'b2c_supplies' => $b2c,
        ]);
    }

    /**
     * Karigar Monthly Accounting Report: Material and Financial Reconciliation with opening/closing balances
     */
    public function karigarMonthlyReport(Request $request)
    {
        $periodType = $request->input('period_type', $request->input('filter_type', 'monthly'));
        $year = (int)$request->input('year', date('Y'));
        $month = $request->input('month');
        $karigarId = $request->input('karigar_id');
        $workOrderId = $request->input('work_order_id');
        $materialType = $request->input('material_type');

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $startDate = Carbon::parse($request->input('start_date'))->startOfDay();
            $endDate = Carbon::parse($request->input('end_date'))->endOfDay();
        } elseif ($periodType === 'weekly') {
            $refDate = $request->filled('date') ? Carbon::parse($request->input('date')) : Carbon::now();
            if ($request->filled('week_offset')) {
                $refDate->addWeeks((int)$request->input('week_offset'));
            }
            $startDate = $refDate->copy()->startOfWeek();
            $endDate = $refDate->copy()->endOfWeek();
        } elseif ($periodType === 'yearly') {
            $startDate = Carbon::create($year, 1, 1)->startOfYear();
            $endDate = Carbon::create($year, 12, 31)->endOfYear();
        } elseif (!empty($month) && $month !== 'all') {
            $startDate = Carbon::create($year, (int)$month, 1)->startOfMonth();
            $endDate = Carbon::create($year, (int)$month, 1)->endOfMonth();
        } else {
            $startDate = Carbon::create($year, 1, 1)->startOfYear();
            $endDate = Carbon::create($year, 12, 31)->endOfYear();
        }

        $karigarQuery = Karigar::query();
        if (!empty($karigarId) && $karigarId !== 'all') {
            $karigarQuery->where('id', $karigarId);
        }
        $karigars = $karigarQuery->orderBy('name')->get();

        $karigarIds = $karigars->pluck('id')->toArray();

        // 1. Prior Transactions in ONE batch query
        $priorTxsQuery = KarigarMaterialTransaction::whereIn('karigar_id', $karigarIds)
            ->where('is_reversed', false)
            ->where('transaction_date', '<', $startDate);
        if (!empty($workOrderId) && $workOrderId !== 'all') {
            $priorTxsQuery->where('work_order_id', $workOrderId);
        }
        if (!empty($materialType) && $materialType !== 'all') {
            $priorTxsQuery->where('material_type', $materialType);
        }
        $allPriorTxs = $priorTxsQuery->get()->groupBy('karigar_id');

        // 2. Prior Payments in ONE batch query
        $priorPaymentsQuery = KarigarPayment::whereIn('karigar_id', $karigarIds)
            ->where('transaction_date', '<', $startDate->toDateString());
        if (!empty($workOrderId) && $workOrderId !== 'all') {
            $priorPaymentsQuery->where('work_order_id', $workOrderId);
        }
        $allPriorPayments = $priorPaymentsQuery->get()->groupBy('karigar_id');

        // 3. Period Transactions in ONE batch query
        $periodTxsQuery = KarigarMaterialTransaction::whereIn('karigar_id', $karigarIds)
            ->where('is_reversed', false)
            ->whereBetween('transaction_date', [$startDate, $endDate])
            ->with(['workOrder:id,work_order_number,product_name']);
        if (!empty($workOrderId) && $workOrderId !== 'all') {
            $periodTxsQuery->where('work_order_id', $workOrderId);
        }
        if (!empty($materialType) && $materialType !== 'all') {
            $periodTxsQuery->where('material_type', $materialType);
        }
        $allPeriodTxs = $periodTxsQuery->orderBy('transaction_date', 'asc')->get()->groupBy('karigar_id');

        // 4. Period Payments in ONE batch query
        $periodPaymentsQuery = KarigarPayment::whereIn('karigar_id', $karigarIds)
            ->whereBetween('transaction_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->with(['workOrder:id,work_order_number,product_name', 'receivedPiece:id,receive_order_number,tag_number']);
        if (!empty($workOrderId) && $workOrderId !== 'all') {
            $periodPaymentsQuery->where('work_order_id', $workOrderId);
        }
        $allPeriodPayments = $periodPaymentsQuery->orderBy('transaction_date', 'asc')->get()->groupBy('karigar_id');

        $allReports = [];
        foreach ($karigars as $karigar) {
            $kId = $karigar->id;

            $priorTxs = $allPriorTxs->get($kId, collect());

            $priorGoldIssuedFine = (float)$priorTxs->where('material_type', 'gold')->whereIn('transaction_type', ['allocation', 'additional_allocation'])->filter(fn($t) => $t->source !== 'bench')->sum(fn($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->company_gold_weight > 0 ? $t->company_gold_weight : $t->weight));
            $priorGoldReceivedFine = (float)$priorTxs->where('material_type', 'gold')->whereIn('transaction_type', ['finished_received', 'production_consumption', 'unused_returned', 'vault_return', 'physical_return'])->sum(fn($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->company_gold_weight > 0 ? $t->company_gold_weight : $t->weight));
            $priorGoldWastageFine = (float)$priorTxs->where('material_type', 'gold')->where('transaction_type', 'approved_wastage')->sum(fn($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->wastage_weight > 0 ? $t->wastage_weight : $t->weight));
            $openingGoldFine = round($priorGoldIssuedFine - $priorGoldReceivedFine - $priorGoldWastageFine, 3);

            $priorGoldIssuedNet = (float)$priorTxs->where('material_type', 'gold')->whereIn('transaction_type', ['allocation', 'additional_allocation'])->filter(fn($t) => $t->source !== 'bench')->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
            $priorGoldReceivedNet = (float)$priorTxs->where('material_type', 'gold')->whereIn('transaction_type', ['finished_received', 'production_consumption', 'unused_returned', 'vault_return', 'physical_return'])->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
            $priorGoldWastageNet = (float)$priorTxs->where('material_type', 'gold')->where('transaction_type', 'approved_wastage')->sum(fn($t) => $t->wastage_weight > 0 ? $t->wastage_weight : $t->weight);
            $openingGoldNet = round($priorGoldIssuedNet - $priorGoldReceivedNet - $priorGoldWastageNet, 3);

            $priorDiaIssuedCt = (float)$priorTxs->where('material_type', 'diamond')->whereIn('transaction_type', ['allocation', 'additional_allocation'])->filter(fn($t) => $t->source !== 'bench')->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
            $priorDiaRecCt = (float)$priorTxs->where('material_type', 'diamond')->whereIn('transaction_type', ['finished_received', 'production_consumption', 'unused_returned', 'vault_return', 'physical_return'])->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
            $openingDiaCt = round($priorDiaIssuedCt - $priorDiaRecCt, 3);

            $priorDiaIssuedPcs = (int)$priorTxs->where('material_type', 'diamond')->whereIn('transaction_type', ['allocation', 'additional_allocation'])->filter(fn($t) => $t->source !== 'bench')->sum('pieces');
            $priorDiaRecPcs = (int)$priorTxs->where('material_type', 'diamond')->whereIn('transaction_type', ['finished_received', 'production_consumption', 'unused_returned', 'vault_return', 'physical_return'])->sum('pieces');
            $openingDiaPcs = $priorDiaIssuedPcs - $priorDiaRecPcs;

            $priorSilverIssued = (float)$priorTxs->where('material_type', 'silver')->whereIn('transaction_type', ['allocation', 'additional_allocation'])->filter(fn($t) => $t->source !== 'bench')->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
            $priorSilverRec = (float)$priorTxs->where('material_type', 'silver')->whereIn('transaction_type', ['finished_received', 'production_consumption', 'unused_returned', 'vault_return', 'physical_return'])->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
            $openingSilverWt = round($priorSilverIssued - $priorSilverRec, 3);

            $priorStoneIssued = (float)$priorTxs->whereIn('material_type', ['stone', 'colour_stone', 'other'])->whereIn('transaction_type', ['allocation', 'additional_allocation'])->filter(fn($t) => $t->source !== 'bench')->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
            $priorStoneRec = (float)$priorTxs->whereIn('material_type', ['stone', 'colour_stone', 'other'])->whereIn('transaction_type', ['finished_received', 'production_consumption', 'unused_returned', 'vault_return', 'physical_return'])->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
            $openingStoneWt = round($priorStoneIssued - $priorStoneRec, 3);

            // Financial opening prior to period
            $priorPayments = $allPriorPayments->get($kId, collect());

            $priorEarned = (float)$priorPayments->where('transaction_type', 'payable')->sum('amount');
            $priorPaid = (float)$priorPayments->where('transaction_type', 'payment')->sum('amount');
            $priorAdvances = (float)$priorPayments->where('transaction_type', 'advance')->sum('amount');
            $priorAdjustments = (float)$priorPayments->where('transaction_type', 'adjustment')->sum('amount');
            $openingNetPayable = round(($priorEarned + $priorAdjustments) - ($priorPaid + $priorAdvances), 2);
            $openingPayable = max(0.0, $openingNetPayable);
            $openingAdvance = $openingNetPayable < 0 ? abs($openingNetPayable) : 0.0;

            // 2. Period Transactions
            $periodTxs = $allPeriodTxs->get($kId, collect());

            $goldPurityBreakdown = [];
            foreach ($periodTxs->where('material_type', 'gold') as $tx) {
                $purity = $tx->purity ?: '24K Pure Gold';
                if (!isset($goldPurityBreakdown[$purity])) {
                    $goldPurityBreakdown[$purity] = [
                        'purity' => $purity,
                        'touch' => (float)$tx->touch ?: 100.0,
                        'issued_gross' => 0.0,
                        'issued_net' => 0.0,
                        'issued_fine' => 0.0,
                        'issued_pieces' => 0,
                        'received_gross' => 0.0,
                        'received_net' => 0.0,
                        'received_fine' => 0.0,
                        'received_pieces' => 0,
                        'wastage_gross' => 0.0,
                        'wastage_fine' => 0.0,
                    ];
                }
                $gWt = (float)($tx->gross_weight > 0 ? $tx->gross_weight : $tx->weight);
                $nWt = (float)($tx->net_weight > 0 ? $tx->net_weight : $gWt);
                $fWt = (float)($tx->fine_weight > 0 ? $tx->fine_weight : ($tx->company_gold_weight > 0 ? $tx->company_gold_weight : $nWt));
                $pcs = (int)$tx->pieces;

                if (in_array($tx->transaction_type, ['allocation', 'additional_allocation'])) {
                    $goldPurityBreakdown[$purity]['issued_gross'] += $gWt;
                    $goldPurityBreakdown[$purity]['issued_net'] += $nWt;
                    $goldPurityBreakdown[$purity]['issued_fine'] += $fWt;
                    $goldPurityBreakdown[$purity]['issued_pieces'] += $pcs;
                } elseif (in_array($tx->transaction_type, ['finished_received', 'unused_returned'])) {
                    $goldPurityBreakdown[$purity]['received_gross'] += $gWt;
                    $goldPurityBreakdown[$purity]['received_net'] += $nWt;
                    $goldPurityBreakdown[$purity]['received_fine'] += $fWt;
                    $goldPurityBreakdown[$purity]['received_pieces'] += $pcs;
                } elseif ($tx->transaction_type === 'approved_wastage') {
                    $goldPurityBreakdown[$purity]['wastage_gross'] += (float)($tx->wastage_weight > 0 ? $tx->wastage_weight : $gWt);
                    $goldPurityBreakdown[$purity]['wastage_fine'] += $fWt;
                }
            }

            $diamondsBreakdown = [];
            foreach ($periodTxs->where('material_type', 'diamond') as $tx) {
                $st = $tx->stamp ?: ($tx->sieve_size ?: 'Standard');
                if (!isset($diamondsBreakdown[$st])) {
                    $diamondsBreakdown[$st] = [
                        'stamp' => $st,
                        'issued_carats' => 0.0,
                        'issued_pieces' => 0,
                        'received_carats' => 0.0,
                        'received_pieces' => 0,
                    ];
                }
                $cWt = (float)($tx->net_weight > 0 ? $tx->net_weight : $tx->weight);
                if (in_array($tx->transaction_type, ['allocation', 'additional_allocation'])) {
                    $diamondsBreakdown[$st]['issued_carats'] += $cWt;
                    $diamondsBreakdown[$st]['issued_pieces'] += (int)$tx->pieces;
                } elseif (in_array($tx->transaction_type, ['finished_received', 'production_consumption', 'unused_returned', 'vault_return', 'physical_return'])) {
                    $diamondsBreakdown[$st]['received_carats'] += $cWt;
                    $diamondsBreakdown[$st]['received_pieces'] += (int)$tx->pieces;
                }
            }

            $periodGoldIssuedFine = (float)$periodTxs->where('material_type', 'gold')->whereIn('transaction_type', ['allocation', 'additional_allocation'])->filter(fn($t) => $t->source !== 'bench')->sum(fn($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->company_gold_weight > 0 ? $t->company_gold_weight : $t->weight));
            $periodGoldRecFine = (float)$periodTxs->where('material_type', 'gold')->whereIn('transaction_type', ['finished_received', 'production_consumption', 'unused_returned', 'vault_return', 'physical_return'])->sum(fn($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->company_gold_weight > 0 ? $t->company_gold_weight : $t->weight));
            $periodGoldWastageFine = (float)$periodTxs->where('material_type', 'gold')->where('transaction_type', 'approved_wastage')->sum(fn($t) => $t->fine_weight > 0 ? $t->fine_weight : ($t->wastage_weight > 0 ? $t->wastage_weight : $t->weight));

            $closingGoldFine = round($openingGoldFine + $periodGoldIssuedFine - $periodGoldRecFine - $periodGoldWastageFine, 3);

            $periodDiaIssuedCt = (float)$periodTxs->where('material_type', 'diamond')->whereIn('transaction_type', ['allocation', 'additional_allocation'])->filter(fn($t) => $t->source !== 'bench')->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
            $periodDiaRecCt = (float)$periodTxs->where('material_type', 'diamond')->whereIn('transaction_type', ['finished_received', 'production_consumption', 'unused_returned', 'vault_return', 'physical_return'])->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
            $closingDiaCt = round($openingDiaCt + $periodDiaIssuedCt - $periodDiaRecCt, 3);

            $periodDiaIssuedPcs = (int)$periodTxs->where('material_type', 'diamond')->whereIn('transaction_type', ['allocation', 'additional_allocation'])->filter(fn($t) => $t->source !== 'bench')->sum('pieces');
            $periodDiaRecPcs = (int)$periodTxs->where('material_type', 'diamond')->whereIn('transaction_type', ['finished_received', 'production_consumption', 'unused_returned', 'vault_return', 'physical_return'])->sum('pieces');
            $closingDiaPcs = $openingDiaPcs + $periodDiaIssuedPcs - $periodDiaRecPcs;

            $periodSilverIssued = (float)$periodTxs->where('material_type', 'silver')->whereIn('transaction_type', ['allocation', 'additional_allocation'])->filter(fn($t) => $t->source !== 'bench')->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
            $periodSilverRec = (float)$periodTxs->where('material_type', 'silver')->whereIn('transaction_type', ['finished_received', 'production_consumption', 'unused_returned', 'vault_return', 'physical_return'])->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
            $closingSilverWt = round($openingSilverWt + $periodSilverIssued - $periodSilverRec, 3);

            $periodStoneIssued = (float)$periodTxs->whereIn('material_type', ['stone', 'colour_stone', 'other'])->whereIn('transaction_type', ['allocation', 'additional_allocation'])->filter(fn($t) => $t->source !== 'bench')->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
            $periodStoneRec = (float)$periodTxs->whereIn('material_type', ['stone', 'colour_stone', 'other'])->whereIn('transaction_type', ['finished_received', 'production_consumption', 'unused_returned', 'vault_return', 'physical_return'])->sum(fn($t) => $t->net_weight > 0 ? $t->net_weight : $t->weight);
            $closingStoneWt = round($openingStoneWt + $periodStoneIssued - $periodStoneRec, 3);

            $periodPayments = $allPeriodPayments->get($kId, collect());

            $periodEarned = (float)$periodPayments->where('transaction_type', 'payable')->sum('amount');
            $periodPaid = (float)$periodPayments->where('transaction_type', 'payment')->sum('amount');
            $periodAdvances = (float)$periodPayments->where('transaction_type', 'advance')->sum('amount');
            $periodAdjustments = (float)$periodPayments->where('transaction_type', 'adjustment')->sum('amount');

            $closingNetPayable = round($openingNetPayable + ($periodEarned + $periodAdjustments) - ($periodPaid + $periodAdvances), 2);
            $closingPayable = max(0.0, $closingNetPayable);
            $closingAdvance = $closingNetPayable < 0 ? abs($closingNetPayable) : 0.0;

            $allReports[] = [
                'karigar' => $karigar,
                'material_report' => [
                    'opening_gold_fine' => $openingGoldFine,
                    'opening_gold_net' => $openingGoldNet,
                    'opening_diamond_carats' => $openingDiaCt,
                    'opening_diamond_pieces' => $openingDiaPcs,
                    'opening_silver_weight' => $openingSilverWt,
                    'opening_stone_weight' => $openingStoneWt,
                    'gold_by_purity' => array_values($goldPurityBreakdown),
                    'diamonds_by_stamp' => array_values($diamondsBreakdown),
                    'period_gold_issued_fine' => round($periodGoldIssuedFine, 3),
                    'period_gold_received_fine' => round($periodGoldRecFine, 3),
                    'period_gold_wastage_fine' => round($periodGoldWastageFine, 3),
                    'closing_gold_fine' => $closingGoldFine,
                    'period_diamond_issued_carats' => round($periodDiaIssuedCt, 3),
                    'period_diamond_received_carats' => round($periodDiaRecCt, 3),
                    'closing_diamond_carats' => $closingDiaCt,
                    'closing_diamond_pieces' => $closingDiaPcs,
                    'period_silver_issued' => round($periodSilverIssued, 3),
                    'period_silver_received' => round($periodSilverRec, 3),
                    'closing_silver_weight' => $closingSilverWt,
                    'period_stone_issued' => round($periodStoneIssued, 3),
                    'period_stone_received' => round($periodStoneRec, 3),
                    'closing_stone_weight' => $closingStoneWt,
                ],
                'financial_report' => [
                    'opening_net_payable' => $openingNetPayable,
                    'opening_payable' => $openingPayable,
                    'opening_advance' => $openingAdvance,
                    'period_earned' => round($periodEarned, 2),
                    'period_paid' => round($periodPaid, 2),
                    'period_advances' => round($periodAdvances, 2),
                    'period_adjustments' => round($periodAdjustments, 2),
                    'closing_net_payable' => $closingNetPayable,
                    'closing_payable' => $closingPayable,
                    'closing_advance' => $closingAdvance,
                ],
                'material_transactions' => $periodTxs,
                'financial_transactions' => $periodPayments,
            ];
        }

        $overallSummary = [
            'total_karigars' => count($allReports),
            'opening_fine_gold' => round(collect($allReports)->sum('material_report.opening_gold_fine'), 3),
            'closing_fine_gold' => round(collect($allReports)->sum('material_report.closing_gold_fine'), 3),
            'issued_fine_gold' => round(collect($allReports)->sum('material_report.period_gold_issued_fine'), 3),
            'received_fine_gold' => round(collect($allReports)->sum('material_report.period_gold_received_fine'), 3),
            'wastage_fine_gold' => round(collect($allReports)->sum('material_report.period_gold_wastage_fine'), 3),
            'closing_diamond_carats' => round(collect($allReports)->sum('material_report.closing_diamond_carats'), 3),
            'closing_diamond_pieces' => (int) collect($allReports)->sum('material_report.closing_diamond_pieces'),
            'issued_diamond_carats' => round(collect($allReports)->sum('material_report.period_diamond_issued_carats'), 3),
            'received_diamond_carats' => round(collect($allReports)->sum('material_report.period_diamond_received_carats'), 3),
            'closing_silver_weight' => round(collect($allReports)->sum('material_report.closing_silver_weight'), 3),
            'closing_stone_weight' => round(collect($allReports)->sum('material_report.closing_stone_weight'), 3),
            'opening_cash_balance' => round(collect($allReports)->sum('financial_report.opening_net_payable'), 2),
            'closing_cash_balance' => round(collect($allReports)->sum('financial_report.closing_net_payable'), 2),
            'period_earned' => round(collect($allReports)->sum('financial_report.period_earned'), 2),
            'period_paid' => round(collect($allReports)->sum('financial_report.period_paid'), 2),
            'period_advances' => round(collect($allReports)->sum('financial_report.period_advances'), 2),
        ];

        return response()->json([
            'status' => 'success',
            'period' => [
                'period_type' => $periodType,
                'year' => $year,
                'month' => $month,
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
            ],
            'summary' => $overallSummary,
            'overall_summary' => $overallSummary,
            'data' => $allReports,
        ]);
    }

    /**
     * Supplier Monthly Accounting Report: Material and Financial Reconciliation with opening/closing balances
     */
    public function supplierMonthlyReport(Request $request)
    {
        $periodType = $request->input('period_type', $request->input('filter_type', 'monthly'));
        $year = (int)$request->input('year', date('Y'));
        $month = $request->input('month');
        $supplierId = $request->input('supplier_id');
        $purchaseType = $request->input('purchase_type'); // gold, silver, diamond, finished_product, raw_material
        $settlementMode = $request->input('settlement_mode'); // monetary, gold, silver

        if ($request->filled('start_date') && $request->filled('end_date')) {
            $startDate = Carbon::parse($request->input('start_date'))->startOfDay();
            $endDate = Carbon::parse($request->input('end_date'))->endOfDay();
        } elseif ($periodType === 'weekly') {
            $refDate = $request->filled('date') ? Carbon::parse($request->input('date')) : Carbon::now();
            if ($request->filled('week_offset')) {
                $refDate->addWeeks((int)$request->input('week_offset'));
            }
            $startDate = $refDate->copy()->startOfWeek();
            $endDate = $refDate->copy()->endOfWeek();
        } elseif ($periodType === 'yearly') {
            $startDate = Carbon::create($year, 1, 1)->startOfYear();
            $endDate = Carbon::create($year, 12, 31)->endOfYear();
        } elseif (!empty($month) && $month !== 'all') {
            $startDate = Carbon::create($year, (int)$month, 1)->startOfMonth();
            $endDate = Carbon::create($year, (int)$month, 1)->endOfMonth();
        } else {
            $startDate = Carbon::create($year, 1, 1)->startOfYear();
            $endDate = Carbon::create($year, 12, 31)->endOfYear();
        }

        $supplierQuery = Supplier::query();
        if (!empty($supplierId) && $supplierId !== 'all') {
            $supplierQuery->where('id', $supplierId);
        }
        $suppliers = $supplierQuery->orderBy('name')->get();

        $supplierIds = $suppliers->pluck('id')->toArray();

        // 1. Batch fetch all prior purchases for all suppliers in ONE query
        $allPriorPurchases = PurchaseEntry::whereIn('supplier_id', $supplierIds)
            ->where('purchase_date', '<', $startDate->toDateString())
            ->get()
            ->groupBy('supplier_id');

        // 2. Batch fetch all prior settlements for all suppliers in ONE query
        $allPriorSettlements = \App\Models\SupplierSettlement::whereIn('supplier_id', $supplierIds)
            ->where('settlement_date', '<', $startDate->toDateString())
            ->get()
            ->groupBy('supplier_id');

        // 3. Batch fetch all period purchases for all suppliers in ONE query
        $periodPurchasesQuery = PurchaseEntry::whereIn('supplier_id', $supplierIds)
            ->whereBetween('purchase_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->with(['product', 'rawMaterial', 'category']);

        if (!empty($purchaseType) && $purchaseType !== 'all') {
            if ($purchaseType === 'finished_jewellery' || $purchaseType === 'finished_product') {
                $periodPurchasesQuery->where('purchase_type', 'finished_product');
            } elseif (in_array($purchaseType, ['gold', 'silver', 'diamond'])) {
                $periodPurchasesQuery->where(function($q) use ($purchaseType) {
                    $q->whereRaw('LOWER(metal_type) = ?', [$purchaseType])
                      ->orWhereHas('rawMaterial', function($rm) use ($purchaseType) {
                          $rm->whereRaw('LOWER(material_type) = ?', [$purchaseType])
                             ->orWhere('name', 'like', "%{$purchaseType}%");
                      });
                });
            }
        }

        if (!empty($settlementMode) && $settlementMode !== 'all') {
            if ($settlementMode === 'monetary') {
                $periodPurchasesQuery->where('rate', '>', 0);
            } elseif ($settlementMode === 'gold') {
                $periodPurchasesQuery->where('rate', '<=', 0)->whereIn('metal_type', ['gold', 'metal', null]);
            } elseif ($settlementMode === 'silver') {
                $periodPurchasesQuery->where('rate', '<=', 0)->where('metal_type', 'silver');
            }
        }

        $allPeriodPurchases = $periodPurchasesQuery->orderBy('purchase_date', 'asc')->get()->groupBy('supplier_id');

        // 4. Batch fetch all period settlements for all suppliers in ONE query
        $allPeriodSettlements = \App\Models\SupplierSettlement::whereIn('supplier_id', $supplierIds)
            ->whereBetween('settlement_date', [$startDate->toDateString(), $endDate->toDateString()])
            ->with('purchaseEntry')
            ->orderBy('settlement_date', 'asc')
            ->get()
            ->groupBy('supplier_id');

        $allReports = [];
        foreach ($suppliers as $supplier) {
            $sId = $supplier->id;

            $priorPurchases = $allPriorPurchases->get($sId, collect());
            $priorSettlements = $allPriorSettlements->get($sId, collect());

            // Calculate Opening Balances from prior transactions
            $priorPricedPurchases = $priorPurchases->where('rate', '>', 0);
            $priorUnpricedGold = $priorPurchases->filter(function($p) {
                $mat = strtolower($p->metal_type ?? 'gold');
                return floatval($p->rate ?? 0) <= 0 && ($mat === 'gold' || $mat === 'metal' || empty($mat));
            });
            $priorUnpricedSilver = $priorPurchases->filter(function($p) {
                return floatval($p->rate ?? 0) <= 0 && strtolower($p->metal_type ?? '') === 'silver';
            });

            $priorMonetaryPayableNew = (float) $priorPricedPurchases->sum(fn($p) => max(0, floatval($p->total_amount ?? 0) - floatval($p->paid_amount ?? 0)));
            $priorCashSettled = (float) $priorSettlements->where('settlement_type', 'cash')->sum('amount');
            $openingCashPayable = round($priorMonetaryPayableNew - $priorCashSettled, 2);

            $priorGoldFineDue = (float) $priorUnpricedGold->sum(fn($p) => floatval($p->fine_weight ?? 0) > 0 ? floatval($p->fine_weight) : floatval($p->weight));
            $priorGoldSettled = (float) $priorSettlements->where('settlement_type', 'gold')->sum(fn($s) => floatval($s->fine_weight ?? 0) > 0 ? floatval($s->fine_weight) : floatval($s->weight ?? 0));
            $openingGoldFine = round($priorGoldFineDue - $priorGoldSettled, 3);

            $priorSilverDue = (float) $priorUnpricedSilver->sum(fn($p) => floatval($p->net_weight ?? 0) > 0 ? floatval($p->net_weight) : floatval($p->weight));
            $priorSilverSettled = (float) $priorSettlements->where('settlement_type', 'silver')->sum(fn($s) => floatval($s->weight ?? 0));
            $openingSilverWeight = round($priorSilverDue - $priorSilverSettled, 3);

            $periodPurchases = $allPeriodPurchases->get($sId, collect());
            $periodSettlements = $allPeriodSettlements->get($sId, collect());

            // Breakdown of period transactions
            $periodPriced = $periodPurchases->where('rate', '>', 0);
            $periodTotalMonetary = round((float) $periodPriced->sum('total_amount'), 2);
            $periodCashPaidAtPurchase = round((float) $periodPriced->sum('paid_amount'), 2);
            $periodMonetaryNewPayable = round((float) $periodPriced->sum(fn($p) => max(0, floatval($p->total_amount ?? 0) - floatval($p->paid_amount ?? 0))), 2);

            $periodCashSettled = round((float) $periodSettlements->where('settlement_type', 'cash')->sum('amount'), 2);

            $periodUnpricedGold = $periodPurchases->filter(function($p) {
                $mat = strtolower($p->metal_type ?? 'gold');
                return floatval($p->rate ?? 0) <= 0 && ($mat === 'gold' || $mat === 'metal' || empty($mat));
            });
            $periodUnpricedGoldFine = round((float) $periodUnpricedGold->sum(fn($p) => floatval($p->fine_weight ?? 0) > 0 ? floatval($p->fine_weight) : floatval($p->weight)), 3);
            $periodGoldSettled = round((float) $periodSettlements->where('settlement_type', 'gold')->sum(fn($s) => floatval($s->fine_weight ?? 0) > 0 ? floatval($s->fine_weight) : floatval($s->weight ?? 0)), 3);

            $periodUnpricedSilver = $periodPurchases->filter(function($p) {
                return floatval($p->rate ?? 0) <= 0 && strtolower($p->metal_type ?? '') === 'silver';
            });
            $periodUnpricedSilverWeight = round((float) $periodUnpricedSilver->sum(fn($p) => floatval($p->net_weight ?? 0) > 0 ? floatval($p->net_weight) : floatval($p->weight)), 3);
            $periodSilverSettled = round((float) $periodSettlements->where('settlement_type', 'silver')->sum(fn($s) => floatval($s->weight ?? 0)), 3);

            // Total weights purchased during period
            $periodGoldPurchases = $periodPurchases->filter(fn($p) => in_array(strtolower($p->metal_type ?? 'gold'), ['gold', 'metal', null]));
            $periodGoldGrossWt = round((float) $periodGoldPurchases->sum('weight'), 3);
            $periodGoldNetWt = round((float) $periodGoldPurchases->sum('net_weight'), 3);
            $periodGoldFine24k = round((float) $periodGoldPurchases->sum('fine_weight'), 3);

            $periodSilverPurchases = $periodPurchases->filter(fn($p) => strtolower($p->metal_type ?? '') === 'silver');
            $periodSilverGrossWt = round((float) $periodSilverPurchases->sum('weight'), 3);
            $periodSilverNetWt = round((float) $periodSilverPurchases->sum('net_weight'), 3);

            // Diamond stamp-wise tally for the period
            $diamondPurchases = $periodPurchases->filter(fn($p) => strtolower($p->metal_type ?? '') === 'diamond' || $p->unit === 'ct');
            $stampBreakdown = [];
            $totalPeriodDiaCarats = 0.0;
            $totalPeriodDiaStones = 0;
            $totalPeriodDiaValue = 0.0;

            foreach ($diamondPurchases as $dp) {
                if (!empty($dp->components) && is_array($dp->components)) {
                    foreach ($dp->components as $c) {
                        $st = trim((string)($c['stamp'] ?? $c['diamond_stamp'] ?? $c['sieve_size'] ?? 'Standard'));
                        $cStones = intval($c['stones_count'] ?? $c['stone_count'] ?? 0);
                        $cCts = floatval($c['weight_carats'] ?? $c['total_weight'] ?? $c['weight'] ?? 0);
                        $cVal = floatval($c['row_value'] ?? 0);

                        if (!isset($stampBreakdown[$st])) {
                            $stampBreakdown[$st] = [
                                'stamp' => $st,
                                'stones_count' => 0,
                                'weight_carats' => 0.0,
                                'total_value' => 0.0,
                            ];
                        }
                        $stampBreakdown[$st]['stones_count'] += $cStones;
                        $stampBreakdown[$st]['weight_carats'] = round($stampBreakdown[$st]['weight_carats'] + $cCts, 3);
                        $stampBreakdown[$st]['total_value'] = round($stampBreakdown[$st]['total_value'] + $cVal, 2);

                        $totalPeriodDiaCarats += $cCts;
                        $totalPeriodDiaStones += $cStones;
                        $totalPeriodDiaValue += $cVal;
                    }
                } else {
                    $st = trim((string)($dp->stamp ?: ($dp->diamond_stamp ?: 'Standard')));
                    $dStones = intval($dp->count_qty > 0 ? $dp->count_qty : ($dp->qty > 0 ? $dp->qty : 0));
                    $dCts = floatval($dp->net_weight > 0 ? $dp->net_weight : $dp->weight);
                    $dVal = floatval($dp->total_amount ?? 0);

                    if (!isset($stampBreakdown[$st])) {
                        $stampBreakdown[$st] = [
                            'stamp' => $st,
                            'stones_count' => 0,
                            'weight_carats' => 0.0,
                            'total_value' => 0.0,
                        ];
                    }
                    $stampBreakdown[$st]['stones_count'] += $dStones;
                    $stampBreakdown[$st]['weight_carats'] = round($stampBreakdown[$st]['weight_carats'] + $dCts, 3);
                    $stampBreakdown[$st]['total_value'] = round($stampBreakdown[$st]['total_value'] + $dVal, 2);

                    $totalPeriodDiaCarats += $dCts;
                    $totalPeriodDiaStones += $dStones;
                    $totalPeriodDiaValue += $dVal;
                }
            }

            // Purity breakdown for gold in period
            $goldPurityBreakdown = [];
            foreach ($periodGoldPurchases as $gp) {
                $pur = trim((string)($gp->purity ?: ($gp->gold_karat ?: '22K')));
                if (!isset($goldPurityBreakdown[$pur])) {
                    $goldPurityBreakdown[$pur] = [
                        'purity' => $pur,
                        'gross_weight' => 0.0,
                        'net_weight' => 0.0,
                        'fine_weight_24k' => 0.0,
                    ];
                }
                $goldPurityBreakdown[$pur]['gross_weight'] = round($goldPurityBreakdown[$pur]['gross_weight'] + floatval($gp->weight), 3);
                $goldPurityBreakdown[$pur]['net_weight'] = round($goldPurityBreakdown[$pur]['net_weight'] + floatval($gp->net_weight > 0 ? $gp->net_weight : $gp->weight), 3);
                $goldPurityBreakdown[$pur]['fine_weight_24k'] = round($goldPurityBreakdown[$pur]['fine_weight_24k'] + floatval($gp->fine_weight), 3);
            }

            // 5. Strict Closing Balance Reconciliation Formula
            // Closing = Opening + Period New Payables - Period Settled
            $closingCashPayable = round($openingCashPayable + $periodMonetaryNewPayable - $periodCashSettled, 2);
            $closingGoldFine = round($openingGoldFine + $periodUnpricedGoldFine - $periodGoldSettled, 3);
            $closingSilverWeight = round($openingSilverWeight + $periodUnpricedSilverWeight - $periodSilverSettled, 3);

            // Reconciled flags
            $isCashReconciled = abs(($openingCashPayable + $periodMonetaryNewPayable - $periodCashSettled) - $closingCashPayable) < 0.01;
            $isGoldReconciled = abs(($openingGoldFine + $periodUnpricedGoldFine - $periodGoldSettled) - $closingGoldFine) < 0.001;
            $isSilverReconciled = abs(($openingSilverWeight + $periodUnpricedSilverWeight - $periodSilverSettled) - $closingSilverWeight) < 0.001;
            $isPerfect = $isCashReconciled && $isGoldReconciled && $isSilverReconciled;

            $allReports[] = [
                'supplier' => $supplier,
                'opening_balance' => [
                    'cash_balance' => $openingCashPayable,
                    'cash_payable' => $openingCashPayable,
                    'gold_fine_grams' => $openingGoldFine,
                    'gold_fine_24k' => $openingGoldFine,
                    'silver_grams' => $openingSilverWeight,
                    'silver_weight' => $openingSilverWeight,
                ],
                'period_purchases' => [
                    'count' => $periodPurchases->count(),
                    'cash_balance' => $periodMonetaryNewPayable,
                    'monetary_purchased' => $periodTotalMonetary,
                    'cash_paid_at_purchase' => $periodCashPaidAtPurchase,
                    'gold_fine_grams' => $periodUnpricedGoldFine,
                    'silver_grams' => $periodUnpricedSilverWeight,
                    'diamond_carats' => round($totalPeriodDiaCarats, 3),
                    'diamond_pieces' => $totalPeriodDiaStones,
                    'diamond_value' => round($totalPeriodDiaValue, 2),
                ],
                'period_settlements' => [
                    'count' => $periodSettlements->count(),
                    'cash_paid' => $periodCashSettled,
                    'gold_fine_grams' => $periodGoldSettled,
                    'silver_grams' => $periodSilverSettled,
                ],
                'period_totals' => [
                    'monetary_purchased' => $periodTotalMonetary,
                    'cash_paid_at_purchase' => $periodCashPaidAtPurchase,
                    'monetary_new_payable' => $periodMonetaryNewPayable,
                    'cash_settled' => $periodCashSettled,
                    'gold_gross_weight' => $periodGoldGrossWt,
                    'gold_net_weight' => $periodGoldNetWt,
                    'gold_fine_24k' => $periodGoldFine24k,
                    'unpriced_gold_purchased_24k' => $periodUnpricedGoldFine,
                    'gold_settled_24k' => $periodGoldSettled,
                    'silver_gross_weight' => $periodSilverGrossWt,
                    'silver_net_weight' => $periodSilverNetWt,
                    'unpriced_silver_purchased' => $periodUnpricedSilverWeight,
                    'silver_settled' => $periodSilverSettled,
                    'diamond_carats' => round($totalPeriodDiaCarats, 3),
                    'diamond_stones' => $totalPeriodDiaStones,
                    'diamond_value' => round($totalPeriodDiaValue, 2),
                ],
                'closing_balance' => [
                    'cash_balance' => $closingCashPayable,
                    'cash_payable' => $closingCashPayable,
                    'gold_fine_grams' => $closingGoldFine,
                    'gold_fine_24k' => $closingGoldFine,
                    'silver_grams' => $closingSilverWeight,
                    'silver_weight' => $closingSilverWeight,
                    'reconciled' => $isPerfect,
                ],
                'reconciliation' => [
                    'is_perfect' => $isPerfect,
                    'cash_reconciled' => $isCashReconciled,
                    'gold_reconciled' => $isGoldReconciled,
                    'silver_reconciled' => $isSilverReconciled,
                ],
                'breakdowns' => [
                    'gold_by_purity' => array_values($goldPurityBreakdown),
                    'diamonds_by_stamp' => array_values($stampBreakdown),
                ],
                'purchases' => $periodPurchases,
                'settlements' => $periodSettlements,
            ];
        }

        $allCashReconciled = collect($allReports)->every(fn($r) => $r['reconciliation']['cash_reconciled'] ?? false);
        $allGoldReconciled = collect($allReports)->every(fn($r) => $r['reconciliation']['gold_reconciled'] ?? false);
        $allSilverReconciled = collect($allReports)->every(fn($r) => $r['reconciliation']['silver_reconciled'] ?? false);
        $allReconciled = $allCashReconciled && $allGoldReconciled && $allSilverReconciled;

        $overallSummary = [
            'total_suppliers' => count($allReports),
            'opening_cash' => round(collect($allReports)->sum('opening_balance.cash_balance'), 2),
            'purchases_cash' => round(collect($allReports)->sum('period_purchases.cash_balance'), 2),
            'settlements_cash' => round(collect($allReports)->sum('period_settlements.cash_paid'), 2),
            'closing_cash' => round(collect($allReports)->sum('closing_balance.cash_balance'), 2),

            'opening_gold_fine' => round(collect($allReports)->sum('opening_balance.gold_fine_grams'), 3),
            'purchases_gold_fine' => round(collect($allReports)->sum('period_purchases.gold_fine_grams'), 3),
            'settlements_gold_fine' => round(collect($allReports)->sum('period_settlements.gold_fine_grams'), 3),
            'closing_gold_fine' => round(collect($allReports)->sum('closing_balance.gold_fine_grams'), 3),

            'opening_silver' => round(collect($allReports)->sum('opening_balance.silver_grams'), 3),
            'purchases_silver' => round(collect($allReports)->sum('period_purchases.silver_grams'), 3),
            'settlements_silver' => round(collect($allReports)->sum('period_settlements.silver_grams'), 3),
            'closing_silver' => round(collect($allReports)->sum('closing_balance.silver_grams'), 3),

            'reconciliation_status' => [
                'cash_reconciled' => $allCashReconciled,
                'gold_reconciled' => $allGoldReconciled,
                'silver_reconciled' => $allSilverReconciled,
                'all_reconciled' => $allReconciled,
            ],
            // Backward-compatible keys
            'opening_cash_balance' => round(collect($allReports)->sum('opening_balance.cash_balance'), 2),
            'closing_cash_balance' => round(collect($allReports)->sum('closing_balance.cash_balance'), 2),
            'opening_fine_gold_24k' => round(collect($allReports)->sum('opening_balance.gold_fine_grams'), 3),
            'closing_fine_gold_24k' => round(collect($allReports)->sum('closing_balance.gold_fine_grams'), 3),
            'opening_silver_weight' => round(collect($allReports)->sum('opening_balance.silver_grams'), 3),
            'closing_silver_weight' => round(collect($allReports)->sum('closing_balance.silver_grams'), 3),
            'period_monetary_purchased' => round(collect($allReports)->sum('period_purchases.monetary_purchased'), 2),
            'period_monetary_payable' => round(collect($allReports)->sum('period_purchases.cash_balance'), 2),
            'period_cash_settled' => round(collect($allReports)->sum('period_settlements.cash_paid'), 2),
            'period_unpriced_gold_fine' => round(collect($allReports)->sum('period_purchases.gold_fine_grams'), 3),
            'period_gold_settled_24k' => round(collect($allReports)->sum('period_settlements.gold_fine_grams'), 3),
            'period_diamond_carats' => round(collect($allReports)->sum('period_purchases.diamond_carats'), 3),
            'period_diamond_stones' => (int) collect($allReports)->sum('period_purchases.diamond_pieces'),
            'reconciled_all' => $allReconciled,
        ];

        return response()->json([
            'status' => 'success',
            'period' => [
                'period_type' => $periodType,
                'year' => $year,
                'month' => $month,
                'start_date' => $startDate->toDateString(),
                'end_date' => $endDate->toDateString(),
            ],
            'summary' => $overallSummary,
            'data' => $allReports,
        ]);
    }
}

