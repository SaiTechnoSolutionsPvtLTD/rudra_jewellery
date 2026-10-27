<?php

namespace App\Services;

use App\Models\GoldRate;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MetalRateService
{
    /**
     * Get authoritative current metal rates for today.
     * Enforces the business rule:
     * Manual rates ALWAYS take precedence over automatic rates for the same applicable date.
     */
    public static function getCurrentRates(): array
    {
        return Cache::remember('authoritative_current_rates', 300, function () {
            $today = Carbon::today()->toDateString();

            // 1. Check if a manual rate was persisted in the database for today
            $todayRecord = GoldRate::where('rate_date', $today)->first();

            if ($todayRecord && strtolower($todayRecord->source) === 'manual') {
                return self::formatRecordToRatesArray($todayRecord, true);
            }

            // 2. If an automatic record already exists for today, return it immediately to avoid web request blocking
            if ($todayRecord && $todayRecord->updated_at && $todayRecord->updated_at->diffInMinutes(now()) < 60) {
                return self::formatRecordToRatesArray($todayRecord, false);
            }

            // 3. Skip external network requests if recent fetch failed (15m cooldown) to prevent locking the PHP web worker
            if (Cache::has('metal_rates_fetch_failed_cooldown')) {
                if ($todayRecord) {
                    return self::formatRecordToRatesArray($todayRecord, strtolower($todayRecord->source) === 'manual');
                }
                $latestRecord = GoldRate::orderBy('rate_date', 'desc')->first();
                if ($latestRecord) {
                    return self::formatRecordToRatesArray($latestRecord, strtolower($latestRecord->source) === 'manual');
                }
            }

            // 4. Otherwise, perform automatic live rate retrieval from market data source (fast timeout)
            $fetched = self::fetchMarketRates();
            if ($fetched['success']) {
                $rates = $fetched['data'];

                // Persist or update today's automatic record safely
                // Note: only update if not already manually locked
                $record = GoldRate::where('rate_date', $today)->first();
                if (!$record || strtolower($record->source) !== 'manual') {
                    $record = GoldRate::updateOrCreate(
                        ['rate_date' => $today],
                        [
                            'gold_24k_10g' => $rates['raw24k'] * 10,
                            'gold_24k_1g' => $rates['raw24k'],
                            'gold_22k_10g' => $rates['raw22k'] * 10,
                            'gold_22k_1g' => $rates['raw22k'],
                            'gold_18k_1g' => $rates['raw18k'],
                            'gold_14k_1g' => $rates['raw14k'] ?? round($rates['raw24k'] * (14 / 24)),
                            'silver_1kg' => $rates['rawSilverKg'],
                            'silver_1g' => $rates['rawSilverGram'],
                            'source' => 'automatic',
                            'notes' => 'Automatic MCX/Live Market rate sync',
                        ]
                    );
                }

                return self::formatRecordToRatesArray($record, strtolower($record->source) === 'manual');
            } else {
                // Set a 15-minute cooldown so that consecutive page loads do not repeatedly stall on external network timeouts
                Cache::put('metal_rates_fetch_failed_cooldown', true, 900);
            }

            // 5. Sensible Fallback: If external source is unavailable, use existing today's record or latest recorded rate in database
            if ($todayRecord) {
                try {
                    $todayRecord->touch();
                } catch (\Throwable $e) {}
                return self::formatRecordToRatesArray($todayRecord, strtolower($todayRecord->source) === 'manual');
            }

        $latestRecord = GoldRate::orderBy('rate_date', 'desc')->first();
        if ($latestRecord) {
            $data = self::formatRecordToRatesArray($latestRecord, strtolower($latestRecord->source) === 'manual');
            $data['source'] = 'Fallback (Stored: ' . $latestRecord->rate_date->format('d M Y') . ')';
            $data['isFallback'] = true;
            return $data;
        }

            // 5. Hard fallback default (Tamil Nadu standard benchmark) if table is completely empty
            return [
                'location' => 'Chennai',
                'date' => Carbon::now()->format('d F Y'),
                'rate_date' => $today,
                'gold24k' => '8,850',
                'gold22k' => '8,113',
                'gold18k' => '6,638',
                'gold14k' => '5,163',
                'gold24kGram' => '8,850',
                'gold22kGram' => '8,113',
                'gold18kGram' => '6,638',
                'gold14kGram' => '5,163',
                'gold24k_10g' => '88,500',
                'gold22k_10g' => '81,130',
                'raw24k' => 8850,
                'raw22k' => 8113,
                'raw18k' => 6638,
                'raw14k' => 5163,
                'silverGram' => '108.0',
                'silverKg' => '108,000',
                'rawSilverGram' => 108.0,
                'rawSilverKg' => 108000,
                'source' => 'Benchmark Standard',
                'isLive' => false,
                'isManual' => false,
                'isFallback' => true,
                'lastUpdated' => Carbon::now()->format('h:i A'),
                'updatedAt' => Carbon::now()->toDateTimeString(),
            ];
        });
    }

    /**
     * Retrieve market metal rates and convert properly from bullion/futures contracts to retail per-gram rates.
     */
    public static function fetchMarketRates(): array
    {
        try {
            // First check if a custom MCX API endpoint is configured
            $mcxEndpoint = config('services.mcx.endpoint', env('MCX_API_URL'));
            $mcxApiKey = config('services.mcx.key', env('MCX_API_KEY'));

            if (!empty($mcxEndpoint) && filter_var($mcxEndpoint, FILTER_VALIDATE_URL)) {
                $mcxRes = Http::timeout(8)->withHeaders(array_filter([
                    'Authorization' => $mcxApiKey ? "Bearer {$mcxApiKey}" : null,
                    'x-api-key' => $mcxApiKey,
                ]))->get($mcxEndpoint);

                if ($mcxRes->successful()) {
                    $json = $mcxRes->json();
                    // If MCX returns 10g futures contract price for Gold and 1kg for Silver
                    $gold10g = (float) ($json['gold_10g'] ?? $json['mcx_gold'] ?? $json['gold'] ?? 0);
                    $silver1kg = (float) ($json['silver_1kg'] ?? $json['mcx_silver'] ?? $json['silver'] ?? 0);

                    if ($gold10g > 10000) {
                        // Conversion from MCX futures to retail per gram:
                        // Add retail landing tariff + 3% GST
                        $gram24k = round(($gold10g / 10) * 1.03);
                        $gram22k = round($gram24k * (22 / 24));
                        $gram18k = round($gram24k * (18 / 24));
                        $gram14k = round($gram24k * (14 / 24));
                        $gramSilver = $silver1kg > 1000 ? round(($silver1kg / 1000) * 1.03, 1) : 108.0;

                        return [
                            'success' => true,
                            'provider' => 'MCX Direct Provider',
                            'data' => [
                                'raw24k' => $gram24k,
                                'raw22k' => $gram22k,
                                'raw18k' => $gram18k,
                                'raw14k' => $gram14k,
                                'rawSilverGram' => $gramSilver,
                                'rawSilverKg' => round($gramSilver * 1000),
                            ]
                        ];
                    }
                }
            }

            // Reliable accessible market data provider: Gold-API + Open Currency Exchange (Fast 1s connect timeout)
            $goldRes = Http::connectTimeout(1)->timeout(2)->get('https://api.gold-api.com/price/XAU');
            $silverRes = Http::connectTimeout(1)->timeout(2)->get('https://api.gold-api.com/price/XAG');
            $erRes = Http::connectTimeout(1)->timeout(2)->get('https://open.er-api.com/v6/latest/USD');

            if ($goldRes->successful() && $erRes->successful()) {
                $goldUsd = (float) $goldRes->json('price');
                $silverUsd = (float) ($silverRes->successful() ? $silverRes->json('price') : 32.5);
                $usdInr = (float) $erRes->json('rates.INR', 95.5);

                if ($goldUsd > 1000 && $usdInr > 50) {
                    // International Spot Rate per gram in INR (1 Troy Oz = 31.1034768 grams)
                    $spotGoldInr = ($goldUsd * $usdInr) / 31.1034768;
                    $spotSilverInr = ($silverUsd * $usdInr) / 31.1034768;

                    // India Domestic Landed Market Duty & Taxes (Customs Duty ~6% + Cess & local GST/margin ~3% => 1.09)
                    $chennai24kGram = $spotGoldInr * 1.09;
                    $chennai22kGram = $chennai24kGram * (22 / 24);
                    $chennai18kGram = $chennai24kGram * (18 / 24);
                    $chennai14kGram = $chennai24kGram * (14 / 24);
                    $chennaiSilverGram = $spotSilverInr * 1.09;

                    $g24 = round($chennai24kGram);
                    $g22 = round($chennai22kGram);
                    $g18 = round($chennai18kGram);
                    $g14 = round($chennai14kGram);
                    $sGram = round($chennaiSilverGram, 1);
                    $sKg = round($chennaiSilverGram * 1000);

                    return [
                        'success' => true,
                        'provider' => 'Live Market (Gold-API & FX)',
                        'data' => [
                            'raw24k' => $g24,
                            'raw22k' => $g22,
                            'raw18k' => $g18,
                            'raw14k' => $g14,
                            'rawSilverGram' => $sGram,
                            'rawSilverKg' => $sKg,
                        ]
                    ];
                }
            }

            return ['success' => false, 'error' => 'External rate API response invalid'];
        } catch (\Throwable $e) {
            Log::warning('MetalRateService: Market retrieval error - ' . $e->getMessage());
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    /**
     * Persist manual rates entered by an authorized user.
     * Manual rates for the date take precedence over any automatic updates.
     */
    public static function saveManualRates(array $data): array
    {
        $cleanNum = fn($val) => (float) str_replace([',', '₹', ' '], '', (string)$val);

        $val24k = $cleanNum($data['gold24k'] ?? 0);
        $val22k = $cleanNum($data['gold22k'] ?? 0);
        $val18k = !empty($data['gold18k']) ? $cleanNum($data['gold18k']) : 0;
        $val14k = !empty($data['gold14k']) ? $cleanNum($data['gold14k']) : 0;
        $silverG = !empty($data['silverGram']) ? $cleanNum($data['silverGram']) : 108.0;

        // If user entered 10g rate (> 40000) vs 1g rate, normalize to 1g
        $gram24k = $val24k > 40000 ? round($val24k / 10) : round($val24k);
        $gram22k = $val22k > 40000 ? round($val22k / 10) : round($val22k);
        $gram18k = $val18k > 40000 ? round($val18k / 10) : ($val18k > 0 ? round($val18k) : round($gram24k * (18 / 24)));
        $gram14k = $val14k > 40000 ? round($val14k / 10) : ($val14k > 0 ? round($val14k) : round($gram24k * (14 / 24)));
        $silverGram = $silverG > 2000 ? round($silverG / 1000, 1) : round($silverG, 1);
        $silverKg = round($silverGram * 1000);

        $rateDate = !empty($data['rate_date']) ? Carbon::parse($data['rate_date'])->toDateString() : Carbon::today()->toDateString();

        // Persist to gold_rates table
        $record = GoldRate::updateOrCreate(
            ['rate_date' => $rateDate],
            [
                'gold_24k_10g' => $gram24k * 10,
                'gold_24k_1g' => $gram24k,
                'gold_22k_10g' => $gram22k * 10,
                'gold_22k_1g' => $gram22k,
                'gold_18k_1g' => $gram18k,
                'gold_14k_1g' => $gram14k,
                'silver_1kg' => $silverKg,
                'silver_1g' => $silverGram,
                'source' => 'manual',
                'notes' => $data['notes'] ?? 'Manual Showroom Override',
            ]
        );

        $result = self::formatRecordToRatesArray($record, true);

        // Clear cache so all endpoints immediately serve the new manual rate
        Cache::forget('authoritative_current_rates');
        Cache::forget('live_metal_rates_chennai_v7');
        Cache::forget('live_metal_rates_chennai_v5');

        return $result;
    }

    /**
     * Reset manual rate override for today and re-sync automatic live market rate.
     */
    public static function resetToLive(): array
    {
        $today = Carbon::today()->toDateString();
        GoldRate::where('rate_date', $today)->delete();

        Cache::forget('authoritative_current_rates');
        Cache::forget('live_metal_rates_chennai_v7');
        Cache::forget('live_metal_rates_chennai_v5');
        Cache::forget('manual_metal_rates_' . $today);

        return self::getCurrentRates();
    }

    /**
     * Format a GoldRate model instance into the comprehensive response array used across ERP.
     */
    private static function formatRecordToRatesArray(GoldRate $record, bool $isManual): array
    {
        $g24 = round((float) $record->gold_24k_1g);
        $g22 = round((float) $record->gold_22k_1g);
        $g18 = $record->gold_18k_1g ? round((float) $record->gold_18k_1g) : round($g24 * (18 / 24));
        $g14 = $record->gold_14k_1g ? round((float) $record->gold_14k_1g) : round($g24 * (14 / 24));
        $sGram = round((float) ($record->silver_1g ?: 108.0), 1);
        $sKg = round((float) ($record->silver_1kg ?: ($sGram * 1000)));

        $sourceLabel = $isManual
            ? 'Manual (Showroom Entry)'
            : 'Automatic (MCX / Live Market)';

        $timeString = $record->updated_at
            ? $record->updated_at->format('h:i A')
            : Carbon::now()->format('h:i A');

        return [
            'location' => 'Chennai',
            'date' => $record->rate_date ? $record->rate_date->format('d F Y') : Carbon::now()->format('d F Y'),
            'rate_date' => $record->rate_date ? $record->rate_date->toDateString() : Carbon::today()->toDateString(),
            'gold24k' => number_format($g24),
            'gold22k' => number_format($g22),
            'gold18k' => number_format($g18),
            'gold14k' => number_format($g14),
            'gold24kGram' => number_format($g24),
            'gold22kGram' => number_format($g22),
            'gold18kGram' => number_format($g18),
            'gold14kGram' => number_format($g14),
            'gold24k_10g' => number_format($g24 * 10),
            'gold22k_10g' => number_format($g22 * 10),
            'gold14k_10g' => number_format($g14 * 10),
            'raw24k' => $g24,
            'raw22k' => $g22,
            'raw18k' => $g18,
            'raw14k' => $g14,
            'silverGram' => number_format($sGram, 1),
            'silverKg' => number_format($sKg),
            'rawSilverGram' => $sGram,
            'rawSilverKg' => $sKg,
            'source' => $sourceLabel,
            'isLive' => !$isManual,
            'isManual' => $isManual,
            'lastUpdated' => $timeString,
            'updatedAt' => $record->updated_at ? $record->updated_at->toDateTimeString() : Carbon::now()->toDateTimeString(),
        ];
    }
}
