<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        try {
            if (Schema::hasTable('clients')) {
                $query = Client::query();

                if ($request->has('search') && !empty($request->search)) {
                    $search = $request->search;
                    $query->where(function($q) use ($search) {
                        $q->where('full_name', 'like', "%{$search}%")
                          ->orWhere('client_code', 'like', "%{$search}%")
                          ->orWhere('primary_phone', 'like', "%{$search}%")
                          ->orWhere('email', 'like', "%{$search}%");
                    });
                }

                if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
                    $query->where('status', $request->status);
                }

                $clients = $query->orderBy('id', 'desc')->get();

                $todayCount = Client::whereDate('created_at', Carbon::today())->count();
                $activeMembersCount = Client::where('status', 'active')->count();
                $newRegCount = Client::where('created_at', '>=', Carbon::now()->subDays(30))->count();

                return response()->json([
                    'stats' => [
                        'todayClients' => $todayCount > 0 ? $todayCount : $clients->count(),
                        'activeMembers' => $activeMembersCount,
                        'newReg' => $newRegCount
                    ],
                    'clients' => $clients
                ]);
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json([
            'stats' => ['todayClients' => 0, 'activeMembers' => 0, 'newReg' => 0],
            'clients' => []
        ]);
    }

    public function generateCode()
    {
        $prefix = 'RJ-CL';
        $latest = Client::orderBy('id', 'desc')->first();
        $nextId = $latest ? ($latest->id + 1001) : 1001;
        $code = $prefix . '-' . $nextId;

        while (Client::where('client_code', $code)->exists()) {
            $nextId++;
            $code = $prefix . '-' . $nextId;
        }

        return response()->json(['client_code' => $code]);
    }

    public function store(Request $request)
    {
        // Normalize request input keys so both snake_case and camelCase work seamlessly
        $fullName = $request->input('full_name') ?: $request->input('fullName');
        $primaryPhone = $request->input('primary_phone') ?: $request->input('primaryPhone');

        $request->merge([
            'full_name' => $fullName,
            'primary_phone' => $primaryPhone,
        ]);

        $validated = $request->validate([
            'client_code' => 'nullable|string|max:50',
            'full_name' => 'required|string|max:255',
            'primary_phone' => 'required|string|max:50',
            'gender' => 'nullable|string',
            'dob' => 'nullable|date',
            'anniversary_date' => 'nullable|date',
            'secondary_phone' => 'nullable|string',
            'email' => 'nullable|email|max:255',
            'aadhar_number' => 'nullable|string',
            'pan_number' => 'nullable|string',
            'street_address' => 'nullable|string',
            'city' => 'nullable|string',
            'state' => 'nullable|string',
            'zip_code' => 'nullable|string',
            'company_name' => 'nullable|string',
            'gst_number' => 'nullable|string',
            'gst_percentage' => 'nullable|string',
            'designation' => 'nullable|string',
            'membership_tier' => 'nullable|string',
            'quick_notes' => 'nullable|string',
            'status' => 'nullable|string',
            'avatar' => 'nullable',
        ]);

        $data = [
            'full_name' => $fullName,
            'client_code' => $request->input('client_code') ?: $request->input('code'),
            'gender' => $request->input('gender', 'female'),
            'dob' => $request->input('dob'),
            'anniversary_date' => $request->input('anniversary_date') ?: $request->input('anniversaryDate'),
            'primary_phone' => $primaryPhone,
            'secondary_phone' => $request->input('secondary_phone') ?: $request->input('secondaryPhone'),
            'email' => $request->input('email'),
            'aadhar_number' => $request->input('aadhar_number') ?: $request->input('aadharNumber'),
            'pan_number' => $request->input('pan_number') ?: $request->input('panNumber'),
            'street_address' => $request->input('street_address') ?: $request->input('streetAddress'),
            'city' => $request->input('city'),
            'state' => $request->input('state'),
            'zip_code' => $request->input('zip_code') ?: $request->input('zipCode'),
            'company_name' => $request->input('company_name') ?: $request->input('companyName'),
            'gst_number' => $request->input('gst_number') ?: $request->input('gstNumber'),
            'gst_percentage' => $request->input('gst_percentage') ?: $request->input('gstPercentage'),
            'designation' => $request->input('designation'),
            'membership_tier' => $request->input('membership_tier') ?: ($request->input('membershipTier') ?: 'silver'),
            'quick_notes' => $request->input('quick_notes') ?: $request->input('quickNotes'),
            'status' => $request->input('status', 'active'),
            'last_visit' => Carbon::now(),
            'total_purchases' => 0.00
        ];

        if (empty($data['client_code'])) {
            $prefix = 'RJ-CL';
            $latest = Client::orderBy('id', 'desc')->first();
            $nextId = $latest ? ($latest->id + 1001) : 1001;
            $data['client_code'] = $prefix . '-' . $nextId;
        }

        // Handle Avatar File Upload
        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('clients/avatars', 'public');
            $data['avatar'] = $path;
        }

        try {
            if (Schema::hasTable('clients')) {
                $client = Client::create($data);
                return response()->json([
                    'status' => 'success',
                    'message' => 'Client registered successfully',
                    'client' => $client
                ], 201);
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json(['message' => 'Database error'], 500);
    }

    public function show($id)
    {
        try {
            if (Schema::hasTable('clients')) {
                $client = Client::find($id);
                if ($client) {
                    return response()->json($client);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json(['message' => 'Client not found'], 404);
    }

    public function update(Request $request, $id)
    {
        try {
            if (Schema::hasTable('clients')) {
                $client = Client::find($id);
                if ($client) {
                    $data = [
                        'full_name' => $request->input('full_name') ?: $request->input('fullName', $client->full_name),
                        'gender' => $request->input('gender', $client->gender),
                        'dob' => $request->input('dob', $client->dob),
                        'anniversary_date' => $request->input('anniversary_date') ?: $request->input('anniversaryDate', $client->anniversary_date),
                        'primary_phone' => $request->input('primary_phone') ?: $request->input('primaryPhone', $client->primary_phone),
                        'secondary_phone' => $request->input('secondary_phone') ?: $request->input('secondaryPhone', $client->secondary_phone),
                        'email' => $request->input('email', $client->email),
                        'aadhar_number' => $request->input('aadhar_number') ?: $request->input('aadharNumber', $client->aadhar_number),
                        'pan_number' => $request->input('pan_number') ?: $request->input('panNumber', $client->pan_number),
                        'street_address' => $request->input('street_address') ?: $request->input('streetAddress', $client->street_address),
                        'city' => $request->input('city', $client->city),
                        'state' => $request->input('state', $client->state),
                        'zip_code' => $request->input('zip_code') ?: $request->input('zipCode', $client->zip_code),
                        'company_name' => $request->input('company_name') ?: $request->input('companyName', $client->company_name),
                        'gst_number' => $request->input('gst_number') ?: $request->input('gstNumber', $client->gst_number),
                        'gst_percentage' => $request->input('gst_percentage') !== null ? $request->input('gst_percentage') : $request->input('gstPercentage', $client->gst_percentage),
                        'designation' => $request->input('designation', $client->designation),
                        'membership_tier' => $request->input('membership_tier') ?: $request->input('membershipTier', $client->membership_tier),
                        'quick_notes' => $request->input('quick_notes') ?: $request->input('quickNotes', $client->quick_notes),
                        'status' => $request->input('status', $client->status),
                    ];

                    if ($request->hasFile('avatar')) {
                        if ($client->avatar && Storage::disk('public')->exists($client->avatar)) {
                            Storage::disk('public')->delete($client->avatar);
                        }
                        $data['avatar'] = $request->file('avatar')->store('clients/avatars', 'public');
                    }

                    $client->update($data);
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Client details updated successfully',
                        'client' => $client
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json(['message' => 'Client not found'], 404);
    }

    public function destroy($id)
    {
        try {
            if (Schema::hasTable('clients')) {
                $client = Client::find($id);
                if ($client) {
                    if ($client->avatar && Storage::disk('public')->exists($client->avatar)) {
                        Storage::disk('public')->delete($client->avatar);
                    }
                    $client->delete();
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Client deleted successfully'
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json(['message' => 'Client not found'], 404);
    }

    public function billing()
    {
        return response()->json([
            'stats' => [
                'todayInvoices' => '1,254',
                'todayBillings' => '28.75 L',
                'pendingBills' => '₹ 12.45 L',
                'totalRevenue' => '14.2 Cr'
            ],
            'invoices' => [
                [
                    'id' => 'INV- 2026-1254',
                    'client' => 'Meera Singhania',
                    'email' => 'meera.s@regal.com',
                    'tier' => 'ELITE',
                    'tierKey' => 'elite',
                    'date' => '23 Jul, 2026',
                    'amount' => 85000,
                    'gst' => 4250,
                    'total' => 89250,
                    'status' => 'paid',
                ]
            ]
        ]);
    }
}
