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
        $categories = [
            [
                'name' => 'Gold',
                'code' => 'GOLD',
                'description' => 'Fine Gold Jewelry & Hallmarked Ornaments',
                'status' => 'active',
                'subcategories' => [
                    ['name' => 'Chain', 'code' => 'CHA'],
                    ['name' => 'Rings', 'code' => 'GLD-RNG'],
                    ['name' => 'Bangles', 'code' => 'GLD-BNG'],
                    ['name' => 'Necklaces', 'code' => 'GLD-NCK'],
                    ['name' => 'Earrings', 'code' => 'GLD-EAR'],
                ]
            ],
            [
                'name' => 'Diamond',
                'code' => 'DIAMOND',
                'description' => 'Certified Diamond Jewelry & Solitaires',
                'status' => 'active',
                'subcategories' => [
                    ['name' => 'Solitaire Rings', 'code' => 'DIA-SLR'],
                    ['name' => 'Diamond Pendants', 'code' => 'DIA-PND'],
                    ['name' => 'Diamond Earrings', 'code' => 'DIA-EAR'],
                    ['name' => 'Tennis Bracelets', 'code' => 'DIA-BRC'],
                ]
            ],
            [
                'name' => 'Silver',
                'code' => 'SILVER',
                'description' => '925 Sterling Silver Jewelry & Articles',
                'status' => 'active',
                'subcategories' => [
                    ['name' => 'Silver Anklets', 'code' => 'SLV-ANK'],
                    ['name' => 'Silver Kadas', 'code' => 'SLV-KDA'],
                    ['name' => 'Silver Pooja Articles', 'code' => 'SLV-PJA'],
                    ['name' => 'Silver Rings', 'code' => 'SLV-RNG'],
                ]
            ],
            [
                'name' => 'Ornaments',
                'code' => 'ORNAMENTS',
                'description' => 'Luxury handcrafted ornaments for every occasion',
                'status' => 'active',
                'subcategories' => [
                    ['name' => 'Bridal Set', 'code' => 'ORN-BRD'],
                    ['name' => 'Antique Choker', 'code' => 'ORN-CHK'],
                    ['name' => 'Temple Haram', 'code' => 'ORN-HRM'],
                    ['name' => 'Traditional Kada', 'code' => 'ORN-KDA'],
                ]
            ],
            [
                'name' => 'Stone',
                'code' => 'STONE',
                'description' => 'Precious & semi-precious gemstones with lasting brilliance',
                'status' => 'active',
                'subcategories' => [
                    ['name' => 'Ruby Jewelry', 'code' => 'STN-RBY'],
                    ['name' => 'Emerald Jewelry', 'code' => 'STN-EMR'],
                    ['name' => 'Sapphire Jewelry', 'code' => 'STN-SPH'],
                    ['name' => 'Navratna Sets', 'code' => 'STN-NAV'],
                ]
            ],
            [
                'name' => 'Platinum',
                'code' => 'PLATINUM',
                'description' => 'Platinum 950 Love Bands & Contemporary Creations',
                'status' => 'active',
                'subcategories' => [
                    ['name' => 'Love Bands', 'code' => 'PLT-BND'],
                    ['name' => 'Platinum Chains', 'code' => 'PLT-CHN'],
                    ['name' => 'Platinum Pendants', 'code' => 'PLT-PND'],
                ]
            ],
        ];

        foreach ($categories as $catData) {
            $subcats = $catData['subcategories'];
            unset($catData['subcategories']);

            $category = Category::where('code', $catData['code'])
                ->orWhere('name', $catData['name'])
                ->first();

            if (!$category) {
                $category = Category::create($catData);
            } else {
                $category->update([
                    'status' => 'active',
                    'description' => $category->description ?: $catData['description']
                ]);
            }

            foreach ($subcats as $subData) {
                $sub = Subcategory::where('category_id', $category->id)
                    ->where(function ($q) use ($subData) {
                        $q->where('code', $subData['code'])
                          ->orWhere('name', $subData['name']);
                    })->first();

                if (!$sub) {
                    Subcategory::create([
                        'category_id' => $category->id,
                        'name' => $subData['name'],
                        'code' => $subData['code'],
                        'status' => 'active',
                    ]);
                } else {
                    $sub->update(['status' => 'active']);
                }
            }
        }

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
    }
}
