<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Supplier;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupplierController extends Controller
{
    /**
     * Display a listing of the suppliers.
     */
    public function index(Request $request)
    {
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
        $validated = $request->validate([
            'supplier_code' => 'required|string|max:50|unique:suppliers,supplier_code',
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'supplier_type' => 'required|string|max:50',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'gstin' => 'nullable|string|max:20',
            'pan_number' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'ifsc_code' => 'nullable|string|max:20',
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

        $supplier = Supplier::create($validated);

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

        $validated = $request->validate([
            'supplier_code' => [
                'required',
                'string',
                'max:50',
                Rule::unique('suppliers', 'supplier_code')->ignore($supplier->id),
            ],
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'supplier_type' => 'required|string|max:50',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|email|max:255',
            'gstin' => 'nullable|string|max:20',
            'pan_number' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'city' => 'nullable|string|max:100',
            'state' => 'nullable|string|max:100',
            'pincode' => 'nullable|string|max:20',
            'bank_name' => 'nullable|string|max:100',
            'account_number' => 'nullable|string|max:50',
            'ifsc_code' => 'nullable|string|max:20',
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

        $supplier->update($validated);

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

        return response()->json([
            'status' => 'success',
            'message' => 'Supplier removed successfully.'
        ]);
    }
}
