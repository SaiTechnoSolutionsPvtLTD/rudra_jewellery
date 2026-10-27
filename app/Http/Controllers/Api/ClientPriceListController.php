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
            'gold_rates' => [
                'rate_24k' => 0,
                'rate_22k' => 0,
                'rate_18k' => 0,
                'rate_14k' => 0,
            ],
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
     * Get price list for a given client (active version or specified version)
     */
    public function show(Request $request, $clientId)
    {
        $client = Client::find($clientId);
        if (!$client) {
            return response()->json(['message' => 'Client not found'], 404);
        }

        if ($request->filled('version')) {
            $priceList = ClientPriceList::where('client_id', $clientId)
                ->where('version', $request->query('version'))
                ->first();
        } else {
            $priceList = ClientPriceList::where('client_id', $clientId)
                ->where('status', 'active')
                ->latest()
                ->first();

            if (!$priceList) {
                $priceList = ClientPriceList::where('client_id', $clientId)->latest()->first();
            }
        }

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
     * Save or update price list for a client.
     * When activating a version, all previous versions for this client are archived to prevent conflicts.
     */
    public function storeOrUpdate(Request $request, $clientId)
    {
        $client = Client::find($clientId);
        if (!$client) {
            return response()->json(['message' => 'Client not found'], 404);
        }

        $version = $request->input('version', '01');
        $status = $request->input('status', 'active');

        // Find existing price list for this client and version
        $priceList = ClientPriceList::where('client_id', $clientId)
            ->where('version', $version)
            ->first();

        $data = [
            'client_id' => (int)$clientId,
            'version' => $version,
            'status' => $status,
            'effective_from' => $request->input('effective_from', Carbon::now()->format('Y-m-d')),
            'effective_to' => $request->input('effective_to', 'Open / Till Updated'),
            'gold_rates' => $request->input('gold_rates', []),
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

        // If newly saved or updated version is active, archive any other version for this client
        if ($status === 'active') {
            ClientPriceList::where('client_id', $clientId)
                ->where('id', '!=', $priceList->id)
                ->update(['status' => 'archived']);
        }

        return response()->json([
            'status' => 'success',
            'message' => 'Price list saved successfully for ' . $client->full_name,
            'price_list' => $priceList,
            'client' => $client
        ]);
    }

    /**
     * Activate a specific price list version for a client
     */
    public function activateVersion($clientId, $versionId)
    {
        $client = Client::find($clientId);
        if (!$client) {
            return response()->json(['message' => 'Client not found'], 404);
        }

        $priceList = ClientPriceList::where('client_id', $clientId)
            ->where(function ($q) use ($versionId) {
                $q->where('id', $versionId)->orWhere('version', $versionId);
            })
            ->first();

        if (!$priceList) {
            return response()->json(['message' => 'Price list version not found'], 404);
        }

        // Archive all other versions for this client
        ClientPriceList::where('client_id', $clientId)
            ->where('id', '!=', $priceList->id)
            ->update(['status' => 'archived']);

        $priceList->update([
            'status' => 'active',
            'effective_from' => Carbon::now()->format('Y-m-d'),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => "Price list version {$priceList->version} activated successfully.",
            'price_list' => $priceList,
            'client' => $client,
        ]);
    }

    /**
     * Get price list version history for a given client
     */
    public function history($clientId)
    {
        $client = Client::find($clientId);
        if (!$client) {
            return response()->json(['message' => 'Client not found'], 404);
        }

        $history = ClientPriceList::where('client_id', $clientId)->orderBy('id', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'history' => $history,
            'client' => $client
        ]);
    }
}
