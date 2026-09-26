<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Role;
use Illuminate\Http\Request;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        $roles = Role::orderBy('id', 'asc')->get();
        return response()->json($roles);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'role_key' => 'required|string|unique:roles,role_key',
            'display_name' => 'required|string',
            'department' => 'required|string',
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
        ]);

        $role = Role::create($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Role created successfully',
            'role' => $role
        ], 201);
    }

    public function show(Request $request, $id)
    {
        $role = Role::find($id);
        if (!$role) {
            return response()->json(['message' => 'Role not found'], 404);
        }
        return response()->json($role);
    }

    public function update(Request $request, $id)
    {
        $role = Role::findOrFail($id);

        $validated = $request->validate([
            'role_key' => 'required|string|unique:roles,role_key,' . $id,
            'display_name' => 'required|string',
            'department' => 'required|string',
            'description' => 'nullable|string',
            'permissions' => 'nullable|array',
        ]);

        $role->update($validated);

        return response()->json([
            'status' => 'success',
            'message' => 'Role updated successfully',
            'role' => $role
        ]);
    }

    public function destroy(Request $request, $id)
    {
        $role = Role::findOrFail($id);
        
        if (in_array($role->role_key, ['super_admin', 'admin'])) {
            return response()->json([
                'status' => 'error',
                'message' => 'System core roles (Super Admin, Admin) cannot be deleted.'
            ], 422);
        }

        $role->delete();

        return response()->json([
            'status' => 'success',
            'message' => 'Role deleted successfully'
        ]);
    }
}
