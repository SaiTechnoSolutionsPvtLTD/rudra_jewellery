<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@rudrajewellers.com'],
            [
                'name' => 'Arvind',
                'role' => 'Super Admin',
                'avatar' => '/images/samples/arvind_profile.jpg',
                'password' => Hash::make('password123'),
            ]
        );
    }
}