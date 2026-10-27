<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\WorkOrderReceivedPiece;
use App\Models\WorkOrder;
use App\Models\Product;
use App\Models\SaleItem;
use App\Models\InventoryMovement;
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
                $baseQuery = Client::query()->where(function($q) {
                    $q->whereNull('is_removed')->orWhere('is_removed', false);
                });

                if ($request->filled('search')) {
                    $search = $request->search;
                    $baseQuery->where(function($q) use ($search) {
                        $q->where('full_name', 'like', "%{$search}%")
                          ->orWhere('client_code', 'like', "%{$search}%")
                          ->orWhere('primary_phone', 'like', "%{$search}%")
                          ->orWhere('email', 'like', "%{$search}%");
                    });
                }

                if ($request->filled('status') && $request->status !== 'all') {
                    $baseQuery->where('status', $request->status);
                }

                $query = clone $baseQuery;

                if ($request->filled('period') && strtolower($request->period) !== 'all') {
                    $period = strtolower($request->period);
                    $fromDate = match ($period) {
                        'today', '1d' => Carbon::today(),
                        'week', 'this week', '7d' => Carbon::now()->startOfWeek(),
                        'month', 'this month', '30d' => Carbon::now()->startOfMonth(),
                        'year', 'this year' => Carbon::now()->startOfYear(),
                        default => null,
                    };

                    if ($fromDate) {
                        $recentClientIds = Invoice::where('created_at', '>=', $fromDate)->pluck('client_id')->filter()->unique()->all();
                        $query->where(function($q) use ($fromDate, $recentClientIds) {
                            $q->where('created_at', '>=', $fromDate)
                              ->orWhere('last_visit', '>=', $fromDate);
                            if (!empty($recentClientIds)) {
                                $q->orWhereIn('id', $recentClientIds);
                            }
                        });
                    }
                }

                $clients = (clone $query)->orderBy('id', 'desc')->get();

                $period = strtolower($request->input('period', 'month'));
                $newRegFrom = match ($period) {
                    'today', '1d' => Carbon::today(),
                    'week', 'this week', '7d' => Carbon::now()->startOfWeek(),
                    'year', 'this year' => Carbon::now()->startOfYear(),
                    default => Carbon::now()->startOfMonth(),
                };

                // Fast single-pass dynamic stats aggregation
                $todayDate = Carbon::today()->toDateString();
                $regFromStr = $newRegFrom->toDateTimeString();
                $statsRow = (clone $baseQuery)->reorder()->selectRaw("
                    COUNT(*) as totalClients,
                    COUNT(CASE WHEN DATE(created_at) = '{$todayDate}' OR DATE(last_visit) = '{$todayDate}' THEN 1 END) as todayClients,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as activeMembers,
                    COUNT(CASE WHEN created_at >= '{$regFromStr}' THEN 1 END) as newReg
                ")->first();

                return response()->json([
                    'stats' => [
                        'todayClients' => (int) ($statsRow->todayClients ?? 0),
                        'totalClients' => (int) ($statsRow->totalClients ?? 0),
                        'activeMembers' => (int) ($statsRow->activeMembers ?? 0),
                        'newReg' => (int) ($statsRow->newReg ?? 0),
                    ],
                    'clients' => $clients
                ]);
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json([
            'stats' => ['todayClients' => 0, 'totalClients' => 0, 'activeMembers' => 0, 'newReg' => 0],
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

    protected function sanitizePhone($val)
    {
        if (!$val) return $val;
        $digits = preg_replace('/\D/', '', (string)$val);
        if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
            $digits = substr($digits, 2);
        } elseif (strlen($digits) === 11 && str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }
        return strlen($digits) === 10 ? $digits : $val;
    }

    public function store(Request $request)
    {
        $fullName = $request->input('full_name') ?: $request->input('fullName');
        $primaryPhone = $this->sanitizePhone($request->input('primary_phone') ?: $request->input('primaryPhone'));
        $secondaryPhone = $this->sanitizePhone($request->input('secondary_phone') ?: $request->input('secondaryPhone'));

        $request->merge([
            'full_name' => $fullName,
            'primary_phone' => $primaryPhone,
            'secondary_phone' => $secondaryPhone,
        ]);

        $validated = $request->validate([
            'client_code' => 'nullable|string|max:50',
            'full_name' => ['required', 'string', 'max:255', 'regex:/^[\p{L}\s.\'-]+$/u'],
            'primary_phone' => ['required', 'string', 'regex:/^[6-9]\d{9}$/'],
            'gender' => 'nullable|string',
            'dob' => 'nullable|date',
            'anniversary_date' => 'nullable|date',
            'secondary_phone' => ['nullable', 'string', 'regex:/^[6-9]\d{9}$/'],
            'email' => 'nullable|email|max:255',
            'aadhar_number' => ['nullable', 'string', 'regex:/^\d{12}$/'],
            'pan_number' => ['nullable', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
            'street_address' => 'nullable|string|max:500',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'zip_code' => ['nullable', 'string', 'regex:/^[1-9][0-9]{5}$/'],
            'company_name' => 'nullable|string|max:255',
            'gst_number' => ['nullable', 'string', 'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i'],
            'gst_percentage' => 'nullable|numeric|min:0|max:100',
            'designation' => 'nullable|string|max:100',
            'membership_tier' => 'nullable|string|max:50',
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
            'secondary_phone' => $secondaryPhone,
            'email' => $request->filled('email') ? strtolower(trim($request->input('email'))) : null,
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
            'preferred_communication' => $request->input('preferred_communication') ?: ($request->input('preferredCommunication') ?: 'Email'),
            'quick_notes' => $request->input('quick_notes') ?: $request->input('quickNotes'),
            'status' => $request->input('status', 'active'),
            'opening_balance' => (float) $request->input('opening_balance', 0),
            'balance_type' => in_array(strtolower((string) $request->input('balance_type', 'receivable')), ['payable', 'credit']) ? 'payable' : 'receivable',
            'last_visit' => Carbon::now(),
            'total_purchases' => 0.00
        ];

        if (empty($data['client_code'])) {
            $prefix = 'RJ-CL';
            $latest = Client::orderBy('id', 'desc')->first();
            $nextId = $latest ? ($latest->id + 1001) : 1001;
            $data['client_code'] = $prefix . '-' . $nextId;
        }

        // Prevent accidental duplicate customer registration using primary phone, PAN, Aadhar, or client code
        $existingDuplicate = Client::where(function ($q) {
            $q->whereNull('is_removed')->orWhere('is_removed', false);
        })->where(function ($q) use ($primaryPhone, $request) {
            $q->where('primary_phone', $primaryPhone);
            if ($request->filled('pan_number')) {
                $q->orWhere('pan_number', strtoupper(trim($request->pan_number)));
            }
            if ($request->filled('aadhar_number')) {
                $q->orWhere('aadhar_number', trim($request->aadhar_number));
            }
            if ($request->filled('client_code')) {
                $q->orWhere('client_code', trim($request->client_code));
            }
        })->first();

        if ($existingDuplicate) {
            return response()->json([
                'status' => 'error',
                'message' => "Customer already exists with matching phone ({$primaryPhone}) or identifier: {$existingDuplicate->full_name} ({$existingDuplicate->client_code}).",
                'existing_customer' => $existingDuplicate,
                'client' => $existingDuplicate,
            ], 422);
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
                    'data' => $client,
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
                    $fullName = $request->input('full_name') ?: $request->input('fullName');
                    $primaryPhone = $request->input('primary_phone') ?: $request->input('primaryPhone');
                    $secondaryPhone = $request->input('secondary_phone') ?: $request->input('secondaryPhone');
                    if ($fullName !== null) $request->merge(['full_name' => $fullName]);
                    if ($primaryPhone !== null) $request->merge(['primary_phone' => $this->sanitizePhone($primaryPhone)]);
                    if ($secondaryPhone !== null) $request->merge(['secondary_phone' => $this->sanitizePhone($secondaryPhone)]);

                    $validated = $request->validate([
                        'full_name' => ['sometimes', 'required', 'string', 'max:255', 'regex:/^[\p{L}\s.\'-]+$/u'],
                        'primary_phone' => ['sometimes', 'required', 'string', 'regex:/^[6-9]\d{9}$/'],
                        'gender' => 'nullable|string',
                        'dob' => 'nullable|date',
                        'anniversary_date' => 'nullable|date',
                        'secondary_phone' => ['nullable', 'string', 'regex:/^[6-9]\d{9}$/'],
                        'email' => 'nullable|email|max:255',
                        'aadhar_number' => ['nullable', 'string', 'regex:/^\d{12}$/'],
                        'pan_number' => ['nullable', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
                        'street_address' => 'nullable|string|max:500',
                        'city' => 'nullable|string|max:100',
                        'state' => 'nullable|string|max:100',
                        'zip_code' => ['nullable', 'string', 'regex:/^[1-9][0-9]{5}$/'],
                        'company_name' => 'nullable|string|max:255',
                        'gst_number' => ['nullable', 'string', 'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i'],
                        'gst_percentage' => 'nullable|numeric|min:0|max:100',
                        'designation' => 'nullable|string|max:100',
                        'membership_tier' => 'nullable|string|max:50',
                        'quick_notes' => 'nullable|string',
                        'status' => 'nullable|string',
                        'avatar' => 'nullable',
                        'opening_balance' => 'nullable|numeric',
                        'balance_type' => 'nullable|string|in:debit,credit,receivable,payable',
                    ]);

                    $rawBalanceType = $request->input('balance_type', $client->balance_type ?? 'receivable');
                    $normalizedBalanceType = in_array(strtolower((string) $rawBalanceType), ['payable', 'credit']) ? 'payable' : 'receivable';

                    $data = [
                        'full_name' => $request->input('full_name') ?: $request->input('fullName', $client->full_name),
                        'gender' => $request->input('gender', $client->gender),
                        'dob' => $request->input('dob', $client->dob),
                        'anniversary_date' => $request->input('anniversary_date') ?: $request->input('anniversaryDate', $client->anniversary_date),
                        'primary_phone' => $request->input('primary_phone') ?: $request->input('primaryPhone', $client->primary_phone),
                        'secondary_phone' => $request->input('secondary_phone') ?: $request->input('secondaryPhone', $client->secondary_phone),
                        'email' => $request->has('email') ? ($request->filled('email') ? strtolower(trim($request->input('email'))) : null) : $client->email,
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
                        'preferred_communication' => $request->input('preferred_communication') ?: ($request->input('preferredCommunication', $client->preferred_communication)),
                        'quick_notes' => $request->input('quick_notes') ?: $request->input('quickNotes', $client->quick_notes),
                        'status' => $request->input('status', $client->status),
                        'opening_balance' => $request->has('opening_balance') ? (float) $request->input('opening_balance') : ($client->opening_balance ?? 0),
                        'balance_type' => $normalizedBalanceType,
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
        } catch (\Illuminate\Validation\ValidationException $ve) {
            throw $ve;
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error("Client update error: " . $e->getMessage());
            return response()->json(['message' => 'Failed to update client: ' . $e->getMessage()], 500);
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

    public function billing(Request $request)
    {
        try {
            if (Schema::hasTable('invoices')) {
                $query = Invoice::query()->with('client');

                if ($request->filled('client_id')) {
                    $query->where('client_id', $request->client_id);
                }

                if ($request->filled('tier') && $request->tier !== 'all') {
                    $tier = strtolower($request->tier);
                    $query->whereRaw('LOWER(client_tier) = ?', [$tier]);
                }

                if ($request->filled('status') && $request->status !== 'all') {
                    $query->where('status', strtolower($request->status));
                }

                if ($request->filled('invoice_type') && $request->invoice_type !== 'all') {
                    $query->where('invoice_type', $request->invoice_type);
                }

                if ($request->filled('search')) {
                    $s = $request->search;
                    $query->where(function($q) use ($s) {
                        $q->where('invoice_no', 'like', "%{$s}%")
                          ->orWhere('client_name', 'like', "%{$s}%")
                          ->orWhere('client_email', 'like', "%{$s}%")
                          ->orWhereHas('client', function($cq) use ($s) {
                              $cq->where('full_name', 'like', "%{$s}%")
                                 ->orWhere('client_code', 'like', "%{$s}%")
                                 ->orWhere('email', 'like', "%{$s}%");
                          });
                    });
                }

                $period = strtolower($request->input('period') ?: $request->input('range') ?: $request->input('month') ?: 'all');

                if ($period !== 'all') {
                    if ($period === 'today' || $period === '1d') {
                        $query->where(function($q) {
                            $q->whereDate('invoice_date', Carbon::today())
                              ->orWhere(function($sub) { $sub->whereNull('invoice_date')->whereDate('created_at', Carbon::today()); });
                        });
                    } elseif ($period === 'yesterday') {
                        $query->where(function($q) {
                            $q->whereDate('invoice_date', Carbon::yesterday())
                              ->orWhere(function($sub) { $sub->whereNull('invoice_date')->whereDate('created_at', Carbon::yesterday()); });
                        });
                    } elseif ($period === 'week' || $period === 'this week' || $period === '7d') {
                        $query->where(function($q) {
                            $q->where('invoice_date', '>=', Carbon::now()->startOfWeek())
                              ->orWhere(function($sub) { $sub->whereNull('invoice_date')->where('created_at', '>=', Carbon::now()->startOfWeek()); });
                        });
                    } elseif ($period === 'month' || $period === 'this month' || $period === '30d') {
                        $query->where(function($q) {
                            $q->where('invoice_date', '>=', Carbon::now()->startOfMonth())
                              ->orWhere(function($sub) { $sub->whereNull('invoice_date')->where('created_at', '>=', Carbon::now()->startOfMonth()); });
                        });
                    } elseif ($period === 'quarter' || $period === 'this quarter' || $period === '3m') {
                        $query->where(function($q) {
                            $q->where('invoice_date', '>=', Carbon::now()->startOfQuarter())
                              ->orWhere(function($sub) { $sub->whereNull('invoice_date')->where('created_at', '>=', Carbon::now()->startOfQuarter()); });
                        });
                    } elseif ($period === 'year' || $period === 'this year' || $period === '1y') {
                        $query->where(function($q) {
                            $q->where('invoice_date', '>=', Carbon::now()->startOfYear())
                              ->orWhere(function($sub) { $sub->whereNull('invoice_date')->where('created_at', '>=', Carbon::now()->startOfYear()); });
                        });
                    } elseif (preg_match('/([a-z]+)\s*(\d{4})/', $period, $m)) {
                        try {
                            $mStart = Carbon::parse("1 {$m[1]} {$m[2]}")->startOfMonth();
                            $mEnd = Carbon::parse("1 {$m[1]} {$m[2]}")->endOfMonth();
                            $query->where(function($q) use ($mStart, $mEnd) {
                                $q->whereBetween('invoice_date', [$mStart, $mEnd])
                                  ->orWhere(function($sub) use ($mStart, $mEnd) { $sub->whereNull('invoice_date')->whereBetween('created_at', [$mStart, $mEnd]); });
                            });
                        } catch (\Exception $e) {}
                    }
                }

                $rawInvoices = (clone $query)->with(['client'])->orderBy('id', 'desc')->get();

                $missingClientNames = $rawInvoices->whereNull('client')->pluck('client_name')->filter()->unique();
                $clientsByName = $missingClientNames->isNotEmpty() 
                    ? Client::whereIn('full_name', $missingClientNames)->get()->keyBy('full_name')
                    : collect();

                $invoices = $rawInvoices->map(function($inv) use ($clientsByName) {
                    $dateObj = $inv->invoice_date ? Carbon::parse($inv->invoice_date) : ($inv->created_at ? Carbon::parse($inv->created_at) : Carbon::now());
                    $client = $inv->client ?: ($inv->client_name ? $clientsByName->get($inv->client_name) : null);

                    $clientName = $client ? $client->full_name : $inv->client_name;
                    $clientEmail = $client ? ($client->email ?: $inv->client_email) : $inv->client_email;
                    $clientTier = $client ? ($client->membership_tier ?: $inv->client_tier) : $inv->client_tier;
                    $clientCode = $client ? $client->client_code : ('RJ-CL-' . str_pad($inv->client_id ?: $inv->id, 4, '0', STR_PAD_LEFT));
                    $clientPhone = $client ? $client->primary_phone : null;
                    $clientAddress = $client ? trim(($client->street_address ?: '') . ', ' . ($client->city ?: '') . ($client->zip_code ? ' - ' . $client->zip_code : ''), ', -') : null;
                    $clientGst = $client ? $client->gst_number : null;
                    $clientCompany = $client ? $client->company_name : null;
                    $avatarUrl = $client ? $client->avatar_url : null;

                    if ($avatarUrl) {
                        if (str_starts_with($avatarUrl, 'http://localhost/storage/')) {
                            $avatarUrl = str_replace('http://localhost/storage/', '/storage/', $avatarUrl);
                        }
                    }

                    if (!$avatarUrl && $clientName) {
                        $avatarUrl = 'https://ui-avatars.com/api/?name=' . urlencode($clientName) . '&background=801824&color=ffffff&bold=true&size=128';
                    }

                    return [
                        'id' => $inv->invoice_no,
                        'invoice_no' => $inv->invoice_no,
                        'numeric_id' => $inv->id,
                        'client_id' => $inv->client_id,
                        'client' => $clientName,
                        'client_name' => $clientName,
                        'client_code' => $clientCode,
                        'client_phone' => $clientPhone,
                        'client_address' => $clientAddress ?: null,
                        'client_gst' => $clientGst ?: null,
                        'client_company' => $clientCompany,
                        'avatar_url' => $avatarUrl,
                        'email' => $clientEmail ?: null,
                        'tier' => strtoupper($clientTier ?: 'SILVER'),
                        'tierKey' => strtolower($clientTier ?: 'silver'),
                        'initials' => $inv->client_initials ?: collect(explode(' ', $clientName))->map(fn($part) => strtoupper(substr($part, 0, 1)))->take(2)->implode(''),
                        'date' => $dateObj->format('d M, Y'),
                        'day' => $dateObj->format('d'),
                        'month_year' => $dateObj->format('M, Y'),
                        'amount' => (float)$inv->amount,
                        'gst' => (float)$inv->gst_amount,
                        'gst_rate' => (float)$inv->gst_rate,
                        'total' => (float)$inv->total_amount,
                        'status' => strtolower($inv->status),
                        'invoice_type' => $inv->invoice_type,
                        'notes' => $inv->notes,
                        'items' => $inv->items ?? [],
                    ];
                });

                // Compute real dynamic stats and growth rates on the filtered query
                $totalInvoicesCount = $rawInvoices->count();
                $todayInvoicesCount = $rawInvoices->count();
                $todayBillingSum = (float) $rawInvoices->sum('total_amount');
                $totalBillingSum = (float) $rawInvoices->sum('total_amount');
                $pendingBillsSum = (float) $rawInvoices->where('status', '!=', 'paid')->sum('total_amount');
                $totalRevenueSum = (float) $rawInvoices->where('status', 'paid')->sum('total_amount') + ((float)$rawInvoices->where('status', 'partial')->sum('total_amount') * 0.5);

                $yesterdayStats = Invoice::whereDate('invoice_date', Carbon::yesterday())
                    ->selectRaw('COUNT(*) as cnt, SUM(total_amount) as total')
                    ->first();
                $yesterdayInvoicesCount = (int) ($yesterdayStats->cnt ?? 0);
                $yesterdayBillingSum = (float) ($yesterdayStats->total ?? 0);

                $todayInvoicesGrowthPct = $yesterdayInvoicesCount > 0 ? round((($todayInvoicesCount - $yesterdayInvoicesCount) / $yesterdayInvoicesCount) * 100, 1) : ($todayInvoicesCount > 0 ? 100.0 : 0.0);
                $todayInvoicesGrowth = ($todayInvoicesGrowthPct >= 0 ? '+' : '') . number_format($todayInvoicesGrowthPct, 1) . '%';

                $todayBillingsGrowthPct = $yesterdayBillingSum > 0 ? round((($todayBillingSum - $yesterdayBillingSum) / $yesterdayBillingSum) * 100, 1) : ($todayBillingSum > 0 ? 100.0 : 0.0);
                $todayBillingsGrowth = ($todayBillingsGrowthPct >= 0 ? '+' : '') . number_format($todayBillingsGrowthPct, 1) . '%';

                $prevMonthPendingSum = Invoice::whereBetween('invoice_date', [Carbon::now()->subMonth()->startOfMonth(), Carbon::now()->subMonth()->endOfMonth()])->where('status', '!=', 'paid')->sum('total_amount');
                $pendingBillsChangePct = $prevMonthPendingSum > 0 ? round((($pendingBillsSum - $prevMonthPendingSum) / $prevMonthPendingSum) * 100, 1) : 0.0;
                $pendingBillsChange = ($pendingBillsChangePct >= 0 ? '+' : '') . number_format($pendingBillsChangePct, 1) . '%';

                $prevYearRevenueSum = Invoice::whereBetween('invoice_date', [Carbon::now()->subYear()->startOfYear(), Carbon::now()->subYear()->endOfYear()])->whereIn('status', ['paid', 'partial'])->sum('total_amount');
                $totalRevenueGrowthPct = $prevYearRevenueSum > 0 ? round((($totalRevenueSum - $prevYearRevenueSum) / $prevYearRevenueSum) * 100, 1) : ($totalRevenueSum > 0 ? 100.0 : 0.0);
                $totalRevenueGrowth = ($totalRevenueGrowthPct >= 0 ? '+' : '') . number_format($totalRevenueGrowthPct, 1) . '%';

                $fmtCurrency = function($amount) {
                    if ($amount >= 10000000) {
                        return '₹ ' . number_format($amount / 10000000, 2) . ' Cr';
                    } elseif ($amount >= 100000) {
                        return '₹ ' . number_format($amount / 100000, 2) . ' L';
                    } elseif ($amount > 0) {
                        return '₹ ' . number_format($amount, 0);
                    }
                    return '₹ 0.00';
                };

                return response()->json([
                    'stats' => [
                        'todayInvoices' => number_format($todayInvoicesCount),
                        'todayInvoicesGrowth' => $todayInvoicesGrowth,
                        'todayBillings' => $fmtCurrency($todayBillingSum),
                        'todayBillingsGrowth' => $todayBillingsGrowth,
                        'pendingBills' => $fmtCurrency($pendingBillsSum),
                        'pendingBillsChange' => $pendingBillsChange,
                        'totalRevenue' => $fmtCurrency($totalRevenueSum),
                        'totalRevenueGrowth' => $totalRevenueGrowth,
                    ],
                    'invoices' => $invoices,
                ]);
            }
        } catch (\Exception $e) {
            // fallback
        }

        return response()->json([
            'stats' => [
                'todayInvoices' => '0',
                'todayBillings' => '₹ 0.00',
                'pendingBills' => '₹ 0.00',
                'totalRevenue' => '₹ 0.00'
            ],
            'invoices' => []
        ]);
    }

    public function storeInvoice(Request $request)
    {
        $validated = $request->validate([
            'client_id' => 'nullable|integer',
            'client_name' => 'required|string|max:255',
            'client_email' => 'nullable|email|max:255',
            'client_tier' => 'nullable|string|max:50',
            'amount' => 'required|numeric|min:0',
            'gst_rate' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:paid,pending,partial',
            'invoice_type' => 'nullable|string|max:50',
            'notes' => 'nullable|string',
            'items' => 'nullable|array',
        ]);

        $latest = Invoice::orderBy('id', 'desc')->first();
        $nextNum = $latest ? ($latest->id + 1254) : 1254;
        $invoiceNo = 'INV - 2026-' . $nextNum;

        while (Invoice::where('invoice_no', $invoiceNo)->exists()) {
            $nextNum++;
            $invoiceNo = 'INV - 2026-' . $nextNum;
        }

        $amount = (float)$validated['amount'];
        $gstRate = isset($validated['gst_rate']) ? (float)$validated['gst_rate'] : 5.00;
        $gstAmount = ($amount * $gstRate) / 100;
        $totalAmount = $amount + $gstAmount;

        $clientName = trim($validated['client_name']);
        $initials = collect(explode(' ', $clientName))->map(fn($part) => strtoupper(substr($part, 0, 1)))->take(2)->implode('');

        $invoice = Invoice::create([
            'invoice_no' => $invoiceNo,
            'client_id' => $validated['client_id'] ?? null,
            'client_name' => $clientName,
            'client_email' => $validated['client_email'] ?? null,
            'client_tier' => strtoupper($validated['client_tier'] ?? 'ELITE'),
            'client_initials' => $initials,
            'invoice_date' => Carbon::now(),
            'amount' => $amount,
            'gst_rate' => $gstRate,
            'gst_amount' => $gstAmount,
            'total_amount' => $totalAmount,
            'status' => $validated['status'] ?? 'paid',
            'invoice_type' => $validated['invoice_type'] ?? 'b2b_tax',
            'notes' => $validated['notes'] ?? null,
            'items' => $validated['items'] ?? null,
        ]);

        // Link and process piece tags if present in items
        if (!empty($validated['items']) && is_array($validated['items'])) {
            foreach ($validated['items'] as $item) {
                $pieceId = $item['piece_id'] ?? null;
                $tagNumber = $item['tag_number'] ?? null;

                $piece = null;
                if ($pieceId) {
                    $piece = WorkOrderReceivedPiece::find($pieceId);
                } elseif ($tagNumber) {
                    $piece = WorkOrderReceivedPiece::where('tag_number', $tagNumber)->first();
                }

                if ($piece && $piece->status !== 'sold') {
                    $piece->status = 'sold';
                    $piece->invoice_id = $invoice->id;
                    $piece->client_id = $invoice->client_id;
                    $piece->save();

                    if ($piece->product_id) {
                        Product::whereKey($piece->product_id)->decrement('current_stock_qty', 1);
                        InventoryMovement::create([
                            'product_id' => $piece->product_id,
                            'invoice_id' => $invoice->id,
                            'movement_type' => 'sale',
                            'quantity' => -1,
                            'weight' => -((float) ($piece->gross_weight ?: 0)),
                            'notes' => "Sold via Client Invoice {$invoice->invoice_no} (Tag: {$piece->tag_number})",
                        ]);
                    }

                    if ($piece->work_order_id) {
                        $wo = WorkOrder::find($piece->work_order_id);
                        if ($wo && $wo->receivedPieces()->count() > 0 && $wo->receivedPieces()->where('status', 'sold')->count() >= $wo->receivedPieces()->count()) {
                            $wo->status = 'delivered';
                            $wo->current_stage = 'delivered';
                            $wo->invoice_id = $invoice->id;
                            $wo->save();
                        }
                    }
                }

                SaleItem::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $piece?->product_id ?? ($item['product_id'] ?? null),
                    'product_name' => $item['desc'] ?? $piece?->product_name ?? 'Jewellery Item',
                    'product_code' => $item['code'] ?? $piece?->design_no ?? 'RJ-ITM',
                    'quantity' => 1,
                    'gross_weight' => (float) ($item['gross_wt'] ?? $piece?->gross_weight ?? 0),
                    'net_weight' => (float) ($item['net_wt'] ?? $piece?->net_gold_weight ?? 0),
                    'rate' => (float) ($item['rate'] ?? 0),
                    'making_charge' => (float) ($item['making'] ?? 0),
                    'line_total' => (float) ($item['taxable'] ?? 0),
                    'details' => [
                        'tag_number' => $piece?->tag_number ?? $tagNumber,
                        'work_order_number' => $piece?->workOrder?->work_order_number ?? ($item['work_order_number'] ?? null),
                        'karigar_name' => $piece?->karigar?->name ?? ($item['karigar_name'] ?? null),
                    ],
                ]);
            }
        }

        // When invoice is created for an existing client, update client total_purchases and last_visit
        if (!empty($validated['client_id'])) {
            $client = Client::find($validated['client_id']);
            if ($client) {
                $client->total_purchases = (float)($client->total_purchases ?: 0) + $totalAmount;
                $client->last_visit = Carbon::now();
                $client->save();
            }
        }

        return response()->json([
            'message' => 'Invoice created successfully.',
            'data' => $invoice,
        ], 201);
    }

    public function updateInvoice(Request $request, $id)
    {
        $invoice = Invoice::find($id);
        if (!$invoice) {
            $invoice = Invoice::where('invoice_no', $id)->first();
        }

        if (!$invoice) {
            return response()->json(['message' => 'Invoice not found.'], 404);
        }

        $validated = $request->validate([
            'amount' => 'nullable|numeric|min:0',
            'gst_rate' => 'nullable|numeric|min:0',
            'status' => 'nullable|in:paid,pending,partial',
            'notes' => 'nullable|string',
            'items' => 'nullable|array',
        ]);

        if (isset($validated['amount'])) {
            $amount = (float)$validated['amount'];
            $gstRate = isset($validated['gst_rate']) ? (float)$validated['gst_rate'] : (float)$invoice->gst_rate;
            $gstAmount = ($amount * $gstRate) / 100;
            $invoice->amount = $amount;
            $invoice->gst_rate = $gstRate;
            $invoice->gst_amount = $gstAmount;
            $invoice->total_amount = $amount + $gstAmount;
        }

        if (isset($validated['status'])) {
            $invoice->status = $validated['status'];
        }

        if (isset($validated['notes'])) {
            $invoice->notes = $validated['notes'];
        }

        if (isset($validated['items'])) {
            $invoice->items = $validated['items'];
        }

        $invoice->save();

        // Sync client's last activity date across the system
        if ($invoice->client_id) {
            $client = Client::find($invoice->client_id);
            if ($client) {
                $client->last_visit = Carbon::now();
                $client->save();
            }
        }

        return response()->json([
            'message' => 'Invoice updated successfully.',
            'data' => $invoice,
        ]);
    }

    public function destroyInvoice($id)
    {
        $invoice = Invoice::find($id);
        if (!$invoice) {
            $invoice = Invoice::where('invoice_no', $id)->first();
        }

        if ($invoice) {
            app(\App\Services\SaleService::class)->cancel($invoice, 'Invoice deleted from Billing', \Illuminate\Support\Facades\Auth::id());
            $invoice->delete();
            return response()->json(['message' => 'Invoice deleted successfully and inventory restored.']);
        }

        return response()->json(['message' => 'Invoice not found.'], 404);
    }

    public function removedClients(Request $request)
    {
        try {
            if (Schema::hasTable('clients')) {
                // Determine Period Label and Month Bounds
                $mStart = null;
                $mEnd = null;
                $periodLabel = 'This Month';

                if ($request->filled('month')) {
                    $mStr = trim($request->month);
                    $mStrLower = strtolower($mStr);
                    if ($mStrLower === 'month' || $mStrLower === 'this month') {
                        $mStart = Carbon::now()->startOfMonth();
                        $mEnd = Carbon::now()->endOfMonth();
                        $periodLabel = 'This Month';
                    } elseif ($mStrLower !== 'all' && $mStrLower !== 'all time') {
                        if (preg_match('/([a-zA-Z]+)\s*(\d{4})/', $mStr, $m)) {
                            try {
                                $mStart = Carbon::parse("1 {$m[1]} {$m[2]}")->startOfMonth();
                                $mEnd = Carbon::parse("1 {$m[1]} {$m[2]}")->endOfMonth();
                                $periodLabel = $mStart->format('F Y');
                            } catch (\Exception $e) {}
                        }
                    } else {
                        $periodLabel = 'All Time';
                    }
                } else {
                    $mStart = Carbon::now()->startOfMonth();
                    $mEnd = Carbon::now()->endOfMonth();
                    $periodLabel = 'This Month';
                }

                // Base Query for Removed Clients
                $query = Client::where('is_removed', true);

                if ($request->filled('search')) {
                    $s = $request->search;
                    $query->where(function($q) use ($s) {
                        $q->where('full_name', 'like', "%{$s}%")
                          ->orWhere('email', 'like', "%{$s}%")
                          ->orWhere('primary_phone', 'like', "%{$s}%")
                          ->orWhere('client_code', 'like', "%{$s}%");
                    });
                }

                if ($request->filled('reason') && strtolower($request->reason) !== 'all') {
                    $query->where('remove_reason', $request->reason);
                }

                if ($request->filled('can_be_restored') && strtolower($request->can_be_restored) !== 'all') {
                    $canVal = in_array(strtolower($request->can_be_restored), ['yes', '1', 'true']);
                    $query->where('can_be_restored', $canVal);
                }

                if ($request->filled('remove_date')) {
                    $query->whereDate('removed_at', $request->remove_date);
                }

                if ($mStart && $mEnd) {
                    $query->whereBetween('removed_at', [$mStart, $mEnd]);
                }

                $clients = (clone $query)->orderBy('removed_at', 'desc')->get()->map(function($c) {
                    $removedAt = $c->removed_at ? Carbon::parse($c->removed_at) : Carbon::now();
                    $initials = collect(explode(' ', $c->full_name))->map(fn($part) => strtoupper(substr($part, 0, 1)))->take(2)->implode('');
                    
                    $purchases = (float)$c->total_purchases;
                    if ($purchases >= 10000000) {
                        $formattedPurchases = '₹' . number_format($purchases / 10000000, 2) . ' Cr';
                    } elseif ($purchases >= 100000) {
                        $formattedPurchases = '₹' . number_format($purchases / 100000, 2) . ' Lakh';
                    } else {
                        $formattedPurchases = '₹' . number_format($purchases, 2);
                    }

                    return [
                        'id' => $c->id,
                        'client_code' => $c->client_code,
                        'full_name' => $c->full_name,
                        'initials' => $initials,
                        'email' => $c->email,
                        'primary_phone' => $c->primary_phone,
                        'membership_tier' => strtoupper($c->membership_tier ?? 'SILVER'),
                        'total_purchases' => $purchases,
                        'formatted_purchases' => $formattedPurchases,
                        'remove_date_formatted' => $removedAt->format('d M, Y'),
                        'remove_time_formatted' => $removedAt->format('h:i A'),
                        'remove_reason' => $c->remove_reason ?: 'Client Request',
                        'can_be_restored' => (bool)$c->can_be_restored,
                        'removed_by' => $c->removed_by ?: 'Arvind (Admin)',
                        'avatar' => $c->avatar,
                    ];
                });

                // Compute Stats dynamically matching filters
                $activeQuery = Client::where(function($q) {
                    $q->whereNull('is_removed')->orWhere('is_removed', false);
                });
                if ($request->filled('search')) {
                    $s = $request->search;
                    $activeQuery->where(function($q) use ($s) {
                        $q->where('full_name', 'like', "%{$s}%")
                          ->orWhere('email', 'like', "%{$s}%")
                          ->orWhere('primary_phone', 'like', "%{$s}%")
                          ->orWhere('client_code', 'like', "%{$s}%");
                    });
                }
                $activeCount = $activeQuery->count();

                // Removed Count matching active filters
                $removedCount = (clone $query)->count();

                // Period Specific Removed Count
                $periodRemovedQuery = Client::where('is_removed', true);
                if ($request->filled('search')) {
                    $s = $request->search;
                    $periodRemovedQuery->where(function($q) use ($s) {
                        $q->where('full_name', 'like', "%{$s}%")
                          ->orWhere('email', 'like', "%{$s}%")
                          ->orWhere('primary_phone', 'like', "%{$s}%")
                          ->orWhere('client_code', 'like', "%{$s}%");
                    });
                }
                if ($request->filled('reason') && strtolower($request->reason) !== 'all') {
                    $periodRemovedQuery->where('remove_reason', $request->reason);
                }
                if ($request->filled('can_be_restored') && strtolower($request->can_be_restored) !== 'all') {
                    $canVal = in_array(strtolower($request->can_be_restored), ['yes', '1', 'true']);
                    $periodRemovedQuery->where('can_be_restored', $canVal);
                }
                if ($request->filled('remove_date')) {
                    $periodRemovedQuery->whereDate('removed_at', $request->remove_date);
                }
                if ($mStart && $mEnd) {
                    $periodRemovedQuery->whereBetween('removed_at', [$mStart, $mEnd]);
                } else {
                    $periodRemovedQuery->whereMonth('removed_at', Carbon::now()->month)
                                       ->whereYear('removed_at', Carbon::now()->year);
                }
                $periodRemovedCount = $periodRemovedQuery->count();

                // Can Be Restored Count matching active filters
                $canBeRestoredQuery = (clone $query)->where('can_be_restored', true);
                $canBeRestoredCount = $canBeRestoredQuery->count();

                // Growth Percentages & Dynamic Comparison Labels
                if ($mStart) {
                    $prevMonthStart = $mStart->copy()->subMonth()->startOfMonth();
                    $prevMonthEnd = $mStart->copy()->subMonth()->endOfMonth();
                    if ($periodLabel === 'This Month') {
                        $comparisonLabel = 'vs last month';
                    } else {
                        $comparisonLabel = 'vs ' . $mStart->copy()->subMonth()->format('M Y');
                    }
                } else {
                    $prevMonthStart = Carbon::now()->subMonth()->startOfMonth();
                    $prevMonthEnd = Carbon::now()->subMonth()->endOfMonth();
                    $comparisonLabel = $periodLabel === 'All Time' ? 'vs prev period' : 'vs last month';
                }

                $prevActiveRef = $mStart ? $mStart : Carbon::now()->startOfMonth();
                $prevActive = Client::where(function($q) {
                    $q->whereNull('is_removed')->orWhere('is_removed', false);
                })->where('created_at', '<', $prevActiveRef)->count();
                $activeGrowthPct = $prevActive > 0 ? round((($activeCount - $prevActive) / $prevActive) * 100, 1) : ($activeCount > 0 ? 100.0 : 0.0);
                $activeGrowth = ($activeGrowthPct >= 0 ? '+' : '') . number_format($activeGrowthPct, 1) . "% {$comparisonLabel}";

                $prevPeriodRemoved = Client::where('is_removed', true)->whereBetween('removed_at', [$prevMonthStart, $prevMonthEnd])->count();
                $periodGrowthPct = $prevPeriodRemoved > 0 ? round((($periodRemovedCount - $prevPeriodRemoved) / $prevPeriodRemoved) * 100, 1) : 0.0;
                $periodGrowth = ($periodGrowthPct >= 0 ? '+' : '') . number_format($periodGrowthPct, 1) . "% {$comparisonLabel}";

                $removedGrowthPct = $prevPeriodRemoved > 0 ? round((($removedCount - $prevPeriodRemoved) / $prevPeriodRemoved) * 100, 1) : 0.0;
                $removedGrowth = ($removedGrowthPct >= 0 ? '+' : '') . number_format($removedGrowthPct, 1) . "% {$comparisonLabel}";

                return response()->json([
                    'stats' => [
                        'activeClients' => number_format($activeCount),
                        'activeGrowth' => $activeGrowth,
                        'removedClients' => number_format($removedCount),
                        'removedGrowth' => $removedGrowth,
                        'thisMonthRemoved' => number_format($periodRemovedCount),
                        'thisMonthGrowth' => $periodGrowth,
                        'canBeRestored' => number_format($canBeRestoredCount),
                        'periodLabel' => $periodLabel,
                        'comparisonLabel' => $comparisonLabel,
                    ],
                    'clients' => $clients,
                ]);
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Client overview stats error: ' . $e->getMessage());
            return response()->json(['message' => 'Unable to load client overview statistics (500). Please try again later.'], 500);
        }

        return response()->json(['stats' => [], 'clients' => []]);
    }

    public function removeClient(Request $request, $id)
    {
        $client = Client::find($id);
        if (!$client) {
            return response()->json(['message' => 'Client not found.'], 404);
        }

        $validated = $request->validate([
            'reason' => 'nullable|string|max:150',
            'can_be_restored' => 'nullable|boolean',
        ]);

        $client->is_removed = true;
        $client->removed_at = Carbon::now();
        $client->remove_reason = $validated['reason'] ?? 'Client Request';
        $client->can_be_restored = isset($validated['can_be_restored']) ? (bool)$validated['can_be_restored'] : true;
        $client->removed_by = 'Arvind (Admin)';
        $client->status = 'inactive';
        $client->save();

        return response()->json([
            'message' => 'Client moved to Removed Clients successfully.',
            'client' => $client,
        ]);
    }

    public function restoreClient(Request $request, $id)
    {
        $client = Client::find($id);
        if (!$client) {
            return response()->json(['message' => 'Client not found.'], 404);
        }

        if (!$client->can_be_restored) {
            return response()->json(['message' => 'This client cannot be restored per policy.'], 400);
        }

        $client->is_removed = false;
        $client->removed_at = null;
        $client->remove_reason = null;
        $client->status = 'active';
        $client->save();

        return response()->json([
            'message' => 'Client restored successfully.',
            'client' => $client,
        ]);
    }

    /**
     * Record gold/metal deposit by client (with or without rate)
     * If rate is provided: Cash value calculated & credited to client account
     * If rate is NOT provided (0/empty): Retained purely as Gold (grams) in client's metal balance!
     */
    public function recordMetalDeposit(Request $request, $id)
    {
        $client = Client::findOrFail($id);

        $validated = $request->validate([
            'metal_type' => 'nullable|string|in:gold,silver',
            'gross_weight' => 'required|numeric|min:0.001',
            'touch' => 'nullable|numeric|min:0|max:100',
            'purity' => 'nullable|string',
            'rate' => 'nullable|numeric|min:0',
            'remarks' => 'nullable|string',
            'transaction_date' => 'nullable|date',
        ]);

        $metalType = strtolower($validated['metal_type'] ?? 'gold');
        $grossWt = floatval($validated['gross_weight']);
        $touch = floatval($validated['touch'] ?? ($metalType === 'gold' ? 91.6 : 92.5));
        $fineWeight = round($grossWt * ($touch / 100), 3);
        $rate = floatval($validated['rate'] ?? 0);
        $txDate = $validated['transaction_date'] ?? Carbon::now()->toDateString();
        $remarks = $validated['remarks'] ?? 'Metal Deposit / Advance';

        if ($rate > 0) {
            // Rate provided: Convert to cash credit
            $cashAmount = round($fineWeight * $rate, 2);
            $client->total_purchases = floatval($client->total_purchases) - $cashAmount;
            $client->save();

            return response()->json([
                'status' => 'success',
                'message' => "Successfully credited ₹" . number_format($cashAmount, 2) . " to client account ({$fineWeight}g fine @ ₹{$rate}/g).",
                'type' => 'cash_credit',
                'cash_amount' => $cashAmount,
                'client' => $client,
            ]);
        } else {
            // No rate provided: Retained purely as Gold / Silver grams in client's metal balance!
            if ($metalType === 'silver') {
                $client->silver_balance_grams = round(floatval($client->silver_balance_grams) + $fineWeight, 3);
            } else {
                $client->gold_balance_grams = round(floatval($client->gold_balance_grams) + $fineWeight, 3);
            }
            $client->save();

            return response()->json([
                'status' => 'success',
                'message' => "Successfully credited {$fineWeight}g pure {$metalType} to client metal balance (held as pure metal, not converted to cash).",
                'type' => 'metal_credit',
                'fine_weight' => $fineWeight,
                'metal_type' => $metalType,
                'client' => $client,
            ]);
        }
    }
}
