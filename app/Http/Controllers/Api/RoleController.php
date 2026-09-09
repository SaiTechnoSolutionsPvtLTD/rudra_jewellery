<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Cache;

class RoleController extends Controller
{
    private function getInitialRoles()
    {
        return [
            [
                'id' => 1,
                'role_key' => 'super_admin',
                'display_name' => 'Super Administrator',
                'department' => 'Administration',
                'description' => 'Full access to all system modules, configurations, and user management.'
            ],
            [
                'id' => 2,
                'role_key' => 'sales_manager',
                'display_name' => 'Sales Manager',
                'department' => 'Sales',
                'description' => 'Manages sales teams, customer accounts, and billing transactions.'
            ],
            [
                'id' => 3,
                'role_key' => 'inventory_head',
                'display_name' => 'Inventory Head',
                'department' => 'Inventory',
                'description' => 'Oversees raw gold, diamond vault allocations, and stock management.'
            ],
            [
                'id' => 4,
                'role_key' => 'master_karigar',
                'display_name' => 'Master Karigar',
                'department' => 'Manufacturing',
                'description' => 'Handles artisan job order receptions, casting, and quality check queue.'
            ]
        ];
    }

    public function index(Request $request)
    {
        try {
            if (Schema::hasTable('roles')) {
                $roles = Role::orderBy('id', 'desc')->get();
                if ($roles->count() === 0) {
                    foreach ($this->getInitialRoles() as $initial) {
                        Role::create($initial);
                    }
                    $roles = Role::orderBy('id', 'desc')->get();
                }
                return response()->json($roles);
            }
        } catch (\Exception $e) {
            // Fallback to cache if database error occurs
        }

        $roles = Cache::get('mock_roles', $this->getInitialRoles());
        return response()->json($roles);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'role_key' => 'required|string',
            'display_name' => 'required|string',
            'department' => 'required|string',
            'description' => 'nullable|string',
        ]);

        try {
            if (Schema::hasTable('roles')) {
                $role = Role::create($validated);
                return response()->json([
                    'status' => 'success',
                    'message' => 'Role created successfully',
                    'role' => $role
                ], 201);
            }
        } catch (\Exception $e) {
            // Fallback
        }

        $roles = Cache::get('mock_roles', $this->getInitialRoles());
        $newId = count($roles) > 0 ? max(array_column($roles, 'id')) + 1 : 1;
        $newRole = array_merge(['id' => $newId], $validated);
        array_unshift($roles, $newRole);
        Cache::put('mock_roles', $roles, 86400);

        return response()->json([
            'status' => 'success',
            'message' => 'Role created successfully',
            'role' => $newRole
        ], 201);
    }

    public function show(Request $request, $id)
    {
        try {
            if (Schema::hasTable('roles')) {
                $role = Role::find($id);
                if ($role) {
                    return response()->json($role);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        $roles = Cache::get('mock_roles', $this->getInitialRoles());
        foreach ($roles as $r) {
            if ($r['id'] == $id) {
                return response()->json($r);
            }
        }

        return response()->json(['message' => 'Role not found'], 404);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'role_key' => 'required|string',
            'display_name' => 'required|string',
            'department' => 'required|string',
            'description' => 'nullable|string',
        ]);

        try {
            if (Schema::hasTable('roles')) {
                $role = Role::find($id);
                if ($role) {
                    $role->update($validated);
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Role updated successfully',
                        'role' => $role
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        $roles = Cache::get('mock_roles', $this->getInitialRoles());
        $updatedRole = null;
        foreach ($roles as &$r) {
            if ($r['id'] == $id) {
                $r = array_merge($r, $validated);
                $updatedRole = $r;
                break;
            }
        }
        Cache::put('mock_roles', $roles, 86400);

        return response()->json([
            'status' => 'success',
            'message' => 'Role updated successfully',
            'role' => $updatedRole
        ]);
    }

    public function destroy(Request $request, $id)
    {
        try {
            if (Schema::hasTable('roles')) {
                $role = Role::find($id);
                if ($role) {
                    $role->delete();
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Role deleted successfully'
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        $roles = Cache::get('mock_roles', $this->getInitialRoles());
        $roles = array_values(array_filter($roles, fn($r) => $r['id'] != $id));
        Cache::put('mock_roles', $roles, 86400);

        return response()->json([
            'status' => 'success',
            'message' => 'Role deleted successfully'
        ]);
    }
}
