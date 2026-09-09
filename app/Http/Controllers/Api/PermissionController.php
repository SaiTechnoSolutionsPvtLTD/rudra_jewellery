<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Permission;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Cache;

class PermissionController extends Controller
{
    private function getInitialPermissions()
    {
        return [
            [
                'id' => 1,
                'module_name' => 'users',
                'actions' => ['Create', 'Edit', 'View', 'Delete'],
                'custom_actions' => 'export, assign',
                'description' => 'User management, account creation, and role assignments.'
            ],
            [
                'id' => 2,
                'module_name' => 'jobs',
                'actions' => ['Create', 'Edit', 'View', 'Delete', 'Approve', 'Reject'],
                'custom_actions' => 'barcode_print, allocate_gold',
                'description' => 'Work order creation, artisan receptions, and quality control.'
            ],
            [
                'id' => 3,
                'module_name' => 'billing',
                'actions' => ['Create', 'Edit', 'View', 'Delete', 'Update'],
                'custom_actions' => 'export_csv, generate_pdf',
                'description' => 'Client invoice generation, payment tracking, and tax calculation.'
            ],
            [
                'id' => 4,
                'module_name' => 'clients',
                'actions' => ['Create', 'Edit', 'View', 'Delete'],
                'custom_actions' => 'communication_mode',
                'description' => 'Client registration, tier classification, and order history.'
            ]
        ];
    }

    public function index(Request $request)
    {
        try {
            if (Schema::hasTable('permissions')) {
                $permissions = Permission::orderBy('id', 'desc')->get();
                if ($permissions->count() === 0) {
                    foreach ($this->getInitialPermissions() as $initial) {
                        Permission::create($initial);
                    }
                    $permissions = Permission::orderBy('id', 'desc')->get();
                }
                return response()->json($permissions);
            }
        } catch (\Exception $e) {
            // Fallback
        }

        $perms = Cache::get('mock_permissions', $this->getInitialPermissions());
        return response()->json($perms);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'module_name' => 'required|string',
            'actions' => 'nullable|array',
            'custom_actions' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        try {
            if (Schema::hasTable('permissions')) {
                $permission = Permission::create($validated);
                return response()->json([
                    'status' => 'success',
                    'message' => 'Permission module created successfully',
                    'permission' => $permission
                ], 201);
            }
        } catch (\Exception $e) {
            // Fallback
        }

        $perms = Cache::get('mock_permissions', $this->getInitialPermissions());
        $newId = count($perms) > 0 ? max(array_column($perms, 'id')) + 1 : 1;
        $newPerm = array_merge(['id' => $newId], $validated);
        array_unshift($perms, $newPerm);
        Cache::put('mock_permissions', $perms, 86400);

        return response()->json([
            'status' => 'success',
            'message' => 'Permission module created successfully',
            'permission' => $newPerm
        ], 201);
    }

    public function show(Request $request, $id)
    {
        try {
            if (Schema::hasTable('permissions')) {
                $permission = Permission::find($id);
                if ($permission) {
                    return response()->json($permission);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        $perms = Cache::get('mock_permissions', $this->getInitialPermissions());
        foreach ($perms as $p) {
            if ($p['id'] == $id) {
                return response()->json($p);
            }
        }

        return response()->json(['message' => 'Permission not found'], 404);
    }

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'module_name' => 'required|string',
            'actions' => 'nullable|array',
            'custom_actions' => 'nullable|string',
            'description' => 'nullable|string',
        ]);

        try {
            if (Schema::hasTable('permissions')) {
                $permission = Permission::find($id);
                if ($permission) {
                    $permission->update($validated);
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Permission updated successfully',
                        'permission' => $permission
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        $perms = Cache::get('mock_permissions', $this->getInitialPermissions());
        $updatedPerm = null;
        foreach ($perms as &$p) {
            if ($p['id'] == $id) {
                $p = array_merge($p, $validated);
                $updatedPerm = $p;
                break;
            }
        }
        Cache::put('mock_permissions', $perms, 86400);

        return response()->json([
            'status' => 'success',
            'message' => 'Permission updated successfully',
            'permission' => $updatedPerm
        ]);
    }

    public function destroy(Request $request, $id)
    {
        try {
            if (Schema::hasTable('permissions')) {
                $permission = Permission::find($id);
                if ($permission) {
                    $permission->delete();
                    return response()->json([
                        'status' => 'success',
                        'message' => 'Permission deleted successfully'
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Fallback
        }

        $perms = Cache::get('mock_permissions', $this->getInitialPermissions());
        $perms = array_values(array_filter($perms, fn($p) => $p['id'] != $id));
        Cache::put('mock_permissions', $perms, 86400);

        return response()->json([
            'status' => 'success',
            'message' => 'Permission deleted successfully'
        ]);
    }
}
