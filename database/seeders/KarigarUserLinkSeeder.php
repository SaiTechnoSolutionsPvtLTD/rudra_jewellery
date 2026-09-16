<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Karigar;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class KarigarUserLinkSeeder extends Seeder
{
    public function run(): void
    {
        $karigars = Karigar::all();
        foreach ($karigars as $k) {
            $user = User::where('email', $k->email)->first();
            if (!$user) {
                $user = User::where('name', $k->name)->first();
            }
            if (!$user) {
                $user = User::create([
                    'name' => $k->name,
                    'email' => $k->email ?: ('karigar' . $k->id . '@rudrajewellers.com'),
                    'mobile_number' => $k->primary_phone,
                    'role' => 'Master Karigar',
                    'password' => Hash::make('password123'),
                ]);
            } else {
                // Ensure role allows artisan features
                if ($user->role !== 'Super Admin') {
                    $user->role = 'Master Karigar';
                    $user->save();
                }
            }
            $k->user_id = $user->id;
            $k->save();
        }
    }
}
