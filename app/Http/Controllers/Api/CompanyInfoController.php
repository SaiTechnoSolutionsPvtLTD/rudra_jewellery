<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompanyInfo;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class CompanyInfoController extends Controller
{
    /**
     * Display a listing of company info profiles.
     */
    public function index()
    {
        $companies = Cache::remember('masters_company_info_all', 300, function () {
            return CompanyInfo::orderBy('is_default', 'desc')
                ->orderBy('created_at', 'desc')
                ->get();
        });

        return response()->json($companies);
    }

    /**
     * Get default/active company info for print header in bills & reports.
     */
    public function getDefault()
    {
        $company = Cache::remember('masters_company_info_default', 300, function () {
            return CompanyInfo::where('is_default', true)->first()
                ?? CompanyInfo::where('is_active', true)->first()
                ?? CompanyInfo::first();
        });

        return response()->json($company);
    }

    /**
     * Store a newly created company info profile.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'tagline' => 'nullable|string|max:255',
            'address_line1' => 'nullable|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'pincode' => ['nullable', 'string', 'regex:/^[1-9][0-9]{5}$/'],
            'state_code' => 'nullable|string|max:255',
            'phone' => ['nullable', 'string', 'regex:/^[6-9]\d{9}$/'],
            'alternate_phone' => ['nullable', 'string', 'regex:/^[6-9]\d{9}$/'],
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|string|max:255',
            'gstin' => ['nullable', 'string', 'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i'],
            'pan_no' => ['nullable', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
            'reg_no' => 'nullable|string|max:255',
            'hallmark_license' => 'nullable|string|max:255',
            'terms_and_conditions' => 'nullable|string',
            'bank_name' => 'nullable|string|max:255',
            'account_number' => ['nullable', 'string', 'regex:/^\d{9,18}$/'],
            'ifsc_code' => ['nullable', 'string', 'regex:/^[A-Z]{4}0[A-Z0-9]{6}$/i'],
            'branch' => 'nullable|string|max:255',
            'logo_url' => 'nullable|string',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if (!empty($validated['is_default'])) {
            CompanyInfo::query()->update(['is_default' => false]);
        }

        if (CompanyInfo::count() === 0) {
            $validated['is_default'] = true;
        }

        if (!empty($validated['email'])) {
            $validated['email'] = strtolower(trim($validated['email']));
        }

        $company = CompanyInfo::create($validated);
        Cache::forget('masters_company_info_all');
        Cache::forget('masters_company_info_default');

        return response()->json($company, 201);
    }

    /**
     * Display the specified company info profile.
     */
    public function show($id)
    {
        $company = CompanyInfo::findOrFail($id);
        return response()->json($company);
    }

    /**
     * Update the specified company info profile.
     */
    public function update(Request $request, $id)
    {
        $company = CompanyInfo::findOrFail($id);

        $validated = $request->validate([
            'company_name' => 'sometimes|required|string|max:255',
            'tagline' => 'nullable|string|max:255',
            'address_line1' => 'nullable|string|max:255',
            'address_line2' => 'nullable|string|max:255',
            'city' => 'nullable|string|max:255',
            'state' => 'nullable|string|max:255',
            'pincode' => ['nullable', 'string', 'regex:/^[1-9][0-9]{5}$/'],
            'state_code' => 'nullable|string|max:255',
            'phone' => ['nullable', 'string', 'regex:/^[6-9]\d{9}$/'],
            'alternate_phone' => ['nullable', 'string', 'regex:/^[6-9]\d{9}$/'],
            'email' => 'nullable|email|max:255',
            'website' => 'nullable|string|max:255',
            'gstin' => ['nullable', 'string', 'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i'],
            'pan_no' => ['nullable', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
            'reg_no' => 'nullable|string|max:255',
            'hallmark_license' => 'nullable|string|max:255',
            'terms_and_conditions' => 'nullable|string',
            'bank_name' => 'nullable|string|max:255',
            'account_number' => ['nullable', 'string', 'regex:/^\d{9,18}$/'],
            'ifsc_code' => ['nullable', 'string', 'regex:/^[A-Z]{4}0[A-Z0-9]{6}$/i'],
            'branch' => 'nullable|string|max:255',
            'logo_url' => 'nullable|string',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($validated['is_default']) && $validated['is_default']) {
            CompanyInfo::where('id', '!=', $id)->update(['is_default' => false]);
        }

        if (!empty($validated['email'])) {
            $validated['email'] = strtolower(trim($validated['email']));
        }

        $company->update($validated);
        Cache::forget('masters_company_info_all');
        Cache::forget('masters_company_info_default');

        return response()->json($company);
    }

    /**
     * Remove the specified company info profile.
     */
    public function destroy($id)
    {
        $company = CompanyInfo::findOrFail($id);
        $wasDefault = $company->is_default;
        $company->delete();

        if ($wasDefault) {
            $next = CompanyInfo::first();
            if ($next) {
                $next->update(['is_default' => true]);
            }
        }

        Cache::forget('masters_company_info_all');
        Cache::forget('masters_company_info_default');

        return response()->json(['message' => 'Company info deleted successfully']);
    }

    /**
     * Set a company profile as default.
     */
    public function setDefault($id)
    {
        CompanyInfo::query()->update(['is_default' => false]);
        $company = CompanyInfo::findOrFail($id);
        $company->update(['is_default' => true, 'is_active' => true]);

        Cache::forget('masters_company_info_all');
        Cache::forget('masters_company_info_default');

        return response()->json([
            'message' => 'Default company profile updated successfully',
            'company' => $company
        ]);
    }
}
