<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Karigar;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::with('karigar')->orderBy('id', 'desc')->get();
        return response()->json($users);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'mobile_number' => 'nullable|string|max:20',
            'role' => 'required|string',
            'status' => 'nullable|in:active,inactive',
            'password' => 'required|string|min:6',
            'karigar_id' => 'nullable|integer',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'mobile_number' => $validated['mobile_number'] ?? null,
            'role' => $validated['role'],
            'status' => $validated['status'] ?? 'active',
            'password' => Hash::make($validated['password']),
        ]);

        if (!empty($validated['karigar_id'])) {
            $karigar = Karigar::find($validated['karigar_id']);
            if ($karigar) {
                $karigar->user_id = $user->id;
                $karigar->save();
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'User created successfully',
            'user' => $user->load('karigar')
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $user = User::with('karigar')->find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }
        return response()->json($user);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $id,
            'mobile_number' => 'nullable|string|max:20',
            'role' => 'required|string',
            'status' => 'nullable|in:active,inactive',
            'password' => 'nullable|string|min:6',
            'karigar_id' => 'nullable|integer',
        ]);

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'mobile_number' => $validated['mobile_number'] ?? null,
            'role' => $validated['role'],
            'status' => $validated['status'] ?? $user->status ?? 'active',
        ];

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        if (isset($validated['karigar_id'])) {
            if ($validated['karigar_id']) {
                $karigar = Karigar::find($validated['karigar_id']);
                if ($karigar) {
                    $karigar->user_id = $user->id;
                    $karigar->save();
                }
            } else {
                Karigar::where('user_id', $user->id)->update(['user_id' => null]);
            }
        }

        return response()->json([
            'status' => 'success',
            'message' => 'User updated successfully',
            'user' => $user->load('karigar')
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $user = User::findOrFail($id);
        
        // Prevent deleting Super Admin User ID 1 (Arvind)
        if ($user->id === 1 || $user->email === 'admin@rudrajewellers.com') {
            return response()->json([
                'status' => 'error',
                'message' => 'Super Administrator account cannot be deleted.'
            ], 422);
        }

        // Unlink Karigar
        Karigar::where('user_id', $user->id)->update(['user_id' => null]);
        
        $user->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'User deleted successfully'
        ]);
    }
}
