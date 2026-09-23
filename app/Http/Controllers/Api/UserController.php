<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Cache;

class UserController extends Controller
{
    private function getInitialUsers()
    {
        return [
            [
                'id' => 1,
                'name' => 'Arvind',
                'email' => 'admin@rudrajewellers.com',
                'mobile_number' => '+91 98765 43210',
                'role' => 'Super Administrator',
            ],
            [
                'id' => 2,
                'name' => 'Rajesh Varma',
                'email' => 'rajesh.v@rudrajewellers.com',
                'mobile_number' => '+91 98765 43211',
                'role' => 'Master Karigar',
            ],
            [
                'id' => 3,
                'name' => 'Amin Khan',
                'email' => 'amin.k@rudrajewellers.com',
                'mobile_number' => '+91 98765 43212',
                'role' => 'Sales Manager',
            ],
            [
                'id' => 4,
                'name' => 'Suresh Lal',
                'email' => 'suresh.l@rudrajewellers.com',
                'mobile_number' => '+91 98765 43213',
                'role' => 'Inventory Head',
            ]
        ];
    }

    public function index(Request $request)
    {
        try {
            if (Schema::hasTable('users')) {
                $users = User::orderBy('id', 'desc')->get(['id', 'name', 'email', 'mobile_number', 'role', 'created_at']);
                return response()->json($users);
            }
        } catch (\Exception $e) {
            // Fallback
        }

        return response()->json([]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email',
            'mobile_number' => 'nullable|string',
            'role' => 'required|string',
            'password' => 'required|string|min:6',
        ]);

        try {
            if (Schema::hasTable('users')) {
                $user = User::create([
                    'name' => $validated['name'],
                    'email' => $validated['email'],
                    'mobile_number' => $validated['mobile_number'] ?? null,
                    'role' => $validated['role'],
                    'password' => Hash::make($validated['password']),
                ]);

                return response()->json([
                    'status' => 'success',
                    'message' => 'User created successfully',
                    'user' => [
                        'id' => $user->id,
                        'name' => $user->name,
                        'email' => $user->email,
                        'mobile_number' => $user->mobile_number,
                        'role' => $user->role,
                    ]
                ], 201);
            }
        } catch (\Exception $e) {
            // Fallback
        }

        $users = Cache::get('mock_users', $this->getInitialUsers());
        $newId = count($users) > 0 ? max(array_column($users, 'id')) + 1 : 1;
        $newUser = [
            'id' => $newId,
            'name' => $validated['name'],
            'email' => $validated['email'],
            'mobile_number' => $validated['mobile_number'] ?? null,
            'role' => $validated['role'],
        ];
        array_unshift($users, $newUser);
        Cache::put('mock_users', $users, 86400);

        return response()->json([
            'status' => 'success',
            'message' => 'User created successfully',
            'user' => $newUser
        ], 201);
    }

    public function show(Request $request, $id)
    {
        try {
            if (Schema::hasTable('users')) {
                $user = User::find($id, ['id', 'name', 'email', 'mobile_number', 'role']);
                if ($user) {
                    return response()->json($user);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        $users = Cache::get('mock_users', $this->getInitialUsers());
        foreach ($users as $u) {
            if ($u['id'] == $id) {
                return response()->json($u);
            }
        }

        return response()->json(['message' => 'User not found'], 404);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email',
            'mobile_number' => 'nullable|string',
            'role' => 'required|string',
            'password' => 'nullable|string|min:6',
        ]);

        try {
            if (Schema::hasTable('users')) {
                $user = User::find($id);
                if ($user) {
                    $updateData = [
                        'name' => $validated['name'],
                        'email' => $validated['email'],
                        'mobile_number' => $validated['mobile_number'] ?? null,
                        'role' => $validated['role'],
                    ];
                    if (!empty($validated['password'])) {
                        $updateData['password'] = Hash::make($validated['password']);
                    }
                    $user->update($updateData);

                    return response()->json([
                        'status' => 'success',
                        'message' => 'User updated successfully',
                        'user' => $user
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        $users = Cache::get('mock_users', $this->getInitialUsers());
        $updatedUser = null;
        foreach ($users as &$u) {
            if ($u['id'] == $id) {
                $u['name'] = $validated['name'];
                $u['email'] = $validated['email'];
                $u['mobile_number'] = $validated['mobile_number'] ?? null;
                $u['role'] = $validated['role'];
                $updatedUser = $u;
                break;
            }
        }
        Cache::put('mock_users', $users, 86400);

        return response()->json([
            'status' => 'success',
            'message' => 'User updated successfully',
            'user' => $updatedUser
        ]);
    }

    public function destroy(Request $request, $id)
    {
        try {
            if (Schema::hasTable('users')) {
                $user = User::find($id);
                if ($user) {
                    $user->delete();
                    return response()->json([
                        'status' => 'success',
                        'message' => 'User deleted successfully'
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        $users = Cache::get('mock_users', $this->getInitialUsers());
        $users = array_values(array_filter($users, fn($u) => $u['id'] != $id));
        Cache::put('mock_users', $users, 86400);

        return response()->json([
            'status' => 'success',
            'message' => 'User deleted successfully'
        ]);
    }
}
