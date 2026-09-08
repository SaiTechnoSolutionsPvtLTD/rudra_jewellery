<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Membership;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class MembershipController extends Controller
{
    public function index(Request $request)
    {
        try {
            if (Schema::hasTable('memberships')) {
                $query = Membership::query();

                if ($request->has('status') && !empty($request->status) && $request->status !== 'all') {
                    $query->where('status', $request->status);
                }

                $memberships = $query->orderBy('id', 'asc')->get();
                return response()->json($memberships);
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json([]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:memberships,code',
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'reward_points_multiplier' => 'nullable|numeric|min:0',
            'validity_months' => 'nullable|integer|min:1',
            'min_purchase_amount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));

        try {
            if (Schema::hasTable('memberships')) {
                $membership = Membership::create($validated);
                return response()->json([
                    'status' => 'success',
                    'message' => 'Membership plan created successfully',
                    'membership' => $membership
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
            if (Schema::hasTable('memberships')) {
                $membership = Membership::find($id);
                if ($membership) {
                    return response()->json($membership);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json(['message' => 'Membership plan not found'], 404);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'code' => 'required|string|max:50|unique:memberships,code,' . $id,
            'discount_percentage' => 'nullable|numeric|min:0|max:100',
            'reward_points_multiplier' => 'nullable|numeric|min:0',
            'validity_months' => 'nullable|integer|min:1',
            'min_purchase_amount' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'status' => 'required|in:active,inactive',
        ]);

        $validated['code'] = strtoupper(trim($validated['code']));

        try {
            if (Schema::hasTable('memberships')) {
                $membership = Membership::find($id);
                if ($membership) {
                    $membership->update($validated);
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Membership plan updated successfully',
                        'membership' => $membership
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json(['message' => 'Membership plan not found'], 404);
    }

    public function destroy($id)
    {
        try {
            if (Schema::hasTable('memberships')) {
                $membership = Membership::find($id);
                if ($membership) {
                    $membership->delete();
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Membership plan deleted successfully'
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json(['message' => 'Membership plan not found'], 404);
    }
}
