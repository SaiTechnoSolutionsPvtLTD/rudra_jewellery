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
                $q->where('invoice_number', 'like', "%{$search}%")
                  ->orWhere('customer_name', 'like', "%{$search}%")
                  ->orWhere('customer_phone', 'like', "%{$search}%");
            });
        }

        $allInvoices = (clone $salesQuery)->get();
        $totalSalesCount = $allInvoices->count();
        $totalSalesRevenue = (float) $allInvoices->sum('total_amount');
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

        $totalSalesItems = $salesQuery->count();
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

        // 2. Inventory & Stock Report Data
        $inventoryQuery = Product::with(['category', 'subcategory']);
        if ($search) {
            $inventoryQuery->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('design_code', 'like', "%{$search}%");
            });
        }
        $allProducts = (clone $inventoryQuery)->get();
        $totalProducts = $allProducts->count();
        $inventoryValuation = (float) $allProducts->sum(function ($p) {
            $qty = $p->current_stock_qty ?? 0;
            $price = $p->selling_price ?? $p->price ?? 0;
            return $qty * $price;
        });

        $lowStockCount = $allProducts->filter(fn($p) => ($p->current_stock_qty ?? 0) < 5)->count();

        $totalInventoryItems = $inventoryQuery->count();
        $products = $isExport
            ? (clone $inventoryQuery)->orderBy('created_at', 'desc')->get()
            : (clone $inventoryQuery)->orderBy('created_at', 'desc')->skip(($page - 1) * $perPage)->take($perPage)->get();

        $formattedInventory = $products->map(function ($p) {
            $qty = $p->current_stock_qty ?? 0;
            $price = (float) ($p->selling_price ?? $p->price ?? 0);
            return [
                'id' => $p->id,
                'sku' => $p->sku ?? ('SKU-' . sprintf('%05d', $p->id)),
                'name' => $p->name,
                'category' => $p->category?->name ?? 'Jewellery',
                'purity' => $p->purity ?? '22K (916)',
                'gross_weight' => (float) ($p->gross_weight ?? 0),
                'net_weight' => (float) ($p->net_weight ?? 0),
                'stock_qty' => $qty,
                'price' => $price,
                'total_valuation' => (float) ($qty * $price),
                'stock_status' => $qty <= 0 ? 'Out of Stock' : ($qty < 5 ? 'Low Stock' : 'In Stock'),
            ];
        })->toArray();

        // 3. Karigar & Manufacturing Job Order Report Data
        $workOrderQuery = WorkOrder::with(['karigar', 'product']);
        $workOrderQuery = $dateQuery($workOrderQuery, 'created_at');

        if ($search) {
            $workOrderQuery->where(function ($q) use ($search) {
                $q->where('work_order_number', 'like', "%{$search}%")
                  ->orWhere('karigar_name', 'like', "%{$search}%")
                  ->orWhere('product_name', 'like', "%{$search}%");
            });
        }

        $allWorkOrders = (clone $workOrderQuery)->get();
        $totalAllottedGold = (float) $allWorkOrders->sum('allotted_weight');
        $totalCompletedGold = (float) $allWorkOrders->sum('completed_weight');
        $totalWastageGold = (float) $allWorkOrders->sum('wastage_weight');
        $totalPendingGold = (float) $allWorkOrders->sum('pending_weight');

        $totalWorkOrderItems = $workOrderQuery->count();
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

        // 4. Purchase & Supplier Report Data
        $purchaseQuery = PurchaseEntry::with(['supplier']);
        $purchaseQuery = $dateQuery($purchaseQuery, 'created_at');

        if ($search) {
            $purchaseQuery->where(function ($q) use ($search) {
                $q->where('purchase_no', 'like', "%{$search}%")
                  ->orWhere('supplier_name', 'like', "%{$search}%");
            });
        }

        $allPurchases = (clone $purchaseQuery)->get();
        $totalPurchaseSpend = (float) $allPurchases->sum('total_amount');

        $totalPurchaseItems = $purchaseQuery->count();
        $purchases = $isExport
            ? (clone $purchaseQuery)->orderBy('created_at', 'desc')->get()
            : (clone $purchaseQuery)->orderBy('created_at', 'desc')->skip(($page - 1) * $perPage)->take($perPage)->get();

        $formattedPurchases = $purchases->map(function ($pu) {
            return [
                'id' => $pu->id,
                'purchase_no' => $pu->purchase_no ?? ('PUR-2026-' . sprintf('%04d', $pu->id)),
                'supplier_name' => $pu->supplier_name ?? $pu->supplier?->name ?? 'Bullion Supplier',
                'purchase_date' => Carbon::parse($pu->purchase_date ?? $pu->created_at)->format('d M Y'),
                'total_amount' => (float) $pu->total_amount,
                'net_weight' => (float) ($pu->total_net_weight ?? $pu->net_weight ?? 0),
                'purity' => $pu->purity ?? '24K (999)',
                'payment_status' => $pu->payment_status ?? 'Paid',
            ];
        })->toArray();

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
}
