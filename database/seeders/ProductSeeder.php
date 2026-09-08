<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;
use App\Models\Subcategory;
use App\Models\Product;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // 1. Ensure Categories & Rich Subcategories Exist
        $goldCat = Category::firstOrCreate(['code' => 'GOLD'], [
            'name' => 'Gold',
            'description' => '24K / 22K Precious Yellow Metal for Jewellery Casting & Fabrication',
            'status' => 'active',
            'form_schema' => [
                ['key' => 'purity', 'type' => 'select', 'label' => 'Gold Purity / Karat', 'options' => ['24K (99.9% Pure)', '22K (91.6% Standard)', '18K (75.0% Jewel)', '14K (58.5% Fashion)'], 'required' => true],
                ['key' => 'gross_weight', 'type' => 'number', 'label' => 'Gross Weight (g)', 'options' => [], 'required' => true],
                ['key' => 'net_weight', 'type' => 'number', 'label' => 'Net Weight (g)', 'options' => [], 'required' => true],
                ['key' => 'wastage_percent', 'type' => 'number', 'label' => 'Wastage %', 'options' => [], 'required' => false],
                ['key' => 'making_charge', 'type' => 'number', 'label' => 'Making Charges (₹)', 'options' => [], 'required' => false],
                ['key' => 'hallmark_no', 'type' => 'text', 'label' => 'BIS Hallmark Reg No', 'options' => [], 'required' => false]
            ]
        ]);

        $silverCat = Category::firstOrCreate(['code' => 'SILVER'], [
            'name' => 'Silver',
            'description' => 'Fine 999 Pure & Sterling 925 Silver Bullion',
            'status' => 'active',
            'form_schema' => [
                ['key' => 'purity', 'type' => 'select', 'label' => 'Silver Purity', 'options' => ['99.9% Fine Pure', '92.5% Sterling', '80.0% German Silver'], 'required' => true],
                ['key' => 'weight', 'type' => 'number', 'label' => 'Weight (g)', 'options' => [], 'required' => true],
                ['key' => 'making_charge', 'type' => 'number', 'label' => 'Making Charges (₹)', 'options' => [], 'required' => false]
            ]
        ]);

        $diamondCat = Category::firstOrCreate(['code' => 'DIAMOND'], [
            'name' => 'Diamond',
            'description' => 'Precious Gemstones, Natural Cut & Uncut Certified Diamonds',
            'status' => 'active',
            'form_schema' => [
                ['key' => 'cut', 'type' => 'select', 'label' => 'Diamond Cut', 'options' => ['Round Brilliant', 'Princess Cut', 'Emerald Cut', 'Oval Cut', 'Marquise Cut'], 'required' => true],
                ['key' => 'clarity', 'type' => 'select', 'label' => 'Clarity', 'options' => ['FL/IF (Flawless)', 'VVS1', 'VVS2', 'VS1', 'SI1'], 'required' => true],
                ['key' => 'color', 'type' => 'select', 'label' => 'Color Grade', 'options' => ['D-F (Colorless)', 'E-F (Rare White)', 'G-H (Near Colorless)', 'I-J (Slight Yellowish)'], 'required' => true],
                ['key' => 'carat_weight', 'type' => 'number', 'label' => 'Carat Weight (ct)', 'options' => [], 'required' => true],
                ['key' => 'piece_count', 'type' => 'number', 'label' => 'Piece Count', 'options' => [], 'required' => false],
                ['key' => 'metal_setting', 'type' => 'text', 'label' => 'Metal Setting Purity', 'options' => [], 'required' => false]
            ]
        ]);

        $stoneCat = Category::firstOrCreate(['code' => 'STONE'], [
            'name' => 'Stone',
            'description' => 'Natural Precious & Semi-Precious Gemstones',
            'status' => 'active',
            'form_schema' => [
                ['key' => 'weight', 'type' => 'number', 'label' => 'Weight (g)', 'options' => [], 'required' => false],
                ['key' => 'price', 'type' => 'number', 'label' => 'Price (₹)', 'options' => [], 'required' => false],
                ['key' => 'making_charge', 'type' => 'number', 'label' => 'Making Charge (₹)', 'options' => [], 'required' => false]
            ]
        ]);

        // Subcategories Mapping
        $goldSubs = [
            'CHAIN' => Subcategory::firstOrCreate(['category_id' => $goldCat->id, 'code' => 'G-CHN'], ['name' => 'CHAIN', 'status' => 'active']),
            'Bangles' => Subcategory::firstOrCreate(['category_id' => $goldCat->id, 'code' => 'G-BAN'], ['name' => 'Bangles', 'status' => 'active']),
            'RING' => Subcategory::firstOrCreate(['category_id' => $goldCat->id, 'code' => 'G-RNG'], ['name' => 'RING', 'status' => 'active']),
            'Necklace' => Subcategory::firstOrCreate(['category_id' => $goldCat->id, 'code' => 'G-NCK'], ['name' => 'Necklace', 'status' => 'active']),
            'Earrings' => Subcategory::firstOrCreate(['category_id' => $goldCat->id, 'code' => 'G-ERG'], ['name' => 'Earrings', 'status' => 'active']),
            'Bracelet' => Subcategory::firstOrCreate(['category_id' => $goldCat->id, 'code' => 'G-BRC'], ['name' => 'Bracelet', 'status' => 'active']),
            'Coin' => Subcategory::firstOrCreate(['category_id' => $goldCat->id, 'code' => 'G-CON'], ['name' => 'Gold Coin', 'status' => 'active']),
        ];

        $silverSubs = [
            'Anklet' => Subcategory::firstOrCreate(['category_id' => $silverCat->id, 'code' => 'S-ANK'], ['name' => 'Silver Anklet', 'status' => 'active']),
            'Ring' => Subcategory::firstOrCreate(['category_id' => $silverCat->id, 'code' => 'S-RNG'], ['name' => 'Silver Ring', 'status' => 'active']),
            'Coin' => Subcategory::firstOrCreate(['category_id' => $silverCat->id, 'code' => 'S-CON'], ['name' => 'Silver Coin', 'status' => 'active']),
            'Puja' => Subcategory::firstOrCreate(['category_id' => $silverCat->id, 'code' => 'S-PUJ'], ['name' => 'Puja Utensils', 'status' => 'active']),
        ];

        $diamondSubs = [
            'Solitaire' => Subcategory::firstOrCreate(['category_id' => $diamondCat->id, 'code' => 'D-SLR'], ['name' => 'Solitaire Ring', 'status' => 'active']),
            'Pendant' => Subcategory::firstOrCreate(['category_id' => $diamondCat->id, 'code' => 'D-PND'], ['name' => 'Diamond Pendant', 'status' => 'active']),
            'Studs' => Subcategory::firstOrCreate(['category_id' => $diamondCat->id, 'code' => 'D-STD'], ['name' => 'Diamond Studs', 'status' => 'active']),
            'Bracelet' => Subcategory::firstOrCreate(['category_id' => $diamondCat->id, 'code' => 'D-BRC'], ['name' => 'Diamond Bracelet', 'status' => 'active']),
        ];

        $stoneSubs = [
            'Ruby' => Subcategory::firstOrCreate(['category_id' => $stoneCat->id, 'code' => 'ST-RBY'], ['name' => 'Ruby Gemstone', 'status' => 'active']),
            'Emerald' => Subcategory::firstOrCreate(['category_id' => $stoneCat->id, 'code' => 'ST-EMR'], ['name' => 'Emerald Gemstone', 'status' => 'active']),
            'Sapphire' => Subcategory::firstOrCreate(['category_id' => $stoneCat->id, 'code' => 'ST-SPH'], ['name' => 'Sapphire Gemstone', 'status' => 'active']),
        ];

        // Seed 100 Realistic Jewellery Products
        $productsData = [];
        $skuCounter = 1;

        // 1. GOLD PRODUCTS (40 Products)
        $goldDesigns = [
            ['Traditional Antique Choker Necklace', 'Necklace', 45.2, 41.8, 12, 650],
            ['Royal Temple Bridal Harami Necklace', 'Necklace', 88.5, 82.0, 14, 750],
            ['Mango Design Kerala Gold Mala', 'Necklace', 32.0, 29.5, 10, 500],
            ['Kundan Emerald Embedded Gold Necklace', 'Necklace', 52.4, 46.8, 15, 800],
            ['Lightweight Daily Wear Gold Chain', 'CHAIN', 8.5, 8.2, 6, 350],
            ['Rope Design Heavy Machine Chain', 'CHAIN', 24.0, 23.1, 8, 400],
            ['Lotus Model Mens Gold Chain', 'CHAIN', 35.6, 34.2, 9, 450],
            ['Hollow Lightweight Gold Chain 22K', 'CHAIN', 12.0, 11.5, 7, 380],
            ['Traditional Broad Antique Gold Bangle (Pair)', 'Bangles', 48.0, 44.5, 11, 550],
            ['Casting Cutwork Designer Gold Bangle', 'Bangles', 28.5, 26.8, 10, 480],
            ['Fancy Lightweight Daily Bangle Set of 4', 'Bangles', 36.0, 33.8, 9, 420],
            ['Ruby Studded South Indian Gold Bangle', 'Bangles', 30.2, 27.5, 12, 600],
            ['Classic Solitaire Style Mens Gold Ring', 'RING', 6.8, 6.4, 8, 400],
            ['Peacock Enamel Work Ladies Gold Ring', 'RING', 4.5, 4.1, 9, 450],
            ['Signet Gents Gold Ring 22K', 'RING', 9.2, 8.8, 7, 350],
            ['Floral Cluster Cubic Zirconia Gold Ring', 'RING', 5.1, 4.6, 10, 500],
            ['Jhumka Style Antique Drop Earrings', 'Earrings', 18.5, 16.8, 13, 600],
            ['Chandbali Model Traditional Gold Earring', 'Earrings', 22.0, 19.8, 14, 650],
            ['Daily Wear Gold Studs 22K', 'Earrings', 3.8, 3.6, 7, 300],
            ['Sui Dhaga Hanging Chain Gold Earring', 'Earrings', 6.2, 5.8, 9, 420],
            ['Gents Solid Gold Cuban Link Bracelet', 'Bracelet', 28.4, 27.0, 8, 450],
            ['Ladies Sleek Fancy Gold Bracelet', 'Bracelet', 11.2, 10.5, 9, 480],
            ['24K Fine Gold Coin 10 Grams (999 Pure)', 'Coin', 10.0, 10.0, 1, 150],
            ['24K Lakshmi Engraved Gold Coin 5 Grams', 'Coin', 5.0, 5.0, 1, 150],
            ['24K Ganesha Gold Coin 2 Grams', 'Coin', 2.0, 2.0, 1, 100],
            ['Nakshi Work Temple Pendant Gold', 'Necklace', 16.5, 15.0, 11, 520],
            ['Kasumala Traditional Gold Coin Necklace', 'Necklace', 64.0, 60.5, 13, 700],
            ['Matar Mala Multi Layer Gold Chain', 'CHAIN', 42.0, 39.5, 10, 480],
            ['Navaratna Studded Royal Gold Ring', 'RING', 8.4, 7.2, 12, 550],
            ['Baby Gold Bangles Pair 22K', 'Bangles', 14.0, 13.2, 8, 380],
            ['Filigree Work Designer Gold Pendant', 'Necklace', 9.5, 8.8, 10, 450],
            ['Ball Model Hanging Gold Earrings', 'Earrings', 8.8, 8.1, 9, 400],
            ['22K Gold Waist Belt (Oddiyanam)', 'Necklace', 145.0, 135.0, 15, 850],
            ['Double Line Machine Cut Gold Bracelet', 'Bracelet', 16.8, 15.9, 8, 420],
            ['24K Fine Gold Bar 20 Grams', 'Coin', 20.0, 20.0, 0.5, 200],
            ['CZ Stone Studded Gold Hoop Earrings', 'Earrings', 7.4, 6.5, 11, 480],
            ['Rani Haar Grand Antique Gold Necklace', 'Necklace', 110.0, 101.5, 14, 800],
            ['Twisted Rope Mens Heavy Gold Bracelet', 'Bracelet', 38.0, 36.2, 8, 460],
            ['Micro Plated Daily Wear Gold Ring', 'RING', 3.2, 3.0, 6, 250],
            ['Spike Pattern Modern Gold Bangle', 'Bangles', 24.0, 22.4, 9, 440],
        ];

        foreach ($goldDesigns as $index => $item) {
            $code = 'PRD-GOLD-' . str_pad($skuCounter++, 4, '0', STR_PAD_LEFT);
            $sub = $goldSubs[$item[1]] ?? reset($goldSubs);

            Product::updateOrCreate(['product_code' => $code], [
                'category_id' => $goldCat->id,
                'subcategory_id' => $sub->id,
                'name' => $item[0],
                'product_code' => $code,
                'description' => "Exquisite {$item[0]} crafted in 22K standard hallmark gold.",
                'status' => 'active',
                'attributes' => [
                    'purity' => '22K (91.6% Standard)',
                    'gross_weight' => $item[2],
                    'net_weight' => $item[3],
                    'wastage_percent' => $item[4],
                    'making_charge' => $item[5],
                    'hallmark_no' => 'BIS-HM-' . rand(100000, 999999),
                ]
            ]);
        }

        // 2. SILVER PRODUCTS (25 Products)
        $silverDesigns = [
            ['92.5 Sterling Silver Traditional Payal Anklet', 'Anklet', 120.0, 250],
            ['Ghungroo Bell Style Silver Heavy Anklet', 'Anklet', 180.5, 300],
            ['Lightweight Daily Wear Silver Chain Anklet', 'Anklet', 45.0, 150],
            ['99.9 Fine Silver Lakshmi Puja Coin 100g', 'Coin', 100.0, 100],
            ['99.9 Fine Silver Ganesha Bar 50g', 'Coin', 50.0, 80],
            ['Silver Puja Kalash Utensil 250g', 'Puja', 250.0, 500],
            ['Handcrafted Silver Diya Lamp Pair', 'Puja', 150.0, 350],
            ['Silver Puja Thali Plate 350g', 'Puja', 350.0, 600],
            ['Oxidised German Silver Tribal Ring', 'Ring', 14.5, 120],
            ['Adjustable Sterling Silver CZ Solitaire Ring', 'Ring', 8.2, 180],
            ['Mens Heavy Eagle Embossed Silver Ring', 'Ring', 18.0, 200],
            ['92.5 Sterling Silver Broad Cuff Bangle', 'Anklet', 65.0, 280],
            ['Silver Flower Pattern Toe Ring (Pair)', 'Anklet', 12.0, 100],
            ['Handmade Silver Chain for Gents 24 Inch', 'Anklet', 55.0, 220],
            ['Silver Chattr for Temple Idol 80g', 'Puja', 80.0, 250],
            ['Silver Agarbatti Stand & Incense Holder', 'Puja', 45.0, 150],
            ['Sterling Silver Cubic Zirconia Pendant Chain', 'Ring', 16.4, 210],
            ['Oxidised Black Silver Jhumka Earrings', 'Ring', 22.0, 190],
            ['99.9 Pure Silver Coin 250g Bullion', 'Coin', 250.0, 150],
            ['925 Sterling Silver Charm Bracelet', 'Anklet', 28.0, 230],
            ['Silver Baby Nazariya Kada Pair', 'Anklet', 24.0, 160],
            ['Silver Engraved Dinner Bowl 180g', 'Puja', 180.0, 400],
            ['Silver Idol Statuette of Lord Krishna 120g', 'Puja', 120.0, 450],
            ['Silver Kumkum Churna Box Container', 'Puja', 35.0, 140],
            ['Sterling Silver Mens Signet Ring', 'Ring', 12.5, 170],
        ];

        foreach ($silverDesigns as $item) {
            $code = 'PRD-SILVER-' . str_pad($skuCounter++, 4, '0', STR_PAD_LEFT);
            $sub = $silverSubs[$item[1]] ?? reset($silverSubs);

            Product::updateOrCreate(['product_code' => $code], [
                'category_id' => $silverCat->id,
                'subcategory_id' => $sub->id,
                'name' => $item[0],
                'product_code' => $code,
                'description' => "High grade {$item[0]} with fine luster and durable finish.",
                'status' => 'active',
                'attributes' => [
                    'purity' => '92.5% Sterling',
                    'weight' => $item[2],
                    'making_charge' => $item[3],
                ]
            ]);
        }

        // 3. DIAMOND PRODUCTS (25 Products)
        $diamondDesigns = [
            ['1.5 Carat VVS1 Solitaire Diamond Engagement Ring', 'Solitaire', 'Round Brilliant', 'VVS1', 'D-F (Colorless)', 1.50, 1, '18K White Gold'],
            ['0.75 Carat Princess Cut Diamond Ring', 'Solitaire', 'Princess Cut', 'VVS2', 'E-F (Rare White)', 0.75, 1, '18K Yellow Gold'],
            ['Dual Tone Solitaire Diamond Ring 1.0ct', 'Solitaire', 'Round Brilliant', 'VVS1', 'D-F (Colorless)', 1.00, 1, 'Platinum 950'],
            ['Emerald Cut Solitaire Ring 2.0ct Certified', 'Solitaire', 'Emerald Cut', 'FL/IF (Flawless)', 'D-F (Colorless)', 2.00, 1, '18K White Gold'],
            ['Floral Cluster Diamond Pendant 0.50ct', 'Pendant', 'Round Brilliant', 'VS1', 'G-H (Near Colorless)', 0.50, 12, '18K Rose Gold'],
            ['Heart Shape Diamond Halo Pendant 0.85ct', 'Pendant', 'Oval Cut', 'VVS1', 'E-F (Rare White)', 0.85, 18, '18K White Gold'],
            ['Peacock Designer Diamond Neck Pendant', 'Pendant', 'Marquise Cut', 'VVS2', 'G-H (Near Colorless)', 1.20, 24, '18K Yellow Gold'],
            ['Solitaire Diamond Stud Earrings 1.0ct Pair', 'Studs', 'Round Brilliant', 'VVS1', 'D-F (Colorless)', 1.00, 2, '18K White Gold'],
            ['Halo Cushion Diamond Stud Earrings 0.60ct', 'Studs', 'Princess Cut', 'VS1', 'E-F (Rare White)', 0.60, 14, '18K Yellow Gold'],
            ['Floating Diamond Dangle Earrings 1.40ct', 'Studs', 'Round Brilliant', 'VVS2', 'G-H (Near Colorless)', 1.40, 32, '18K Rose Gold'],
            ['Classic Tennis Diamond Bracelet 5.0ct', 'Bracelet', 'Round Brilliant', 'VVS2', 'F-G (White)', 5.00, 52, '18K White Gold'],
            ['Bangle Style Curved Diamond Bracelet 2.2ct', 'Bracelet', 'Round Brilliant', 'VS1', 'G-H (Near Colorless)', 2.20, 36, '18K Yellow Gold'],
            ['Oval Cut Diamond Cluster Ring 0.90ct', 'Solitaire', 'Oval Cut', 'VVS2', 'E-F (Rare White)', 0.90, 9, '18K White Gold'],
            ['Marquise Diamond Butterfly Pendant', 'Pendant', 'Marquise Cut', 'VS1', 'G-H (Near Colorless)', 0.70, 15, '18K Rose Gold'],
            ['Mens Single Diamond Band Ring 0.35ct', 'Solitaire', 'Princess Cut', 'VVS1', 'F-G (White)', 0.35, 1, 'Platinum 950'],
            ['3-Stone Past Present Future Diamond Ring', 'Solitaire', 'Round Brilliant', 'VVS1', 'D-F (Colorless)', 1.10, 3, '18K White Gold'],
            ['Pear Cut Solitaire Diamond Drop Pendant', 'Pendant', 'Oval Cut', 'FL/IF (Flawless)', 'D-F (Colorless)', 1.75, 1, '18K White Gold'],
            ['Square Diamond Stud Earrings 0.40ct', 'Studs', 'Princess Cut', 'VS1', 'H-I (Near Colorless)', 0.40, 2, '18K Yellow Gold'],
            ['Modern Wave Line Diamond Bracelet 1.8ct', 'Bracelet', 'Round Brilliant', 'VS1', 'G-H (Near Colorless)', 1.80, 28, '18K Rose Gold'],
            ['Full Eternity Diamond Band Ring 2.5ct', 'Solitaire', 'Round Brilliant', 'VVS2', 'E-F (Rare White)', 2.50, 20, '18K White Gold'],
            ['Uncut Polki Diamond Choker Pendant', 'Pendant', 'Round Brilliant', 'SI1', 'I-J (Slight Yellowish)', 3.20, 40, '22K Gold Setting'],
            ['Snowflake Cluster Diamond Studs 0.80ct', 'Studs', 'Round Brilliant', 'VVS2', 'F-G (White)', 0.80, 18, '18K White Gold'],
            ['Royal Crown Solitaire Diamond Ring 1.25ct', 'Solitaire', 'Round Brilliant', 'FL/IF (Flawless)', 'D-F (Colorless)', 1.25, 1, 'Platinum 950'],
            ['Cascade Waterfall Diamond Bracelet 3.5ct', 'Bracelet', 'Round Brilliant', 'VVS1', 'E-F (Rare White)', 3.50, 48, '18K White Gold'],
            ['Vintage Filigree Diamond Ring 0.65ct', 'Solitaire', 'Emerald Cut', 'VS1', 'G-H (Near Colorless)', 0.65, 7, '18K Yellow Gold'],
        ];

        foreach ($diamondDesigns as $item) {
            $code = 'PRD-DMND-' . str_pad($skuCounter++, 4, '0', STR_PAD_LEFT);
            $sub = $diamondSubs[$item[1]] ?? reset($diamondSubs);

            Product::updateOrCreate(['product_code' => $code], [
                'category_id' => $diamondCat->id,
                'subcategory_id' => $sub->id,
                'name' => $item[0],
                'product_code' => $code,
                'description' => "Certified natural diamond product ({$item[0]}). Includes IGI/GIA certificate.",
                'status' => 'active',
                'attributes' => [
                    'cut' => $item[2],
                    'clarity' => $item[3],
                    'color' => $item[4],
                    'carat_weight' => $item[5],
                    'piece_count' => $item[6],
                    'metal_setting' => $item[7],
                ]
            ]);
        }

        // 4. STONE PRODUCTS (10 Products)
        $stoneDesigns = [
            ['Natural Certified Burmese Ruby Gemstone 4.2 Carat', 'Ruby', 0.84, 45000, 1000],
            ['Unheated Pigeon Blood Red Ruby 5.5ct', 'Ruby', 1.10, 85000, 1500],
            ['Zambian Natural Emerald Gemstone 3.8 Carat', 'Emerald', 0.76, 38000, 800],
            ['Deep Green Colombian Emerald Oval Cut 6.0ct', 'Emerald', 1.20, 110000, 2000],
            ['Ceylon Royal Blue Sapphire Gemstone 5.0ct', 'Sapphire', 1.00, 95000, 1500],
            ['Natural Yellow Sapphire (Pukhraj) 6.2ct', 'Sapphire', 1.24, 52000, 1200],
            ['Star Sapphire Cabochon Cut 7.5ct', 'Sapphire', 1.50, 42000, 900],
            ['Natural Mozambican Ruby Gemstone 3.0ct', 'Ruby', 0.60, 28000, 700],
            ['Vivid Green Panjshir Emerald Gemstone 2.5ct', 'Emerald', 0.50, 32000, 800],
            ['Kashmir Cornflower Blue Sapphire 3.5ct', 'Sapphire', 0.70, 150000, 2500],
        ];

        foreach ($stoneDesigns as $item) {
            $code = 'PRD-STNE-' . str_pad($skuCounter++, 4, '0', STR_PAD_LEFT);
            $sub = $stoneSubs[$item[1]] ?? reset($stoneSubs);

            Product::updateOrCreate(['product_code' => $code], [
                'category_id' => $stoneCat->id,
                'subcategory_id' => $sub->id,
                'name' => $item[0],
                'product_code' => $code,
                'description' => "Natural gemstone ({$item[0]}). Authenticity lab tested.",
                'status' => 'active',
                'attributes' => [
                    'weight' => $item[2],
                    'price' => $item[3],
                    'making_charge' => $item[4],
                ]
            ]);
        }
    }
}
