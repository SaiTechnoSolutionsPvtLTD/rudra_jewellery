<?php

require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\User;
use App\Models\Role;
use App\Models\Karigar;
use Illuminate\Support\Facades\Hash;

echo "=== RUDHRA JEWELLERY AUTHENTICATION & SECURITY VERIFICATION ===\n\n";

$usersToTest = [
    'Super Admin (Arvind)' => 'admin@rudrajewellers.com',
    'Operational Admin' => 'admin.test@rudrajewellers.com',
    'Store Manager' => 'manager.test@rudrajewellers.com',
    'Counter Staff' => 'staff.test@rudrajewellers.com',
    'Master Karigar' => 'masterkarigar.test@rudrajewellers.com',
    'Karigar A' => 'karigara.test@rudrajewellers.com',
    'Karigar B' => 'karigarb.test@rudrajewellers.com',
    'Inactive Account' => 'inactive.test@rudrajewellers.com',
];

foreach ($usersToTest as $label => $email) {
    $user = User::where('email', $email)->first();
    if (!$user) {
        echo "[FAIL] User not found: {$email}\n";
        continue;
    }
    
    $passValid = Hash::check('admin123', $user->password) ? 'PASS' : 'FAIL';
    $statusStr = strtoupper($user->status ?? 'active');
    $karigarInfo = $user->karigar ? " (Karigar ID: {$user->karigar->id}, Code: {$user->karigar->karigar_code})" : "";
    $permCount = count($user->permissions);

    echo "[{$passValid}] {$label} ({$user->name})\n";
    echo "       Email: {$email} | Password: admin123 | Status: {$statusStr}\n";
    echo "       Role: {$user->role} | Permissions Count: {$permCount}{$karigarInfo}\n\n";
}

echo "=== ROLES & PERMISSIONS MATRIX ===\n";
$roles = Role::all();
foreach ($roles as $role) {
    $perms = is_array($role->permissions) ? implode(', ', array_slice($role->permissions, 0, 6)) . '...' : 'None';
    echo "Role: {$role->display_name} ({$role->role_key}) -> Permissions: [{$perms}]\n";
}

echo "\nVerification script execution complete.\n";
