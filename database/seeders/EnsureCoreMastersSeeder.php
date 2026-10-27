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
    }
}
