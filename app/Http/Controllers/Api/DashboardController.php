<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        return response()->json([
            'summary' => [
                'activeArtisans' => 42,
                'activeArtisansChange' => '+12%',
                'pendingOrders' => 18,
                'overdueItems' => 4,
                'qcPending' => 18,
                'qcThisWeek' => 3,
                'completedJobs' => 64,
                'completedValue' => '6,74,820'
            ],
            'liveJobs' => [
                [
                    'id' => 1,
                    'artisan' => 'Rajesh Varma',
                    'initials' => 'RV',
                    'orderId' => 'MO - 882',
                    'itemType' => 'Bridal Necklace',
                    'stage' => 'STONE SETTING',
                    'dueDate' => 'Oct 24, 2023',
                    'badgeColor' => 'yellow'
                ],
                [
                    'id' => 2,
                    'artisan' => 'Amin Khan',
                    'initials' => 'AK',
                    'orderId' => 'MO - 901',
                    'itemType' => 'Gold Filigree Cuff',
                    'stage' => 'POLISHING',
                    'dueDate' => 'Oct 26, 2023',
                    'badgeColor' => 'green'
                ],
                [
                    'id' => 3,
                    'artisan' => 'Mohit Sharma',
                    'initials' => 'MS',
                    'orderId' => 'MO - 745',
                    'itemType' => 'Solitaire Ring',
                    'stage' => 'CASTING',
                    'dueDate' => 'Oct 20, 2023',
                    'badgeColor' => 'red'
                ],
                [
                    'id' => 4,
                    'artisan' => 'Suresh Lal',
                    'initials' => 'SL',
                    'orderId' => 'MO - 912',
                    'itemType' => 'Temple Earring Set',
                    'stage' => 'ENAMELING',
                    'dueDate' => 'Oct 29, 2023',
                    'badgeColor' => 'purple'
                ]
            ]
        ]);
    }

    public function metalRates()
    {
        $rates = Cache::remember('live_metal_rates_chennai_v3', 300, function () {
            try {
                // Fetch Gold, Silver spot prices and USD/INR rate asynchronously
                $goldResponse = Http::timeout(4)->get('https://api.gold-api.com/price/XAU');
                $silverResponse = Http::timeout(4)->get('https://api.gold-api.com/price/XAG');
                $erResponse = Http::timeout(4)->get('https://open.er-api.com/v6/latest/USD');

                if ($goldResponse->successful() && $silverResponse->successful() && $erResponse->successful()) {
                    $goldUsd = $goldResponse->json('price');
                    $silverUsd = $silverResponse->json('price');
                    $usdInr = $erResponse->json('rates.INR', 86.5);

                    if ($goldUsd && $silverUsd) {
                        // International Spot Rate per gram in INR (1 Troy Oz = 31.1034768 grams)
                        $spotGoldInr = ($goldUsd * $usdInr) / 31.1034768;
                        $spotSilverInr = ($silverUsd * $usdInr) / 31.1034768;

                        // Apply Chennai Domestic Market Duty & Premium (Import Duty + Cess ~7.5%)
                        $chennai24kGram = $spotGoldInr * 1.075;
                        $chennai22kGram = $chennai24kGram * (22 / 24);
                        $chennaiSilverGram = $spotSilverInr * 1.075;

                        return [
                            'location' => 'Chennai',
                            'date' => Carbon::now()->format('d F Y'),
                            'gold24k' => number_format(round($chennai24kGram)),
                            'gold22k' => number_format(round($chennai22kGram)),
                            'silverGram' => number_format(round($chennaiSilverGram, 1), 1),
                            'silverKg' => number_format(round($chennaiSilverGram * 1000)),
                            'usdInr' => number_format($usdInr, 2),
                            'isLive' => true,
                        ];
                    }
                }
            } catch (\Exception $e) {
                // Ignore API failure and fallback
            }

            // Fallback Chennai Jewellers Association Market Benchmark Rates
            return [
                'location' => 'Chennai',
                'date' => Carbon::now()->format('d F Y'),
                'gold24k' => '7,320',
                'gold22k' => '6,710',
                'silverGram' => '94.0',
                'silverKg' => '94,000',
                'usdInr' => '86.50',
                'isLive' => false,
            ];
        });

        return response()->json($rates);
    }
}
