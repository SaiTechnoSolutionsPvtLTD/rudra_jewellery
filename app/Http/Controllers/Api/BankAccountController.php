<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use Illuminate\Http\Request;

class BankAccountController extends Controller
{
    /**
     * Display a listing of bank accounts.
     */
    public function index()
    {
        $accounts = BankAccount::orderBy('is_default', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($accounts);
    }

    /**
     * Store a newly created bank account.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'bank_name' => 'required|string|max:255',
            'account_name' => 'required|string|max:255',
            'account_number' => 'required|string|max:255',
            'ifsc_code' => 'required|string|max:255',
            'branch' => 'nullable|string|max:255',
            'account_type' => 'nullable|string|max:255',
            'upi_id' => 'nullable|string|max:255',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if (!empty($validated['is_default'])) {
            BankAccount::query()->update(['is_default' => false]);
        }

        $count = BankAccount::count();
        if ($count === 0) {
            $validated['is_default'] = true;
        }

        $account = BankAccount::create($validated);

        return response()->json($account, 217);
    }

    /**
     * Display the specified bank account.
     */
    public function show($id)
    {
        $account = BankAccount::findOrFail($id);
        return response()->json($account);
    }

    /**
     * Update the specified bank account.
     */
    public function update(Request $request, $id)
    {
        $account = BankAccount::findOrFail($id);

        $validated = $request->validate([
            'bank_name' => 'sometimes|required|string|max:255',
            'account_name' => 'sometimes|required|string|max:255',
            'account_number' => 'sometimes|required|string|max:255',
            'ifsc_code' => 'sometimes|required|string|max:255',
            'branch' => 'nullable|string|max:255',
            'account_type' => 'nullable|string|max:255',
            'upi_id' => 'nullable|string|max:255',
            'is_default' => 'nullable|boolean',
            'is_active' => 'nullable|boolean',
        ]);

        if (isset($validated['is_default']) && $validated['is_default']) {
            BankAccount::where('id', '!=', $id)->update(['is_default' => false]);
        }

        $account->update($validated);

        return response()->json($account);
    }

    /**
     * Remove the specified bank account.
     */
    public function destroy($id)
    {
        $account = BankAccount::findOrFail($id);
        $wasDefault = $account->is_default;
        $account->delete();

        if ($wasDefault) {
            $next = BankAccount::first();
            if ($next) {
                $next->update(['is_default' => true]);
            }
        }

        return response()->json(['message' => 'Bank account deleted successfully']);
    }

    /**
     * Set a bank account as default.
     */
    public function setDefault($id)
    {
        BankAccount::query()->update(['is_default' => false]);
        $account = BankAccount::findOrFail($id);
        $account->update(['is_default' => true, 'is_active' => true]);

        return response()->json([
            'message' => 'Default bank account updated successfully',
            'account' => $account
        ]);
    }
}
