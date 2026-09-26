<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $periodParam = strtolower($request->get('period', 'month'));
        $cacheKey = "dashboard_data_perf_v3_{$periodParam}";

        $cachedResult = Cache::remember($cacheKey, 15, function () use ($request, $periodParam) {
            $startDate = match($periodParam) {
                'today' => Carbon::today(),
                'week' => Carbon::now()->startOfWeek(),
                'month' => Carbon::now()->startOfMonth(),
                'quarter' => Carbon::now()->startOfQuarter(),
                'year' => Carbon::now()->startOfYear(),
                'all' => Carbon::create(2000, 1, 1),
                default => Carbon::now()->startOfMonth(),
            };

        $endDate = match($periodParam) {
            'today' => Carbon::today()->endOfDay(),
            'week' => Carbon::now()->endOfWeek(),
            'month' => Carbon::now()->endOfMonth(),
            'quarter' => Carbon::now()->endOfQuarter(),
            'year' => Carbon::now()->endOfYear(),
            'all' => Carbon::now()->addYears(10),
            default => Carbon::now()->endOfMonth(),
        };

        $prevPeriodStart = match($periodParam) {
            'today' => Carbon::yesterday(),
            'week' => Carbon::now()->subWeek()->startOfWeek(),
            'month' => Carbon::now()->subMonth()->startOfMonth(),
            'quarter' => Carbon::now()->subQuarter()->startOfQuarter(),
            'year' => Carbon::now()->subYear()->startOfYear(),
            'all' => Carbon::create(1990, 1, 1),
            default => Carbon::now()->subMonth()->startOfMonth(),
        };

        $prevPeriodEnd = match($periodParam) {
            'today' => Carbon::yesterday()->endOfDay(),
            'week' => Carbon::now()->subWeek()->endOfWeek(),
            'month' => Carbon::now()->subMonth()->endOfMonth(),
            'quarter' => Carbon::now()->subQuarter()->endOfQuarter(),
            'year' => Carbon::now()->subYear()->endOfYear(),
            'all' => Carbon::create(1999, 12, 31),
            default => Carbon::now()->subMonth()->endOfMonth(),
        };

        $vsLabel = match($periodParam) {
            'today' => 'vs Yesterday',
            'week' => 'vs Last Week',
            'month' => 'vs Last Month',
            'quarter' => 'vs Last Quarter',
            'year' => 'vs Last Year',
            'all' => 'All Time',
            default => 'vs Last Month',
        };

        // Helper for dynamic percentage changes & direction
        $calcMetricChange = function ($curr, $prev) use ($vsLabel) {
            $curr = (float) $curr;
            $prev = (float) $prev;
            if ($prev > 0) {
                $pct = round((($curr - $prev) / $prev) * 100, 1);
                return [
                    'change' => ($pct >= 0 ? '+' : '') . number_format($pct, 1) . '%',
                    'is_increase' => $pct >= 0,
                    'pct' => $pct,
                    'vs_label' => $vsLabel,
                ];
            }
            if ($curr > 0) {
                return [
                    'change' => '+100.0%',
                    'is_increase' => true,
                    'pct' => 100.0,
                    'vs_label' => $vsLabel,
                ];
            }
            return [
                'change' => '+0.0%',
                'is_increase' => true,
                'pct' => 0.0,
                'vs_label' => $vsLabel,
            ];
        };

        // 1. Sales Metric
        $totalSales = (float) \App\Models\Invoice::sum('total_amount');
        $periodSalesRaw = (float) \App\Models\Invoice::where('created_at', '>=', $startDate)->sum('total_amount');
        $prevPeriodSales = (float) \App\Models\Invoice::whereBetween('created_at', [$prevPeriodStart, $prevPeriodEnd])->sum('total_amount');
        $salesMetricChange = $calcMetricChange($periodSalesRaw, $prevPeriodSales);

        // Today's Sales
        $todaysSalesRaw = (float) \App\Models\Invoice::whereDate('created_at', Carbon::today())->sum('total_amount');

        // 2. Orders Metric
        $periodOrdersCount = \App\Models\Invoice::where('created_at', '>=', $startDate)->count();
        $prevPeriodOrdersCount = \App\Models\Invoice::whereBetween('created_at', [$prevPeriodStart, $prevPeriodEnd])->count();
        $totalOrders = \App\Models\Invoice::count();
        $ordersMetricChange = $calcMetricChange($periodOrdersCount, $prevPeriodOrdersCount);

        // 3. Customers Metric
        $activeClients = \App\Models\Client::count();
        $periodClientsCount = \App\Models\Client::where('created_at', '>=', $startDate)->count();
        $prevClientsCount = \App\Models\Client::whereBetween('created_at', [$prevPeriodStart, $prevPeriodEnd])->count();
        $clientsMetricChange = $calcMetricChange($periodClientsCount, $prevClientsCount);

        // 4. Inventory Valuation Metric
        $totalProducts = \App\Models\Product::count();
        $productsList = \App\Models\Product::select('id', 'opening_stock_rate', 'opening_stock_qty', 'current_stock_qty', 'opening_stock_weight', 'attributes', 'created_at')->get();
        $calcProdVal = function($p) {
            $attrs = is_array($p->attributes) ? $p->attributes : json_decode($p->attributes ?? '[]', true);
            $rate = (float) ($p->opening_stock_rate ?: ($attrs['sale_rate'] ?? $attrs['rate'] ?? 0));
            $qty = (int) ($p->current_stock_qty ?? $p->opening_stock_qty ?? 0);
            $wt = (float) ($attrs['gross_wt'] ?? $p->opening_stock_weight ?? 0);
            return $qty * $wt * $rate;
        };
        $inventoryValuation = (float) $productsList->sum($calcProdVal);
        $prevInvVal = (float) $productsList->filter(fn($p) => $p->created_at < $startDate)->sum($calcProdVal);
        $invMetricChange = $calcMetricChange($inventoryValuation, $prevInvVal);

        // 5. Active Artisans & Pending Orders
        $activeArtisans = \App\Models\Karigar::where('status', 'active')->count();
        $pendingOrdersCount = \App\Models\WorkOrder::whereIn('status', ['pending', 'in_progress', 'pending_approval', 'created'])->count();
        $periodPendingCount = \App\Models\WorkOrder::whereIn('status', ['pending', 'in_progress', 'pending_approval', 'created'])->where('created_at', '>=', $startDate)->count();
        $prevPendingCount = \App\Models\WorkOrder::whereIn('status', ['pending', 'in_progress', 'pending_approval', 'created'])->whereBetween('created_at', [$prevPeriodStart, $prevPeriodEnd])->count();
        $pendingMetricChange = $calcMetricChange($periodPendingCount, $prevPendingCount);

        // Dynamic Chart Points from Invoices table for selected period
        $chartPointsQuery = \App\Models\Invoice::where('created_at', '>=', $startDate);
        if ($periodParam === 'today') {
            $chartPoints = $chartPointsQuery->selectRaw('HOUR(created_at) as hr, SUM(total_amount) as total')
                ->groupBy('hr')->orderBy('hr', 'asc')->get()->map(function ($inv) {
                    return [
                        'date' => sprintf('%02d:00', $inv->hr),
                        'val' => round((float) $inv->total / 100000, 2),
                        'label' => '₹' . number_format($inv->total / 100000, 1) . 'L',
                    ];
                })->toArray();
        } else {
            $chartPoints = $chartPointsQuery->selectRaw('DATE(created_at) as date, SUM(total_amount) as total')
                ->groupBy('date')->orderBy('date', 'asc')->get()->map(function ($inv) {
                    return [
                        'date' => Carbon::parse($inv->date)->format('d M'),
                        'val' => round((float) $inv->total / 100000, 2),
                        'label' => '₹' . number_format($inv->total / 100000, 1) . 'L',
                    ];
                })->toArray();
        }

        // 1. Recent Orders (Combining WorkOrders and Invoices)
        $ordersList = collect();

        // Work Orders
        $woQuery = \App\Models\WorkOrder::with('client');
        if ($periodParam !== 'all') {
            $woQuery->where('created_at', '>=', $startDate);
        }
        $workOrders = $woQuery->orderBy('created_at', 'desc')->take(5)->get();

        foreach ($workOrders as $wo) {
            $statusLabel = match($wo->status) {
                'in_progress' => 'In Progress',
                'pending', 'pending_approval', 'created' => 'Pending',
                'quality_check' => 'Quality Check',
                'completed', 'ready', 'delivered' => 'Delivered',
                default => 'In Progress'
            };
            $statusStyle = match($wo->status) {
                'in_progress' => 'bg-blue-50 text-blue-600',
                'pending', 'pending_approval', 'created' => 'bg-amber-50 text-amber-700',
                'quality_check' => 'bg-purple-50 text-purple-700',
                'completed', 'ready', 'delivered' => 'bg-emerald-50 text-emerald-700',
                default => 'bg-blue-50 text-blue-600'
            };
            $ordersList->push([
                'id' => $wo->work_order_number ?: ('ORD-2026-' . (1050 + $wo->id)),
                'name' => $wo->client ? $wo->client->full_name : ($wo->customer_name ?? 'Client Order'),
                'status' => $statusLabel,
                'style' => $statusStyle,
                'created_at' => $wo->created_at,
            ]);
        }

        // Recent Invoices (Sales Orders)
        $invQuery = \App\Models\Invoice::with('client');
        if ($periodParam !== 'all') {
            $invQuery->where('created_at', '>=', $startDate);
        }
        $recentInvoices = $invQuery->orderBy('created_at', 'desc')->take(5)->get();
        foreach ($recentInvoices as $inv) {
            $statusLabel = match($inv->status) {
                'paid' => 'Delivered',
                'partial' => 'In Progress',
                'pending', 'unpaid' => 'Pending',
                default => 'Delivered'
            };
            $statusStyle = match($inv->status) {
                'paid' => 'bg-emerald-50 text-emerald-700',
                'partial' => 'bg-blue-50 text-blue-600',
                'pending', 'unpaid' => 'bg-amber-50 text-amber-700',
                default => 'bg-emerald-50 text-emerald-700'
            };
            $ordersList->push([
                'id' => $inv->invoice_number ?: ('INV-2026-' . sprintf('%03d', $inv->id)),
                'name' => $inv->client_name ?: ($inv->client ? $inv->client->full_name : 'Retail Customer'),
                'status' => $statusLabel,
                'style' => $statusStyle,
                'created_at' => $inv->created_at,
            ]);
        }

        $recentOrders = $ordersList->sortByDesc('created_at')
            ->take(5)
            ->values()
            ->map(function ($item) {
                unset($item['created_at']);
                return $item;
            })
            ->toArray();

        // 2. Top Selling Categories (Connected directly to Masters Category table)
        $masterCategories = \App\Models\Category::all();
        
        $categoriesMeta = [];
        if ($masterCategories->isNotEmpty()) {
            foreach ($masterCategories as $mc) {
                $catId = $mc->id;
                $name = $mc->name;
                $code = $mc->code ?? '';
                $kws = array_filter([strtolower($name), strtolower($code)]);
                if (str_contains(strtolower($name), 'gold')) $kws = array_merge($kws, ['gold', '22k', '24k', '18k']);
                if (str_contains(strtolower($name), 'silver')) $kws = array_merge($kws, ['silver', '925']);
                if (str_contains(strtolower($name), 'diamond')) $kws = array_merge($kws, ['diamond', 'solitaire', 'ct']);
                if (str_contains(strtolower($name), 'ring')) $kws = array_merge($kws, ['ring']);
                if (str_contains(strtolower($name), 'bangle')) $kws = array_merge($kws, ['bangle', 'kaddas']);
                if (str_contains(strtolower($name), 'chain') || str_contains(strtolower($name), 'necklace')) $kws = array_merge($kws, ['chain', 'necklace', 'har']);

                $icon = match(true) {
                    str_contains(strtolower($name), 'gold') => '✨',
                    str_contains(strtolower($name), 'silver') => '🪙',
                    str_contains(strtolower($name), 'diamond') => '💎',
                    str_contains(strtolower($name), 'ring') => '💍',
                    str_contains(strtolower($name), 'bangle') => '💫',
                    str_contains(strtolower($name), 'chain') || str_contains(strtolower($name), 'necklace') => '📿',
                    default => '🏷️',
                };

                // Get product IDs belonging to this category from Product master
                $prodIds = \App\Models\Product::where('category_id', $catId)->pluck('id')->toArray();

                $categoriesMeta[$name] = [
                    'id' => $catId,
                    'icon' => $icon,
                    'keywords' => array_unique($kws),
                    'product_ids' => $prodIds
                ];
            }
        }

        $calcCategorySalesForRange = function($meta, $rangeStart, $rangeEnd = null) {
            $sum = 0.0;
            $keywords = $meta['keywords'] ?? [];
            $prodIds = $meta['product_ids'] ?? [];
            $catId = $meta['id'] ?? null;
            
            // A. Search SaleItem records by product_id or category_id or name keywords
            $siQuery = \App\Models\SaleItem::query();
            if ($rangeStart) $siQuery->where('created_at', '>=', $rangeStart);
            if ($rangeEnd) $siQuery->where('created_at', '<=', $rangeEnd);
            
            foreach ($siQuery->get() as $item) {
                $pId = $item->product_id ?? null;
                $cId = $item->category_id ?? null;
                $pName = strtolower($item->product_name ?? '');
                $cName = strtolower($item->category ?? '');
                $mType = strtolower($item->metal_type ?? '');
                
                $matched = false;
                if ($catId && $cId == $catId) $matched = true;
                if (!$matched && $pId && in_array($pId, $prodIds)) $matched = true;
                if (!$matched) {
                    foreach ($keywords as $kw) {
                        if ($kw && (str_contains($pName, $kw) || str_contains($cName, $kw) || str_contains($mType, $kw))) {
                            $matched = true;
                            break;
                        }
                    }
                }
                
                if ($matched) {
                    $sum += (float) ($item->line_total ?: $item->total_price ?: 0);
                }
            }
            
            // B. Search Invoice items JSON if SaleItem produced 0
            if ($sum == 0.0) {
                $invQuery = \App\Models\Invoice::query();
                if ($rangeStart) $invQuery->where('created_at', '>=', $rangeStart);
                if ($rangeEnd) $invQuery->where('created_at', '<=', $rangeEnd);
                
                foreach ($invQuery->get() as $inv) {
                    $items = is_array($inv->items) ? $inv->items : json_decode($inv->items ?? '[]', true);
                    if (is_array($items)) {
                        foreach ($items as $it) {
                            $itPId = $it['product_id'] ?? $it['id'] ?? null;
                            $desc = strtolower($it['description'] ?? $it['name'] ?? $it['item_name'] ?? '');
                            $matched = false;
                            if ($itPId && in_array($itPId, $prodIds)) $matched = true;
                            if (!$matched) {
                                foreach ($keywords as $kw) {
                                    if ($kw && str_contains($desc, $kw)) {
                                        $matched = true;
                                        break;
                                    }
                                }
                            }
                            if ($matched) {
                                $sum += (float) ($it['total'] ?? $it['amount'] ?? $it['line_total'] ?? 0);
                            }
                        }
                    }
                }
            }
            
            return $sum;
        };

        $topCategoriesList = [];
        foreach ($categoriesMeta as $catName => $meta) {
            $catSales = $calcCategorySalesForRange($meta, $startDate, null);
            $catSalesPrev = $calcCategorySalesForRange($meta, $prevPeriodStart, $prevPeriodEnd);

            $catGrowthPct = $catSalesPrev > 0 
                ? round((($catSales - $catSalesPrev) / $catSalesPrev) * 100, 1) 
                : ($catSales > 0 ? 100.0 : 0.0);
            
            $catGrowthStr = ($catGrowthPct >= 0 ? '↑ ' : '↓ ') . number_format(abs($catGrowthPct), 1) . '%';

            $topCategoriesList[] = [
                'icon' => $meta['icon'],
                'name' => $catName,
                'raw_sales' => $catSales,
                'sales' => '₹ ' . number_format($catSales, 0),
                'growth' => $catGrowthStr,
                'is_increase' => $catGrowthPct >= 0,
            ];
        }

        // Sort by sales descending and slice top 5
        usort($topCategoriesList, fn($a, $b) => $b['raw_sales'] <=> $a['raw_sales']);
        $topCategories = array_slice($topCategoriesList, 0, 5);

        // 3. Action Required Table (Low stock, pending payments, active work order alerts)
        $actionList = collect();

        // A. Low Stock Inventory Products (stock <= 2)
        $lowStockProducts = \App\Models\Product::where('current_stock_qty', '<=', 2)
            ->take(5)
            ->get();
        foreach ($lowStockProducts as $lp) {
            $actionList->push([
                'icon' => '⚠️',
                'name' => $lp->name,
                'sales' => 'Stock: ' . ($lp->current_stock_qty ?? 0) . ' Units',
                'growth' => 'Low Stock',
            ]);
        }

        // B. Unpaid or Partial Client Invoices
        $pendingInvoices = \App\Models\Invoice::whereIn('status', ['pending', 'partial', 'unpaid'])
            ->orWhere('due_amount', '>', 0)
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();
        foreach ($pendingInvoices as $inv) {
            $dueAmt = (float) ($inv->due_amount ?: ($inv->total_amount - ($inv->paid_amount ?? 0)));
            if ($dueAmt > 0) {
                $actionList->push([
                    'icon' => '💳',
                    'name' => ($inv->invoice_number ?: 'Invoice') . ' (' . ($inv->client_name ?? 'Client') . ')',
                    'sales' => 'Due: ₹' . number_format($dueAmt, 0),
                    'growth' => 'Payment Due',
                ]);
            }
        }

        // C. Pending Job Work Orders
        $pendingWorkOrders = \App\Models\WorkOrder::whereIn('status', ['pending', 'in_progress', 'pending_approval'])
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get();
        foreach ($pendingWorkOrders as $pWo) {
            $actionList->push([
                'icon' => '🛠️',
                'name' => ($pWo->work_order_number ?: 'Work Order') . ' - ' . ($pWo->customer_name ?? 'Custom Order'),
                'sales' => 'Status: ' . ucfirst(str_replace('_', ' ', $pWo->status)),
                'growth' => 'In Progress',
            ]);
        }

        $actionRequires = $actionList->take(5)->values()->toArray();

        // Compute 24K Touch % Converted Fine Weight Gold Averages & Diamond Sieve Rates
        $purchases = \App\Models\PurchaseEntry::all();
        $totalPurchaseAmount = 0.0;
        $totalPurchase24kFineGrams = 0.0;
        $totalDiamondPurchaseAmount = 0.0;
        $totalDiamondPurchaseCarats = 0.0;

        foreach ($purchases as $pu) {
            $amt = (float) $pu->total_amount;
            $wt = (float) $pu->weight;
            $touch = \App\Helpers\GoldConversionHelper::getTouchPercent($pu->touch ?: 91.66);
            $fineWt = $pu->fine_weight > 0 ? (float)$pu->fine_weight : \App\Helpers\GoldConversionHelper::convertTo24kFineWeight($wt, $touch);

            $productName = strtolower($pu->product->name ?? '');
            if (str_contains($productName, 'diamond')) {
                $totalDiamondPurchaseAmount += $amt;
                $totalDiamondPurchaseCarats += max(0.1, $wt);
            } else {
                $totalPurchaseAmount += $amt;
                $totalPurchase24kFineGrams += $fineWt;
            }
        }

        $avg24kBuyingRate10g = \App\Helpers\GoldConversionHelper::calculate24kAverageRatePer10g($totalPurchaseAmount, $totalPurchase24kFineGrams);
        $avg24kBuyingRateGram = $totalPurchase24kFineGrams > 0 ? ($totalPurchaseAmount / $totalPurchase24kFineGrams) : 0.0;
        $avgDiamondBuyingRatePerCt = $totalDiamondPurchaseCarats > 0 ? round($totalDiamondPurchaseAmount / $totalDiamondPurchaseCarats, 2) : 0.0;

        // Sales 24K Converted Averages
        $saleItems = \App\Models\SaleItem::all();
        $totalSalesGoldAmount = 0.0;
        $totalSales24kFineGrams = 0.0;
        $totalSalesDiamondAmount = 0.0;
        $totalSalesDiamondCarats = 0.0;

        foreach ($saleItems as $si) {
            $amt = (float) $si->line_total;
            $wt = (float) ($si->gross_weight ?: $si->net_weight);
            $touch = \App\Helpers\GoldConversionHelper::getTouchPercent($si->purity ?: 91.66);
            $fineWt = \App\Helpers\GoldConversionHelper::convertTo24kFineWeight($wt, $touch);

            $prodName = strtolower($si->product_name ?? '');
            if (str_contains($prodName, 'diamond')) {
                $totalSalesDiamondAmount += $amt;
                $totalSalesDiamondCarats += max(0.1, (float)($si->stone_weight ?: $wt));
            } else {
                $totalSalesGoldAmount += $amt;
                $totalSales24kFineGrams += $fineWt;
            }
        }

        $avg24kSellingRate10g = \App\Helpers\GoldConversionHelper::calculate24kAverageRatePer10g($totalSalesGoldAmount, $totalSales24kFineGrams);
        $avg24kSellingRateGram = $totalSales24kFineGrams > 0 ? ($totalSalesGoldAmount / $totalSales24kFineGrams) : 0.0;
        $avgDiamondSellingRatePerCt = $totalSalesDiamondCarats > 0 ? round($totalSalesDiamondAmount / $totalSalesDiamondCarats, 2) : 0.0;

        // Period-specific Gold Averages and real percentage comparisons
        $todayGold = $this->calculateGoldAveragesForDateRange(Carbon::today());
        $yesterdayGold = $this->calculateGoldAveragesForDateRange(Carbon::yesterday(), Carbon::yesterday()->endOfDay());
        $weekGold = $this->calculateGoldAveragesForDateRange(Carbon::now()->startOfWeek());
        $prevWeekGold = $this->calculateGoldAveragesForDateRange(Carbon::now()->subWeek()->startOfWeek(), Carbon::now()->subWeek()->endOfWeek());
        $monthGold = $this->calculateGoldAveragesForDateRange(Carbon::now()->startOfMonth());
        $prevMonthGold = $this->calculateGoldAveragesForDateRange(Carbon::now()->subMonth()->startOfMonth(), Carbon::now()->subMonth()->endOfMonth());
        $quarterGold = $this->calculateGoldAveragesForDateRange(Carbon::now()->startOfQuarter());
        $prevQuarterGold = $this->calculateGoldAveragesForDateRange(Carbon::now()->subQuarter()->startOfQuarter(), Carbon::now()->subQuarter()->endOfQuarter());
        $yearGold = $this->calculateGoldAveragesForDateRange(Carbon::now()->startOfYear());
        $prevYearGold = $this->calculateGoldAveragesForDateRange(Carbon::now()->subYear()->startOfYear(), Carbon::now()->subYear()->endOfYear());
        $allGold = $this->calculateGoldAveragesForDateRange(Carbon::create(2000, 1, 1));
        $prevAllGold = $this->calculateGoldAveragesForDateRange(Carbon::create(1990, 1, 1), Carbon::create(1999, 12, 31));

        $goldAverages = [
            'today' => [
                'buyingVal' => number_format($todayGold['buying10g']),
                'buyingChange' => $calcMetricChange($todayGold['buying10g'], $yesterdayGold['buying10g'])['change'],
                'buyingVs' => 'vs Yesterday',
                'sellingVal' => number_format($todayGold['selling10g']),
                'sellingChange' => $calcMetricChange($todayGold['selling10g'], $yesterdayGold['selling10g'])['change'],
                'sellingVs' => 'vs Yesterday',
            ],
            'week' => [
                'buyingVal' => number_format($weekGold['buying10g']),
                'buyingChange' => $calcMetricChange($weekGold['buying10g'], $prevWeekGold['buying10g'])['change'],
                'buyingVs' => 'vs Last Week',
                'sellingVal' => number_format($weekGold['selling10g']),
                'sellingChange' => $calcMetricChange($weekGold['selling10g'], $prevWeekGold['selling10g'])['change'],
                'sellingVs' => 'vs Last Week',
            ],
            'month' => [
                'buyingVal' => number_format($monthGold['buying10g']),
                'buyingChange' => $calcMetricChange($monthGold['buying10g'], $prevMonthGold['buying10g'])['change'],
                'buyingVs' => 'vs Last Month',
                'sellingVal' => number_format($monthGold['selling10g']),
                'sellingChange' => $calcMetricChange($monthGold['selling10g'], $prevMonthGold['selling10g'])['change'],
                'sellingVs' => 'vs Last Month',
            ],
            'quarter' => [
                'buyingVal' => number_format($quarterGold['buying10g']),
                'buyingChange' => $calcMetricChange($quarterGold['buying10g'], $prevQuarterGold['buying10g'])['change'],
                'buyingVs' => 'vs Last Quarter',
                'sellingVal' => number_format($quarterGold['selling10g']),
                'sellingChange' => $calcMetricChange($quarterGold['selling10g'], $prevQuarterGold['selling10g'])['change'],
                'sellingVs' => 'vs Last Quarter',
            ],
            'year' => [
                'buyingVal' => number_format($yearGold['buying10g']),
                'buyingChange' => $calcMetricChange($yearGold['buying10g'], $prevYearGold['buying10g'])['change'],
                'buyingVs' => 'vs Last Year',
                'sellingVal' => number_format($yearGold['selling10g']),
                'sellingChange' => $calcMetricChange($yearGold['selling10g'], $prevYearGold['selling10g'])['change'],
                'sellingVs' => 'vs Last Year',
            ],
            'all' => [
                'buyingVal' => number_format($allGold['buying10g']),
                'buyingChange' => $calcMetricChange($allGold['buying10g'], $prevAllGold['buying10g'])['change'],
                'buyingVs' => 'All Time',
                'sellingVal' => number_format($allGold['selling10g']),
                'sellingChange' => $calcMetricChange($allGold['selling10g'], $prevAllGold['selling10g'])['change'],
                'sellingVs' => 'All Time',
            ],
        ];

        // 24K Converted Profit Calculations
        $goldCost = $totalSales24kFineGrams * $avg24kBuyingRateGram;
        $goldProfit = max(0, $totalSalesGoldAmount - $goldCost);

        $diamondCost = $totalSalesDiamondCarats * $avgDiamondBuyingRatePerCt;
        $diamondProfit = max(0, $totalSalesDiamondAmount - $diamondCost);

        $totalNetProfit = max(0, $goldProfit + $diamondProfit);

        return response()->json([
            'summary' => [
                'todaysSaleFormatted' => '₹' . number_format($periodSalesRaw, 0),
                'todaysSaleRaw' => $periodSalesRaw,
                'sales_metric' => $salesMetricChange,
                'ordersFormatted' => number_format($periodOrdersCount),
                'orders_metric' => $ordersMetricChange,
                'inventoryValueFormatted' => '₹' . number_format($inventoryValuation, 0),
                'inventory_metric' => $invMetricChange,
                'customersCount' => $activeClients,
                'customers_metric' => $clientsMetricChange,
                'pendingOrdersCount' => $pendingOrdersCount,
                'pending_metric' => $pendingMetricChange,
                'totalSalesFormatted' => '₹' . number_format($totalSales, 0),
                'totalSalesRaw' => $totalSales,
                'salesGrowth' => $salesMetricChange['change'],
                'activeClients' => $activeClients,
                'totalProducts' => $totalProducts,
                'activeArtisans' => $activeArtisans,
                'totalOrders' => $totalOrders,
                'avg24kBuyingRate10g' => $avg24kBuyingRate10g,
                'avg24kBuyingRate10gFormatted' => '₹' . number_format($avg24kBuyingRate10g),
                'avg24kSellingRate10g' => $avg24kSellingRate10g,
                'avg24kSellingRate10gFormatted' => '₹' . number_format($avg24kSellingRate10g),
                'avgDiamondBuyingRatePerCt' => $avgDiamondBuyingRatePerCt,
                'avgDiamondBuyingRatePerCtFormatted' => '₹' . number_format($avgDiamondBuyingRatePerCt),
                'avgDiamondSellingRatePerCt' => $avgDiamondSellingRatePerCt,
                'avgDiamondSellingRatePerCtFormatted' => '₹' . number_format($avgDiamondSellingRatePerCt),
                'goldAverages' => $goldAverages,
                'chartPoints' => $chartPoints,
                'goldProfit' => round($goldProfit, 2),
                'diamondProfit' => round($diamondProfit, 2),
                'totalNetProfit' => round($totalNetProfit, 2),
                'totalNetProfitFormatted' => '₹' . number_format($totalNetProfit, 0),
            ],
            'recentOrders' => $recentOrders,
            'topCategories' => $topCategories,
            'actionRequires' => $actionRequires,
        ];
        });

        return response()->json($cachedResult);
    }

    private function calculateGoldAveragesForDateRange($startDate = null, $endDate = null)
    {
        $purchaseQuery = \App\Models\PurchaseEntry::query();
        if ($startDate) {
            $purchaseQuery->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $purchaseQuery->where('created_at', '<=', $endDate);
        }
        $purchases = $purchaseQuery->get();

        $totalPurchaseAmount = 0.0;
        $totalPurchase24kFineGrams = 0.0;
        foreach ($purchases as $pu) {
            $amt = (float) $pu->total_amount;
            $wt = (float) $pu->weight;
            $touch = \App\Helpers\GoldConversionHelper::getTouchPercent($pu->touch ?: 91.66);
            $fineWt = $pu->fine_weight > 0 ? (float)$pu->fine_weight : \App\Helpers\GoldConversionHelper::convertTo24kFineWeight($wt, $touch);

            $productName = strtolower($pu->product->name ?? '');
            if (!str_contains($productName, 'diamond')) {
                $totalPurchaseAmount += $amt;
                $totalPurchase24kFineGrams += $fineWt;
            }
        }
        $avgBuyingRate10g = \App\Helpers\GoldConversionHelper::calculate24kAverageRatePer10g($totalPurchaseAmount, $totalPurchase24kFineGrams);

        $saleQuery = \App\Models\SaleItem::query();
        if ($startDate) {
            $saleQuery->where('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $saleQuery->where('created_at', '<=', $endDate);
        }
        $saleItems = $saleQuery->get();

        $totalSalesGoldAmount = 0.0;
        $totalSales24kFineGrams = 0.0;
        foreach ($saleItems as $si) {
            $amt = (float) $si->line_total;
            $wt = (float) ($si->gross_weight ?: $si->net_weight);
            $touch = \App\Helpers\GoldConversionHelper::getTouchPercent($si->purity ?: 91.66);
            $fineWt = \App\Helpers\GoldConversionHelper::convertTo24kFineWeight($wt, $touch);

            $prodName = strtolower($si->product_name ?? '');
            if (!str_contains($prodName, 'diamond')) {
                $totalSalesGoldAmount += $amt;
                $totalSales24kFineGrams += $fineWt;
            }
        }
        $avgSellingRate10g = \App\Helpers\GoldConversionHelper::calculate24kAverageRatePer10g($totalSalesGoldAmount, $totalSales24kFineGrams);

        return [
            'buying10g' => round($avgBuyingRate10g),
            'selling10g' => round($avgSellingRate10g),
        ];
    }


    public function metalRates()
    {
        $todayDateKey = 'manual_metal_rates_' . Carbon::now()->toDateString();
        if (Cache::has($todayDateKey)) {
            $manualData = Cache::get($todayDateKey);
            if ($manualData) {
                return response()->json($manualData);
            }
        }

        $rates = Cache::remember('live_metal_rates_chennai_v5', 3600, function () {
            try {
                // Fetch Gold, Silver spot prices and USD/INR rate asynchronously
                $goldResponse = Http::timeout(1)->get('https://api.gold-api.com/price/XAU');
                $silverResponse = Http::timeout(1)->get('https://api.gold-api.com/price/XAG');
                $erResponse = Http::timeout(1)->get('https://open.er-api.com/v6/latest/USD');

                if ($goldResponse->successful() && $erResponse->successful()) {
                    $goldUsd = $goldResponse->json('price');
                    $silverUsd = $silverResponse->successful() ? $silverResponse->json('price') : 31.5;
                    $usdInr = $erResponse->json('rates.INR', 86.5);

                    if ($goldUsd) {
                        // International Spot Rate per gram in INR (1 Troy Oz = 31.1034768 grams)
                        $spotGoldInr = ($goldUsd * $usdInr) / 31.1034768;
                        $spotSilverInr = ($silverUsd * $usdInr) / 31.1034768;

                        // Apply Chennai Domestic Market Duty & Taxes
                        $chennai24kGram = $spotGoldInr * 1.09;
                        $chennai22kGram = $chennai24kGram * (22 / 24);
                        $g24 = round($chennai24kGram);
                        $g22 = round($chennai22kGram);
                        $sGram = round($chennaiSilverGram, 1);
                        $sKg = round($chennaiSilverGram * 1000);

                        return [
                            'location' => 'Chennai',
                            'date' => Carbon::now()->format('d F Y'),
                            'gold24k' => number_format($g24),
                            'gold22k' => number_format($g22),
                            'gold24k_10g' => number_format($g24 * 10),
                            'gold22k_10g' => number_format($g22 * 10),
                            'raw24k' => $g24,
                            'raw22k' => $g22,
                            'silverGram' => number_format($sGram, 1),
                            'silverKg' => number_format($sKg),
                            'rawSilverGram' => $sGram,
                            'rawSilverKg' => $sKg,
                            'usdInr' => number_format($usdInr, 2),
                            'isLive' => true,
                            'isManual' => false,
                        ];
                    }
                }
            } catch (\Exception $e) {
                // Ignore API failure and fallback
            }

            // Up-to-date Chennai Jewellers Association Market Benchmark Rates
            return [
                'location' => 'Chennai',
                'date' => Carbon::now()->format('d F Y'),
                'gold24k' => '14,634',
                'gold22k' => '13,414',
                'gold24k_10g' => '1,46,340',
                'gold22k_10g' => '1,34,140',
                'raw24k' => 14634,
                'raw22k' => 13414,
                'silverGram' => '110.0',
                'silverKg' => '1,10,000',
                'rawSilverGram' => 110.0,
                'rawSilverKg' => 110000,
                'usdInr' => '86.50',
                'isLive' => false,
                'isManual' => false,
            ];
        });

        return response()->json($rates);
    }

    /**
     * Save manual metal rate override for today
     */
    public function updateMetalRates(Request $request)
    {
        $validated = $request->validate([
            'gold24k' => 'required',
            'gold22k' => 'required',
            'gold18k' => 'nullable',
            'silverGram' => 'nullable',
            'silverKg' => 'nullable',
        ]);

        $cleanNum = fn($val) => (float) str_replace([',', '₹', ' '], '', (string)$val);

        $val24k = $cleanNum($request->gold24k);
        $val22k = $cleanNum($request->gold22k);

        // Normalize if user entered per 10g value (e.g. > 50,000) vs per gram
        $gram24k = $val24k > 50000 ? round($val24k / 10) : round($val24k);
        $gram22k = $val22k > 50000 ? round($val22k / 10) : round($val22k);

        $tenG24k = $gram24k * 10;
        $tenG22k = $gram22k * 10;

        $silverG = $cleanNum($request->silverGram ?? 110);
        $silverK = $cleanNum($request->silverKg ?? ($silverG * 1000));

        $data = [
            'location' => 'Chennai',
            'date' => Carbon::now()->format('d F Y'),
            'gold24k' => number_format($gram24k),
            'gold22k' => number_format($gram22k),
            'gold24k_10g' => number_format($tenG24k),
            'gold22k_10g' => number_format($tenG22k),
            'raw24k' => $gram24k,
            'raw22k' => $gram22k,
            'silverGram' => number_format($silverG, 1),
            'silverKg' => number_format($silverK),
            'rawSilverGram' => $silverG,
            'rawSilverKg' => $silverK,
            'usdInr' => '86.50',
            'isLive' => false,
            'isManual' => true,
            'updatedAt' => Carbon::now()->toDateTimeString(),
        ];

        $todayDateKey = 'manual_metal_rates_' . Carbon::now()->toDateString();
        Cache::put($todayDateKey, $data, 86400); // Saved for today (24 hours)
        Cache::forget('live_metal_rates_chennai_v5');

        return response()->json([
            'status' => 'success',
            'message' => 'Gold & Silver rates updated successfully for today!',
            'rates' => $data,
        ]);
    }

    /**
     * Reset manual rates for today and fetch fresh internet rates
     */
    public function resetMetalRates()
    {
        $todayDateKey = 'manual_metal_rates_' . Carbon::now()->toDateString();
        Cache::forget($todayDateKey);
        Cache::forget('live_metal_rates_chennai_v5');

        return $this->metalRates();
    }
}
