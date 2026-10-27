<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GoldRate;
use Illuminate\Http\Request;
use Carbon\Carbon;

class GoldRateController extends Controller
{
    /**
     * Get historical / stored daily gold rates with filtering.
     */
    public function index(Request $request)
    {
        try {
            $query = GoldRate::query();

            $fromDate = $request->input('from_date') ?? $request->input('start_date');
            $toDate = $request->input('to_date') ?? $request->input('end_date');

            if (!empty($fromDate)) {
                $query->whereDate('rate_date', '>=', $fromDate);
            }

            if (!empty($toDate)) {
                $query->whereDate('rate_date', '<=', $toDate);
            }

            if ($request->filled('month') && $request->filled('year')) {
                $query->whereYear('rate_date', $request->year)
                      ->whereMonth('rate_date', $request->month);
            }

            $rates = $query->orderBy('rate_date', 'desc')->get();

            return response()->json([
                'status' => 'success',
                'data' => $rates,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error fetching gold rates: ' . $e->getMessage());
            return response()->json([
                'status' => 'error',
                'message' => 'Unable to fetch gold rates.',
            ], 500);
        }
    }

    /**
     * Get today's gold rate or latest recorded.
     */
    public function today()
    {
        try {
            $rates = \App\Services\MetalRateService::getCurrentRates();

            return response()->json([
                'status' => 'success',
                'data' => $rates,
                'is_today' => true,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error fetching today rate'], 500);
        }
    }

    /**
     * Store or update daily gold rate.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'rate_date' => 'required|date',
            'gold_24k_10g' => 'required|numeric|min:0',
            'gold_24k_1g' => 'required|numeric|min:0',
            'gold_22k_10g' => 'required|numeric|min:0',
            'gold_22k_1g' => 'required|numeric|min:0',
            'gold_18k_1g' => 'nullable|numeric|min:0',
            'gold_14k_1g' => 'nullable|numeric|min:0',
            'silver_1kg' => 'nullable|numeric|min:0',
            'silver_1g' => 'nullable|numeric|min:0',
            'source' => 'nullable|string|max:50',
            'notes' => 'nullable|string|max:500',
        ]);

        try {
            $goldRate = GoldRate::updateOrCreate(
                ['rate_date' => $validated['rate_date']],
                [
                    'gold_24k_10g' => $validated['gold_24k_10g'],
                    'gold_24k_1g' => $validated['gold_24k_1g'],
                    'gold_22k_10g' => $validated['gold_22k_10g'],
                    'gold_22k_1g' => $validated['gold_22k_1g'],
                    'gold_18k_1g' => $validated['gold_18k_1g'] ?? ($validated['gold_24k_1g'] * 0.75),
                    'gold_14k_1g' => $validated['gold_14k_1g'] ?? ($validated['gold_24k_1g'] * (14 / 24)),
                    'silver_1kg' => $validated['silver_1kg'] ?? null,
                    'silver_1g' => $validated['silver_1g'] ?? null,
                    'source' => $validated['source'] ?? 'manual',
                    'notes' => $validated['notes'] ?? null,
                ]
            );

            // Invalidate cached live rates so UI updates in real-time
            \Illuminate\Support\Facades\Cache::forget('live_metal_rates_chennai_v7');
            \Illuminate\Support\Facades\Cache::forget('live_metal_rates_chennai_v5');

            return response()->json([
                'status' => 'success',
                'message' => 'Gold rate for ' . $validated['rate_date'] . ' saved successfully.',
                'data' => $goldRate,
            ], 200);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Error saving gold rate: ' . $e->getMessage());
            return response()->json(['message' => 'Unable to connect to the server. Please try again later.'], 500);
        }
    }

    /**
     * Delete a gold rate entry.
     */
    public function destroy($id)
    {
        try {
            $rate = GoldRate::findOrFail($id);
            $rate->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Gold rate entry deleted successfully.',
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error deleting gold rate'], 500);
        }
    }
}
