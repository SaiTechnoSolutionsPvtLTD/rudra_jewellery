<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;
use App\Models\Subcategory;
use App\Models\RawMaterial;

class EnsureCoreMastersSeeder extends Seeder
{
    public function run(): void
    {
        // Note: Categories and subcategories should be added manually by the user, not auto-seeded.

        // Also ensure raw material default masters
        $rawMaterials = [
            ['material_type' => 'gold', 'name' => 'Raw Gold', 'unit' => 'g'],
            ['material_type' => 'silver', 'name' => 'Raw Silver', 'unit' => 'g'],
            ['material_type' => 'platinum', 'name' => 'Raw Platinum', 'unit' => 'g'],
            ['material_type' => 'diamond', 'name' => 'Raw Diamond', 'unit' => 'ct'],
            ['material_type' => 'stone', 'name' => 'Precious Stones', 'unit' => 'units'],
        ];

        foreach ($rawMaterials as $rm) {
            $existing = RawMaterial::where('material_type', $rm['material_type'])->first();
            if (!$existing) {
                RawMaterial::create([
                    'material_type' => $rm['material_type'],
                    'name' => $rm['name'],
                    'unit' => $rm['unit'],
                    'purchased_weight' => 0,
                    'allocated_weight' => 0,
                    'current_balance' => 0,
                    'purchased_count' => 0,
                    'allocated_count' => 0,
                    'current_count' => 0,
                ]);
            }
        }

        // Ensure default Unit masters if missing
        $units = [
            ['name' => 'Grams', 'code' => 'g', 'sort_order' => 1, 'description' => 'Standard metric weight in grams (g)'],
            ['name' => 'Carats', 'code' => 'ct', 'sort_order' => 2, 'description' => 'Gemstone & Diamond carats (1 ct = 0.2g)'],
            ['name' => 'Pieces', 'code' => 'pcs', 'sort_order' => 3, 'description' => 'Countable quantity pieces (pcs)'],
            ['name' => 'Kilograms', 'code' => 'kg', 'sort_order' => 4, 'description' => 'Bulk metric weight in kilograms (kg)'],
            ['name' => 'Milligrams', 'code' => 'mg', 'sort_order' => 5, 'description' => 'Precision weight in milligrams (mg)'],
        ];
        foreach ($units as $u) {
            \App\Models\Unit::firstOrCreate(['name' => $u['name']], $u);
        }

        // Ensure default Stamp masters across all material types if missing
        $defaultStamps = [
            // Gold Stamps
            ['name' => '916', 'code' => '916', 'applicable_for' => 'Gold', 'sort_order' => 1],
            ['name' => '999', 'code' => '999', 'applicable_for' => 'Gold', 'sort_order' => 2],
            ['name' => '750', 'code' => '750', 'applicable_for' => 'Gold', 'sort_order' => 3],
            ['name' => '585', 'code' => '585', 'applicable_for' => 'Gold', 'sort_order' => 4],
            ['name' => 'HM', 'code' => 'HM', 'applicable_for' => 'Gold', 'sort_order' => 5],
            
            // Platinum Stamps
            ['name' => 'PT950', 'code' => 'PT950', 'applicable_for' => 'Platinum', 'sort_order' => 6],
            ['name' => 'PT900', 'code' => 'PT900', 'applicable_for' => 'Platinum', 'sort_order' => 7],
            ['name' => '950', 'code' => '950', 'applicable_for' => 'Platinum', 'sort_order' => 8],
            
            // Silver Stamps
            ['name' => '925', 'code' => '925', 'applicable_for' => 'Silver', 'sort_order' => 9],
            
            // Diamond Stamps
            ['name' => '+3', 'code' => '+3', 'applicable_for' => 'Diamond', 'sort_order' => 10],
            ['name' => '+4', 'code' => '+4', 'applicable_for' => 'Diamond', 'sort_order' => 11],
            ['name' => '+5', 'code' => '+5', 'applicable_for' => 'Diamond', 'sort_order' => 12],
            ['name' => '+6', 'code' => '+6', 'applicable_for' => 'Diamond', 'sort_order' => 13],
            ['name' => 'IGI Certified', 'code' => 'IGI', 'applicable_for' => 'Diamond', 'sort_order' => 14],
            ['name' => 'GIA Certified', 'code' => 'GIA', 'applicable_for' => 'Diamond', 'sort_order' => 15],
            
            // Stone Stamps
            ['name' => 'Certified Stone', 'code' => 'CST', 'applicable_for' => 'Stone', 'sort_order' => 16],
        ];

        foreach ($defaultStamps as $st) {
            \App\Models\Stamp::firstOrCreate(['name' => $st['name']], $st);
        }
    }
}
