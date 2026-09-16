<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Product;
use App\Services\SaleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesController extends Controller
{
    public function __construct(private SaleService $saleService) {}

    public function dashboard(Request $request)
    {
        $query = $this->filteredQuery($request);
        $sales = (clone $query)->get();
        return response()->json([
            'stats' => [
                'total_sales' => round($sales->sum('total_amount'), 2),
                'total_orders' => $sales->count(),
                'paid_amount' => round($sales->sum('paid_amount'), 2),
                'outstanding_amount' => round($sales->sum('due_amount'), 2),
                'profit' => round($sales->sum('profit_amount'), 2),
                'customers' => $sales->pluck('client_id')->filter()->unique()->count(),
            ],
            'trend' => $sales->groupBy(fn ($sale) => optional($sale->invoice_date)->format('Y-m-d'))->map(fn ($group, $date) => ['date' => $date, 'amount' => round($group->sum('total_amount'), 2)])->values(),
            'recent_sales' => $sales->take(10)->values(),
        ]);
    }

    public function customerReport(Request $request)
    {
        $base = Invoice::query()
            ->when($request->filled('from'), fn ($q) => $q->whereDate('invoice_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('invoice_date', '<=', $request->date('to')))
            ->when($request->filled('client_id') && $request->client_id !== 'all', fn ($q) => $q->where('client_id', $request->client_id))
            ->when($request->filled('search'), fn ($q) => $q->where(fn ($inner) => $inner->where('client_name', 'like', '%' . $request->search . '%')->orWhere('invoice_no', 'like', '%' . $request->search . '%')));

        $summary = [
            'sales' => round((clone $base)->sum('total_amount'), 2),
            'customers' => (clone $base)->whereNotNull('client_id')->distinct('client_id')->count('client_id'),
            'invoices' => (clone $base)->count(),
        ];

        $itemBase = DB::table('sale_items')->join('invoices', 'invoices.id', '=', 'sale_items.invoice_id')
            ->when($request->filled('from'), fn ($q) => $q->whereDate('invoices.invoice_date', '>=', $request->date('from')))
            ->when($request->filled('to'), fn ($q) => $q->whereDate('invoices.invoice_date', '<=', $request->date('to')))
            ->when($request->filled('client_id') && $request->client_id !== 'all', fn ($q) => $q->where('invoices.client_id', $request->client_id));
        $invoiceSummary = [
            'gold_value' => round((float) (clone $itemBase)->sum(DB::raw('sale_items.rate * sale_items.quantity')), 2),
            'making_charges' => round((float) (clone $itemBase)->sum('sale_items.making_charge'), 2),
            'stone_charges' => round((float) (clone $itemBase)->sum(DB::raw('sale_items.stone_charge + sale_items.diamond_charge')), 2),
            'discount' => 0,
            'gst' => round((float) (clone $base)->sum('gst_amount'), 2),
            'grand_total' => round((float) (clone $base)->sum('total_amount'), 2),
        ];
        $summary['quantity'] = round((float) (clone $itemBase)->sum('sale_items.quantity'), 3);
        $summary['gold_weight'] = round((float) (clone $itemBase)->sum('sale_items.gross_weight'), 3);
        $summary['diamond_weight'] = round((float) (clone $itemBase)->sum('sale_items.stone_weight'), 3);

        $rows = (clone $base)
            ->leftJoin('sale_items', 'invoices.id', '=', 'sale_items.invoice_id')
            ->select([
                'invoices.client_id', 'invoices.client_name',
                DB::raw('COUNT(DISTINCT invoices.id) as invoice_count'),
                DB::raw('COALESCE(SUM(sale_items.quantity), 0) as quantity'),
                DB::raw('COALESCE(SUM(sale_items.gross_weight), 0) as gold_weight'),
                DB::raw('COALESCE(SUM(sale_items.stone_weight), 0) as diamond_weight'),
                DB::raw('SUM(invoices.total_amount) as total_amount'),
                DB::raw('MAX(invoices.invoice_date) as last_sale_date'),
            ])
            ->groupBy('invoices.client_id', 'invoices.client_name')
            ->orderByDesc('total_amount')
            ->paginate((int) min(50, max(1, $request->integer('per_page', 5))));

        $trend = (clone $base)->select('invoice_date', DB::raw('SUM(total_amount) as amount'))->groupBy('invoice_date')->orderBy('invoice_date')->get()->map(fn ($row) => ['date' => $row->invoice_date, 'amount' => round((float) $row->amount, 2)]);

        return response()->json(['summary' => $summary, 'invoice_summary' => $invoiceSummary, 'trend' => $trend, 'rows' => $rows]);
    }

    public function index(Request $request)
    {
        $sales = $this->filteredQuery($request)->paginate((int) min(100, max(1, $request->integer('per_page', 15))));
        return response()->json($sales);
    }

    public function show(Invoice $sale)
    {
        return response()->json($sale->load(['client', 'itemsRelation.product', 'payments.receiver', 'creator']));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'nullable|exists:clients,id',
            'client_name' => 'nullable|string|max:255',
            'invoice_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'gst_rate' => 'nullable|numeric|min:0|max:100',
            'discount' => 'nullable|numeric|min:0',
            'other_charge' => 'nullable|numeric|min:0',
            'payment_method' => 'nullable|string|max:50',
            'payment_reference' => 'nullable|string|max:255',
            'paid_amount' => 'nullable|numeric|min:0',
            'invoice_type' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.product_id' => 'nullable|exists:products,id',
            'items.*.product_name' => 'nullable|string|max:255',
            'items.*.quantity' => 'required|numeric|min:0.001',
            'items.*.rate' => 'nullable|numeric|min:0',
            'items.*.cost_rate' => 'nullable|numeric|min:0',
            'items.*.gross_weight' => 'nullable|numeric|min:0',
            'items.*.net_weight' => 'nullable|numeric|min:0',
            'items.*.stone_weight' => 'nullable|numeric|min:0',
            'items.*.purity' => 'nullable|numeric|min:0|max:100',
            'items.*.making_charge' => 'nullable|numeric|min:0',
            'items.*.labour_charge' => 'nullable|numeric|min:0',
            'items.*.stone_charge' => 'nullable|numeric|min:0',
            'items.*.diamond_charge' => 'nullable|numeric|min:0',
            'items.*.other_charge' => 'nullable|numeric|min:0',
            'items.*.details' => 'nullable|array',
        ]);
        return response()->json(['message' => 'Sale created successfully.', 'data' => $this->saleService->create($validated, $request->user()?->id)], 201);
    }

    public function payment(Request $request, Invoice $sale)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|string|max:50',
            'reference' => 'nullable|string|max:255',
            'paid_at' => 'nullable|date',
        ]);
        return response()->json(['message' => 'Payment recorded successfully.', 'data' => $this->saleService->recordPayment($sale, $validated, $request->user()?->id)]);
    }

    public function customer(Request $request, Client $client)
    {
        $query = $client->invoices()->with(['itemsRelation.product', 'payments'])->latest('invoice_date');
        if ($request->filled('from')) $query->whereDate('invoice_date', '>=', $request->date('from'));
        if ($request->filled('to')) $query->whereDate('invoice_date', '<=', $request->date('to'));
        $sales = $query->get();
        return response()->json(['customer' => $client, 'stats' => ['total_purchases' => round($sales->sum('total_amount'), 2), 'paid_amount' => round($sales->sum('paid_amount'), 2), 'due_amount' => round($sales->sum('due_amount'), 2), 'transactions' => $sales->count()], 'sales' => $sales]);
    }

    public function profit(Request $request)
    {
        $sales = $this->filteredQuery($request)->paginate((int) min(100, max(1, $request->integer('per_page', 15))));
        return response()->json(['summary' => ['revenue' => round((clone $this->filteredQuery($request))->sum('total_amount'), 2), 'cost' => round((clone $this->filteredQuery($request))->sum('cost_amount'), 2), 'profit' => round((clone $this->filteredQuery($request))->sum('profit_amount'), 2)], 'sales' => $sales]);
    }

    public function products(Request $request)
    {
        return response()->json(Product::with(['category', 'subcategory'])->where('status', 'active')->when($request->filled('search'), fn ($q) => $q->where(fn ($inner) => $inner->where('name', 'like', '%' . $request->search . '%')->orWhere('product_code', 'like', '%' . $request->search . '%')))->orderBy('name')->paginate(30));
    }

    private function filteredQuery(Request $request)
    {
        return Invoice::with(['client', 'itemsRelation'])->when($request->filled('search'), fn ($q) => $q->where(fn ($inner) => $inner->where('invoice_no', 'like', '%' . $request->search . '%')->orWhere('client_name', 'like', '%' . $request->search . '%')->orWhereHas('itemsRelation', fn ($items) => $items->where('product_name', 'like', '%' . $request->search . '%')->orWhere('product_code', 'like', '%' . $request->search . '%'))))->when($request->filled('client_id') && $request->client_id !== 'all', fn ($q) => $q->where('client_id', $request->client_id))->when($request->filled('status') && $request->status !== 'all', fn ($q) => $q->where('status', $request->status))->when($request->filled('from'), fn ($q) => $q->whereDate('invoice_date', '>=', $request->date('from')))->when($request->filled('to'), fn ($q) => $q->whereDate('invoice_date', '<=', $request->date('to')))->latest('invoice_date');
    }
}
