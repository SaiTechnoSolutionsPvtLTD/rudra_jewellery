<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Karigar;
use App\Models\Repair;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class RepairController extends Controller
{
    public function index(Request $request)
    {
        $query = Repair::with(['client', 'karigar'])
            ->when($request->filled('status') && $request->status !== 'all', fn ($q) => $q->where('status', $request->status))
            ->when($request->filled('client_id'), fn ($q) => $q->where('client_id', $request->client_id))
            ->when($request->filled('karigar_id'), fn ($q) => $q->where('karigar_id', $request->karigar_id))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = $request->search;
                $q->where(fn ($sub) => $sub->where('repair_number', 'like', "%{$term}%")
                    ->orWhere('client_name', 'like', "%{$term}%")
                    ->orWhere('item_description', 'like', "%{$term}%"));
            })
            ->latest('intake_date');

        return response()->json([
            'data' => $query->paginate($request->input('per_page', 25))
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'required|exists:clients,id',
            'intake_date' => 'nullable|date',
            'promised_date' => 'nullable|date',
            'item_description' => 'required|string|max:255',
            'intake_weight' => 'required|numeric|min:0.001',
            'advance_paid' => 'nullable|numeric|min:0',
            'karigar_id' => 'nullable|exists:karigars,id',
            'notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($validated) {
            $client = Client::findOrFail($validated['client_id']);
            $karigar = !empty($validated['karigar_id']) ? Karigar::find($validated['karigar_id']) : null;

            $count = Repair::count() + 1;
            $repairNumber = 'REP-' . date('Y') . '-' . str_pad($count, 5, '0', STR_PAD_LEFT);

            $advance = (float) ($validated['advance_paid'] ?? 0);

            $repair = Repair::create([
                'repair_number' => $repairNumber,
                'client_id' => $client->id,
                'client_name' => $client->full_name,
                'intake_date' => $validated['intake_date'] ?? now()->toDateString(),
                'promised_date' => $validated['promised_date'] ?? now()->addDays(5)->toDateString(),
                'item_description' => $validated['item_description'],
                'intake_weight' => $validated['intake_weight'],
                'status' => $karigar ? 'assigned' : 'received',
                'karigar_id' => $karigar?->id,
                'karigar_name' => $karigar?->name,
                'added_metal_weight' => 0.000,
                'added_metal_cost' => 0.00,
                'labour_charges' => 0.00,
                'stone_charges' => 0.00,
                'total_charges' => 0.00,
                'advance_paid' => $advance,
                'balance_due' => -$advance,
                'notes' => $validated['notes'] ?? null,
            ]);

            return response()->json([
                'message' => "Repair intake order {$repairNumber} created successfully.",
                'data' => $repair->load(['client', 'karigar'])
            ], 201);
        });
    }

    public function show($id)
    {
        $repair = Repair::with(['client', 'karigar'])->findOrFail($id);
        return response()->json(['data' => $repair]);
    }

    public function updateProgress(Request $request, $id)
    {
        $validated = $request->validate([
            'status' => 'required|string|in:received,assigned,in_progress,ready,delivered',
            'karigar_id' => 'nullable|exists:karigars,id',
            'added_metal_weight' => 'nullable|numeric|min:0',
            'added_metal_cost' => 'nullable|numeric|min:0',
            'labour_charges' => 'nullable|numeric|min:0',
            'stone_charges' => 'nullable|numeric|min:0',
            'advance_paid' => 'nullable|numeric|min:0',
            'notes' => 'nullable|string',
        ]);

        return DB::transaction(function () use ($id, $validated) {
            $repair = Repair::findOrFail($id);

            if (isset($validated['karigar_id'])) {
                $karigar = Karigar::find($validated['karigar_id']);
                $repair->karigar_id = $karigar?->id;
                $repair->karigar_name = $karigar?->name;
            }

            if (isset($validated['added_metal_weight'])) {
                $repair->added_metal_weight = (float) $validated['added_metal_weight'];
            }
            if (isset($validated['added_metal_cost'])) {
                $repair->added_metal_cost = (float) $validated['added_metal_cost'];
            }
            if (isset($validated['labour_charges'])) {
                $repair->labour_charges = (float) $validated['labour_charges'];
            }
            if (isset($validated['stone_charges'])) {
                $repair->stone_charges = (float) $validated['stone_charges'];
            }
            if (isset($validated['advance_paid'])) {
                $repair->advance_paid = (float) $validated['advance_paid'];
            }

            $total = (float) $repair->added_metal_cost + (float) $repair->labour_charges + (float) $repair->stone_charges;
            $repair->total_charges = $total;
            $repair->balance_due = max(0, $total - (float) $repair->advance_paid);
            $repair->status = $validated['status'];

            if (isset($validated['notes'])) {
                $repair->notes = $validated['notes'];
            }

            $repair->save();

            return response()->json([
                'message' => "Repair order {$repair->repair_number} updated successfully.",
                'data' => $repair->load(['client', 'karigar'])
            ]);
        });
    }

    public function deliver(Request $request, $id)
    {
        $validated = $request->validate([
            'payment_received' => 'nullable|numeric|min:0',
        ]);

        return DB::transaction(function () use ($id, $validated) {
            $repair = Repair::findOrFail($id);
            $payment = (float) ($validated['payment_received'] ?? $repair->balance_due);

            $repair->advance_paid += $payment;
            $repair->balance_due = max(0, $repair->total_charges - $repair->advance_paid);
            $repair->status = 'delivered';
            $repair->save();

            return response()->json([
                'message' => "Repair {$repair->repair_number} delivered to customer.",
                'data' => $repair->load(['client', 'karigar'])
            ]);
        });
    }
}
