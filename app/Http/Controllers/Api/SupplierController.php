<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    /**
     * Display a listing of the suppliers.
     */
    public function index(Request $request)
    {
        $hasFilters = $request->filled('search') ||
            ($request->filled('supplier_type') && $request->input('supplier_type') !== 'all') ||
            ($request->filled('status') && $request->input('status') !== 'all');

        if (!$hasFilters) {
            $suppliers = Cache::remember('masters_suppliers_all', 300, function () {
                return Supplier::orderBy('id', 'desc')->get();
            });

            return response()->json([
                'status' => 'success',
                'data' => $suppliers
            ]);
        }

        $query = Supplier::query();

        // Search filter
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('company_name', 'like', "%{$search}%")
                  ->orWhere('supplier_code', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%")
                  ->orWhere('gstin', 'like', "%{$search}%")
                  ->orWhere('city', 'like', "%{$search}%");
            });
        }

        // Supplier type filter
        if ($request->filled('supplier_type') && $request->input('supplier_type') !== 'all') {
            $query->where('supplier_type', $request->input('supplier_type'));
        }

        // Status filter
        if ($request->filled('status') && $request->input('status') !== 'all') {
            $query->where('status', $request->input('status'));
        }

        $suppliers = $query->orderBy('id', 'desc')->get();

        return response()->json([
            'status' => 'success',
            'data' => $suppliers
        ]);
    }

    /**
     * Store a newly created supplier in storage.
     */
    public function store(Request $request)
    {
        $sanitizePhone = function ($val) {
            if (!$val) return $val;
            $digits = preg_replace('/\D/', '', (string)$val);
            if (strlen($digits) === 12 && str_starts_with($digits, '91')) {
                $digits = substr($digits, 2);
            } elseif (strlen($digits) === 11 && str_starts_with($digits, '0')) {
                $digits = substr($digits, 1);
            }
            return strlen($digits) === 10 ? $digits : $val;
        };

        if ($request->has('phone')) {
            $request->merge(['phone' => $sanitizePhone($request->phone)]);
        }

        $validated = $request->validate([
            'supplier_code' => 'required|string|max:50|unique:suppliers,supplier_code',
            'name' => ['required', 'string', 'max:255', 'regex:/^[\p{L}\s.\'-]+$/u'],
            'company_name' => 'nullable|string|max:255',
            'supplier_type' => 'required|string|max:50',
            'phone' => ['nullable', 'string', 'regex:/^[6-9]\d{9}$/'],
            'email' => 'nullable|email|max:255',
            'gstin' => ['nullable', 'string', 'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i'],
            'pan_number' => ['nullable', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => ['nullable', 'string', 'regex:/^[1-9][0-9]{5}$/'],
            'bank_name' => 'nullable|string|max:100',
            'account_number' => ['nullable', 'string', 'regex:/^\d{9,18}$/'],
            'ifsc_code' => ['nullable', 'string', 'regex:/^[A-Z]{4}0[A-Z0-9]{6}$/i'],
            'branch' => 'nullable|string|max:100',
            'status' => 'required|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        $validated['supplier_code'] = strtoupper(trim($validated['supplier_code']));
        if (!empty($validated['gstin'])) {
            $validated['gstin'] = strtoupper(trim($validated['gstin']));
        }
        if (!empty($validated['pan_number'])) {
            $validated['pan_number'] = strtoupper(trim($validated['pan_number']));
        }
        if (!empty($validated['email'])) {
            $validated['email'] = strtolower(trim($validated['email']));
        }

        $supplier = Supplier::create($validated);
        Cache::forget('masters_suppliers_all');

        return response()->json([
            'status' => 'success',
            'message' => 'Supplier registered successfully!',
            'data' => $supplier
        ], 201);
    }

    /**
     * Display the specified supplier.
     */
    public function show($id)
    {
        $supplier = Supplier::findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data' => $supplier
        ]);
    }

    /**
     * Update the specified supplier in storage.
     */
    public function update(Request $request, $id)
    {
        $supplier = Supplier::findOrFail($id);

        if ($request->has('phone')) {
            $request->merge(['phone' => $sanitizePhone($request->phone)]);
        }

        $validated = $request->validate([
            'supplier_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('suppliers', 'supplier_code')->ignore($supplier->id),
            ],
            'name' => ['required', 'string', 'max:255', 'regex:/^[\p{L}\s.\'-]+$/u'],
            'company_name' => 'nullable|string|max:255',
            'supplier_type' => 'required|string|max:50',
            'phone' => ['nullable', 'string', 'regex:/^[6-9]\d{9}$/'],
            'email' => 'nullable|email|max:255',
            'gstin' => ['nullable', 'string', 'regex:/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i'],
            'pan_number' => ['nullable', 'string', 'regex:/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i'],
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => ['nullable', 'string', 'regex:/^[1-9][0-9]{5}$/'],
            'bank_name' => 'nullable|string|max:100',
            'account_number' => ['nullable', 'string', 'regex:/^\d{9,18}$/'],
            'ifsc_code' => ['nullable', 'string', 'regex:/^[A-Z]{4}0[A-Z0-9]{6}$/i'],
            'branch' => 'nullable|string|max:100',
            'status' => 'required|in:active,inactive',
            'notes' => 'nullable|string',
        ]);

        $validated['supplier_code'] = strtoupper(trim($validated['supplier_code']));
        if (!empty($validated['gstin'])) {
            $validated['gstin'] = strtoupper(trim($validated['gstin']));
        }
        if (!empty($validated['pan_number'])) {
            $validated['pan_number'] = strtoupper(trim($validated['pan_number']));
        }
        if (!empty($validated['email'])) {
            $validated['email'] = strtolower(trim($validated['email']));
        }

        $supplier->update($validated);
        Cache::forget('masters_suppliers_all');

        return response()->json([
            'status' => 'success',
            'message' => 'Supplier details updated successfully!',
            'data' => $supplier
        ]);
    }

    /**
     * Remove the specified supplier from storage.
     */
    public function destroy($id)
    {
        $supplier = Supplier::findOrFail($id);
        $supplier->delete();
        Cache::forget('masters_suppliers_all');

        return response()->json([
            'status' => 'success',
            'message' => 'Supplier removed successfully.'
        ]);
    }
}
