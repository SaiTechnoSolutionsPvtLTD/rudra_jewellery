<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Client;
use Carbon\Carbon;

class ClientSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $clients = [
            [
                'client_code' => 'RJ-CL-1001',
                'full_name' => 'Meera Singhania',
                'gender' => 'female',
                'dob' => '1988-05-14',
                'anniversary_date' => '2012-11-20',
                'primary_phone' => '+91 98765 43210',
                'secondary_phone' => '+91 98765 43211',
                'email' => 'meera.s@regal.com',
                'aadhar_number' => '4589 1234 5678',
                'pan_number' => 'ABCPS1234F',
                'street_address' => '45 Regal Gardens, Boat Club Road',
                'city' => 'Chennai',
                'state' => 'Tamil Nadu',
                'zip_code' => '600028',
                'company_name' => 'Regal Textiles Pvt Ltd',
                'gst_number' => '33ABCPS1234F1Z5',
                'designation' => 'Managing Director',
                'membership_tier' => 'elite',
                'total_purchases' => 8450000.00,
                'last_visit' => Carbon::now()->subDays(2),
                'quick_notes' => 'Prefers 22K Antique gold jewellery and VVS1 diamond solitaires.',
                'status' => 'active',
            ],
            [
                'client_code' => 'RJ-CL-1002',
                'full_name' => 'Rajesh Khanna',
                'gender' => 'male',
                'dob' => '1975-09-22',
                'anniversary_date' => '2001-02-14',
                'primary_phone' => '+91 98400 12345',
                'secondary_phone' => '+91 98400 12346',
                'email' => 'khanna.ra@rkgroup.in',
                'aadhar_number' => '8765 4321 0987',
                'pan_number' => 'APZPK9876K',
                'street_address' => '12 Anna Salai, Thousand Lights',
                'city' => 'Chennai',
                'state' => 'Tamil Nadu',
                'zip_code' => '600006',
                'company_name' => 'RK Group of Industries',
                'gst_number' => '33APZPK9876K1Z2',
                'designation' => 'CEO',
                'membership_tier' => 'gold',
                'total_purchases' => 4220000.00,
                'last_visit' => Carbon::now()->subDays(5),
                'quick_notes' => 'Regular buyer for family festival occasions.',
                'status' => 'active',
            ],
            [
                'client_code' => 'RJ-CL-1003',
                'full_name' => 'Ananya Iyer',
                'gender' => 'female',
                'dob' => '1994-03-10',
                'anniversary_date' => '2020-12-05',
                'primary_phone' => '+91 97100 88990',
                'secondary_phone' => null,
                'email' => 'ananya.i@techcorp.com',
                'aadhar_number' => '3210 9876 5432',
                'pan_number' => 'BIPAI4321M',
                'street_address' => '88 Besant Avenue, Adyar',
                'city' => 'Chennai',
                'state' => 'Tamil Nadu',
                'zip_code' => '600020',
                'company_name' => 'TechCorp Solutions',
                'gst_number' => null,
                'designation' => 'Senior Vice President',
                'membership_tier' => 'silver',
                'total_purchases' => 1875000.00,
                'last_visit' => Carbon::now()->subDays(12),
                'quick_notes' => 'Loves lightweight daily wear gold chains and silver anklets.',
                'status' => 'active',
            ],
            [
                'client_code' => 'RJ-CL-1004',
                'full_name' => 'Vikram Malhotra',
                'gender' => 'male',
                'dob' => '1982-11-30',
                'anniversary_date' => '2008-06-18',
                'primary_phone' => '+91 99620 55443',
                'secondary_phone' => '+91 99620 55444',
                'email' => 'v.malhotra@heritage.in',
                'aadhar_number' => '6543 2109 8765',
                'pan_number' => 'CMWPM5678P',
                'street_address' => '104 Poes Garden',
                'city' => 'Chennai',
                'state' => 'Tamil Nadu',
                'zip_code' => '600086',
                'company_name' => 'Heritage Exports',
                'gst_number' => '33CMWPM5678P1Z8',
                'designation' => 'Chairman',
                'membership_tier' => 'platinum',
                'total_purchases' => 12400000.00,
                'last_visit' => Carbon::now()->subDays(1),
                'quick_notes' => 'Collector of natural Burmese rubies and certified solitaire diamond rings.',
                'status' => 'active',
            ],
        ];

        foreach ($clients as $client) {
            Client::updateOrCreate(['client_code' => $client['client_code']], $client);
        }
    }
}
