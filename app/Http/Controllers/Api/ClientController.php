<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Invoice;
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
                        $query->where(function($q) use ($fromDate, $period) {
                            if ($period === 'today' || $period === '1d') {
                                $q->whereDate('created_at', Carbon::today())
                                  ->orWhereDate('last_visit', Carbon::today())
                                  ->orWhereHas('invoices', function($iq) {
                                      $iq->whereDate('created_at', Carbon::today());
                                  });
                            } else {
                                $q->where('created_at', '>=', $fromDate)
                                  ->orWhere('last_visit', '>=', $fromDate)
                                  ->orWhereHas('invoices', function($iq) use ($fromDate) {
                                      $iq->where('created_at', '>=', $fromDate);
                                  });
                            }
                        });
                    }
                }

                $clients = (clone $query)->orderBy('id', 'desc')->get();

                // Compute stats dynamically
                $totalCount = (clone $baseQuery)->count();
                $todayCount = (clone $baseQuery)->where(function($q) {
                    $q->whereDate('created_at', Carbon::today())
                      ->orWhereDate('last_visit', Carbon::today());
                })->count();
                $activeMembersCount = (clone $baseQuery)->where('status', 'active')->count();

                $period = strtolower($request->input('period', 'month'));
                $newRegFrom = match ($period) {
                    'today', '1d' => Carbon::today(),
                    'week', 'this week', '7d' => Carbon::now()->startOfWeek(),
                    'year', 'this year' => Carbon::now()->startOfYear(),
                    default => Carbon::now()->startOfMonth(),
                };

                $newRegCount = (clone $baseQuery)->where('created_at', '>=', $newRegFrom)->count();

                return response()->json([
                    'stats' => [
                        'todayClients' => $todayCount,
                        'totalClients' => $totalCount,
                        'activeMembers' => $activeMembersCount,
                        'newReg' => $newRegCount,
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

                $rawInvoices = (clone $query)->orderBy('id', 'desc')->get();

                $invoices = $rawInvoices->map(function($inv) {
                    $dateObj = $inv->invoice_date ? Carbon::parse($inv->invoice_date) : ($inv->created_at ? Carbon::parse($inv->created_at) : Carbon::now());
                    $client = $inv->client;
                    if (!$client && $inv->client_id) {
                        $client = Client::find($inv->client_id);
                    }
                    if (!$client && $inv->client_name) {
                        $client = Client::where('full_name', $inv->client_name)->orWhere('client_code', $inv->client_name)->first();
                    }

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
                        if (str_starts_with($avatarUrl, '/storage/')) {
                            $relPath = str_replace('/storage/', '', $avatarUrl);
                            if (!file_exists(public_path('storage/' . $relPath))) {
                                $avatarUrl = null;
                            }
                        }
                    }

                    if (!$avatarUrl && $clientName) {
                        $matchedClient = Client::where('full_name', $clientName)->whereNotNull('avatar')->where('avatar', '!=', '')->first();
                        if ($matchedClient && $matchedClient->avatar_url) {
                            $avatarUrl = $matchedClient->avatar_url;
                        } else {
                            $avatarUrl = 'https://ui-avatars.com/api/?name=' . urlencode($clientName) . '&background=801824&color=ffffff&bold=true&size=128';
                        }
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
                        'client_address' => $clientAddress ?: 'Chennai, Tamil Nadu',
                        'client_gst' => $clientGst ?: '33AAAAA0000A1Z5',
                        'client_company' => $clientCompany,
                        'avatar_url' => $avatarUrl,
                        'email' => $clientEmail ?: (strtolower(str_replace(' ', '.', $clientName)) . '@regal.com'),
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

                $yesterdayInvoicesCount = Invoice::whereDate('invoice_date', Carbon::yesterday())->count();
                $todayInvoicesGrowthPct = $yesterdayInvoicesCount > 0 ? round((($todayInvoicesCount - $yesterdayInvoicesCount) / $yesterdayInvoicesCount) * 100, 1) : ($todayInvoicesCount > 0 ? 100.0 : 0.0);
                $todayInvoicesGrowth = ($todayInvoicesGrowthPct >= 0 ? '+' : '') . number_format($todayInvoicesGrowthPct, 1) . '%';

                $yesterdayBillingSum = Invoice::whereDate('invoice_date', Carbon::yesterday())->sum('total_amount');
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
            'client_email' => $validated['client_email'] ?? (strtolower(str_replace(' ', '.', $clientName)) . '@regal.com'),
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
            if ($invoice->client_id) {
                $client = Client::find($invoice->client_id);
                if ($client) {
                    $client->total_purchases = max(0, (float)($client->total_purchases ?: 0) - (float)$invoice->total_amount);
                    $client->save();
                }
            }
            $invoice->delete();
            return response()->json(['message' => 'Invoice deleted successfully.']);
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
            return response()->json(['error' => $e->getMessage()], 500);
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
}
