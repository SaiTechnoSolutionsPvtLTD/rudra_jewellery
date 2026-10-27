<?php

use Illuminate\Database\Migrations\Migration;
use App\Models\Client;
use App\Models\Invoice;

return new class extends Migration
{
    public function up(): void
    {
        $walkIn = Client::firstOrCreate(
            ['full_name' => 'Walk-in Customer'],
            [
                'client_code' => 'RJ-CL-1000',
                'primary_phone' => '9999999999',
                'status' => 'active',
                'street_address' => 'Store Walk-in',
                'city' => 'Chennai',
                'state' => 'Tamil Nadu',
            ]
        );

        Invoice::whereNull('client_id')
            ->where(function ($q) {
                $q->where('client_name', 'like', '%walk%')
                  ->orWhereNull('client_name')
                  ->orWhere('client_name', '');
            })
            ->update([
                'client_id' => $walkIn->id,
                'client_name' => 'Walk-in Customer',
            ]);
    }

    public function down(): void
    {
        // No-op
    }
};
