<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Membership;

class MembershipSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Silver Saver Club',
                'code' => 'MEM-SLV',
                'discount_percentage' => 3.00,
                'reward_points_multiplier' => 1.00,
                'validity_months' => 12,
                'min_purchase_amount' => 25000.00,
                'description' => 'Entry level membership tier with 3% discount on making charges and standard reward points.',
                'status' => 'active',
            ],
            [
                'name' => 'Gold Privilege Club',
                'code' => 'MEM-GLD',
                'discount_percentage' => 7.50,
                'reward_points_multiplier' => 1.50,
                'validity_months' => 12,
                'min_purchase_amount' => 75000.00,
                'description' => 'Premium tier offering 7.5% discount on making charges, 1.5x reward points, and free annual jewellery polishing.',
                'status' => 'active',
            ],
            [
                'name' => 'Platinum VIP Club',
                'code' => 'MEM-PLT',
                'discount_percentage' => 12.00,
                'reward_points_multiplier' => 2.00,
                'validity_months' => 24,
                'min_purchase_amount' => 200000.00,
                'description' => 'Elite VIP tier offering 12% discount, 2.0x points, priority custom design preview, and complimentary insured home delivery.',
                'status' => 'active',
            ],
            [
                'name' => 'Diamond Royal Circle',
                'code' => 'MEM-[#b01622] DMND',
                'discount_percentage' => 15.00,
                'reward_points_multiplier' => 2.50,
                'validity_months' => 36,
                'min_purchase_amount' => 500000.00,
                'description' => 'Ultra luxury tier for high value collectors with 15% discount, dedicated personal concierge, and zero wastage charges on select collections.',
                'status' => 'active',
            ],
        ];

        foreach ($plans as $plan) {
            Membership::updateOrCreate(['code' => $plan['code']], $plan);
        }
    }
}
