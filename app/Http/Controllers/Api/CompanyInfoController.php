<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CompanyInfo;
use Illuminate\Http\Request;

class CompanyInfoController extends Controller
{
    /**
     * Display a listing of company info profiles.
     */
    public function index()
    {
        $companies = CompanyInfo::orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($companies);
    }

    /**
     * Get default/active company info for print header in bills & reports.
     */
    public function getDefault()
    {
        $company = CompanyInfo::where('is_default', true)->first()
            ?? CompanyInfo::where('is_active', true)->first()
            ?? CompanyInfo::first();

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
            'pincode' => 'nullable|string|max:255',
            'state_code' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'alternate_phone' => 'nullable|string|max:255',
            'email' => 'nullable|string|max:255',
            'website' => 'nullable|string|max:255',
            'gstin' => 'nullable|string|max:255',
            'pan_no' => 'nullable|string|max:255',
            'reg_no' => 'nullable|string|max:255',
            'hallmark_license' => 'nullable|string|max:255',
            'terms_and_conditions' => 'nullable|string',
            'bank_name' => 'nullable|string|max:255',
            'account_number' => 'nullable|string|max:255',
            'ifsc_code' => 'nullable|string|max:255',
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

        $company = CompanyInfo::create($validated);

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
            'pincode' => 'nullable|string|max:255',
            'state_code' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'alternate_phone' => 'nullable|string|max:255',
            'email' => 'nullable|string|max:255',
            'website' => 'nullable|string|max:255',
            'gstin' => 'nullable|string|max:255',
            'pan_no' => 'nullable|string|max:255',
            'reg_no' => 'nullable|string|max:255',
            'hallmark_license' => 'nullable|string|max:255',
            'terms_and_conditions' => 'nullable|string',
            'bank_name' => 'nullable|string|max:255',
            'account_number' => 'nullable|string|max:255',
            'ifsc_code' => 'nullable|string|max:255',
            'branch' => 'nullable|string|max:255',
            'logo_url' => 'nullable|string',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($validated['is_default']) && $validated['is_default']) {
            CompanyInfo::where('id', '!=', $id)->update(['is_default' => false]);
        }

        $company->update($validated);

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

        return response()->json([
            'message' => 'Default company profile updated successfully',
            'company' => $company
        ]);
    }
}
