<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientPriceList;
use App\Models\Client;
use Illuminate\Http\Request;
use Carbon\Carbon;

class ClientPriceListController extends Controller
{
    /**
     * Default template price list structure
     */
    private function getDefaultPriceListData($clientId)
    {
        return [
            'client_id' => (int)$clientId,
            'version' => '01',
            'status' => 'active',
            'effective_from' => Carbon::now()->format('Y-m-d'),
            'effective_to' => 'Open / Till Updated',
            'diamond_stone_rates' => [],
            'color_stone_charges' => [
                [
                    'id' => 1,
                    'stone' => 'Navaratna Stones',
                    'rate_per_ct' => 1800
                ],
                [
                    'id' => 2,
                    'stone' => 'Emerald',
                    'rate_per_ct' => 2000
                ],
                [
                    'id' => 3,
                    'stone' => 'Onyx',
                    'rate_per_ct' => 550
                ],
            ],
            'additional_charges' => [
                'minimum_labour' => 1500,
                'minimum_labour_desc' => 'Per Piece for Below 1.00 gms items',
                'single_nose_pin' => 850,
                'single_nose_pin_desc' => 'Per Piece',
                'multi_stones' => 1000,
                'multi_stones_desc' => 'Per Piece',
                'step_nose_pin' => 0,
                'tongai' => 0,
            ],
            'making_charges' => [
                [
                    'id' => 1,
                    'type_design' => '22KT: Close Setting',
                    'wastage_percent' => '6%',
                    'labour_charge' => 'Rs. 500/- per gms wt',
                    'gold_purity' => '916',
                    'on_wt' => '92%'
                ],
                [
                    'id' => 2,
                    'type_design' => '18KT: Open Setting',
                    'wastage_percent' => '6%',
                    'labour_charge' => 'Rs. 450/- per gms wt',
                    'gold_purity' => '916',
                    'on_wt' => '92%'
                ],
                [
                    'id' => 3,
                    'type_design' => '18KT: Open / Close',
                    'wastage_percent' => '6%',
                    'labour_charge' => 'Rs. 500/- per gms wt',
                    'gold_purity' => '750',
                    'on_wt' => '76%'
                ],
            ],
            'stamping_instructions' => [
                'stamping_detail' => 'DIA WT/NO OF DIA/ RJ Seal',
                'certification' => '-',
                'hallmark_huid' => 'NO',
                'metal_colour' => '-',
                'client_qc_before_billing' => 'NO',
                'necklace_back_chain' => '-',
            ],
            'payment_terms' => [
                ['id' => 1, 'type' => 'Gold', 'terms' => 'COD'],
                ['id' => 2, 'type' => 'Diamond', 'terms' => 'COD'],
                ['id' => 3, 'type' => 'MC', 'terms' => 'COD'],
                ['id' => 4, 'type' => 'MC', 'terms' => 'COD'],
                ['id' => 5, 'type' => 'Diamond', 'terms' => 'COD'],
            ]
        ];
    }

    /**
     * Get price list for a given client
     */
    public function show($clientId)
    {
        $client = Client::find($clientId);
        if (!$client) {
            return response()->json(['message' => 'Client not found'], 404);
        }

        $priceList = ClientPriceList::where('client_id', $clientId)->latest()->first();

        if (!$priceList) {
            // Return default template
            $defaultData = $this->getDefaultPriceListData($clientId);
            return response()->json([
                'status' => 'success',
                'is_default' => true,
                'price_list' => $defaultData,
                'client' => $client
            ]);
        }

        return response()->json([
            'status' => 'success',
            'is_default' => false,
            'price_list' => $priceList,
            'client' => $client
        ]);
    }

    /**
     * Save or update price list for a client
     */
    public function storeOrUpdate(Request $request, $clientId)
    {
        $client = Client::find($clientId);
        if (!$client) {
            return response()->json(['message' => 'Client not found'], 404);
        }

        $version = $request->input('version', '01');

        // Find existing price list for this client and version
        $priceList = ClientPriceList::where('client_id', $clientId)
            ->where('version', $version)
            ->first();

        $data = [
            'client_id' => (int)$clientId,
            'version' => $version,
            'status' => $request->input('status', 'active'),
            'effective_from' => $request->input('effective_from', Carbon::now()->format('Y-m-d')),
            'effective_to' => $request->input('effective_to', 'Open / Till Updated'),
            'diamond_stone_rates' => $request->input('diamond_stone_rates', []),
            'color_stone_charges' => $request->input('color_stone_charges', []),
            'additional_charges' => $request->input('additional_charges', []),
            'making_charges' => $request->input('making_charges', []),
            'stamping_instructions' => $request->input('stamping_instructions', []),
            'payment_terms' => $request->input('payment_terms', []),
        ];

        if ($priceList) {
            $priceList->update($data);
        } else {
            $priceList = ClientPriceList::create($data);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Price list saved successfully for ' . $client->full_name,
            'price_list' => $priceList,
            'client' => $client
        ]);
    }
}
