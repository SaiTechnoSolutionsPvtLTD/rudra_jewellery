<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\Karigar;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class RoleAndUserSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Seed standard permissions
        $permissions = [
            [
                'module_name' => 'dashboard',
                'actions' => ['view'],
                'custom_actions' => 'analytics',
                'description' => 'View dashboard stats and charts'
            ],
            [
                'module_name' => 'users',
                'actions' => ['view', 'create', 'edit', 'delete'],
                'custom_actions' => 'status_toggle, password_reset',
                'description' => 'User account management'
            ],
            [
                'module_name' => 'roles',
                'actions' => ['view', 'create', 'edit', 'delete'],
                'custom_actions' => 'assign_permissions',
                'description' => 'Role and permission management'
            ],
            [
                'module_name' => 'permissions',
                'actions' => ['view', 'manage'],
                'custom_actions' => 'configure',
                'description' => 'System permission setup'
            ],
            [
                'module_name' => 'inventory',
                'actions' => ['view', 'create', 'edit', 'delete'],
                'custom_actions' => 'stock_movement, gold_vault',
                'description' => 'Raw materials and finished stock'
            ],
            [
                'module_name' => 'workorders',
                'actions' => ['view', 'create', 'edit', 'assign', 'receive', 'start', 'update', 'complete', 'submit', 'qc', 'approve', 'return', 'rework', 'resubmit'],
                'custom_actions' => 'print_bom, export',
                'description' => 'Work order lifecycle and artisan assignments'
            ],
            [
                'module_name' => 'karigars',
                'actions' => ['view', 'create', 'edit', 'assign'],
                'custom_actions' => 'ledger_sync, wastage_config',
                'description' => 'Artisan directory and gold ledger'
            ],
            [
                'module_name' => 'clients',
                'actions' => ['view', 'create', 'edit', 'delete'],
                'custom_actions' => 'price_list',
                'description' => 'Client management and pricing'
            ],
            [
                'module_name' => 'billing',
                'actions' => ['view', 'create', 'edit', 'payment'],
                'custom_actions' => 'generate_pdf, print',
                'description' => 'Invoicing and payment processing'
            ],
            [
                'module_name' => 'reports',
                'actions' => ['view'],
                'custom_actions' => 'export_excel',
                'description' => 'Business and stock reports'
            ],
        ];

        foreach ($permissions as $p) {
            Permission::updateOrCreate(
                ['module_name' => $p['module_name']],
                $p
            );
        }

        // 2. Define Roles and Permission Sets
        $allPermissionKeys = [
            'dashboard.view', 'users.view', 'users.create', 'users.edit', 'users.delete',
            'roles.view', 'roles.create', 'roles.edit', 'roles.delete',
            'permissions.view', 'permissions.manage',
            'inventory.view', 'inventory.create', 'inventory.edit', 'inventory.delete',
            'workorders.view', 'workorders.create', 'workorders.edit', 'workorders.assign',
            'workorders.receive', 'workorders.start', 'workorders.update', 'workorders.complete',
            'workorders.submit', 'workorders.qc', 'workorders.approve', 'workorders.return', 'workorders.rework', 'workorders.resubmit',
            'karigars.view', 'karigars.create', 'karigars.edit', 'karigars.assign',
            'clients.view', 'clients.create', 'clients.edit', 'clients.delete',
            'billing.view', 'billing.create', 'billing.edit', 'billing.payment',
            'reports.view'
        ];

        $roles = [
            [
                'role_key' => 'super_admin',
                'display_name' => 'Super Admin',
                'department' => 'Administration',
                'description' => 'Full access to all system modules, configurations, and user management.',
                'permissions' => $allPermissionKeys
            ],
            [
                'role_key' => 'admin',
                'display_name' => 'Admin',
                'department' => 'Operations',
                'description' => 'Broad operational access across inventory, work orders, billing, and clients.',
                'permissions' => array_diff($allPermissionKeys, ['users.create', 'users.delete', 'roles.create', 'roles.delete'])
            ],
            [
                'role_key' => 'manager',
                'display_name' => 'Manager',
                'department' => 'Management',
                'description' => 'Granular operational access to inventory, job orders, and reporting.',
                'permissions' => [
                    'dashboard.view', 'inventory.view', 'inventory.create', 'inventory.edit',
                    'workorders.view', 'workorders.create', 'workorders.assign', 'workorders.receive',
                    'workorders.start', 'workorders.update', 'workorders.complete', 'workorders.submit',
                    'workorders.qc', 'workorders.approve', 'workorders.return', 'workorders.rework', 'workorders.resubmit',
                    'karigars.view', 'clients.view', 'billing.view', 'reports.view'
                ]
            ],
            [
                'role_key' => 'staff',
                'display_name' => 'Staff',
                'department' => 'Store Operations',
                'description' => 'Restricted entry and view access for inventory, orders, and clients.',
                'permissions' => [
                    'dashboard.view', 'inventory.view', 'workorders.view', 'workorders.create', 'workorders.receive', 'clients.view'
                ]
            ],
            [
                'role_key' => 'karigar',
                'display_name' => 'Karigar',
                'department' => 'Manufacturing',
                'description' => 'Artisan workbench for updating assigned active work and rework.',
                'permissions' => [
                    'dashboard.view', 'workorders.view', 'workorders.start', 'workorders.update',
                    'workorders.complete', 'workorders.submit', 'workorders.rework', 'workorders.resubmit'
                ]
            ],
        ];

        foreach ($roles as $r) {
            Role::updateOrCreate(
                ['role_key' => $r['role_key']],
                $r
            );
        }

        // 3. User 1: Arvind -> Super Admin with password admin123
        $arvind = User::updateOrCreate(
            ['email' => 'admin@rudrajewellers.com'],
            [
                'name' => 'Arvind',
                'mobile_number' => '+91 98765 43210',
                'role' => 'Super Admin',
                'status' => 'active',
                'password' => Hash::make('admin123'),
            ]
        );

        // 4. Test Accounts for each role
        $adminUser = User::updateOrCreate(
            ['email' => 'admin.test@rudrajewellers.com'],
            [
                'name' => 'Operational Admin',
                'mobile_number' => '+91 98765 43211',
                'role' => 'Admin',
                'status' => 'active',
                'password' => Hash::make('admin123'),
            ]
        );

        $managerUser = User::updateOrCreate(
            ['email' => 'manager.test@rudrajewellers.com'],
            [
                'name' => 'Store Manager',
                'mobile_number' => '+91 98765 43212',
                'role' => 'Manager',
                'status' => 'active',
                'password' => Hash::make('admin123'),
            ]
        );

        $staffUser = User::updateOrCreate(
            ['email' => 'staff.test@rudrajewellers.com'],
            [
                'name' => 'Counter Staff',
                'mobile_number' => '+91 98765 43213',
                'role' => 'Staff',
                'status' => 'active',
                'password' => Hash::make('admin123'),
            ]
        );

        // Karigar Account & Karigar Record
        $masterKarigarUser = User::updateOrCreate(
            ['email' => 'masterkarigar.test@rudrajewellers.com'],
            [
                'name' => 'Rajesh Varma (Karigar)',
                'mobile_number' => '+91 98765 43214',
                'role' => 'Karigar',
                'status' => 'active',
                'password' => Hash::make('admin123'),
            ]
        );

        $masterKarigarRecord = Karigar::updateOrCreate(
            ['karigar_code' => 'K-1001'],
            [
                'user_id' => $masterKarigarUser->id,
                'name' => 'Rajesh Varma (Master)',
                'primary_phone' => '+91 98765 43214',
                'email' => 'masterkarigar.test@rudrajewellers.com',
                'specialization' => 'Gold Casting & Filing',
                'experience_years' => 15,
                'workshop_name' => 'Varma Artisans',
                'status' => 'active',
                'standard_wastage_percent' => 1.5,
                'making_charge_per_gram' => 120.0,
            ]
        );

        // Karigar A Account & Record
        $karigarAUser = User::updateOrCreate(
            ['email' => 'karigara.test@rudrajewellers.com'],
            [
                'name' => 'Suresh Goldsmith (Karigar A)',
                'mobile_number' => '+91 98765 43215',
                'role' => 'Karigar',
                'status' => 'active',
                'password' => Hash::make('admin123'),
            ]
        );

        $karigarARecord = Karigar::updateOrCreate(
            ['karigar_code' => 'K-1002'],
            [
                'user_id' => $karigarAUser->id,
                'name' => 'Suresh Goldsmith (Karigar A)',
                'primary_phone' => '+91 98765 43215',
                'email' => 'karigara.test@rudrajewellers.com',
                'specialization' => 'Plain Gold Jewelry',
                'experience_years' => 10,
                'workshop_name' => 'Suresh Craft Workshop',
                'status' => 'active',
                'standard_wastage_percent' => 1.8,
                'making_charge_per_gram' => 100.0,
            ]
        );

        // Karigar B Account & Record
        $karigarBUser = User::updateOrCreate(
            ['email' => 'karigarb.test@rudrajewellers.com'],
            [
                'name' => 'Ramesh Artisan (Karigar B)',
                'mobile_number' => '+91 98765 43216',
                'role' => 'Karigar',
                'status' => 'active',
                'password' => Hash::make('admin123'),
            ]
        );

        $karigarBRecord = Karigar::updateOrCreate(
            ['karigar_code' => 'K-1003'],
            [
                'user_id' => $karigarBUser->id,
                'name' => 'Ramesh Artisan (Karigar B)',
                'primary_phone' => '+91 98765 43216',
                'email' => 'karigarb.test@rudrajewellers.com',
                'specialization' => 'Diamond Setting & Polishing',
                'experience_years' => 8,
                'workshop_name' => 'Ramesh Polishing Hub',
                'status' => 'active',
                'standard_wastage_percent' => 2.0,
                'making_charge_per_gram' => 150.0,
            ]
        );

        // Inactive Account
        User::updateOrCreate(
            ['email' => 'inactive.test@rudrajewellers.com'],
            [
                'name' => 'Inactive Test Account',
                'mobile_number' => '+91 98765 43217',
                'role' => 'Staff',
                'status' => 'inactive',
                'password' => Hash::make('admin123'),
            ]
        );
    }
}
