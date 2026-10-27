<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ApprovalMemo;
use App\Models\ApprovalMemoItem;
use App\Models\Client;
use App\Models\WorkOrderReceivedPiece;
use App\Services\SaleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApprovalMemoController extends Controller
{
    public function __construct(private SaleService $saleService) {}

    public function index(Request $request)
    {
        $query = ApprovalMemo::with(['client', 'items.piece'])
            ->when($request->filled('status') && $request->status !== 'all', fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->client_id))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = $request->search;
                $q->where(fn ($sub) => $sub->where('memo_number', 'like', "%{$term}%")->orWhere('client_name', 'like', "%{$term}%"));
            })
            ->latest('memo_date');

        return response()->json([
            'data' => $query->paginate($request->input('per_page', 25))
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'memo_date' => 'nullable|date',
            'due_date' => 'nullable|date',
            'notes' => 'nullable|string',
            'piece_ids' => 'required|array|min:1',
            'piece_ids.*' => 'required|integer|exists:work_order_received_pieces,id',
        ]);

        return DB::transaction(function () use ($validated, $request) {
            $client = Client::findOrFail($validated['client_id']);

            // Lock and verify pieces availability
            $pieces = WorkOrderReceivedPiece::whereIn('id', $validated['piece_ids'])
                ->lockForUpdate()
                ->get();

            foreach ($pieces as $piece) {
                if ($piece->status === 'sold' || !empty($piece->invoice_id)) {
                    throw ValidationException::withMessages([
                        'piece_ids' => "Tag '{$piece->tag_number}' has already been sold."
                    ]);
                }
                if ($piece->status === 'on_approval') {
                    throw ValidationException::withMessages([
                        'piece_ids' => "Tag '{$piece->tag_number}' is already out on another approval memo."
                    ]);
                }
            }

            // Generate Memo Number
            $count = ApprovalMemo::count() + 1;
            $memoNumber = 'APPR-' . date('Y') . '-' . str_pad($count, 5, '0', STR_PAD_LEFT);

            $totalWeight = $pieces->sum('gross_weight') ?: $pieces->sum('net_gold_weight');
            $estimatedVal = 0;

            $memo = ApprovalMemo::create([
                'memo_number' => $memoNumber,
                'client_id' => $client->id,
                'client_name' => $client->full_name,
                'memo_date' => $validated['memo_date'] ?? now()->toDateString(),
                'due_date' => $validated['due_date'] ?? now()->addDays(7)->toDateString(),
                'status' => 'pending',
                'total_pieces' => $pieces->count(),
                'total_weight' => round($totalWeight, 3),
                'estimated_value' => $estimatedVal,
                'notes' => $validated['notes'] ?? null,
            ]);

            foreach ($pieces as $piece) {
                // Update piece status to on_approval
                $piece->status = 'on_approval';
                $piece->save();

                $prod = $piece->product;
                $estPrice = $piece->total_making_charge ?: 0;

                ApprovalMemoItem::create([
                    'approval_memo_id' => $memo->id,
                    'piece_id' => $piece->id,
                    'tag_number' => $piece->tag_number,
                    'product_id' => $piece->product_id,
                    'product_name' => $piece->product_name ?: ($prod?->name ?: 'Jewellery Item'),
                    'gross_weight' => (float) $piece->gross_weight,
                    'net_weight' => (float) ($piece->net_gold_weight ?: $piece->gross_weight),
                    'estimated_price' => $estPrice,
                    'status' => 'pending',
                ]);
            }

            return response()->json([
                'message' => "Approval memo {$memoNumber} created successfully.",
                'data' => $memo->load('items.piece')
            ], 201);
        });
    }

    public function show($id)
    {
        $memo = ApprovalMemo::with(['client', 'items.piece.product', 'items.invoice'])->findOrFail($id);
        return response()->json(['data' => $memo]);
    }

    public function returnPiece(Request $request, $memoId, $itemId)
    {
        return DB::transaction(function () use ($memoId, $itemId) {
            $memo = ApprovalMemo::findOrFail($memoId);
            $item = ApprovalMemoItem::where('approval_memo_id', $memo->id)->where('id', $itemId)->firstOrFail();

            if ($item->status !== 'pending') {
                return response()->json(['message' => "Item already marked as {$item->status}."], 422);
            }

            // Restore piece status to in_stock
            $piece = WorkOrderReceivedPiece::whereKey($item->piece_id)->lockForUpdate()->first();
            if ($piece) {
                $piece->status = 'in_stock';
                $piece->save();
            }

            $item->status = 'returned';
            $item->returned_at = now();
            $item->save();

            // Check if all items processed
            $remaining = ApprovalMemoItem::where('approval_memo_id', $memo->id)->where('status', 'pending')->count();
            if ($remaining === 0) {
                $hasSold = ApprovalMemoItem::where('approval_memo_id', $memo->id)->where('status', 'sold')->exists();
                $memo->status = $hasSold ? 'partial' : 'returned';
            } else {
                $memo->status = 'partial';
            }
            $memo->save();

            return response()->json([
                'message' => "Piece {$item->tag_number} successfully returned to showroom inventory.",
                'data' => $memo->load('items.piece')
            ]);
        });
    }

    public function convertToSale(Request $request, $memoId)
    {
        $validated = $request->validate([
            'item_ids' => 'required|array|min:1',
            'payment_method' => 'nullable|string',
            'amount_received' => 'nullable|numeric|min:0',
            'rate' => 'nullable|numeric|min:0',
        ]);

        return DB::transaction(function () use ($memoId, $validated, $request) {
            $memo = ApprovalMemo::with('client')->findOrFail($memoId);
            $itemsToSell = ApprovalMemoItem::where('approval_memo_id', $memo->id)
                ->whereIn('id', $validated['item_ids'])
                ->where('status', 'pending')
                ->with('piece.product')
                ->get();

            if ($itemsToSell->isEmpty()) {
                return response()->json(['message' => 'No pending approval items selected for sale.'], 422);
            }

            // Format items for SaleService
            $saleItemsPayload = [];
            foreach ($itemsToSell as $apprItem) {
                $piece = $apprItem->piece;
                $gross = (float) $piece->gross_weight;
                $net = (float) ($piece->net_gold_weight ?: $gross);

                // Temporarily release on_approval status so SaleService can lock it as in_stock
                $piece->status = 'in_stock';
                $piece->save();

                $saleItemsPayload[] = [
                    'piece_id' => $piece->id,
                    'tag_number' => $piece->tag_number,
                    'product_id' => $piece->product_id,
                    'product_name' => $apprItem->product_name,
                    'quantity' => 1,
                    'gross_weight' => $gross,
                    'net_weight' => $net,
                    'purity' => $piece->gold_karat ?: '22K',
                    'rate' => $validated['rate'] ?? 7800,
                    'making_charge' => $piece->total_making_charge ?: 0,
                    'line_total' => 0,
                ];
            }

            $salePayload = [
                'client_id' => $memo->client_id,
                'client_name' => $memo->client_name,
                'items' => $saleItemsPayload,
                'paid_amount' => $validated['amount_received'] ?? 0,
                'payment_method' => $validated['payment_method'] ?? 'cash',
                'notes' => "Converted from Approval Memo {$memo->memo_number}",
            ];

            $invoice = $this->saleService->create($salePayload, $request->user()?->id);

            // Mark approval items as sold and link invoice
            foreach ($itemsToSell as $apprItem) {
                $apprItem->status = 'sold';
                $apprItem->sold_at = now();
                $apprItem->invoice_id = $invoice->id;
                $apprItem->save();
            }

            // Update memo status
            $pendingCount = ApprovalMemoItem::where('approval_memo_id', $memo->id)->where('status', 'pending')->count();
            $memo->status = ($pendingCount === 0) ? 'converted_to_sale' : 'partial';
            $memo->save();

            return response()->json([
                'message' => "Successfully converted approval items to Sales Invoice {$invoice->invoice_no}.",
                'invoice' => $invoice,
                'memo' => $memo->load('items.piece')
            ]);
        });
    }
}
