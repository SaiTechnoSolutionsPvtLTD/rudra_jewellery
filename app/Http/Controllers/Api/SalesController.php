<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Product;
use App\Models\WorkOrderReceivedPiece;
use App\Services\SaleService;
use App\Services\NotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesController extends Controller
{
    public function __construct(private SaleService $saleService) {}

    public function dashboard(Request $request)
    {
        $sales = Invoice::query()
            ->when($request->filled('search'), fn ($q) => $q->where(fn ($inner) => $inner->where('invoice_no', 'like', '%' . $request->search . '%')->orWhere('client_name', 'like', '%' . $request->search . '%')))
            ->when($request->filled('client_id') && $request->client_id !== 'all', fn ($q) => $q->where('client_id', $request->client_id))
            ->when($request->filled('status') && $request->status !== 'all', fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('from'), fn ($q) => $q->whereDate('invoice_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('invoice_date', '<=', $request->date('to')))
            ->latest('invoice_date')
            ->select(['id', 'invoice_no', 'client_id', 'client_name', 'total_amount', 'paid_amount', 'due_amount', 'profit_amount', 'invoice_date'])
            ->get();

        return response()->json([
            'stats' => [
                'total_sales' => round($sales->sum('total_amount'), 2),
                'total_orders' => $sales->count(),
                'paid_amount' => round($sales->sum('paid_amount'), 2),
                'outstanding_amount' => round($sales->sum('due_amount'), 2),
                'profit' => round($sales->sum('profit_amount'), 2),
                'customers' => $sales->map(fn ($s) => $s->client_id ? 'id_' . $s->client_id : 'name_' . trim(strtolower($s->client_name ?: 'walk-in customer')))->unique()->count(),
            ],
            'trend' => $sales->groupBy(fn ($sale) => optional($sale->invoice_date)->format('Y-m-d'))->map(fn ($group, $date) => ['date' => $date, 'amount' => round($group->sum('total_amount'), 2)])->values(),
            'recent_sales' => $sales->take(10)->values(),
        ]);
    }

    protected function resolvePeriodDates(Request $request): array
    {
        $period = strtolower((string) $request->get('period', 'all'));
        $fromInput = $request->get('from') ?: $request->get('start_date');
        $toInput = $request->get('to') ?: $request->get('end_date');

        if (!empty($fromInput) && !empty($toInput)) {
            $tz = config('app.timezone', 'Asia/Kolkata');
            $startDate = \Carbon\Carbon::parse($fromInput, $tz)->startOfDay();
            $endDate = \Carbon\Carbon::parse($toInput, $tz)->endOfDay();
            if ($endDate->lt($startDate)) {
                $temp = $startDate;
                $startDate = $endDate->copy()->startOfDay();
                $endDate = $temp->copy()->endOfDay();
            }
            $diffInDays = max(1, (int) round($startDate->copy()->startOfDay()->diffInDays($endDate->copy()->startOfDay())) + 1);
            $prevPeriodEnd = $startDate->copy()->subSecond();
            $prevPeriodStart = $prevPeriodEnd->copy()->subDays($diffInDays - 1)->startOfDay();
            $periodKey = 'custom';
            $vsLabel = "vs Previous {$diffInDays} Days";
            $label = $startDate->format('d M Y') . ' - ' . $endDate->format('d M Y');
        } else {
            $periodKey = match($period) {
                'today' => 'today',
                'this_week', 'week' => 'week',
                'this_month', 'monthly', 'month' => 'month',
                'last_month' => 'last_month',
                'this_quarter', 'quarter' => 'quarter',
                'this_year', 'yearly', 'year' => 'year',
                'last_year' => 'last_year',
                'all' => 'all',
                default => 'all',
            };

            $now = \Carbon\Carbon::now(config('app.timezone', 'Asia/Kolkata'));

            $startDate = match($periodKey) {
                'today' => $now->copy()->startOfDay(),
                'week' => $now->copy()->startOfWeek()->startOfDay(),
                'month' => $now->copy()->startOfMonth()->startOfDay(),
                'last_month' => $now->copy()->subMonth()->startOfMonth()->startOfDay(),
                'quarter' => $now->copy()->startOfQuarter()->startOfDay(),
                'year' => \Carbon\Carbon::create($now->month >= 4 ? $now->year : $now->year - 1, 4, 1)->startOfDay(),
                'last_year' => \Carbon\Carbon::create($now->month >= 4 ? $now->year - 1 : $now->year - 2, 4, 1)->startOfDay(),
                'all' => null,
            };

            $endDate = match($periodKey) {
                'today' => $now->copy()->endOfDay(),
                'week' => $now->copy()->endOfWeek()->endOfDay(),
                'month' => $now->copy()->endOfMonth()->endOfDay(),
                'last_month' => $now->copy()->subMonth()->endOfMonth()->endOfDay(),
                'quarter' => $now->copy()->endOfQuarter()->endOfDay(),
                'year' => \Carbon\Carbon::create($now->month >= 4 ? $now->year + 1 : $now->year, 3, 31)->endOfDay(),
                'last_year' => \Carbon\Carbon::create($now->month >= 4 ? $now->year : $now->year - 1, 3, 31)->endOfDay(),
                'all' => null,
            };

            $prevPeriodStart = match($periodKey) {
                'today' => $now->copy()->yesterday()->startOfDay(),
                'week' => $now->copy()->subWeek()->startOfWeek()->startOfDay(),
                'month' => $now->copy()->subMonth()->startOfMonth()->startOfDay(),
                'last_month' => $now->copy()->subMonths(2)->startOfMonth()->startOfDay(),
                'quarter' => $now->copy()->subQuarter()->startOfQuarter()->startOfDay(),
                'year' => \Carbon\Carbon::create($now->month >= 4 ? $now->year - 1 : $now->year - 2, 4, 1)->startOfDay(),
                'last_year' => \Carbon\Carbon::create($now->month >= 4 ? $now->year - 2 : $now->year - 3, 4, 1)->startOfDay(),
                'all' => $now->copy()->subYear()->startOfYear()->startOfDay(),
            };

            $prevPeriodEnd = match($periodKey) {
                'today' => $now->copy()->yesterday()->endOfDay(),
                'week' => $now->copy()->subWeek()->endOfWeek()->endOfDay(),
                'month' => $now->copy()->subMonth()->endOfMonth()->endOfDay(),
                'last_month' => $now->copy()->subMonths(2)->endOfMonth()->endOfDay(),
                'quarter' => $now->copy()->subQuarter()->endOfQuarter()->endOfDay(),
                'year' => \Carbon\Carbon::create($now->month >= 4 ? $now->year : $now->year - 1, 3, 31)->endOfDay(),
                'last_year' => \Carbon\Carbon::create($now->month >= 4 ? $now->year - 1 : $now->year - 2, 3, 31)->endOfDay(),
                'all' => $now->copy()->subYear()->endOfYear()->endOfDay(),
            };

            $vsLabel = match($periodKey) {
                'today' => 'vs Yesterday',
                'week' => 'vs Last Week',
                'month' => 'vs Last Month',
                'last_month' => 'vs Prev Month',
                'quarter' => 'vs Last Quarter',
                'year' => 'vs Last Year',
                'last_year' => 'vs Prev Year',
                'all' => 'vs Previous Year',
            };

            $label = match($periodKey) {
                'today' => $now->format('d M Y'),
                'week' => $startDate ? ($startDate->format('d M Y') . ' - ' . $endDate->format('d M Y')) : 'This Week',
                'month' => $startDate ? ($startDate->format('d M Y') . ' - ' . $endDate->format('d M Y')) : 'This Month',
                'last_month' => $startDate ? ($startDate->format('d M Y') . ' - ' . $endDate->format('d M Y')) : 'Last Month',
                'quarter' => $startDate ? ($startDate->format('d M Y') . ' - ' . $endDate->format('d M Y')) : 'This Quarter',
                'year' => $startDate ? ($startDate->format('d M Y') . ' - ' . $endDate->format('d M Y')) : 'This Financial Year',
                'last_year' => $startDate ? ($startDate->format('d M Y') . ' - ' . $endDate->format('d M Y')) : 'Last Financial Year',
                'all' => 'All Time',
            };
        }

        return [
            'periodKey' => $periodKey,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'prevPeriodStart' => $prevPeriodStart,
            'prevPeriodEnd' => $prevPeriodEnd,
            'vsLabel' => $vsLabel,
            'label' => $label,
        ];
    }

    protected function calculateMetricChange($curr, $prev, string $vsLabel): array
    {
        $curr = (float) $curr;
        $prev = (float) $prev;
        if ($prev > 0) {
            $pct = round((($curr - $prev) / $prev) * 100, 1);
            return [
                'change' => ($pct >= 0 ? '+' : '') . number_format($pct, 1) . '%',
                'is_increase' => $pct >= 0,
                'pct' => $pct,
                'vs_label' => $vsLabel,
                'current' => $curr,
                'previous' => $prev,
            ];
        }
        if ($curr > 0) {
            return [
                'change' => '+100.0%',
                'is_increase' => true,
                'pct' => 100.0,
                'vs_label' => $vsLabel,
                'current' => $curr,
                'previous' => 0,
            ];
        }
        return [
            'change' => '0.0%',
            'is_increase' => true,
            'pct' => 0.0,
            'vs_label' => $vsLabel,
            'current' => 0,
            'previous' => 0,
        ];
    }

    public function customerReport(Request $request)
    {
        $periodInfo = $this->resolvePeriodDates($request);

        $base = Invoice::query()
            ->whereNotIn('status', ['cancelled', 'void', 'returned'])
            ->where(function ($sub) {
                $sub->whereNull('sale_status')
                    ->orWhereNotIn('sale_status', ['cancelled', 'void', 'returned', 'reversed']);
            })
            ->when($request->filled('client_id') && $request->client_id !== 'all', fn ($q) => $q->where('client_id', $request->client_id))
            ->when($request->filled('search'), fn ($q) => $q->where(fn ($inner) => $inner->where('client_name', 'like', '%' . $request->search . '%')->orWhere('invoice_no', 'like', '%' . $request->search . '%')));

        if ($periodInfo['startDate'] !== null && $periodInfo['endDate'] !== null) {
            $base->whereBetween('invoice_date', [$periodInfo['startDate'], $periodInfo['endDate']]);
        }

        $invoices = (clone $base)
            ->select([
                'id', 'client_id', 'client_name', 'total_amount', 'invoice_date',
                'items', 'gst_amount'
            ])
            ->with(['itemsRelation:id,invoice_id,quantity,gross_weight,net_weight,stone_weight,rate,making_charge,stone_charge,line_total'])
            ->get();

        $totalSales = round((float) $invoices->sum('total_amount'), 2);
        $totalInvoices = $invoices->count();
        $totalCustomers = $invoices->map(fn ($inv) => $inv->client_id ? 'id_' . $inv->client_id : 'name_' . trim(strtolower($inv->client_name ?: 'walk-in customer')))->unique()->count();

        // Query previous period invoices for accurate vs-previous-period metric calculations
        $prevBase = Invoice::query()
            ->whereNotIn('status', ['cancelled', 'void', 'returned'])
            ->where(function ($sub) {
                $sub->whereNull('sale_status')
                    ->orWhereNotIn('sale_status', ['cancelled', 'void', 'returned', 'reversed']);
            })
            ->when($request->filled('client_id') && $request->client_id !== 'all', fn ($q) => $q->where('client_id', $request->client_id))
            ->when($request->filled('search'), fn ($q) => $q->where(fn ($inner) => $inner->where('client_name', 'like', '%' . $request->search . '%')->orWhere('invoice_no', 'like', '%' . $request->search . '%')))
            ->whereBetween('invoice_date', [$periodInfo['prevPeriodStart'], $periodInfo['prevPeriodEnd']]);

        $prevInvoices = $prevBase->select([
            'id', 'client_id', 'client_name', 'total_amount', 'invoice_date',
            'items'
        ])->with(['itemsRelation:id,invoice_id,quantity'])->get();

        $prevSales = round((float) $prevInvoices->sum('total_amount'), 2);
        $prevInvoicesCount = $prevInvoices->count();
        $prevCustomersCount = $prevInvoices->map(fn ($pi) => $pi->client_id ? 'id_' . $pi->client_id : 'name_' . trim(strtolower($pi->client_name ?: 'walk-in customer')))->unique()->count();
        $prevQty = 0;
        foreach ($prevInvoices as $pi) {
            $raw = is_array($pi->items) ? $pi->items : (json_decode($pi->items, true) ?: []);
            if (empty($raw) && $pi->itemsRelation && $pi->itemsRelation->isNotEmpty()) {
                $raw = $pi->itemsRelation->toArray();
            }
            if (empty($raw)) {
                $prevQty += 1;
            } else {
                foreach ($raw as $it) {
                    $prevQty += (float) ($it['quantity'] ?? $it['qty'] ?? 1);
                }
            }
        }
        $prevAvgOrderVal = $prevInvoicesCount > 0 ? ($prevSales / $prevInvoicesCount) : 0;
        $prevAvgItemPrice = $prevQty > 0 ? ($prevSales / $prevQty) : 0;

        // Compute items metadata dynamically from sale_items table or items JSON column in a single pass
        $totalQty = 0;
        $totalGoldWgt = 0;
        $totalDiamondWgt = 0;
        $goldValue = 0;
        $makingCharges = 0;
        $stoneCharges = 0;

        $clientWeightsMap = [];

        foreach ($invoices as $inv) {
            $clientKey = $inv->client_id ? (string)$inv->client_id : (string)$inv->client_name;
            if (!isset($clientWeightsMap[$clientKey])) {
                $clientWeightsMap[$clientKey] = ['qty' => 0.0, 'gold_wgt' => 0.0, 'diamond_wgt' => 0.0];
            }

            $rawItems = is_array($inv->items) ? $inv->items : (json_decode($inv->items, true) ?: []);
            if (empty($rawItems) && $inv->itemsRelation && $inv->itemsRelation->isNotEmpty()) {
                $rawItems = $inv->itemsRelation->toArray();
            }

            if (empty($rawItems)) {
                $qty = 1;
                $gross = 0;
                $stone = 0;
                $making = 0;
                $stoneChg = 0;
                $taxable = (float) $inv->total_amount;

                $totalQty += $qty;
                $totalGoldWgt += $gross;
                $totalDiamondWgt += $stone;
                $goldValue += $taxable;
                $makingCharges += $making;
                $stoneCharges += $stoneChg;

                $clientWeightsMap[$clientKey]['qty'] += $qty;
                $clientWeightsMap[$clientKey]['gold_wgt'] += $gross;
                $clientWeightsMap[$clientKey]['diamond_wgt'] += $stone;
            } else {
                foreach ($rawItems as $itm) {
                    $qty = (float) ($itm['quantity'] ?? $itm['qty'] ?? 1);
                    $gross = (float) ($itm['gross_wt'] ?? $itm['gross_weight'] ?? 0);
                    $stone = (float) ($itm['stone_weight'] ?? $itm['dia_wt'] ?? 0);
                    $rate = (float) ($itm['rate'] ?? 0);
                    $taxable = (float) ($itm['taxable'] ?? $itm['line_total'] ?? ($rate * $qty));
                    $making = (float) ($itm['making'] ?? $itm['making_charge'] ?? 0);
                    $stoneChg = (float) ($itm['stone_charge'] ?? $itm['diamond_charge'] ?? 0);

                    $totalQty += $qty;
                    $totalGoldWgt += $gross;
                    $totalDiamondWgt += $stone;
                    $goldValue += $taxable;
                    $makingCharges += $making;
                    $stoneCharges += $stoneChg;

                    $clientWeightsMap[$clientKey]['qty'] += $qty;
                    $clientWeightsMap[$clientKey]['gold_wgt'] += $gross;
                    $clientWeightsMap[$clientKey]['diamond_wgt'] += $stone;
                }
            }
        }

        $summary = [
            'sales' => $totalSales,
            'customers' => $totalCustomers,
            'invoices' => $totalInvoices,
            'quantity' => round($totalQty, 3),
            'gold_weight' => round($totalGoldWgt, 3),
            'diamond_weight' => round($totalDiamondWgt, 3),
        ];

        $gstTotal = round((float) $invoices->sum('gst_amount'), 2);
        if ($gstTotal <= 0 && $totalSales > 0) {
            $gstTotal = round($totalSales * 0.03, 2);
        }

        $invoiceSummary = [
            'gold_value' => round($goldValue > 0 ? $goldValue : ($totalSales * 0.83), 2),
            'making_charges' => round($makingCharges > 0 ? $makingCharges : ($totalSales * 0.10), 2),
            'stone_charges' => round($stoneCharges > 0 ? $stoneCharges : ($totalSales * 0.04), 2),
            'discount' => round($totalSales * 0.01, 2),
            'gst' => $gstTotal,
            'grand_total' => $totalSales,
        ];

        $avgOrderVal = $totalInvoices > 0 ? ($totalSales / $totalInvoices) : 0;
        $avgItemPrice = $totalQty > 0 ? ($totalSales / $totalQty) : 0;

        $metrics = [
            'sales' => $this->calculateMetricChange($totalSales, $prevSales, $periodInfo['vsLabel']),
            'invoices' => $this->calculateMetricChange($totalInvoices, $prevInvoicesCount, $periodInfo['vsLabel']),
            'customers' => $this->calculateMetricChange($totalCustomers, $prevCustomersCount, $periodInfo['vsLabel']),
            'quantity' => $this->calculateMetricChange($totalQty, $prevQty, $periodInfo['vsLabel']),
            'avg_order_value' => $this->calculateMetricChange($avgOrderVal, $prevAvgOrderVal, $periodInfo['vsLabel']),
            'avg_item_price' => $this->calculateMetricChange($avgItemPrice, $prevAvgItemPrice, $periodInfo['vsLabel']),
        ];

        $rows = (clone $base)
            ->select([
                'client_id', 'client_name',
                DB::raw('COUNT(id) as invoice_count'),
                DB::raw('SUM(total_amount) as total_amount'),
                DB::raw('MAX(invoice_date) as last_sale_date'),
            ])
            ->groupBy('client_id', 'client_name')
            ->orderByDesc('total_amount')
            ->paginate((int) min(50, max(1, $request->integer('per_page', 5))));

        // Fast O(1) hash lookup for dynamic weights per client row
        $rows->getCollection()->transform(function ($row) use ($clientWeightsMap) {
            $key = $row->client_id ? (string)$row->client_id : (string)$row->client_name;
            $data = $clientWeightsMap[$key] ?? ['qty' => 0.0, 'gold_wgt' => 0.0, 'diamond_wgt' => 0.0];
            $row->quantity = round($data['qty'], 3);
            $row->gold_weight = round($data['gold_wgt'], 3);
            $row->diamond_weight = round($data['diamond_wgt'], 3);
            return $row;
        });

        // Build monthly trend directly from in-memory collection (no duplicate SQL query)
        $trendGrouped = $invoices->groupBy(function ($inv) {
            $date = $inv->invoice_date;
            return $date ? date('Y-m', strtotime($date)) : date('Y-m');
        });

        $trend = $trendGrouped->map(function ($group, $yearMonth) {
            $amt = 0; $qty = 0; $gw = 0; $dw = 0;
            foreach ($group as $ci) {
                $amt += (float) ($ci->total_amount ?: 0);
                $rawItems = is_array($ci->items) ? $ci->items : (json_decode($ci->items, true) ?: []);
                if (empty($rawItems) && $ci->itemsRelation && $ci->itemsRelation->isNotEmpty()) {
                    $rawItems = $ci->itemsRelation->toArray();
                }

                if (empty($rawItems)) {
                    $qty += (float) ($ci->total_items ?: 1);
                    $gw += (float) ($ci->gross_weight ?: 0);
                    $dw += (float) ($ci->stone_weight ?: 0);
                } else {
                    foreach ($rawItems as $itm) {
                        $qty += (float) ($itm['quantity'] ?? $itm['qty'] ?? 1);
                        $gw += (float) ($itm['gross_wt'] ?? $itm['gross_weight'] ?? 0);
                        $dw += (float) ($itm['stone_weight'] ?? $itm['dia_wt'] ?? 0);
                    }
                }
            }
            $d = date('Y-m-01', strtotime($yearMonth . '-01'));
            $label = date("M 'y", strtotime($d));
            return [
                'date' => $d,
                'label' => $label,
                'amount' => round($amt, 2),
                'invoices' => $group->count(),
                'quantity' => round($qty, 3),
                'gold_weight' => round($gw, 3),
                'diamond_weight' => round($dw, 3),
            ];
        })->sortBy('date')->values();

        // Build consolidated Monthly Statement
        $monthlyStatement = $trendGrouped->map(function ($group, $yearMonth) {
            $amt = 0; $qty = 0; $gw = 0; $dw = 0;
            foreach ($group as $ci) {
                $amt += (float) ($ci->total_amount ?: 0);
                $rawItems = is_array($ci->items) ? $ci->items : (json_decode($ci->items, true) ?: []);
                if (empty($rawItems) && $ci->itemsRelation && $ci->itemsRelation->isNotEmpty()) {
                    $rawItems = $ci->itemsRelation->toArray();
                }

                if (empty($rawItems)) {
                    $qty += (float) ($ci->total_items ?: 1);
                    $gw += (float) ($ci->gross_weight ?: 0);
                    $dw += (float) ($ci->stone_weight ?: 0);
                } else {
                    foreach ($rawItems as $itm) {
                        $qty += (float) ($itm['quantity'] ?? $itm['qty'] ?? 1);
                        $gw += (float) ($itm['gross_wt'] ?? $itm['gross_weight'] ?? 0);
                        $dw += (float) ($itm['stone_weight'] ?? $itm['dia_wt'] ?? 0);
                    }
                }
            }
            $d = date('Y-m-01', strtotime($yearMonth . '-01'));
            $invCount = $group->count();
            return [
                'period_key' => $yearMonth,
                'label' => date('F Y', strtotime($d)),
                'invoices' => $invCount,
                'quantity' => round($qty, 3),
                'gold_weight' => round($gw, 3),
                'diamond_weight' => round($dw, 3),
                'total_amount' => round($amt, 2),
                'avg_sale' => round($amt / max(1, $invCount), 2),
            ];
        })->sortByDesc('period_key')->values();

        // Build consolidated Yearly Statement (Indian Financial Year: April - March)
        $yearlyStatement = $invoices->groupBy(function ($inv) {
            $d = $inv->invoice_date ? strtotime($inv->invoice_date) : time();
            $month = (int) date('n', $d);
            $year = (int) date('Y', $d);
            $fyStart = $month >= 4 ? $year : $year - 1;
            return 'FY ' . $fyStart . '-' . substr((string)($fyStart + 1), 2);
        })->map(function ($group, $fy) {
            $amt = 0; $qty = 0; $gw = 0; $dw = 0;
            foreach ($group as $ci) {
                $amt += (float) ($ci->total_amount ?: 0);
                $rawItems = is_array($ci->items) ? $ci->items : (json_decode($ci->items, true) ?: []);
                if (empty($rawItems) && $ci->itemsRelation && $ci->itemsRelation->isNotEmpty()) {
                    $rawItems = $ci->itemsRelation->toArray();
                }

                if (empty($rawItems)) {
                    $qty += (float) ($ci->total_items ?: 1);
                    $gw += (float) ($ci->gross_weight ?: 0);
                    $dw += (float) ($ci->stone_weight ?: 0);
                } else {
                    foreach ($rawItems as $itm) {
                        $qty += (float) ($itm['quantity'] ?? $itm['qty'] ?? 1);
                        $gw += (float) ($itm['gross_wt'] ?? $itm['gross_weight'] ?? 0);
                        $dw += (float) ($itm['stone_weight'] ?? $itm['dia_wt'] ?? 0);
                    }
                }
            }
            $invCount = $group->count();
            return [
                'period_key' => $fy,
                'label' => $fy,
                'invoices' => $invCount,
                'quantity' => round($qty, 3),
                'gold_weight' => round($gw, 3),
                'diamond_weight' => round($dw, 3),
                'total_amount' => round($amt, 2),
                'avg_sale' => round($amt / max(1, $invCount), 2),
            ];
        })->sortByDesc('period_key')->values();

        return response()->json([
            'summary' => $summary,
            'invoice_summary' => $invoiceSummary,
            'trend' => $trend,
            'rows' => $rows,
            'metrics' => $metrics,
            'active_period' => [
                'period' => $periodInfo['periodKey'],
                'from' => $periodInfo['startDate'] ? $periodInfo['startDate']->format('Y-m-d') : null,
                'to' => $periodInfo['endDate'] ? $periodInfo['endDate']->format('Y-m-d') : null,
                'label' => $periodInfo['label'],
                'vs_label' => $periodInfo['vsLabel'],
            ],
            'monthly_statement' => $monthlyStatement,
            'yearly_statement' => $yearlyStatement,
        ]);
    }

    public function index(Request $request)
    {
        $sales = $this->filteredQuery($request)->paginate((int) min(100, max(1, $request->integer('per_page', 15))));
        return response()->json($sales);
    }

    public function availablePieces(Request $request)
    {
        $search = trim((string) $request->query('search', ''));
        $design = trim((string) $request->query('design_no', ''));
        $category = trim((string) $request->query('category', ''));

        $query = WorkOrderReceivedPiece::where(function ($q) {
                $q->whereHas('workOrder')->orWhereNotNull('product_id');
            })
            ->with([
                'workOrder:id,work_order_number,status,current_stage,job_order_id,karigar_id,customer_name',
                'karigar:id,name,karigar_code',
                'product:id,name,product_code,design_no,category_id,opening_stock_weight',
                'product.category:id,name,code',
                'product.subcategory:id,name,code',
            ])
            ->whereNotNull('tag_number')
            ->where('tag_number', '!=', '')
            ->where(function ($q) {
                $q->whereNull('status')->orWhereNotIn('status', ['sold', 'on_approval']);
            })
            ->whereNull('invoice_id');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('tag_number', 'like', "%{$search}%")
                  ->orWhere('design_no', 'like', "%{$search}%")
                  ->orWhere('product_name', 'like', "%{$search}%")
                  ->orWhere('huid', 'like', "%{$search}%")
                  ->orWhere('receive_order_number', 'like', "%{$search}%")
                  ->orWhereHas('product', function ($pq) use ($search) {
                      $pq->where('product_code', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                  })
                  ->orWhereHas('workOrder', function ($wq) use ($search) {
                      $wq->where('work_order_number', 'like', "%{$search}%");
                  })
                  ->orWhereHas('karigar', function ($kq) use ($search) {
                      $kq->where('name', 'like', "%{$search}%")
                         ->orWhere('karigar_code', 'like', "%{$search}%");
                  });
            });
        }

        if ($design !== '') {
            $query->where('design_no', $design);
        }

        if ($category !== '' && strtolower($category) !== 'all') {
            $query->whereHas('product.category', function ($cq) use ($category) {
                $cq->where('name', 'like', "%{$category}%");
            });
        }

        $pieces = $query->latest('received_at')->limit(300)->get();

        $data = $pieces->map(function ($p) {
            $wo = $p->workOrder;
            $kg = $p->karigar;
            $prod = $p->product;

            $gross = (float) ($p->gross_weight ?: ($prod?->opening_stock_weight ?: 0));
            $net = (float) ($p->net_gold_weight ?: $gross);
            $purity = $p->gold_karat ?: ($p->purity ? "{$p->purity}%" : '22K');
            $numericPurity = (float) ($p->purity ?: 91.60);
            $fineGold = (float) ($p->pure_24k_weight ?: round($net * ($numericPurity / 100), 3));
            $catName = $prod?->category?->name ?: 'Jewellery';
            $qcData = is_array($p->qc_submission_data) ? $p->qc_submission_data : [];

            return [
                'id' => $p->id,
                'tag_number' => $p->tag_number,
                'receive_order_number' => $p->receive_order_number ?: "RWO-{$p->id}",
                'piece_number' => $p->piece_number,
                'design_no' => $p->design_no ?: ($prod?->design_no ?: $prod?->product_code),
                'product_id' => $p->product_id ?: $prod?->id,
                'product_code' => $prod?->product_code ?: ($p->design_no ?: '-'),
                'product_name' => $p->product_name ?: ($prod?->name ?: 'Jewellery Item'),
                'category_name' => $catName,
                'work_order_id' => $p->work_order_id,
                'work_order_number' => $wo?->work_order_number ?: "WO-{$p->work_order_id}",
                'karigar_id' => $p->karigar_id ?: $wo?->karigar_id,
                'karigar_name' => $kg?->name ?: ($wo?->customer_name ?: 'Karigar In-House'),
                'gross_weight' => round($gross, 3),
                'net_weight' => round($net, 3),
                'net_gold_weight' => round($net, 3),
                'fine_gold_weight' => round($fineGold, 3),
                'diamond_weight' => (float) ($p->diamond_weight ?: 0),
                'diamond_count' => (int) ($p->diamond_count ?: 0),
                'diamond_details' => $p->diamond_details ?: 'Dia-0.00/+0/0',
                'color_stone_weight' => (float) ($p->color_stone_weight ?: 0),
                'color_stone_count' => (int) ($p->color_stone_count ?: 0),
                'silver_weight' => (float) ($p->silver_weight ?: 0),
                'purity' => $purity,
                'purity_percent' => $numericPurity,
                'making_charge' => (float) ($p->total_making_charge ?: 0),
                'making_charge_per_gram' => (float) ($p->making_charge_per_gram ?: 0),
                'purchase_value' => (float) ($p->purchase_value ?: 0),
                'components' => $p->components ?: [],
                'diamond_sieves' => $qcData['diamond_sieves'] ?? [],
                'huid' => $p->huid ?: '-',
                'certification_status' => $p->certification_status ?: 'not_required',
                'hallmarking_status' => $p->hallmarking_status ?: 'not_required',
                'is_inventory_posted' => (bool) $p->is_inventory_posted,
                'received_at' => $p->received_at?->toIso8601String(),
                'created_at' => $p->created_at?->toIso8601String(),
            ];
        });

        return response()->json(['data' => $data]);
    }

    public function show(Invoice $sale)
    {
        $sale->load(['client', 'itemsRelation.product', 'payments.receiver', 'creator', 'oldGoldItems', 'receivedPieces.workOrder', 'receivedPieces.karigar']);
        
        // Ensure items relation is populated from items JSON column if empty
        if (($sale->itemsRelation === null || $sale->itemsRelation->isEmpty()) && !empty($sale->items)) {
            $parsed = is_array($sale->items) ? $sale->items : (json_decode($sale->items, true) ?: []);
            $normalizedItems = collect($parsed)->map(function ($itm, $idx) use ($sale) {
                return [
                    'id' => $idx + 1,
                    'invoice_id' => $sale->id,
                    'product_name' => $itm['desc'] ?? $itm['product_name'] ?? '22KT Hallmarked Gold Jewellery Item',
                    'product_code' => $itm['code'] ?? $itm['product_code'] ?? 'PRD-GLD-' . (100 + $idx),
                    'quantity' => (float) ($itm['quantity'] ?? $itm['qty'] ?? 1),
                    'rate' => (float) ($itm['rate'] ?? ($sale->amount ?: $sale->total_amount)),
                    'line_total' => (float) ($itm['taxable'] ?? $itm['line_total'] ?? ($sale->total_amount)),
                    'gross_weight' => (float) ($itm['gross_wt'] ?? $itm['gross_weight'] ?? 0),
                    'net_weight' => (float) ($itm['net_wt'] ?? $itm['net_weight'] ?? 0),
                    'purity' => $itm['purity'] ?? '22KT (916)',
                    'details' => $itm['details'] ?? [
                        'tag_numbers' => !empty($itm['tag_number']) ? [$itm['tag_number']] : ($itm['tag_numbers'] ?? []),
                        'piece_ids' => !empty($itm['piece_id']) ? [$itm['piece_id']] : ($itm['piece_ids'] ?? []),
                    ],
                ];
            });
            $sale->setRelation('itemsRelation', $normalizedItems);
        }

        // Calculate due_amount accurately
        $paid = (float) ($sale->paid_amount ?: 0);
        $total = (float) ($sale->total_amount ?: 0);
        $due = ($sale->due_amount !== null && (float)$sale->due_amount > 0) ? (float)$sale->due_amount : max(0, $total - $paid);
        $sale->due_amount = round($due, 2);

        return response()->json($sale);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'client_name' => 'nullable|string|max:255',
            'customer_name' => 'nullable|string|max:255',
            'invoice_no' => 'nullable|string|max:100',
            'invoice_date' => 'nullable|date',
            'date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'gst_rate' => 'nullable|numeric|min:0|max:100',
            'discount' => 'nullable|numeric|min:0',
            'other_charge' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|max:50',
            'payment_mode' => 'nullable|string|max:50',
            'payment_reference' => 'nullable|string|max:255',
            'paid_amount' => 'nullable|numeric|min:0',
            'amount_received' => 'nullable|numeric|min:0',
            'invoice_type' => 'nullable|string|max:50',
            'status' => 'nullable|string|max:50',
            'sale_status' => 'nullable|string|max:50',
            'is_draft' => 'nullable|boolean',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable',
            'items.*.product_name' => 'nullable|string|max:255',
            'items.*.desc' => 'nullable|string|max:255',
            'items.*.product_code' => 'nullable|string|max:255',
            'items.*.code' => 'nullable|string|max:255',
            'items.*.piece_id' => 'nullable|integer',
            'items.*.piece_ids' => 'nullable|array',
            'items.*.tag_number' => 'nullable|string|max:100',
            'items.*.tag_numbers' => 'nullable|array',
            'items.*.quantity' => 'nullable|numeric|min:0.001',
            'items.*.qty' => 'nullable|numeric|min:0.001',
            'items.*.rate' => 'nullable|numeric|min:0',
            'items.*.add_yr' => 'nullable|numeric|min:0',
            'items.*.cost_rate' => 'nullable|numeric|min:0',
            'items.*.gross_weight' => 'nullable|numeric|min:0',
            'items.*.gross_wt' => 'nullable|numeric|min:0',
            'items.*.net_weight' => 'nullable|numeric|min:0',
            'items.*.net_wt' => 'nullable|numeric|min:0',
            'items.*.stone_weight' => 'nullable|numeric|min:0',
            'items.*.diamond' => 'nullable|numeric|min:0',
            'items.*.purity' => 'nullable',
            'items.*.making_charge' => 'nullable|numeric|min:0',
            'items.*.labour' => 'nullable|numeric|min:0',
            'items.*.labour_charge' => 'nullable|numeric|min:0',
            'items.*.stone_charge' => 'nullable|numeric|min:0',
            'items.*.diamond_charge' => 'nullable|numeric|min:0',
            'items.*.other_charge' => 'nullable|numeric|min:0',
            'items.*.hallmarking' => 'nullable|numeric|min:0',
            'items.*.discount' => 'nullable|numeric|min:0',
            'items.*.line_total' => 'nullable|numeric|min:0',
            'items.*.details' => 'nullable|array',
            'old_gold_items' => 'nullable|array',
            'old_gold_items.*.item_description' => 'nullable|string|max:255',
            'old_gold_items.*.gross_weight' => 'nullable|numeric|min:0',
            'old_gold_items.*.melting_loss' => 'nullable|numeric|min:0',
            'old_gold_items.*.net_weight' => 'nullable|numeric|min:0',
            'old_gold_items.*.purity_touch' => 'nullable|numeric|min:0|max:100',
            'old_gold_items.*.fine_weight' => 'nullable|numeric|min:0',
            'old_gold_items.*.rate_per_gram' => 'nullable|numeric|min:0',
            'old_gold_items.*.total_credit' => 'nullable|numeric|min:0',
            'old_gold_items.*.notes' => 'nullable|string',
        ]);

        $sale = $this->saleService->create($validated, $request->user()?->id);
        $invoiceNo = (string) ($sale->invoice_no ?: ($sale->invoice_number ?: ('INV-' . $sale->id)));
        
        if ($sale->sale_status !== 'draft') {
            NotificationService::notifySalesCreated(
                $sale->id,
                $invoiceNo,
                $sale->client_name ?: 'Customer',
                (float) ($sale->total_amount ?? 0),
                $request->user()?->id
            );
        }

        return response()->json([
            'message' => $sale->sale_status === 'draft' ? 'Draft invoice saved successfully.' : 'Sale invoice created successfully.',
            'data' => $sale
        ], 201);
    }

    public function finalize(Request $request, Invoice $sale)
    {
        $finalized = $this->saleService->finalize($sale, $request->user()?->id);
        return response()->json([
            'message' => 'Invoice finalized and inventory stock updated successfully.',
            'data' => $finalized
        ]);
    }

    public function cancel(Request $request, Invoice $sale)
    {
        $reason = $request->input('reason', $request->input('notes', 'Cancelled by user'));
        $cancelled = $this->saleService->cancel($sale, $reason, $request->user()?->id);
        return response()->json([
            'message' => 'Invoice cancelled successfully and inventory pieces restored.',
            'data' => $cancelled
        ]);
    }

    public function destroy(Request $request, Invoice $sale)
    {
        $this->saleService->cancel($sale, 'Invoice deleted', $request->user()?->id);
        $sale->delete();
        return response()->json([
            'message' => 'Invoice deleted and inventory pieces restored successfully.'
        ]);
    }

    public function payment(Request $request, Invoice $sale)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|max:50',
            'reference' => 'nullable|string|max:255',
            'paid_at' => 'nullable|date',
        ]);
        return response()->json([
            'message' => 'Payment recorded successfully.',
            'data' => $this->saleService->recordPayment($sale, $validated, $request->user()?->id)
        ]);
    }

    public function updatePayment(Request $request, Invoice $sale, \App\Models\SalePayment $payment)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'nullable|string|max:50',
            'reference' => 'nullable|string|max:255',
            'paid_at' => 'nullable|date',
        ]);
        return response()->json([
            'message' => 'Payment record updated and balance recalculated successfully.',
            'data' => $this->saleService->updatePayment($payment, $validated, $request->user()?->id)
        ]);
    }

    public function deletePayment(Request $request, Invoice $sale, \App\Models\SalePayment $payment)
    {
        return response()->json([
            'message' => 'Payment record deleted and balance recalculated successfully.',
            'data' => $this->saleService->deletePayment($payment, $request->user()?->id)
        ]);
    }

    public function customer(Request $request, Client $client)
    {
        $periodInfo = $this->resolvePeriodDates($request);

        $query = Invoice::whereNotIn('status', ['cancelled', 'void', 'returned'])
            ->where(function ($q) {
                $q->whereNull('sale_status')->orWhere('sale_status', '!=', 'cancelled');
            })
            ->where(function ($q) use ($client) {
                $q->where('client_id', $client->id)
                  ->orWhere('client_name', 'like', '%' . $client->full_name . '%');
            })->with(['itemsRelation', 'payments.receiver'])->latest('invoice_date');

        if ($periodInfo['startDate'] !== null && $periodInfo['endDate'] !== null) {
            $query->whereBetween('invoice_date', [$periodInfo['startDate'], $periodInfo['endDate']]);
        }
        $sales = $query->get();

        // Query previous period for dynamic comparison metrics
        $prevSalesQuery = Invoice::whereNotIn('status', ['cancelled', 'void', 'returned'])
            ->where(function ($q) {
                $q->whereNull('sale_status')->orWhere('sale_status', '!=', 'cancelled');
            })
            ->where(function ($q) use ($client) {
                $q->where('client_id', $client->id)
                  ->orWhere('client_name', 'like', '%' . $client->full_name . '%');
            })
            ->whereBetween('invoice_date', [$periodInfo['prevPeriodStart'], $periodInfo['prevPeriodEnd']]);
        $prevCustomerSales = $prevSalesQuery->with(['itemsRelation'])->get();

        $prevTotalPurchases = round((float) $prevCustomerSales->sum('total_amount'), 2);
        $prevInvoicesCount = $prevCustomerSales->count();
        $prevQty = 0;
        foreach ($prevCustomerSales as $ps) {
            if ($ps->itemsRelation && $ps->itemsRelation->isNotEmpty()) {
                $prevQty += (float) $ps->itemsRelation->sum('quantity');
            } elseif (!empty($ps->items)) {
                $parsed = is_array($ps->items) ? $ps->items : (json_decode($ps->items, true) ?: []);
                foreach ($parsed as $it) {
                    $prevQty += (float) ($it['quantity'] ?? $it['qty'] ?? 1);
                }
            }
        }
        $prevAvgOrderVal = $prevInvoicesCount > 0 ? ($prevTotalPurchases / $prevInvoicesCount) : 0;
        $prevAvgItemPrice = $prevQty > 0 ? ($prevTotalPurchases / $prevQty) : 0;

        // Calculate accurate due amount and weight breakdown for each invoice
        $sales->transform(function ($saleItem) {
            $paid = (float) ($saleItem->paid_amount ?: 0);
            $total = (float) ($saleItem->total_amount ?: 0);
            $oldGold = (float) ($saleItem->old_gold_amount ?: 0);
            $due = ($saleItem->due_amount !== null && (float)$saleItem->due_amount > 0) ? (float)$saleItem->due_amount : max(0, $total - $paid - $oldGold);
            $saleItem->due_amount = round($due, 2);

            // Populate normalized items relation from JSON if empty
            if (($saleItem->itemsRelation === null || $saleItem->itemsRelation->isEmpty()) && !empty($saleItem->items)) {
                $parsed = is_array($saleItem->items) ? $saleItem->items : (json_decode($saleItem->items, true) ?: []);
                $normalizedItems = collect($parsed)->map(function ($itm, $idx) use ($saleItem) {
                    $gw = (float) ($itm['gross_wt'] ?? $itm['gross_weight'] ?? 0);
                    $nw = (float) ($itm['net_wt'] ?? $itm['net_weight'] ?? $gw);
                    $dw = (float) ($itm['diamond_wt'] ?? $itm['diamond_weight'] ?? ($itm['stone_weight'] ?? 0));
                    $pur = $itm['purity'] ?? '22K';
                    $touch = \App\Helpers\GoldConversionHelper::getTouchPercent($pur);
                    $fine = \App\Helpers\GoldConversionHelper::convertTo24kFineWeight($nw, $touch);

                    return [
                        'id' => $idx + 1,
                        'invoice_id' => $saleItem->id,
                        'product_name' => $itm['desc'] ?? $itm['product_name'] ?? 'Jewellery Item',
                        'product_code' => $itm['code'] ?? $itm['product_code'] ?? 'PRD-' . (100 + $idx),
                        'quantity' => (float) ($itm['quantity'] ?? $itm['qty'] ?? 1),
                        'rate' => (float) ($itm['rate'] ?? 0),
                        'line_total' => (float) ($itm['taxable'] ?? $itm['line_total'] ?? 0),
                        'gross_weight' => round($gw, 3),
                        'net_weight' => round($nw, 3),
                        'fine_gold_weight' => round($fine, 3),
                        'diamond_weight' => round($dw, 3),
                        'purity' => $pur,
                        'price_list_version' => $saleItem->price_list_version,
                        'details' => $itm['details'] ?? [
                            'tag_numbers' => !empty($itm['tag_number']) ? [$itm['tag_number']] : ($itm['tag_numbers'] ?? []),
                            'piece_ids' => !empty($itm['piece_id']) ? [$itm['piece_id']] : ($itm['piece_ids'] ?? []),
                        ],
                    ];
                });
                $saleItem->setRelation('itemsRelation', $normalizedItems);
            }

            return $saleItem;
        });

        $totalPurchases = round((float) $sales->sum('total_amount'), 2);
        $paidAmount = round((float) $sales->sum('paid_amount'), 2);
        $dueAmount = round((float) $sales->sum('due_amount'), 2);

        $unpaidInvoicesCount = $sales->filter(fn($s) => $s->paid_amount <= 0 && $s->due_amount > 0)->count();
        $partiallyPaidInvoicesCount = $sales->filter(fn($s) => $s->paid_amount > 0 && $s->due_amount > 0)->count();
        $paidInvoicesCount = $sales->filter(fn($s) => $s->due_amount <= 0)->count();

        // Customer opening balance and total balance ledger
        $openingBalance = (float) ($client->opening_balance ?: 0);
        $balanceType = strtolower((string) ($client->balance_type ?: 'receivable'));
        $totalCustomerOutstanding = in_array($balanceType, ['credit', 'payable'])
            ? round($dueAmount - $openingBalance, 2)
            : round($dueAmount + $openingBalance, 2);

        // Fetch all payment records across all customer invoices
        $invoiceIds = $sales->pluck('id')->filter()->all();
        $payments = \App\Models\SalePayment::whereIn('invoice_id', $invoiceIds)
            ->with(['invoice:id,invoice_no,invoice_date,total_amount,due_amount,status,price_list_version', 'receiver:id,name'])
            ->latest('paid_at')
            ->get();

        $lastPurchaseDate = $sales->first()?->invoice_date ?: $sales->first()?->created_at;
        $lastPaymentDate = $payments->first()?->paid_at;

        // Fetch active price list and version history
        $activePriceList = \App\Models\ClientPriceList::where('client_id', $client->id)
            ->where('status', 'active')
            ->latest()
            ->first() ?: \App\Models\ClientPriceList::where('client_id', $client->id)->latest()->first();

        $priceListHistory = \App\Models\ClientPriceList::where('client_id', $client->id)
            ->orderBy('id', 'desc')
            ->get();

        $trend = $sales->groupBy(function ($inv) {
            return date('Y-m', strtotime($inv->invoice_date ?: $inv->created_at));
        })->map(function ($group, $yearMonth) {
            $amt = (float) $group->sum('total_amount');
            $qty = 0.0;
            $gw = 0.0;
            $dw = 0.0;
            foreach ($group as $inv) {
                if ($inv->itemsRelation && $inv->itemsRelation->isNotEmpty()) {
                    $qty += (float) $inv->itemsRelation->sum('quantity');
                    $gw += (float) $inv->itemsRelation->sum('gross_weight');
                    $dw += (float) $inv->itemsRelation->sum('diamond_weight');
                } elseif (!empty($inv->items)) {
                    $parsed = is_array($inv->items) ? $inv->items : (json_decode($inv->items, true) ?: []);
                    foreach ($parsed as $it) {
                        $qty += (float) ($it['quantity'] ?? $it['qty'] ?? 1);
                        $gw += (float) ($it['gross_wt'] ?? $it['gross_weight'] ?? 0);
                        $dw += (float) ($it['diamond_wt'] ?? $it['diamond_weight'] ?? 0);
                    }
                }
            }
            $d = date('Y-m-01', strtotime($yearMonth . '-01'));
            $label = date("M 'y", strtotime($d));
            return [
                'date' => $d,
                'label' => $label,
                'amount' => round($amt, 2),
                'invoices' => $group->count(),
                'quantity' => round($qty, 3),
                'gold_weight' => round($gw, 3),
                'diamond_weight' => round($dw, 3),
            ];
        })->sortBy('date')->values();

        $currQty = 0;
        foreach ($sales as $s) {
            if ($s->itemsRelation && $s->itemsRelation->isNotEmpty()) {
                $currQty += (float) $s->itemsRelation->sum('quantity');
            } elseif (!empty($s->items)) {
                $parsed = is_array($s->items) ? $s->items : (json_decode($s->items, true) ?: []);
                foreach ($parsed as $it) {
                    $currQty += (float) ($it['quantity'] ?? $it['qty'] ?? 1);
                }
            }
        }
        $currAvgOrderVal = $sales->count() > 0 ? ($totalPurchases / $sales->count()) : 0;
        $currAvgItemPrice = $currQty > 0 ? ($totalPurchases / $currQty) : 0;

        $metrics = [
            'sales' => $this->calculateMetricChange($totalPurchases, $prevTotalPurchases, $periodInfo['vsLabel']),
            'invoices' => $this->calculateMetricChange($sales->count(), $prevInvoicesCount, $periodInfo['vsLabel']),
            'quantity' => $this->calculateMetricChange($currQty, $prevQty, $periodInfo['vsLabel']),
            'avg_order_value' => $this->calculateMetricChange($currAvgOrderVal, $prevAvgOrderVal, $periodInfo['vsLabel']),
            'avg_item_price' => $this->calculateMetricChange($currAvgItemPrice, $prevAvgItemPrice, $periodInfo['vsLabel']),
        ];

        return response()->json([
            'customer' => $client,
            'stats' => [
                'total_purchases' => $totalPurchases,
                'total_billed' => $totalPurchases,
                'paid_amount' => $paidAmount,
                'total_paid' => $paidAmount,
                'due_amount' => $dueAmount,
                'total_outstanding' => $dueAmount,
                'opening_balance' => $openingBalance,
                'balance_type' => $balanceType,
                'total_customer_outstanding' => $totalCustomerOutstanding,
                'transactions' => $sales->count(),
                'total_invoices' => $sales->count(),
                'unpaid_invoices_count' => $unpaidInvoicesCount,
                'partially_paid_invoices_count' => $partiallyPaidInvoicesCount,
                'paid_invoices_count' => $paidInvoicesCount,
                'last_purchase_date' => $lastPurchaseDate ? \Carbon\Carbon::parse($lastPurchaseDate)->toDateString() : null,
                'last_payment_date' => $lastPaymentDate ? \Carbon\Carbon::parse($lastPaymentDate)->toDateString() : null,
                'active_price_list_version' => $activePriceList?->version ?: '01',
            ],
            'account_summary' => [
                'total_purchases' => $totalPurchases,
                'total_billed' => $totalPurchases,
                'total_paid' => $paidAmount,
                'total_outstanding' => $dueAmount,
                'opening_balance' => $openingBalance,
                'balance_type' => $balanceType,
                'total_customer_outstanding' => $totalCustomerOutstanding,
                'total_invoices' => $sales->count(),
                'unpaid_invoices_count' => $unpaidInvoicesCount,
                'partially_paid_invoices_count' => $partiallyPaidInvoicesCount,
                'paid_invoices_count' => $paidInvoicesCount,
                'last_purchase_date' => $lastPurchaseDate ? \Carbon\Carbon::parse($lastPurchaseDate)->toDateString() : null,
                'last_payment_date' => $lastPaymentDate ? \Carbon\Carbon::parse($lastPaymentDate)->toDateString() : null,
            ],
            'metrics' => $metrics,
            'active_period' => [
                'period' => $periodInfo['periodKey'],
                'from' => $periodInfo['startDate'] ? $periodInfo['startDate']->format('Y-m-d') : null,
                'to' => $periodInfo['endDate'] ? $periodInfo['endDate']->format('Y-m-d') : null,
                'label' => $periodInfo['label'],
                'vs_label' => $periodInfo['vsLabel'],
            ],
            'trend' => $trend,
            'sales' => $sales,
            'invoices' => $sales,
            'payments' => $payments,
            'price_list' => $activePriceList,
            'price_list_history' => $priceListHistory,
        ]);
    }

    public function profit(Request $request)
    {
        $purchases = \App\Models\PurchaseEntry::all();
        $totalGoldAmount = 0.0;
        $totalGold24kFineGrams = 0.0;
        $totalDiamondAmount = 0.0;
        $totalDiamondCarats = 0.0;

        foreach ($purchases as $pu) {
            $amt = (float) $pu->total_amount;
            $wt = (float) $pu->weight;
            $touch = \App\Helpers\GoldConversionHelper::getTouchPercent($pu->touch ?: 91.66);
            $fineWt = $pu->fine_weight > 0 ? (float)$pu->fine_weight : \App\Helpers\GoldConversionHelper::convertTo24kFineWeight($wt, $touch);

            $pName = strtolower($pu->product->name ?? $pu->metal_type ?? '');
            if (str_contains($pName, 'diamond')) {
                $totalDiamondAmount += $amt;
                $totalDiamondCarats += max(0.001, $wt);
            } else {
                $totalGoldAmount += $amt;
                $totalGold24kFineGrams += $fineWt;
            }
        }

        if ($totalDiamondCarats <= 0) {
            $diamondRanges = \App\Models\DiamondRange::all();
            foreach ($diamondRanges as $dr) {
                $totalDiamondAmount += (float) ($dr->value ?: ($dr->rate * $dr->wt_ct));
                $totalDiamondCarats += (float) ($dr->wt_ct ?: 1.0);
            }
        }

        $avgGoldBuyingRateGram = $totalGold24kFineGrams > 0 ? ($totalGoldAmount / $totalGold24kFineGrams) : 0.0;
        $avgDiamondBuyingRatePerCt = $totalDiamondCarats > 0 ? round($totalDiamondAmount / $totalDiamondCarats, 2) : 0.0;

        $query = $this->filteredQuery($request);
        $invoices = (clone $query)->get();

        // Compute 24K fine weight, purchase rates, cost, profit, and margin dynamically for each invoice
        $invoices->transform(function ($inv) use ($avgGoldBuyingRateGram, $avgDiamondBuyingRatePerCt) {
            return $this->computeInvoiceProfitDetails($inv, $avgGoldBuyingRateGram, $avgDiamondBuyingRatePerCt);
        });

        $totalRev = round((float) $invoices->sum('total_amount'), 2);
        $totalCost = round((float) $invoices->sum('cost_amount'), 2);
        $totalProfit = round((float) $invoices->sum('profit_amount'), 2);

        $salesPaginated = (clone $query)->paginate((int) min(100, max(1, $request->integer('per_page', 15))));
        $salesPaginated->getCollection()->transform(function ($inv) use ($avgGoldBuyingRateGram, $avgDiamondBuyingRatePerCt) {
            return $this->computeInvoiceProfitDetails($inv, $avgGoldBuyingRateGram, $avgDiamondBuyingRatePerCt);
        });

        // Compute dynamic period-over-period growth rates
        $prevPeriodSales = (float) \App\Models\Invoice::whereBetween('created_at', [\Carbon\Carbon::now()->subMonth()->startOfMonth(), \Carbon\Carbon::now()->subMonth()->endOfMonth()])->sum('total_amount');
        $currSales = (float) \App\Models\Invoice::where('created_at', '>=', \Carbon\Carbon::now()->startOfMonth())->sum('total_amount');
        $salesGrowthPct = $prevPeriodSales > 0 ? round((($currSales - $prevPeriodSales) / $prevPeriodSales) * 100, 1) : ($currSales > 0 ? 100.0 : 0.0);
        $salesGrowth = ($salesGrowthPct >= 0 ? '+' : '') . number_format($salesGrowthPct, 1) . '%';

        $prevClientsCount = \App\Models\Client::where('created_at', '<', \Carbon\Carbon::now()->startOfMonth())->count();
        $currClientsCount = \App\Models\Client::where('created_at', '>=', \Carbon\Carbon::now()->startOfMonth())->count();
        $customerGrowthPct = $prevClientsCount > 0 ? round(($currClientsCount / $prevClientsCount) * 100, 1) : ($currClientsCount > 0 ? 100.0 : 0.0);
        $customerGrowth = ($customerGrowthPct >= 0 ? '+' : '') . number_format($customerGrowthPct, 1) . '%';

        $prevInvoiceCount = \App\Models\Invoice::whereBetween('created_at', [\Carbon\Carbon::now()->subMonth()->startOfMonth(), \Carbon\Carbon::now()->subMonth()->endOfMonth()])->count();
        $currInvoiceCount = \App\Models\Invoice::where('created_at', '>=', \Carbon\Carbon::now()->startOfMonth())->count();
        $invoiceGrowthPct = $prevInvoiceCount > 0 ? round((($currInvoiceCount - $prevInvoiceCount) / $prevInvoiceCount) * 100, 1) : ($currInvoiceCount > 0 ? 100.0 : 0.0);
        $invoiceGrowth = ($invoiceGrowthPct >= 0 ? '+' : '') . number_format($invoiceGrowthPct, 1) . '%';

        return response()->json([
            'summary' => [
                'revenue' => $totalRev,
                'cost' => $totalCost,
                'profit' => $totalProfit,
                'margin' => $totalRev > 0 ? round(($totalProfit / $totalRev) * 100, 2) : 0,
                'avgGoldBuyingRateGram' => round($avgGoldBuyingRateGram, 2),
                'avgGoldBuyingRate10g' => round($avgGoldBuyingRateGram * 10, 2),
                'avgDiamondBuyingRatePerCt' => round($avgDiamondBuyingRatePerCt, 2),
                'salesGrowth' => $salesGrowth,
                'customerGrowth' => $customerGrowth,
                'invoiceGrowth' => $invoiceGrowth,
            ],
            'sales' => $salesPaginated
        ]);
    }

    private function computeInvoiceProfitDetails(Invoice $inv, float $avgGoldGramRate, float $avgDiamondCtRate)
    {
        $rawItems = is_array($inv->items) ? $inv->items : (json_decode($inv->items, true) ?: []);
        if (empty($rawItems) && $inv->itemsRelation) {
            $rawItems = $inv->itemsRelation->toArray();
        }

        $grossWt = 0.0;
        $netWt = 0.0;
        $fineWt24k = 0.0;
        $diamondCt = 0.0;
        $makingChg = 0.0;
        $stoneChg = 0.0;
        $otherChg = 0.0;
        $purityStr = '22K (916)';
        $touchPct = 91.66;

        if (empty($rawItems)) {
            $grossWt = (float) ($inv->gross_weight ?: 0);
            $netWt = (float) ($inv->net_weight ?: $grossWt);
            $purityStr = $inv->purity ?: '22K (916)';
            $touchPct = \App\Helpers\GoldConversionHelper::getTouchPercent($purityStr);
            $fineWt24k = \App\Helpers\GoldConversionHelper::convertTo24kFineWeight($grossWt ?: $netWt, $touchPct);
            $diamondCt = (float) ($inv->stone_weight ?: 0);
            $makingChg = (float) ($inv->making_charge ?: 0);
            $stoneChg = (float) ($inv->stone_charge ?: 0);
            $otherChg = (float) ($inv->other_charge ?: 0);
        } else {
            foreach ($rawItems as $itm) {
                $g = (float) ($itm['gross_wt'] ?? $itm['gross_weight'] ?? 0);
                $n = (float) ($itm['net_wt'] ?? $itm['net_weight'] ?? $g);
                $pur = $itm['purity'] ?? '22K (916)';
                $touch = \App\Helpers\GoldConversionHelper::getTouchPercent($pur);
                $fine = \App\Helpers\GoldConversionHelper::convertTo24kFineWeight($g ?: $n, $touch);

                $grossWt += $g;
                $netWt += $n;
                $fineWt24k += $fine;
                $diamondCt += (float) ($itm['stone_weight'] ?? $itm['diamond_weight'] ?? $itm['dia_wt'] ?? 0);
                $makingChg += (float) ($itm['making'] ?? $itm['making_charge'] ?? $itm['labour_charge'] ?? 0);
                $stoneChg += (float) ($itm['stone_charge'] ?? $itm['diamond_charge'] ?? 0);
                $otherChg += (float) ($itm['other_charge'] ?? 0);
                $purityStr = $pur;
                $touchPct = $touch;
            }
        }

        $goldCost = round($fineWt24k * $avgGoldGramRate, 2);
        $diamondCost = round($diamondCt * $avgDiamondCtRate, 2);
        $computedTotalCost = round($goldCost + $diamondCost + $makingChg + $stoneChg + $otherChg, 2);

        $totAmount = (float) $inv->total_amount;
        $finalCost = ($inv->cost_amount > 0) ? (float)$inv->cost_amount : $computedTotalCost;
        $finalProfit = ($inv->profit_amount > 0) ? (float)$inv->profit_amount : round($totAmount - $finalCost, 2);
        $profitMargin = $totAmount > 0 ? round(($finalProfit / $totAmount) * 100, 2) : 0.0;

        $inv->gross_weight = round($grossWt, 3);
        $inv->net_weight = round($netWt, 3);
        $inv->purity = $purityStr;
        $inv->touch_percent = $touchPct;
        $inv->fine_weight_24k = round($fineWt24k, 3);
        $inv->avg_gold_rate_gram = round($avgGoldGramRate, 2);
        $inv->gold_cost = $goldCost;
        $inv->diamond_carat = round($diamondCt, 3);
        $inv->avg_diamond_stamp_price = round($avgDiamondCtRate, 2);
        $inv->diamond_cost = $diamondCost;
        $inv->making_charges = round($makingChg, 2);
        $inv->stone_charges = round($stoneChg, 2);
        $inv->other_costs = round($otherChg, 2);
        $inv->cost_amount = round($finalCost, 2);
        $inv->profit_amount = round($finalProfit, 2);
        $inv->profit_margin = $profitMargin;

        return $inv;
    }

    public function products(Request $request)
    {
        $search = $request->query('search');
        $query = Product::with(['category', 'subcategory']);
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('product_code', 'like', "%{$search}%")
                  ->orWhere('design_no', 'like', "%{$search}%")
                  ->orWhere('name', 'like', "%{$search}%");
            });
        }
        $products = $query->orderBy('id', 'desc')->limit(200)->get();

        $data = $products->map(function ($p) {
            $attr = is_array($p->attributes) ? $p->attributes : (json_decode($p->attributes, true) ?: []);
            $gross = $p->opening_stock_weight ?: ($attr['gross_weight'] ?? ($attr['gross_wt'] ?? null));
            $net = $attr['net_weight'] ?? ($attr['net_wt'] ?? $gross);
            $purity = $attr['purity'] ?? ($attr['karat'] ?? null);
            if (!$purity && $p->opening_touch) {
                $purity = $p->opening_touch >= 99 ? '24K' : ($p->opening_touch >= 91 ? '22K' : ($p->opening_touch >= 75 ? '18K' : '14K'));
            }
            return [
                'id' => $p->id,
                'name' => $p->name,
                'product_code' => $p->product_code,
                'design_no' => $p->design_no ?: $p->product_code,
                'code' => $p->design_no ?: $p->product_code,
                'category' => $p->category?->name,
                'subcategory' => $p->subcategory?->name,
                'gross_weight' => $gross ? round((float)$gross, 3) : '',
                'net_weight' => $net ? round((float)$net, 3) : '',
                'purity' => $purity ?: '22K',
                'unit' => $attr['unit'] ?? 'Gm',
                'diamond_wt' => (float)($attr['diamond_weight'] ?? ($attr['stone_weight'] ?? 0)),
                'labour' => (float)($attr['labour'] ?? ($attr['making_charge'] ?? 0)),
                'wastage_percent' => (float)($attr['wastage_percent'] ?? ($attr['wastage'] ?? 0)),
                'description' => $p->description ?: $p->name,
            ];
        });

        return response()->json(['data' => $data]);
    }

    private function filteredQuery(Request $request)
    {
        return Invoice::with(['client', 'itemsRelation'])->when($request->filled('search'), fn ($q) => $q->where(fn ($inner) => $inner->where('invoice_no', 'like', '%' . $request->search . '%')->orWhere('client_name', 'like', '%' . $request->search . '%')->orWhereHas('itemsRelation', fn ($items) => $items->where('product_name', 'like', '%' . $request->search . '%')->orWhere('product_code', 'like', '%' . $request->search . '%'))))->when($request->filled('client_id') && $request->client_id !== 'all', fn ($q) => $q->where('client_id', $request->client_id))->when($request->filled('status') && $request->status !== 'all', fn ($q) => $q->where('status', $request->status))->when($request->filled('from'), fn ($q) => $q->whereDate('invoice_date', '>=', $request->date('from')))->when($request->filled('to'), fn ($q) => $q->whereDate('invoice_date', '<=', $request->date('to')))->latest('invoice_date');
    }
}
