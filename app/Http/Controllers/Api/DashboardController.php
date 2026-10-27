<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $startInput = $request->get('start_date') ?: ($request->get('from_date') ?: $request->get('from'));
        $endInput = $request->get('end_date') ?: ($request->get('to_date') ?: $request->get('to'));
        $rawPeriod = strtolower($request->get('period', 'month'));

        if (!$startInput && preg_match('/(\d{4}-\d{2}-\d{2})[,\s_to:]+(\d{4}-\d{2}-\d{2})/i', $rawPeriod, $matches)) {
            $startInput = $matches[1];
            $endInput = $matches[2];
        }

        $isCustomRange = !empty($startInput) && !empty($endInput);
        if ($isCustomRange) {
            $periodParam = 'custom';
            $tz = config('app.timezone', 'Asia/Kolkata');
            $startDate = Carbon::parse($startInput, $tz)->startOfDay();
            $endDate = Carbon::parse($endInput, $tz)->endOfDay();
            if ($endDate->lt($startDate)) {
                $temp = $startDate;
                $startDate = $endDate->copy()->startOfDay();
                $endDate = $temp->copy()->endOfDay();
            }
            $diffInDays = max(1, (int) round($startDate->copy()->startOfDay()->diffInDays($endDate->copy()->startOfDay())) + 1);
            $prevPeriodEnd = $startDate->copy()->subSecond();
            $prevPeriodStart = $prevPeriodEnd->copy()->subDays($diffInDays - 1)->startOfDay();
            $vsLabel = "vs Previous {$diffInDays} Days";
            $cacheKey = "dashboard_data_perf_v29_custom_" . $startDate->format('Ymd') . "_" . $endDate->format('Ymd');
        } else {
            $periodParam = match (true) {
                str_contains($rawPeriod, 'today') => 'today',
                str_contains($rawPeriod, 'week') => 'week',
                str_contains($rawPeriod, 'month') => 'month',
                str_contains($rawPeriod, 'quarter') => 'quarter',
                str_contains($rawPeriod, 'year') => 'year',
                str_contains($rawPeriod, 'all') => 'all',
                default => 'month',
            };
            $cacheKey = "dashboard_data_perf_v29_{$periodParam}";

            $startDate = match($periodParam) {
                'today' => Carbon::today()->startOfDay(),
                'week' => Carbon::now()->startOfWeek()->startOfDay(),
                'month' => Carbon::now()->startOfMonth()->startOfDay(),
                'quarter' => Carbon::now()->startOfQuarter()->startOfDay(),
                'year' => Carbon::now()->startOfYear()->startOfDay(),
                'all' => Carbon::create(2000, 1, 1)->startOfDay(),
                default => Carbon::now()->startOfMonth()->startOfDay(),
            };

            $endDate = match($periodParam) {
                'today' => Carbon::today()->endOfDay(),
                'week' => Carbon::now()->endOfWeek()->endOfDay(),
                'month' => Carbon::now()->endOfMonth()->endOfDay(),
                'quarter' => Carbon::now()->endOfQuarter()->endOfDay(),
                'year' => Carbon::now()->endOfYear()->endOfDay(),
                'all' => Carbon::now()->addYears(10)->endOfDay(),
                default => Carbon::now()->endOfMonth()->endOfDay(),
            };

            $prevPeriodStart = match($periodParam) {
                'today' => Carbon::yesterday()->startOfDay(),
                'week' => Carbon::now()->subWeek()->startOfWeek()->startOfDay(),
                'month' => Carbon::now()->subMonth()->startOfMonth()->startOfDay(),
                'quarter' => Carbon::now()->subQuarter()->startOfQuarter()->startOfDay(),
                'year' => Carbon::now()->subYear()->startOfYear()->startOfDay(),
                'all' => Carbon::create(1990, 1, 1)->startOfDay(),
                default => Carbon::now()->subMonth()->startOfMonth()->startOfDay(),
            };

            $prevPeriodEnd = match($periodParam) {
                'today' => Carbon::yesterday()->endOfDay(),
                'week' => Carbon::now()->subWeek()->endOfWeek()->endOfDay(),
                'month' => Carbon::now()->subMonth()->endOfMonth()->endOfDay(),
                'quarter' => Carbon::now()->subQuarter()->endOfQuarter()->endOfDay(),
                'year' => Carbon::now()->subYear()->endOfYear()->endOfDay(),
                'all' => Carbon::create(1999, 12, 31)->endOfDay(),
                default => Carbon::now()->subMonth()->endOfMonth()->endOfDay(),
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
        }

        if ($request->has('refresh') || $request->has('nocache')) {
            Cache::forget($cacheKey);
        }

        $cachedResult = Cache::remember($cacheKey, 30, function () use ($request, $periodParam, $startDate, $endDate, $prevPeriodStart, $prevPeriodEnd, $vsLabel, $isCustomRange) {

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

        // Helper query for qualifying sales invoices (exclude cancelled, voided, returned, reversed)
        $validInvoiceBase = \App\Models\Invoice::whereNotIn('status', ['cancelled', 'void', 'returned'])
            ->where(function($q) {
                $q->whereNull('sale_status')
                  ->orWhereNotIn('sale_status', ['cancelled', 'void', 'returned', 'reversed']);
            });

        // 1. Sales Metric (Persisted qualifying sales revenue only - Work Orders and Inventory additions excluded)
        $totalSales = (float) (clone $validInvoiceBase)->sum('total_amount');
        $periodSalesRaw = (float) (clone $validInvoiceBase)->where('created_at', '>=', $startDate)->where('created_at', '<=', $endDate)->sum('total_amount');
        $prevPeriodSales = (float) (clone $validInvoiceBase)->whereBetween('created_at', [$prevPeriodStart, $prevPeriodEnd])->sum('total_amount');
        $salesMetricChange = $calcMetricChange($periodSalesRaw, $prevPeriodSales);

        // Today's Sales
        $todaysSalesRaw = (float) (clone $validInvoiceBase)->whereDate('created_at', Carbon::today('Asia/Kolkata'))->sum('total_amount');

        // 2. Orders Metric (Combining Invoices + WorkOrders orders count)
        $periodOrdersCount = \App\Models\Invoice::where('created_at', '>=', $startDate)->count()
            + \App\Models\WorkOrder::where('created_at', '>=', $startDate)->count();
        $prevPeriodOrdersCount = \App\Models\Invoice::whereBetween('created_at', [$prevPeriodStart, $prevPeriodEnd])->count()
            + \App\Models\WorkOrder::whereBetween('created_at', [$prevPeriodStart, $prevPeriodEnd])->count();
        $totalOrders = \App\Models\Invoice::count() + \App\Models\WorkOrder::count();
        $ordersMetricChange = $calcMetricChange($periodOrdersCount, $prevPeriodOrdersCount);

        // 3. Customers Metric
        $activeClients = \App\Models\Client::count();
        $periodClientsCount = \App\Models\Client::where('created_at', '>=', $startDate)->count();
        $prevClientsCount = \App\Models\Client::whereBetween('created_at', [$prevPeriodStart, $prevPeriodEnd])->count();
        $clientsMetricChange = $calcMetricChange($periodClientsCount, $prevClientsCount);

        // 4. Inventory Products Metric (Total Product Stock Count - sum of current_stock_qty)
        $validProductsBaseQuery = \App\Models\Product::where(function ($q) {
            $q->whereNull('status')->orWhere('status', '!=', 'inactive');
        });
        $allTimeActiveProducts = (int)(clone $validProductsBaseQuery)->selectRaw('COALESCE(SUM(CASE WHEN current_stock_qty > 0 THEN current_stock_qty ELSE 1 END), 0) as total_units')->value('total_units');

        // Helper to calculate historical active inventory snapshot at a specific point in time:
        // Sums active stock units (current_stock_qty > 0 or 1 per product) created on or before snapshot date
        $calcHistoricalProductCount = function ($snapshotDate) {
            if (!$snapshotDate) {
                return (int)\App\Models\Product::where(function ($q) {
                    $q->whereNull('status')->orWhere('status', '!=', 'inactive');
                })->selectRaw('COALESCE(SUM(CASE WHEN current_stock_qty > 0 THEN current_stock_qty ELSE 1 END), 0) as total_units')->value('total_units');
            }

            return (int)\App\Models\Product::where('created_at', '<=', $snapshotDate)
                ->where(function ($q) use ($snapshotDate) {
                    // Include products that are active, OR products that were deactivated AFTER the snapshot date
                    $q->where(function ($sub) {
                        $sub->whereNull('status')->orWhere('status', '!=', 'inactive');
                    })->orWhere(function ($sub) use ($snapshotDate) {
                        $sub->where('status', 'inactive')
                            ->where(function ($deactQuery) use ($snapshotDate) {
                                $deactQuery->where('attributes->deactivated_at', '>', $snapshotDate)
                                           ->orWhere(function ($fallback) use ($snapshotDate) {
                                               $fallback->whereNull('attributes->deactivated_at')
                                                        ->where('updated_at', '>', $snapshotDate);
                                           });
                            });
                    });
                })
                ->selectRaw('COALESCE(SUM(CASE WHEN current_stock_qty > 0 THEN current_stock_qty ELSE 1 END), 0) as total_units')
                ->value('total_units');
        };

        // Products created strictly during the period (for diagnostic/reporting transparency)
        $periodCreatedProductsCount = (int)(clone $validProductsBaseQuery)
            ->whereBetween('created_at', [$startDate, $endDate])
            ->selectRaw('COALESCE(SUM(CASE WHEN current_stock_qty > 0 THEN current_stock_qty ELSE 1 END), 0) as total_units')
            ->value('total_units');

        if ($periodParam === 'all' && !$isCustomRange) {
            $periodProductsCount = $allTimeActiveProducts;
            $prevProductsCount = 0;
        } else {
            // Historical inventory snapshot at the end of the selected period
            $periodProductsCount = $calcHistoricalProductCount($endDate);
            // Historical inventory snapshot at the end of the preceding comparison period
            $prevProductsCount = $calcHistoricalProductCount($prevPeriodEnd);
        }
        $invMetricChange = $calcMetricChange($periodProductsCount, $prevProductsCount);
        $totalProducts = $periodProductsCount;

        // Fallback product valuation for categories
        $liveRates = self::getLiveMetalRatesData();
        $rate24k = (float)($liveRates['raw24k'] ?? 14408);
        $rate22k = (float)($liveRates['raw22k'] ?? round($rate24k * (22 / 24)));
        $rate18k = (float)($liveRates['raw18k'] ?? round($rate24k * (18 / 24)));
        $rateSilver = (float)($liveRates['rawSilverGram'] ?? round($rate24k / 65, 1));

        $productsList = \App\Models\Product::with(['category', 'subcategory'])
            ->select('id', 'name', 'category_id', 'subcategory_id', 'opening_stock_rate', 'opening_stock_qty', 'current_stock_qty', 'opening_stock_weight', 'opening_fine_weight', 'attributes', 'created_at')
            ->get();
        $calcProdVal = function($p) use ($rate24k, $rate22k, $rate18k, $rateSilver) {
            $attrs = is_array($p->attributes) ? $p->attributes : json_decode($p->attributes ?? '[]', true);
            $val = (float) ($attrs['sale_value'] ?? 0);
            $qty = (int) ($p->current_stock_qty ?? $p->opening_stock_qty ?? 1);
            if ($qty < 0) $qty = 0;

            if ($val <= 0) {
                $rate = (float) ($attrs['sale_rate'] ?? $attrs['rate'] ?? $p->opening_stock_rate ?? 0);
                $wt = (float) ($attrs['net_wt'] ?? $attrs['gross_wt'] ?? $p->opening_stock_weight ?? 0);

                // Fallback to live market rate if no explicit rate or sale value is defined
                if ($rate <= 0) {
                    $catName = strtolower(($p->category?->name ?? '') . ' ' . ($p->name ?? ''));
                    $karat = strtolower((string)($attrs['karat'] ?? $attrs['purity'] ?? $attrs['stamp'] ?? $attrs['gold_type'] ?? ''));

                    if (str_contains($catName, 'silver') || str_contains($karat, 'silver')) {
                        $rate = $rateSilver;
                    } elseif (str_contains($karat, '18k') || str_contains($karat, '750')) {
                        $rate = $rate18k;
                    } elseif (str_contains($karat, '24k') || str_contains($karat, '999')) {
                        $rate = $rate24k;
                    } else {
                        // Standard jewelry gold 22K (916)
                        $rate = $rate22k;
                    }
                }

                $val = ($wt > 0) ? ($wt * $rate) : ($qty * $rate);
            } else {
                if ($qty > 1) {
                    $val = $val * $qty;
                }
            }
            return $val;
        };
        $inventoryValuation = (float) $productsList->sum($calcProdVal);

        // 5. Active Artisans & Pending Orders
        $activeArtisans = \App\Models\Karigar::where('status', 'active')->count();
        $pendingOrdersCount = \App\Models\WorkOrder::whereNotIn('status', ['completed', 'cancelled', 'final_received', 'delivered'])->count();
        $periodPendingCount = $pendingOrdersCount;
        $prevPendingCount = 0;
        $pendingMetricChange = $calcMetricChange($periodPendingCount, $prevPendingCount);

        // Dynamic Chart Points timeline for selected period
        $chartPoints = [];
        if ($periodParam === 'today') {
            $invToday = \App\Models\Invoice::whereDate('created_at', Carbon::today())->get();
            $woToday = \App\Models\WorkOrder::whereDate('created_at', Carbon::today())->get();

            $hours = [6, 9, 11, 13, 15, 17, 19];
            $chartPoints[] = [
                'date' => '00:00',
                'val' => 0,
                'label' => '₹0',
            ];

            foreach ($hours as $hr) {
                $cutoff = Carbon::today()->addHours($hr);
                $invTot = (float) $invToday->filter(fn($i) => Carbon::parse($i->created_at)->lte($cutoff))->sum('total_amount');
                $tot = $invTot;
                $chartPoints[] = [
                    'date' => sprintf('%02d:00', $hr),
                    'val' => $tot,
                    'label' => '₹' . number_format($tot, 0),
                ];
            }
        } elseif ($periodParam === 'week') {
            $weekStart = Carbon::now()->startOfWeek()->startOfDay();
            $weekEnd = Carbon::now()->endOfWeek()->endOfDay();
            $dailySums = \App\Models\Invoice::whereBetween('created_at', [$weekStart, $weekEnd])
                ->whereNotIn('status', ['cancelled', 'void', 'returned'])
                ->selectRaw('DATE(created_at) as dt, SUM(total_amount) as total')
                ->groupBy('dt')
                ->pluck('total', 'dt');

            $runningTot = 0;
            for ($i = 0; $i < 7; $i++) {
                $dayDate = Carbon::now()->startOfWeek()->addDays($i);
                if ($dayDate->gt(Carbon::now()->endOfDay())) continue;
                $invTotal = (float) ($dailySums->get($dayDate->toDateString()) ?? 0);
                $runningTot += $invTotal;
                $chartPoints[] = [
                    'date' => $dayDate->format('D, d M'),
                    'val' => $runningTot,
                    'label' => '₹' . number_format($runningTot, 0),
                ];
            }
        } elseif ($periodParam === 'month') {
            $monthStart = Carbon::now()->startOfMonth()->startOfDay();
            $monthEnd = Carbon::now()->endOfMonth()->endOfDay();
            $dailySums = \App\Models\Invoice::whereBetween('created_at', [$monthStart, $monthEnd])
                ->whereNotIn('status', ['cancelled', 'void', 'returned'])
                ->selectRaw('DATE(created_at) as dt, SUM(total_amount) as total')
                ->groupBy('dt')
                ->pluck('total', 'dt');

            $days = [1, 5, 10, 15, 20, 25, Carbon::now()->day];
            $days = array_values(array_unique($days));
            sort($days);
            foreach ($days as $d) {
                $dt = Carbon::now()->startOfMonth()->addDays($d - 1);
                if ($dt->gt(Carbon::now())) continue;
                $dtStr = $dt->toDateString();
                $tot = (float) $dailySums->filter(fn($val, $key) => $key <= $dtStr)->sum();
                $chartPoints[] = [
                    'date' => $dt->format('d M'),
                    'val' => $tot,
                    'label' => '₹' . number_format($tot, 0),
                ];
            }
        } else {
            $sixMonthsAgo = Carbon::now()->subMonths(5)->startOfMonth()->startOfDay();
            $driver = \Illuminate\Support\Facades\DB::connection()->getDriverName();
            $dateFormat = $driver === 'sqlite' ? "strftime('%Y-%m', created_at)" : "DATE_FORMAT(created_at, '%Y-%m')";
            $monthlySums = \App\Models\Invoice::where('created_at', '>=', $sixMonthsAgo)
                ->whereNotIn('status', ['cancelled', 'void', 'returned'])
                ->selectRaw("{$dateFormat} as ym, SUM(total_amount) as total")
                ->groupBy('ym')
                ->pluck('total', 'ym');

            for ($i = 5; $i >= 0; $i--) {
                $mDate = Carbon::now()->subMonths($i);
                $ymKey = $mDate->format('Y-m');
                $tot = (float) ($monthlySums->get($ymKey) ?? 0);
                $chartPoints[] = [
                    'date' => $mDate->format('M Y'),
                    'val' => $tot,
                    'label' => '₹' . number_format($tot, 0),
                ];
            }
        }

        // 1. Recent Orders (Combining WorkOrders and Invoices)
        $ordersList = collect();

        // Work Orders
        $woQuery = \App\Models\WorkOrder::with(['client', 'receivedPieces']);
        if ($periodParam !== 'all') {
            $woQuery->where('created_at', '>=', $startDate);
        }
        $workOrders = $woQuery->orderBy('created_at', 'desc')->take(10)->get();

        foreach ($workOrders as $wo) {
            $statusInfo = $wo->getDeliveryStatusInfo();
            $statusLabel = $statusInfo['label'];
            $statusStyle = $statusInfo['style'];

            $rawName = $wo->client ? $wo->client->full_name : ($wo->customer_name ?? 'Client Order');
            $shortName = str_replace([' (Retail Partner)', ' Showroom', ' India Pvt Ltd', ' India Ltd'], '', $rawName);

            $ordersList->push([
                'id' => $wo->work_order_number ?: ('WO-2026-' . sprintf('%04d', $wo->id)),
                'name' => $shortName,
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
        $recentInvoices = $invQuery->orderBy('created_at', 'desc')->take(10)->get();
        foreach ($recentInvoices as $inv) {
            $st = strtolower($inv->status ?? '');
            if (in_array($st, ['cancelled', 'void', 'refunded'])) {
                $statusLabel = 'Cancelled';
                $statusStyle = 'bg-[#fee2e2] text-[#b91c1c]';
            } elseif ($st === 'paid') {
                $statusLabel = 'Delivered';
                $statusStyle = 'bg-[#dcfce7] text-[#15803d]';
            } elseif ($st === 'partial') {
                $statusLabel = 'In Progress';
                $statusStyle = 'bg-[#dbeafe] text-[#1d4ed8]';
            } else {
                $statusLabel = 'Pending';
                $statusStyle = 'bg-[#fef3c7] text-[#b45309]';
            }
            $rawName = $inv->client_name ?: ($inv->client ? $inv->client->full_name : 'Retail Customer');
            $shortName = str_replace([' (Retail Partner)', ' Showroom', ' India Pvt Ltd', ' India Ltd'], '', $rawName);

            $ordersList->push([
                'id' => $inv->invoice_number ?: ('INV-2026-' . sprintf('%03d', $inv->id)),
                'name' => $shortName,
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

        // Dynamic rates from DB PurchaseEntry and SaleItem
        $totalPurchaseAmountTemp = (float) \App\Models\PurchaseEntry::sum('total_amount');
        $totalPurchaseWtTemp = (float) \App\Models\PurchaseEntry::sum('weight');
        $avg24kBuyingRateGram = $totalPurchaseWtTemp > 0 ? ($totalPurchaseAmountTemp / $totalPurchaseWtTemp) : 0.0;
        $totalSalesGoldAmtTemp = (float) \App\Models\SaleItem::sum('line_total');
        $totalSalesGoldWtTemp = (float) \App\Models\SaleItem::sum('gross_weight');
        $avg24kSellingRateGram = $totalSalesGoldWtTemp > 0 ? ($totalSalesGoldAmtTemp / $totalSalesGoldWtTemp) : 0.0;

        $fetchSaleData = function($rStart, $rEnd) {
            $items = collect();
            $invoices = collect();
            try {
                $siQ = \App\Models\SaleItem::query()
                    ->whereHas('invoice', function ($iq) {
                        $iq->whereNotIn('status', ['cancelled', 'void', 'returned'])
                           ->where(function ($sub) {
                               $sub->whereNull('sale_status')
                                   ->orWhereNotIn('sale_status', ['cancelled', 'void', 'returned', 'reversed']);
                           });
                    });
                if ($rStart) $siQ->where('created_at', '>=', $rStart);
                if ($rEnd) $siQ->where('created_at', '<=', $rEnd);
                $items = $siQ->with('product:id,category_id')->get();

                $invQ = \App\Models\Invoice::query()
                    ->whereNotIn('status', ['cancelled', 'void', 'returned'])
                    ->where(function ($sub) {
                        $sub->whereNull('sale_status')
                            ->orWhereNotIn('sale_status', ['cancelled', 'void', 'returned', 'reversed']);
                    });
                if ($rStart) $invQ->where('created_at', '>=', $rStart);
                if ($rEnd) $invQ->where('created_at', '<=', $rEnd);
                $invoices = $invQ->get();
            } catch (\Exception $e) {}
            return [$items, $invoices];
        };

        [$currSaleItems, $currInvoices] = $fetchSaleData($startDate, $endDate);
        [$prevSaleItems, $prevInvoices] = $fetchSaleData($prevPeriodStart, $prevPeriodEnd);

        $calcCategorySalesForRange = function($meta, $preloadedItems, $preloadedInvoices) {
            $sum = 0.0;
            $keywords = $meta['keywords'] ?? [];
            $prodIds = $meta['product_ids'] ?? [];
            $catId = $meta['id'] ?? null;
            $catNameLower = strtolower($meta['name'] ?? '');
            $handledInvoiceIds = [];

            foreach ($preloadedItems as $item) {
                $pId = $item->product_id ?? null;
                $pName = strtolower($item->product_name ?? '');
                $cName = strtolower($item->category ?? '');
                $mType = strtolower($item->metal_type ?? '');

                $matched = false;
                if ($pId && in_array($pId, $prodIds)) {
                    $matched = true;
                } elseif ($item->product && $item->product->category_id == $catId) {
                    $matched = true;
                } elseif ($cName && ($cName === $catNameLower || str_contains($cName, $catNameLower))) {
                    $matched = true;
                } else {
                    foreach ($keywords as $kw) {
                        if ($kw && (str_contains($pName, $kw) || str_contains($cName, $kw) || str_contains($mType, $kw))) {
                            $matched = true;
                            break;
                        }
                    }
                }

                if ($matched) {
                    $sum += (float) ($item->line_total ?: $item->total_price ?: 0);
                    if ($item->invoice_id) {
                        $handledInvoiceIds[$item->invoice_id] = true;
                    }
                }
            }

            foreach ($preloadedInvoices as $inv) {
                if (isset($handledInvoiceIds[$inv->id])) continue;

                $invTotal = (float) ($inv->total_amount ?? 0);
                $items = is_array($inv->items) ? $inv->items : json_decode($inv->items ?? '[]', true);
                if (is_array($items) && count($items) > 0) {
                    $itemCount = count($items);
                    foreach ($items as $it) {
                        $itPId = $it['product_id'] ?? $it['id'] ?? null;
                        $itCode = strtolower($it['code'] ?? $it['product_code'] ?? $it['item_code'] ?? '');
                        $desc = strtolower($it['desc'] ?? $it['description'] ?? $it['name'] ?? $it['item_name'] ?? '');
                        $cName = strtolower($it['category'] ?? '');

                        $matched = false;
                        if (($catId && ($it['category_id'] ?? null) == $catId) || ($itPId && in_array($itPId, $prodIds))) {
                            $matched = true;
                        } elseif ($cName && ($cName === $catNameLower || str_contains($cName, $catNameLower))) {
                            $matched = true;
                        }

                        if (!$matched) {
                            $fullSearchText = "$desc $cName $itCode";
                            foreach ($keywords as $kw) {
                                if ($kw && str_contains($fullSearchText, $kw)) {
                                    $matched = true;
                                    break;
                                }
                            }
                        }

                        if ($matched) {
                            $itAmt = (float) ($it['total'] ?? $it['line_total'] ?? $it['taxable'] ?? 0);
                            if ($itAmt <= 0 && $itemCount === 1) {
                                $itAmt = $invTotal;
                            } elseif ($itAmt <= 0) {
                                $itAmt = $invTotal / $itemCount;
                            }
                            $sum += $itAmt;
                        }
                    }
                }
            }
            return $sum;
        };

        // Pre-aggregate Work Orders by category in 1 query
        $woCategoryStats = \App\Models\WorkOrder::selectRaw('category_id,
            COUNT(CASE WHEN status NOT IN ("completed", "delivered", "final_received") THEN 1 END) as pending_count,
            COALESCE(SUM(CASE WHEN status NOT IN ("completed", "delivered", "final_received") THEN total_price ELSE 0 END), 0) as pending_value,
            COUNT(CASE WHEN current_stage = "delayed" THEN 1 END) as delayed_count
        ')
        ->groupBy('category_id')
        ->get()
        ->keyBy('category_id');

        // Pre-aggregate low stock products by category in 1 query
        $lowStockByCategory = \App\Models\Product::selectRaw('category_id, COUNT(*) as low_count')
            ->where('current_stock_qty', '<=', 2)
            ->groupBy('category_id')
            ->pluck('low_count', 'category_id');

        $topCategoriesList = [];
        $actionRequiresList = [];

        foreach ($categoriesMeta as $catName => $meta) {
            $catId = $meta['id'];
            $catSales = $calcCategorySalesForRange($meta, $currSaleItems, $currInvoices);
            $catSalesPrev = $calcCategorySalesForRange($meta, $prevSaleItems, $prevInvoices);

            // STRICT REQUIREMENT: Only actual qualifying sales are displayed in Top-Selling Categories.
            // Inventory addition or work order creation must NEVER count as a sale!
            $catGrowthPct = $catSalesPrev > 0 
                ? round((($catSales - $catSalesPrev) / $catSalesPrev) * 100, 1) 
                : ($catSales > 0 ? 100.0 : 0.0);
            
            $catGrowthStr = ($catGrowthPct >= 0 ? '↑ ' : '↓ ') . number_format(abs($catGrowthPct), 1) . '%';

            $formattedName = ucwords(strtolower($catName));

            $icon = match(true) {
                str_contains(strtolower($catName), 'neck') || str_contains(strtolower($catName), 'choker') || str_contains(strtolower($catName), 'haram') => '✨',
                str_contains(strtolower($catName), 'ring') => '⭕',
                str_contains(strtolower($catName), 'diamond') => '💎',
                str_contains(strtolower($catName), 'bangle') || str_contains(strtolower($catName), 'kada') || str_contains(strtolower($catName), 'bracelet') => '🟠',
                str_contains(strtolower($catName), 'silver') => '🪙',
                default => '🏷️',
            };

            if ($catSales > 0) {
                $topCategoriesList[] = [
                    'icon' => $icon,
                    'name' => $formattedName,
                    'raw_sales' => $catSales,
                    'sales' => '₹ ' . number_format($catSales, 0),
                    'growth' => $catGrowthStr,
                    'is_increase' => $catGrowthPct >= 0,
                ];
            }

            // Retrieve pre-computed stats without per-category queries
            $cStats = $woCategoryStats->get($catId);
            $catPendingOrdersCount = (int) ($cStats->pending_count ?? 0);
            $pendingValue = (float) ($cStats->pending_value ?? 0);
            $delayedCount = (int) ($cStats->delayed_count ?? 0);
            $lowStockCount = (int) ($lowStockByCategory[$catId] ?? 0);

            if ($catPendingOrdersCount > 0 || $lowStockCount > 0 || $pendingValue > 0) {
                $actionValStr = $pendingValue > 0 ? ('₹ ' . number_format($pendingValue, 0)) : ($catPendingOrdersCount . ' Pending Jobs');
                $actionGrowthStr = $delayedCount > 0 ? "Overdue ({$delayedCount})" : ($catPendingOrdersCount > 0 ? "Active ({$catPendingOrdersCount})" : "Low Stock ({$lowStockCount})");
                
                $actionRequiresList[] = [
                    'icon' => $icon,
                    'name' => $formattedName,
                    'raw_val' => $pendingValue > 0 ? $pendingValue : $catPendingOrdersCount * 1000,
                    'sales' => $actionValStr,
                    'growth' => $actionGrowthStr,
                    'is_increase' => $delayedCount === 0,
                ];
            }
        }

        // Sort Top Categories by sales descending
        usort($topCategoriesList, fn($a, $b) => ($b['raw_sales'] <=> $a['raw_sales']));
        $topCategories = array_slice($topCategoriesList, 0, 5);

        // Sort Action Requires by urgency / valuation descending
        if (count($actionRequiresList) > 0) {
            usort($actionRequiresList, fn($a, $b) => ($b['raw_val'] <=> $a['raw_val']));
            $actionRequires = array_slice($actionRequiresList, 0, 5);
        } else {
            $actionRequires = [];
        }

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

        // Period-specific transaction-based Gold Averages and real percentage comparisons
        $goldAverages = [
            'today' => $this->buildGoldAveragesForPeriod('today'),
            'week' => $this->buildGoldAveragesForPeriod('week'),
            'month' => $this->buildGoldAveragesForPeriod('month'),
            'quarter' => $this->buildGoldAveragesForPeriod('quarter'),
            'year' => $this->buildGoldAveragesForPeriod('year'),
            'all' => $this->buildGoldAveragesForPeriod('all'),
        ];
        $currentGoldAverage = $goldAverages[$periodParam] ?? $goldAverages['month'];


        // 24K Converted Profit Calculations
        $goldCost = $totalSales24kFineGrams * $avg24kBuyingRateGram;
        $goldProfit = max(0, $totalSalesGoldAmount - $goldCost);

        $diamondCost = $totalSalesDiamondCarats * $avgDiamondBuyingRatePerCt;
        $diamondProfit = max(0, $totalSalesDiamondAmount - $diamondCost);

        $totalNetProfit = max(0, $goldProfit + $diamondProfit);

        // Active Work Order Material Weights across system
        $activeOrdersForDash = \App\Models\WorkOrder::whereNotIn('status', ['completed', 'cancelled', 'final_received', 'delivered'])->get();
        $dashAllocatedWeight = (float) $activeOrdersForDash->sum('allotted_weight');
        $dashCompletedWeight = (float) $activeOrdersForDash->sum('completed_weight');
        $dashPendingWeight = (float) $activeOrdersForDash->sum('pending_weight');

        $dashSilverWeight = (float) $activeOrdersForDash->filter(function ($wo) {
            $m = strtolower($wo->material_type ?? '');
            return str_contains($m, 'silver');
        })->sum('allotted_weight');

        $dashDiamondWeight = (float) $activeOrdersForDash->filter(function ($wo) {
            $m = strtolower($wo->material_type ?? '');
            return str_contains($m, 'diamond');
        })->sum('allotted_weight');

        $dashGoldWeight = (float) $activeOrdersForDash->filter(function ($wo) {
            $m = strtolower($wo->material_type ?? '');
            return !str_contains($m, 'silver') && !str_contains($m, 'diamond');
        })->sum('allotted_weight');

        if ($request->has('refresh') || $request->has('nocache')) {
            \App\Models\RawMaterial::recalculateAllocations();
        }

        // 6. Authoritative Total Diamond Carats from persisted stock records & movements
        $diamondRawMat = \App\Models\RawMaterial::where('material_type', 'diamond')->first();
        $totalDiamondOpeningCarats = (float) \App\Models\MaterialOpeningStock::where('material_type', 'diamond')->sum('carat_weight');
        $totalDiamondOpeningCount = (float) \App\Models\MaterialOpeningStock::where('material_type', 'diamond')->sum('quantity');
        $totalDiamondPurchasedCarats = (float) \App\Models\PurchaseEntry::where('purchase_type', 'raw_material')->where('metal_type', 'diamond')->sum('weight');
        $totalDiamondPurchasedCount = (float) \App\Models\PurchaseEntry::where('purchase_type', 'raw_material')->where('metal_type', 'diamond')->sum('count_qty');

        $totalAllocatedDiaCarats = (float) $activeOrdersForDash->sum('total_dia_cts');
        $totalAllocatedDiaCount = (float) $activeOrdersForDash->sum('total_dia_pcs');

        if ($diamondRawMat && $diamondRawMat->current_balance > 0) {
            $dashTotalDiamondCarats = round((float) $diamondRawMat->current_balance, 3);
            $dashTotalDiamondCount = round((float) $diamondRawMat->current_count, 0);
        } else {
            $dashTotalDiamondCarats = max(0.0, round(($totalDiamondOpeningCarats + $totalDiamondPurchasedCarats) - $totalAllocatedDiaCarats, 3));
            $dashTotalDiamondCount = max(0.0, round(($totalDiamondOpeningCount + $totalDiamondPurchasedCount) - $totalAllocatedDiaCount, 0));
        }

        // Diamond stamps breakdown
        $diaStampsMap = [];
        $opStamps = \App\Models\MaterialOpeningStock::where('material_type', 'diamond')->select('stamp', DB::raw('SUM(carat_weight) as carats'), DB::raw('SUM(quantity) as pcs'))->groupBy('stamp')->get();
        $purStamps = \App\Models\PurchaseEntry::where('purchase_type', 'raw_material')->where('metal_type', 'diamond')->select('purity as stamp', DB::raw('SUM(weight) as carats'), DB::raw('SUM(count_qty) as pcs'))->groupBy('purity')->get();

        foreach ($opStamps as $os) {
            $st = trim($os->stamp ?: 'Standard');
            if (!isset($diaStampsMap[$st])) $diaStampsMap[$st] = ['stamp' => $st, 'carats' => 0.0, 'count' => 0];
            $diaStampsMap[$st]['carats'] += (float)$os->carats;
            $diaStampsMap[$st]['count'] += (int)$os->pcs;
        }
        foreach ($purStamps as $ps) {
            $st = trim($ps->stamp ?: 'Standard');
            if (!isset($diaStampsMap[$st])) $diaStampsMap[$st] = ['stamp' => $st, 'carats' => 0.0, 'count' => 0];
            $diaStampsMap[$st]['carats'] += (float)$ps->carats;
            $diaStampsMap[$st]['count'] += (int)$ps->pcs;
        }
        $diaStampsBreakdown = array_values($diaStampsMap);

        return [
            'summary' => [
                'totalDiamondCarats' => $dashTotalDiamondCarats,
                'totalDiamondCaratsFormatted' => number_format($dashTotalDiamondCarats, 3) . ' ct',
                'totalDiamondCount' => $dashTotalDiamondCount,
                'totalDiamondCountFormatted' => number_format($dashTotalDiamondCount) . ' pcs',
                'diamondStampsBreakdown' => $diaStampsBreakdown,
                'todaysSaleFormatted' => '₹' . number_format($periodSalesRaw, 0),
                'todaysSaleRaw' => $periodSalesRaw,
                'sales_metric' => $salesMetricChange,
                'ordersFormatted' => number_format($periodOrdersCount),
                'orders_metric' => $ordersMetricChange,
                'inventoryProductsCount' => $periodProductsCount,
                'inventoryProductsFormatted' => number_format($periodProductsCount),
                'inventory_products_metric' => $invMetricChange,
                'inventoryValueFormatted' => number_format($periodProductsCount),
                'inventory_metric' => $invMetricChange,
                'periodCreatedProductsCount' => $periodCreatedProductsCount,
                'allTimeActiveProducts' => $allTimeActiveProducts,
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
                'allocated_weight' => round($dashAllocatedWeight, 3),
                'completed_weight' => round($dashCompletedWeight, 3),
                'pending_weight' => round($dashPendingWeight, 3),
                'gold_weight' => round($dashGoldWeight, 3),
                'silver_weight' => round($dashSilverWeight, 3),
                'diamond_weight' => round($dashDiamondWeight, 3),
                'currentGoldAverage' => $currentGoldAverage,
                'avgBuyingRateGram' => $currentGoldAverage['buyingValRaw'],
                'avgSellingRateGram' => $currentGoldAverage['sellingValRaw'],
                'avg24kBuyingRate10g' => (float)($currentGoldAverage['buyingVal10g'] ?: ($currentGoldAverage['buyingValRaw'] * 10)),
                'avg24kBuyingRate10gFormatted' => '₹' . ($currentGoldAverage['buyingVal10g'] ?: number_format($currentGoldAverage['buyingValRaw'] * 10)),
                'avg24kSellingRate10g' => (float)($currentGoldAverage['sellingVal10g'] ?: ($currentGoldAverage['sellingValRaw'] * 10)),
                'avg24kSellingRate10gFormatted' => '₹' . ($currentGoldAverage['sellingVal10g'] ?: number_format($currentGoldAverage['sellingValRaw'] * 10)),
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

    /**
     * Calculate transaction-based gold metrics for a specific date range.
     * Uses actual transaction gold weight and transaction amount/value.
     * Weighted average = SUM(gold value) / SUM(gold weight).
     * Excludes cancelled or reversed transactions.
     * Does NOT use live external API rates.
     */
    private function calculateGoldTransactionMetricsForRange($startDate = null, $endDate = null)
    {
        // 1. Gold Purchases
        $purchaseQuery = \App\Models\PurchaseEntry::query();

        // Exclude cancelled/reversed if status column exists or by notes
        if (\Illuminate\Support\Facades\Schema::hasColumn('purchase_entries', 'status')) {
            $purchaseQuery->whereNotIn('status', ['cancelled', 'reversed', 'void', 'deleted']);
        }
        $purchaseQuery->where(function ($q) {
            $q->whereNull('notes')
              ->orWhere(function ($n) {
                  $n->where('notes', 'not like', '%[CANCELLED]%')
                    ->where('notes', 'not like', '%[REVERSED]%');
              });
        });

        if ($startDate && $endDate) {
            $sStr = $startDate instanceof Carbon ? $startDate->toDateString() : substr((string)$startDate, 0, 10);
            $eStr = $endDate instanceof Carbon ? $endDate->toDateString() : substr((string)$endDate, 0, 10);
            $purchaseQuery->where(function ($q) use ($sStr, $eStr, $startDate, $endDate) {
                $q->whereBetween('purchase_date', [$sStr, $eStr])
                  ->orWhere(function ($sub) use ($startDate, $endDate) {
                      $sub->whereNull('purchase_date')
                          ->whereBetween('created_at', [$startDate, $endDate]);
                  });
            });
        } elseif ($startDate) {
            $sStr = $startDate instanceof Carbon ? $startDate->toDateString() : substr((string)$startDate, 0, 10);
            $purchaseQuery->where(function ($q) use ($sStr, $startDate) {
                $q->where('purchase_date', '>=', $sStr)
                  ->orWhere(function ($sub) use ($startDate) {
                      $sub->whereNull('purchase_date')
                          ->where('created_at', '>=', $startDate);
                  });
            });
        } elseif ($endDate) {
            $eStr = $endDate instanceof Carbon ? $endDate->toDateString() : substr((string)$endDate, 0, 10);
            $purchaseQuery->where(function ($q) use ($eStr, $endDate) {
                $q->where('purchase_date', '<=', $eStr)
                  ->orWhere(function ($sub) use ($endDate) {
                      $sub->whereNull('purchase_date')
                          ->where('created_at', '<=', $endDate);
                  });
            });
        }

        $purchases = $purchaseQuery->with(['product', 'category'])->get();

        $totalPurchaseGoldValue = 0.0;
        $totalPurchaseGoldWeight = 0.0;
        $purchaseCount = 0;

        foreach ($purchases as $pu) {
            // Check metal type and category
            $metalType = strtolower(trim($pu->metal_type ?? ''));
            $itemName = strtolower(trim($pu->item_name ?? ''));
            $prodName = strtolower(trim($pu->product?->name ?? ''));
            $catName = strtolower(trim($pu->category?->name ?? ''));

            // Exclude non-gold transactions (silver, diamond without gold, platinum)
            if (str_contains($metalType, 'silver') || str_contains($metalType, 'diamond') || str_contains($metalType, 'platinum')) {
                continue;
            }
            if (empty($metalType) && (str_contains($catName, 'silver') || str_contains($itemName, 'silver') || str_contains($prodName, 'silver'))) {
                continue;
            }
            if (empty($metalType) && (str_contains($catName, 'diamond') || str_contains($itemName, 'diamond') || str_contains($prodName, 'diamond')) && (float)$pu->weight <= 0) {
                continue;
            }

            $wt = (float) ($pu->net_weight > 0 ? $pu->net_weight : $pu->weight);
            $rate = (float) ($pu->rate ?? 0);
            $amt = (float) ($pu->total_amount ?? 0);

            // Exclude unpriced / unfixed gold purchases ("Gold Payable (No Rate)")
            // An unpriced gold entry has no agreed rupee gold rate; liability is in physical grams.
            // Any total_amount on unpriced entries is solely making charges/tax, which must NOT be treated as the gold purchase rate.
            $isUnpriced = ($rate <= 0)
                || !empty($pu->is_unpriced)
                || strtolower($pu->payment_status ?? '') === 'gold_payable'
                || strtolower($pu->payable_type ?? '') === 'gold';

            if ($isUnpriced) {
                continue;
            }

            // For priced gold purchases, metal purchase cost is rate * weight (or total_amount if consistent)
            $goldValue = ($rate > 0 && $wt > 0) ? ($rate * $wt) : $amt;

            if ($wt > 0 && $goldValue > 0) {
                $totalPurchaseGoldValue += $goldValue;
                $totalPurchaseGoldWeight += $wt;
                $purchaseCount++;
            }
        }

        $avgBuyingRateGram = $totalPurchaseGoldWeight > 0 ? round($totalPurchaseGoldValue / $totalPurchaseGoldWeight, 2) : 0.0;

        // 2. Gold Sales
        $totalSalesGoldValue = 0.0;
        $totalSalesGoldWeight = 0.0;
        $salesCount = 0;
        $invoicesCounted = [];

        // 2A. SaleItem records
        $saleQuery = \App\Models\SaleItem::with(['invoice', 'product']);
        $saleItems = $saleQuery->get();

        foreach ($saleItems as $si) {
            $inv = $si->invoice;
            if ($inv) {
                if (in_array(strtolower($inv->status ?? ''), ['cancelled', 'reversed', 'void']) ||
                    in_array(strtolower($inv->sale_status ?? ''), ['cancelled', 'reversed'])) {
                    continue;
                }
                $invoicesCounted[$inv->id] = true;
                $invDate = $inv->invoice_date ? Carbon::parse($inv->invoice_date) : Carbon::parse($inv->created_at);
            } else {
                $invDate = Carbon::parse($si->created_at);
            }

            // Check date range
            if ($startDate && $invDate->lt($startDate)) continue;
            if ($endDate && $invDate->gt($endDate)) continue;

            $prodName = strtolower(trim($si->product_name ?? ''));
            $mType = strtolower(trim($si->metal_type ?? ''));
            if (str_contains($prodName, 'silver') || str_contains($mType, 'silver')) continue;

            $wt = (float) ($si->net_weight > 0 ? $si->net_weight : $si->gross_weight);
            $rate = (float) ($si->rate ?? 0);
            $amt = (float) ($si->line_total ?? 0);

            if ($amt <= 0 && $rate > 0 && $wt > 0) {
                $amt = $rate * $wt;
            }

            if ($wt > 0 && $amt > 0) {
                $totalSalesGoldValue += $amt;
                $totalSalesGoldWeight += $wt;
                $salesCount++;
            }
        }

        // 2B. Invoices with items stored as JSON array (if not already counted via SaleItem)
        $invQuery = \App\Models\Invoice::query();
        if ($startDate && $endDate) {
            $invQuery->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('invoice_date', [$startDate->toDateString(), $endDate->toDateString()])
                  ->orWhere(function ($sub) use ($startDate, $endDate) {
                      $sub->whereNull('invoice_date')
                          ->whereBetween('created_at', [$startDate, $endDate]);
                  });
            });
        } elseif ($startDate) {
            $invQuery->where(function ($q) use ($startDate) {
                $q->where('invoice_date', '>=', $startDate->toDateString())
                  ->orWhere(function ($sub) use ($startDate) {
                      $sub->whereNull('invoice_date')
                          ->where('created_at', '>=', $startDate);
                  });
            });
        } elseif ($endDate) {
            $invQuery->where(function ($q) use ($endDate) {
                $q->where('invoice_date', '<=', $endDate->toDateString())
                  ->orWhere(function ($sub) use ($endDate) {
                      $sub->whereNull('invoice_date')
                          ->where('created_at', '<=', $endDate);
                  });
            });
        }

        $invQuery->whereNotIn('status', ['cancelled', 'reversed', 'void'])
                 ->whereNotIn('sale_status', ['cancelled', 'reversed']);

        $invoices = $invQuery->get();

        foreach ($invoices as $inv) {
            if (isset($invoicesCounted[$inv->id])) continue; // already processed via SaleItem

            $items = is_array($inv->items) ? $inv->items : (json_decode($inv->items ?? '[]', true) ?: []);
            foreach ($items as $itm) {
                $desc = strtolower(trim($itm['description'] ?? $itm['name'] ?? $itm['item_name'] ?? ''));
                $mType = strtolower(trim($itm['metal_type'] ?? ''));
                if (str_contains($desc, 'silver') || str_contains($mType, 'silver')) continue;

                $wt = (float) ($itm['net_weight'] ?? $itm['net_wt'] ?? $itm['gross_weight'] ?? $itm['gross_wt'] ?? 0);
                $rate = (float) ($itm['rate'] ?? 0);
                $amt = (float) ($itm['line_total'] ?? $itm['taxable'] ?? 0);

                if ($amt <= 0 && $rate > 0 && $wt > 0) {
                    $amt = $rate * $wt;
                }

                if ($wt > 0 && $amt > 0) {
                    $totalSalesGoldValue += $amt;
                    $totalSalesGoldWeight += $wt;
                    $salesCount++;
                }
            }
        }

        $avgSellingRateGram = $totalSalesGoldWeight > 0 ? round($totalSalesGoldValue / $totalSalesGoldWeight, 2) : 0.0;

        return [
            'buying_weight' => round($totalPurchaseGoldWeight, 3),
            'buying_value' => round($totalPurchaseGoldValue, 2),
            'buying_count' => $purchaseCount,
            'avg_buying_price_gram' => $avgBuyingRateGram,
            'avg_buying_price_10g' => round($avgBuyingRateGram * 10, 2),

            'selling_weight' => round($totalSalesGoldWeight, 3),
            'selling_value' => round($totalSalesGoldValue, 2),
            'sales_count' => $salesCount,
            'avg_selling_price_gram' => $avgSellingRateGram,
            'avg_selling_price_10g' => round($avgSellingRateGram * 10, 2),
        ];
    }

    /**
     * Compute metric comparison against preceding period.
     * Percentage change = ((current period average - previous period average) / previous period average) * 100
     * Handles missing transactions and zero previous-period values safely (never NaN or Infinity).
     */
    private function computeMetricComparison($currAvg, $prevAvg, $vsLabel)
    {
        $curr = (float) $currAvg;
        $prev = (float) $prevAvg;
        $diff = round($curr - $prev, 2);

        // Previous average is zero or unavailable
        if ($prev <= 0) {
            return [
                'val' => $curr > 0 ? round($curr, 2) : 0,
                'formatted' => $curr > 0 ? (fmod($curr, 1) == 0 ? number_format($curr) : number_format($curr, 2)) : '0',
                'val_10g' => round($curr * 10, 2),
                'formatted_10g' => $curr > 0 ? number_format(round($curr * 10)) : '0',
                'prev_val' => 0,
                'prev_formatted' => 'N/A',
                'diff' => 0,
                'diff_formatted' => 'N/A',
                'change' => 'N/A',
                'change_pct' => null,
                'is_increase' => null,
                'direction' => 'na', // 'up', 'down', 'flat', 'na'
                'has_data' => $curr > 0,
                'has_prev' => false,
                'vs_label' => $vsLabel,
            ];
        }

        // Both previous and current exist
        $pct = round((($curr - $prev) / $prev) * 100, 1);
        if ($pct > 0) {
            $changeStr = '+' . number_format($pct, 1) . '%';
            $direction = 'up';
            $isIncrease = true;
        } elseif ($pct < 0) {
            $changeStr = number_format($pct, 1) . '%';
            $direction = 'down';
            $isIncrease = false;
        } else {
            $changeStr = '0.0%';
            $direction = 'flat';
            $isIncrease = true;
        }

        $diffFormatted = ($diff > 0 ? '+₹' : ($diff < 0 ? '-₹' : '₹')) . (fmod(abs($diff), 1) == 0 ? number_format(abs($diff)) : number_format(abs($diff), 2));
        $prevFormatted = (fmod($prev, 1) == 0 ? number_format($prev) : number_format($prev, 2));

        return [
            'val' => round($curr, 2),
            'formatted' => fmod($curr, 1) == 0 ? number_format($curr) : number_format($curr, 2),
            'val_10g' => round($curr * 10, 2),
            'formatted_10g' => number_format(round($curr * 10)),
            'prev_val' => round($prev, 2),
            'prev_formatted' => $prevFormatted,
            'diff' => $diff,
            'diff_formatted' => $diffFormatted,
            'change' => $changeStr,
            'change_pct' => $pct,
            'is_increase' => $isIncrease,
            'direction' => $direction,
            'has_data' => $curr > 0,
            'has_prev' => true,
            'vs_label' => $vsLabel,
        ];
    }

    /**
     * Build gold averages and percentage changes for a standard period key.
     * Compares against the immediately preceding period of the exact same duration.
     */
    public function buildGoldAveragesForPeriod($periodKey)
    {
        $now = Carbon::now();
        $currStart = match($periodKey) {
            'today' => Carbon::today()->startOfDay(),
            'week' => $now->copy()->startOfWeek(),
            'month' => $now->copy()->startOfMonth(),
            'quarter' => $now->copy()->startOfQuarter(),
            'year' => $now->copy()->startOfYear(),
            'all' => Carbon::create(2000, 1, 1)->startOfDay(),
            default => $now->copy()->startOfMonth(),
        };

        $currEnd = match($periodKey) {
            'today' => Carbon::today()->endOfDay(),
            'week' => $now->copy()->endOfWeek(),
            'month' => $now->copy()->endOfMonth(),
            'quarter' => $now->copy()->endOfQuarter(),
            'year' => $now->copy()->endOfYear(),
            'all' => $now->copy()->endOfDay(),
            default => $now->copy()->endOfMonth(),
        };

        $prevStart = match($periodKey) {
            'today' => Carbon::yesterday()->startOfDay(),
            'week' => $now->copy()->subWeek()->startOfWeek(),
            'month' => $now->copy()->subMonth()->startOfMonth(),
            'quarter' => $now->copy()->subQuarter()->startOfQuarter(),
            'year' => $now->copy()->subYear()->startOfYear(),
            'all' => null,
            default => $now->copy()->subMonth()->startOfMonth(),
        };

        $prevEnd = match($periodKey) {
            'today' => Carbon::yesterday()->endOfDay(),
            'week' => $now->copy()->subWeek()->endOfWeek(),
            'month' => $now->copy()->subMonth()->endOfMonth(),
            'quarter' => $now->copy()->subQuarter()->endOfQuarter(),
            'year' => $now->copy()->subYear()->endOfYear(),
            'all' => null,
            default => $now->copy()->subMonth()->endOfMonth(),
        };

        $vsLabel = match($periodKey) {
            'today' => 'vs Yesterday',
            'week' => 'vs Last Week',
            'month' => 'vs Last Month',
            'quarter' => 'vs Last Quarter',
            'year' => 'vs Last Year',
            'all' => 'All Time',
            default => 'vs Last Month',
        };

        $currMetrics = $this->calculateGoldTransactionMetricsForRange($currStart, $currEnd);
        $prevMetrics = $prevStart ? $this->calculateGoldTransactionMetricsForRange($prevStart, $prevEnd) : [
            'avg_buying_price_gram' => 0.0,
            'avg_selling_price_gram' => 0.0,
        ];

        $buyComp = $this->computeMetricComparison(
            $currMetrics['avg_buying_price_gram'],
            $prevMetrics['avg_buying_price_gram'],
            $vsLabel
        );

        $sellComp = $this->computeMetricComparison(
            $currMetrics['avg_selling_price_gram'],
            $prevMetrics['avg_selling_price_gram'],
            $vsLabel
        );

        return [
            'period' => $periodKey,
            'unit' => 'g',
            'buyingVal' => $buyComp['formatted'],
            'buyingValRaw' => $buyComp['val'],
            'buyingVal10g' => $buyComp['formatted_10g'],
            'prevBuyingVal' => $buyComp['prev_formatted'],
            'buyingDiff' => $buyComp['diff_formatted'],
            'buyingChange' => $buyComp['change'],
            'buyingDirection' => $buyComp['direction'],
            'buyingIsIncrease' => $buyComp['is_increase'],
            'buyingVs' => $buyComp['vs_label'],
            'hasBuyingData' => $buyComp['has_data'],

            'sellingVal' => $sellComp['formatted'],
            'sellingValRaw' => $sellComp['val'],
            'sellingVal10g' => $sellComp['formatted_10g'],
            'prevSellingVal' => $sellComp['prev_formatted'],
            'sellingDiff' => $sellComp['diff_formatted'],
            'sellingChange' => $sellComp['change'],
            'sellingDirection' => $sellComp['direction'],
            'sellingIsIncrease' => $sellComp['is_increase'],
            'sellingVs' => $sellComp['vs_label'],
            'hasSellingData' => $sellComp['has_data'],
        ];
    }

    private function calculateGoldAveragesForDateRange($startDate = null, $endDate = null)
    {
        $metrics = $this->calculateGoldTransactionMetricsForRange($startDate, $endDate);
        return [
            'buying10g' => round($metrics['avg_buying_price_10g']),
            'selling10g' => round($metrics['avg_selling_price_10g']),
        ];
    }


    public static function getLiveMetalRatesData()
    {
        return \App\Services\MetalRateService::getCurrentRates();
    }

    public function metalRates()
    {
        return response()->json(\App\Services\MetalRateService::getCurrentRates());
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
            'gold14k' => 'nullable',
            'silverGram' => 'nullable',
            'silverKg' => 'nullable',
        ]);

        $data = \App\Services\MetalRateService::saveManualRates($request->all());

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
        $liveRates = \App\Services\MetalRateService::resetToLive();

        return response()->json([
            'status' => 'success',
            'message' => 'Reset to live internet rates successfully!',
            'rates' => $liveRates,
        ]);
    }
}
