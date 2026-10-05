<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use App\Models\User;
use App\Models\Role;
use App\Models\Permission;
use App\Models\Category;
use App\Models\Subcategory;
use App\Models\Supplier;
use App\Models\Client;
use App\Models\Karigar;
use App\Models\Product;
use App\Models\RawMaterial;
use App\Models\WorkOrder;
use App\Models\WorkOrderTimeline;
use App\Models\WorkOrderNotification;
use App\Models\WorkSpecification;
use Carbon\Carbon;

class SampleDataSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Seeding comprehensive sample data for Rudhra Jewellery...');

        // 1. First ensure Roles & Permissions exist
        $this->call(RoleAndUserSeeder::class);

        // Seed Masters (Karat, Stamp, Unit, GoldType, Style) if missing
        foreach (['24K', '22K', '18K', '14K', '10K'] as $k) {
            \App\Models\Karat::firstOrCreate(['name' => $k], ['code' => $k]);
        }
        foreach (['999', '916', '750', '585', 'HM'] as $st) {
            \App\Models\Stamp::firstOrCreate(['name' => $st], ['code' => $st]);
        }
        foreach (['Carat', 'Gram', 'Kg', 'Piece', 'Milligram'] as $u) {
            \App\Models\Unit::firstOrCreate(['name' => $u], ['code' => $u]);
        }
        foreach (['22KT: Yellow Gold', '18KT: White Gold', '18KT: Rose Gold', '24KT: Fine Gold'] as $gt) {
            \App\Models\GoldType::firstOrCreate(['name' => $gt]);
        }
        foreach (['Close Setting', 'Open Setting', 'Pave Setting', 'Prong Setting'] as $s) {
            \App\Models\Style::firstOrCreate(['name' => $s]);
        }

        // Seed Diamond Colors
        $diamondColors = [
            ['name' => 'D (Colorless - Premium)', 'code' => 'D', 'sort_order' => 1, 'status' => 'active', 'description' => 'Highest color grade, completely colorless'],
            ['name' => 'E (Colorless)', 'code' => 'E', 'sort_order' => 2, 'status' => 'active', 'description' => 'Colorless, minute traces of color visible only to experts'],
            ['name' => 'F (Colorless)', 'code' => 'F', 'sort_order' => 3, 'status' => 'active', 'description' => 'Colorless, high quality grade'],
            ['name' => 'G (Near Colorless)', 'code' => 'G', 'sort_order' => 4, 'status' => 'active', 'description' => 'Near colorless, exceptional value'],
            ['name' => 'H (Near Colorless)', 'code' => 'H', 'sort_order' => 5, 'status' => 'active', 'description' => 'Near colorless, standard commercial grade'],
            ['name' => 'I-J (Near Colorless)', 'code' => 'I-J', 'sort_order' => 6, 'status' => 'active', 'description' => 'Slight warm tint, cost effective'],
            ['name' => 'Fancy Yellow', 'code' => 'FY', 'sort_order' => 7, 'status' => 'active', 'description' => 'Vibrant fancy yellow colored diamond'],
        ];
        foreach ($diamondColors as $dc) {
            \App\Models\DiamondColor::firstOrCreate(['code' => $dc['code']], $dc);
        }

        // Seed Diamond Clarities
        $diamondClarities = [
            ['name' => 'FL / IF (Flawless / Internally Flawless)', 'code' => 'FL-IF', 'sort_order' => 1, 'status' => 'active', 'description' => 'No internal or external inclusions under 10x magnification'],
            ['name' => 'VVS1 (Very Very Slightly Included 1)', 'code' => 'VVS1', 'sort_order' => 2, 'status' => 'active', 'description' => 'Extremely difficult to see inclusions under 10x magnification'],
            ['name' => 'VVS2 (Very Very Slightly Included 2)', 'code' => 'VVS2', 'sort_order' => 3, 'status' => 'active', 'description' => 'Very difficult to see inclusions under 10x magnification'],
            ['name' => 'VS1 (Very Slightly Included 1)', 'code' => 'VS1', 'sort_order' => 4, 'status' => 'active', 'description' => 'Minor inclusions difficult to see under 10x magnification'],
            ['name' => 'VS2 (Very Slightly Included 2)', 'code' => 'VS2', 'sort_order' => 5, 'status' => 'active', 'description' => 'Minor inclusions somewhat easy to see under 10x magnification'],
            ['name' => 'SI1 (Slightly Included 1)', 'code' => 'SI1', 'sort_order' => 6, 'status' => 'active', 'description' => 'Noticeable inclusions under 10x magnification'],
            ['name' => 'SI2 (Slightly Included 2)', 'code' => 'SI2', 'sort_order' => 7, 'status' => 'active', 'description' => 'Noticeable inclusions easily seen under 10x magnification'],
        ];
        foreach ($diamondClarities as $dcl) {
            \App\Models\DiamondClarity::firstOrCreate(['code' => $dcl['code']], $dcl);
        }

        // Seed Diamond Ranges
        $diamondRangesData = [
            [
                'name' => 'Star / Melee (0.01 - 0.10 ct)',
                'code' => 'DIA-RNG-001-010',
                'min_ct' => 0.010,
                'max_ct' => 0.100,
                'description' => 'Small round brilliant diamonds for pave setting & halo rings',
                'item_name' => 'DIAMOND',
                'stamp' => '1',
                'part' => '-',
                'colour' => 'E-F',
                'clarity' => 'VVS-VS',
                'remarks' => 'Pave & Accent Stones',
                'unit' => 'Carat',
                'tunch' => '-',
                'sale_lb' => '-',
                'pc' => 10,
                'wt_ct' => 0.050,
                'dollar' => 0.00,
                'disc_percent' => 0.00,
                'dolx_rate' => 0.00,
                'rate' => 28000.00,
                'value' => 1400.00,
            ],
            [
                'name' => 'Eleven to Quarter Pointer (0.11 - 0.25 ct)',
                'code' => 'DIA-RNG-011-025',
                'min_ct' => 0.110,
                'max_ct' => 0.250,
                'description' => 'Quarter carat pointer diamonds for multi-stone stud earrings',
                'item_name' => 'DIAMOND',
                'stamp' => '1',
                'part' => '-',
                'colour' => 'D-E',
                'clarity' => 'VVS1',
                'remarks' => 'Earring & Pendant Clusters',
                'unit' => 'Carat',
                'tunch' => '-',
                'sale_lb' => '-',
                'pc' => 4,
                'wt_ct' => 0.200,
                'dollar' => 0.00,
                'disc_percent' => 0.00,
                'dolx_rate' => 0.00,
                'rate' => 42000.00,
                'value' => 8400.00,
            ],
            [
                'name' => 'Half Pointer (0.26 - 0.49 ct)',
                'code' => 'DIA-RNG-026-049',
                'min_ct' => 0.260,
                'max_ct' => 0.490,
                'description' => 'Half pointer certified diamonds for engagement bands',
                'item_name' => 'DIAMOND',
                'stamp' => '1',
                'part' => '-',
                'colour' => 'D',
                'clarity' => 'VVS2',
                'remarks' => 'Band & Trio Rings',
                'unit' => 'Carat',
                'tunch' => '-',
                'sale_lb' => '-',
                'pc' => 2,
                'wt_ct' => 0.350,
                'dollar' => 0.00,
                'disc_percent' => 0.00,
                'dolx_rate' => 0.00,
                'rate' => 65000.00,
                'value' => 22750.00,
            ],
            [
                'name' => 'Solitaire (0.50 - 0.70 ct)',
                'code' => 'DIA-RNG-050-070',
                'min_ct' => 0.500,
                'max_ct' => 0.700,
                'description' => 'Popular solitaire diamonds for classic single stone rings',
                'item_name' => 'DIAMOND',
                'stamp' => '1',
                'part' => '-',
                'colour' => 'E',
                'clarity' => 'VS1',
                'remarks' => 'Solitaire Ring Master',
                'unit' => 'Carat',
                'tunch' => '-',
                'sale_lb' => '-',
                'pc' => 1,
                'wt_ct' => 0.600,
                'dollar' => 0.00,
                'disc_percent' => 0.00,
                'dolx_rate' => 0.00,
                'rate' => 95000.00,
                'value' => 57000.00,
            ],
            [
                'name' => 'Single Carat Solitaire (0.71 - 1.00 ct)',
                'code' => 'DIA-RNG-071-100',
                'min_ct' => 0.710,
                'max_ct' => 1.000,
                'description' => 'Certified 1 Carat Solitaire diamond for bridal collection',
                'item_name' => 'DIAMOND',
                'stamp' => '1',
                'part' => '-',
                'colour' => 'D',
                'clarity' => 'VVS1',
                'remarks' => 'IGI / GIA Certified Solitaire',
                'unit' => 'Carat',
                'tunch' => '-',
                'sale_lb' => '-',
                'pc' => 1,
                'wt_ct' => 1.000,
                'dollar' => 0.00,
                'disc_percent' => 0.00,
                'dolx_rate' => 0.00,
                'rate' => 145000.00,
                'value' => 145000.00,
            ],
            [
                'name' => 'Solitaire 1.120 ct (D-VS1)',
                'code' => 'DIA-D-VS-112',
                'min_ct' => 1.010,
                'max_ct' => 1.500,
                'description' => 'Premium D Color VS1 Clarity Solitaire diamond',
                'item_name' => 'DIAMOND',
                'stamp' => '1',
                'part' => '-',
                'colour' => 'D',
                'clarity' => 'VS1',
                'remarks' => 'High Grade Solitaire',
                'unit' => 'Carat',
                'tunch' => '-',
                'sale_lb' => '-',
                'pc' => 2,
                'wt_ct' => 1.120,
                'dollar' => 0.00,
                'disc_percent' => 0.00,
                'dolx_rate' => 0.00,
                'rate' => 13500.00,
                'value' => 15120.00,
            ],
            [
                'name' => 'Solitaire 2.450 ct (D-VS)',
                'code' => 'DIA-D-VS-245',
                'min_ct' => 1.510,
                'max_ct' => 2.500,
                'description' => 'Heavy 2.45ct D Color VS Solitaire diamond',
                'item_name' => 'DIAMOND',
                'stamp' => '1',
                'part' => '-',
                'colour' => 'D',
                'clarity' => 'VS',
                'remarks' => 'Bridal Master Ring',
                'unit' => 'Carat',
                'tunch' => '-',
                'sale_lb' => '-',
                'pc' => 2,
                'wt_ct' => 2.450,
                'dollar' => 0.00,
                'disc_percent' => 0.00,
                'dolx_rate' => 0.00,
                'rate' => 13500.00,
                'value' => 33075.00,
            ],
            [
                'name' => 'Luxury Solitaire 3.020 ct (D-VS)',
                'code' => 'DIA-D-VS-302',
                'min_ct' => 2.510,
                'max_ct' => 4.000,
                'description' => 'Exclusive 3 Carat D Color Solitaire diamond',
                'item_name' => 'DIAMOND',
                'stamp' => '1',
                'part' => '-',
                'colour' => 'D',
                'clarity' => 'VS',
                'remarks' => 'Collector Item',
                'unit' => 'Carat',
                'tunch' => '-',
                'sale_lb' => '-',
                'pc' => 2,
                'wt_ct' => 3.020,
                'dollar' => 0.00,
                'disc_percent' => 0.00,
                'dolx_rate' => 0.00,
                'rate' => 13500.00,
                'value' => 40770.00,
            ],
        ];

        foreach ($diamondRangesData as $dr) {
            \App\Models\DiamondRange::updateOrCreate(['code' => $dr['code']], $dr);
        }

        // 2. Categories & Subcategories
        $categoriesData = [
            [
                'name' => 'Gold Necklaces',
                'code' => 'CAT-NECK',
                'description' => '22K & 18K Gold Chokers, Antique Harams & Bridal Sets',
                'status' => 'active',
                'subcategories' => [
                    ['name' => 'Antique Choker', 'code' => 'SUB-CHK'],
                    ['name' => 'Temple Design Haram', 'code' => 'SUB-HRM'],
                    ['name' => 'Bridal Sets', 'code' => 'SUB-BRD'],
                    ['name' => 'Mangalsutra', 'code' => 'SUB-MNG'],
                ]
            ],
            [
                'name' => 'Gold Bangles & Kadas',
                'code' => 'CAT-BNGL',
                'description' => 'Plain, Machine Cut & Antique Carved Gold Bangles',
                'status' => 'active',
                'subcategories' => [
                    ['name' => 'Antique Kada Bangle', 'code' => 'SUB-KDA'],
                    ['name' => 'Machine Cut Bangles', 'code' => 'SUB-MCB'],
                    ['name' => 'Pipe Bangles', 'code' => 'SUB-PPB'],
                ]
            ],
            [
                'name' => 'Gold Rings',
                'code' => 'CAT-RING',
                'description' => 'Men & Women Gold, Solitaire & Cocktail Rings',
                'status' => 'active',
                'subcategories' => [
                    ['name' => 'Solitaire Ring', 'code' => 'SUB-SLR'],
                    ['name' => 'Designer Band', 'code' => 'SUB-BND'],
                    ['name' => 'Cocktail Ring', 'code' => 'SUB-CKT'],
                ]
            ],
            [
                'name' => 'Earrings & Jhumkas',
                'code' => 'CAT-EAR',
                'description' => '22K Gold Jhumkas, Chandbalis & Studs',
                'status' => 'active',
                'subcategories' => [
                    ['name' => 'Traditional Jhumkas', 'code' => 'SUB-JHM'],
                    ['name' => 'Chandbalis', 'code' => 'SUB-CHB'],
                    ['name' => 'Ear Studs', 'code' => 'SUB-STD'],
                ]
            ],
            [
                'name' => 'Silver Ornaments',
                'code' => 'CAT-SLV',
                'description' => '925 Sterling Silver Kadas, Articles & Utensils',
                'status' => 'active',
                'subcategories' => [
                    ['name' => 'Silver Kadas', 'code' => 'SUB-SKD'],
                    ['name' => 'Silver Pooja Articles', 'code' => 'SUB-SPA'],
                ]
            ],
            [
                'name' => 'Diamond & Platinum Collection',
                'code' => 'CAT-DIA',
                'description' => 'Certified VVS-EF Diamond & Platinum 950 Jewelry',
                'status' => 'active',
                'subcategories' => [
                    ['name' => 'Diamond Solitaire Pendants', 'code' => 'SUB-DSP'],
                    ['name' => 'Platinum Bands', 'code' => 'SUB-PLB'],
                ]
            ],
        ];

        $categoriesMap = [];
        $subcategoriesMap = [];

        foreach ($categoriesData as $cat) {
            $subs = $cat['subcategories'];
            unset($cat['subcategories']);

            $c = Category::updateOrCreate(['code' => $cat['code']], $cat);
            $categoriesMap[$c->code] = $c;

            foreach ($subs as $sub) {
                $sc = Subcategory::updateOrCreate(
                    ['code' => $sub['code']],
                    [
                        'category_id' => $c->id,
                        'name' => $sub['name'],
                        'status' => 'active'
                    ]
                );
                $subcategoriesMap[$sc->code] = $sc;
            }
        }

        // 3. Suppliers (Multi-metal support: Raw Gold, Silver, Platinum Dealers)
        $suppliersData = [
            [
                'supplier_code' => 'SUP-1001',
                'name' => 'Reliance Bullion Vault',
                'company_name' => 'Reliance Bullion Merchants Pvt Ltd',
                'supplier_type' => 'Raw Gold Dealer',
                'phone' => '+91 98220 11223',
                'email' => 'bullion@reliancegold.com',
                'gstin' => '27AAACR1234F1Z1',
                'address' => 'Zaveri Bazaar, Kalbadevi',
                'city' => 'Mumbai',
                'state' => 'Maharashtra',
                'pincode' => '400002',
                'bank_name' => 'HDFC Bank',
                'account_number' => '50200012345678',
                'ifsc_code' => 'HDFC0000060',
                'branch' => 'Zaveri Bazaar',
                'status' => 'active',
                'notes' => 'Primary 24K Gold 999 bar supplier'
            ],
            [
                'supplier_code' => 'SUP-1002',
                'name' => 'Apex Raw Gold Merchants',
                'company_name' => 'Apex Gold & Bullion Traders',
                'supplier_type' => 'Raw Gold Dealer',
                'phone' => '+91 98450 33445',
                'email' => 'supply@apexgold.com',
                'gstin' => '24AAACA5678G2Z5',
                'address' => 'C.G. Road, Navrangpura',
                'city' => 'Ahmedabad',
                'state' => 'Gujarat',
                'pincode' => '380009',
                'bank_name' => 'ICICI Bank',
                'account_number' => '001105009876',
                'ifsc_code' => 'ICIC0000011',
                'branch' => 'Navrangpura',
                'status' => 'active',
                'notes' => 'Bulk 22K 916 grain supplier'
            ],
            [
                'supplier_code' => 'SUP-1003',
                'name' => 'Gujarat Silver Refinery',
                'company_name' => 'Gujarat Silver Trade Co',
                'supplier_type' => 'Silver Supplier',
                'phone' => '+91 97110 55667',
                'email' => 'orders@gujaratsilver.com',
                'gstin' => '24AAACG9988H1Z9',
                'address' => 'Manek Chowk',
                'city' => 'Ahmedabad',
                'state' => 'Gujarat',
                'pincode' => '380001',
                'bank_name' => 'State Bank of India',
                'account_number' => '30998877665',
                'ifsc_code' => 'SBIN0000301',
                'branch' => 'Manek Chowk',
                'status' => 'active',
                'notes' => 'Pure 999 Silver & Sterling Silver supplier'
            ],
            [
                'supplier_code' => 'SUP-1004',
                'name' => 'Surat Diamond Exchange',
                'company_name' => 'Surat Gem Imports Ltd',
                'supplier_type' => 'Diamond Supplier',
                'phone' => '+91 98980 77889',
                'email' => 'gems@suratdiamond.com',
                'gstin' => '24AAACS1122K1Z3',
                'address' => 'Diamond Bourse, Varachha',
                'city' => 'Surat',
                'state' => 'Gujarat',
                'pincode' => '395006',
                'bank_name' => 'Axis Bank',
                'account_number' => '918020011223344',
                'ifsc_code' => 'UTIB0000180',
                'branch' => 'Varachha',
                'status' => 'active',
                'notes' => 'Certified VVS-EF Loose Diamonds supplier'
            ],
        ];

        foreach ($suppliersData as $sup) {
            Supplier::updateOrCreate(['supplier_code' => $sup['supplier_code']], $sup);
        }

        // 4. Clients / Customers
        $clientsData = [
            [
                'client_code' => 'CL-1001',
                'full_name' => 'Malabar Gold & Diamonds (Retail Partner)',
                'company_name' => 'Malabar Gold India Pvt Ltd',
                'primary_phone' => '+91 98460 11111',
                'email' => 'purchase@malabargold.com',
                'gst_number' => '32AAACM1234A1Z0',
                'street_address' => 'M.G. Road',
                'city' => 'Kochi',
                'state' => 'Kerala',
                'zip_code' => '682016',
                'membership_tier' => 'Platinum VIP',
                'status' => 'active',
                'total_purchases' => 12500000.0,
            ],
            [
                'client_code' => 'CL-1002',
                'full_name' => 'Kalyan Jewellers Showroom',
                'company_name' => 'Kalyan Jewellers India Ltd',
                'primary_phone' => '+91 98470 22222',
                'email' => 'orders@kalyanjewellers.com',
                'gst_number' => '32AAACK5678B1Z2',
                'street_address' => 'Swaraj Round North',
                'city' => 'Thrissur',
                'state' => 'Kerala',
                'zip_code' => '680001',
                'membership_tier' => 'Platinum VIP',
                'status' => 'active',
                'total_purchases' => 8900000.0,
            ],
            [
                'client_code' => 'CL-1003',
                'full_name' => 'Senco Gold & Diamonds',
                'company_name' => 'Senco Gold Ltd',
                'primary_phone' => '+91 98300 33333',
                'email' => 'b2b@sencogold.com',
                'gst_number' => '19AAACS9988C1Z4',
                'street_address' => 'Bowbazar Street',
                'city' => 'Kolkata',
                'state' => 'West Bengal',
                'zip_code' => '700012',
                'membership_tier' => 'Gold',
                'status' => 'active',
                'total_purchases' => 4500000.0,
            ],
            [
                'client_code' => 'CL-1004',
                'full_name' => 'Ananya Sharma (Retail VIP)',
                'company_name' => 'Personal Client',
                'primary_phone' => '+91 98110 44444',
                'email' => 'ananya.sharma@gmail.com',
                'street_address' => 'Bandra West',
                'city' => 'Mumbai',
                'state' => 'Maharashtra',
                'zip_code' => '400050',
                'membership_tier' => 'Gold',
                'status' => 'active',
                'total_purchases' => 680000.0,
            ],
        ];

        $clientsMap = [];
        foreach ($clientsData as $cli) {
            $c = Client::updateOrCreate(['client_code' => $cli['client_code']], $cli);
            $clientsMap[$c->client_code] = $c;
        }

        // 4b. Work Craft Specifications (Master)
        $workSpecsData = [
            [
                'code' => 'SPEC-001',
                'name' => 'Antique & Temple Work',
                'description' => 'Specialized in 22K Nagas, Nakshi, handcrafted temple jewellery, and antique heritage pieces.',
                'default_wastage_percent' => 5.20,
                'default_making_charge' => 680.00,
                'icon' => 'fa-solid fa-vihara',
                'color' => 'amber',
                'status' => 'active',
                'sort_order' => 1,
            ],
            [
                'code' => 'SPEC-002',
                'name' => 'Diamond & Prong Setting',
                'description' => 'Micro-pave, claw, prong, bezel, and invisible diamond and gemstone setting.',
                'default_wastage_percent' => 3.80,
                'default_making_charge' => 850.00,
                'icon' => 'fa-solid fa-gem',
                'color' => 'blue',
                'status' => 'active',
                'sort_order' => 2,
            ],
            [
                'code' => 'SPEC-003',
                'name' => 'Plain Gold & Machine Casting',
                'description' => 'Centrifugal vacuum casting, plain 22K/18K gold bangles, chains, and bullion casting.',
                'default_wastage_percent' => 3.50,
                'default_making_charge' => 450.00,
                'icon' => 'fa-solid fa-cubes-stacked',
                'color' => 'emerald',
                'status' => 'active',
                'sort_order' => 3,
            ],
            [
                'code' => 'SPEC-004',
                'name' => 'Kundan & Meenakari',
                'description' => 'Traditional Jaipur reverse enamel work, Jadau foil setting, and intricate color meena.',
                'default_wastage_percent' => 6.00,
                'default_making_charge' => 920.00,
                'icon' => 'fa-solid fa-palette',
                'color' => 'purple',
                'status' => 'active',
                'sort_order' => 4,
            ],
            [
                'code' => 'SPEC-005',
                'name' => 'Stone Setting & Polishing',
                'description' => 'Navaratna setting, semi-precious stone insertion, high-luster polishing, and rhodium plating.',
                'default_wastage_percent' => 4.20,
                'default_making_charge' => 520.00,
                'icon' => 'fa-solid fa-star',
                'color' => 'red',
                'status' => 'active',
                'sort_order' => 5,
            ],
            [
                'code' => 'SPEC-006',
                'name' => 'Filigree & Die Work',
                'description' => 'Delicate wire filigree, embossed die-cutting, stamp work, and decorative sheet motifs.',
                'default_wastage_percent' => 4.80,
                'default_making_charge' => 620.00,
                'icon' => 'fa-solid fa-feather-pointed',
                'color' => 'slate',
                'status' => 'active',
                'sort_order' => 6,
            ],
        ];

        foreach ($workSpecsData as $ws) {
            WorkSpecification::updateOrCreate(['code' => $ws['code']], $ws);
        }

        // 5. Karigars / Artisans & Matching Accounts
        $karigarsData = [
            [
                'code' => 'K-1001',
                'name' => 'Rajesh Varma (Master)',
                'phone' => '+91 98765 43214',
                'email' => 'masterkarigar.test@rudrajewellers.com',
                'spec' => 'Antique & Temple Work',
                'exp' => 15,
                'wastage' => 5.2,
                'mc' => 680.0,
            ],
            [
                'code' => 'K-1002',
                'name' => 'Suresh Goldsmith (Karigar A)',
                'phone' => '+91 98765 43215',
                'email' => 'karigara.test@rudrajewellers.com',
                'spec' => 'Diamond & Prong Setting',
                'exp' => 12,
                'wastage' => 3.8,
                'mc' => 850.0,
            ],
            [
                'code' => 'K-1003',
                'name' => 'Prakash Goldsmith (Karigar B)',
                'phone' => '+91 98765 43216',
                'email' => 'prakash.karigar@rudrajewellers.com',
                'spec' => 'Plain Gold & Machine Casting',
                'exp' => 10,
                'wastage' => 3.5,
                'mc' => 450.0,
            ],
            [
                'code' => 'K-1004',
                'name' => 'Amit Varma (Artisan)',
                'phone' => '+91 98765 43217',
                'email' => 'amit.karigar@rudrajewellers.com',
                'spec' => 'Kundan & Meenakari',
                'exp' => 8,
                'wastage' => 6.0,
                'mc' => 920.0,
            ],
            [
                'code' => 'K-1005',
                'name' => 'Dinesh Karigar',
                'phone' => '+91 98765 43218',
                'email' => 'dinesh.karigar@rudrajewellers.com',
                'spec' => 'Stone Setting & Polishing',
                'exp' => 7,
                'wastage' => 4.2,
                'mc' => 520.0,
            ],
        ];

        $karigarsMap = [];
        foreach ($karigarsData as $kd) {
            $u = User::updateOrCreate(
                ['email' => $kd['email']],
                [
                    'name' => $kd['name'],
                    'mobile_number' => $kd['phone'],
                    'role' => 'Karigar',
                    'status' => 'active',
                    'password' => Hash::make('admin123'),
                ]
            );

            $k = Karigar::updateOrCreate(
                ['karigar_code' => $kd['code']],
                [
                    'user_id' => $u->id,
                    'name' => $kd['name'],
                    'primary_phone' => $kd['phone'],
                    'email' => $kd['email'],
                    'specialization' => $kd['spec'],
                    'experience_years' => $kd['exp'],
                    'workshop_name' => $kd['name'] . ' Workshop',
                    'status' => 'active',
                    'standard_wastage_percent' => $kd['wastage'],
                    'making_charge_per_gram' => $kd['mc'],
                ]
            );
            $karigarsMap[$kd['code']] = $k;
        }

        // 6. Products / Inventory Items
        $productsData = [
            [
                'product_code' => 'PROD-CHK-001',
                'name' => '22K Antique Peacock Choker',
                'cat' => 'CAT-NECK',
                'sub' => 'SUB-CHK',
                'wt' => 45.500,
                'qty' => 5,
                'img' => '/images/samples/peacock_choker.jpg',
            ],
            [
                'product_code' => 'PROD-HRM-002',
                'name' => '22K Temple Design Antique Haram',
                'cat' => 'CAT-NECK',
                'sub' => 'SUB-HRM',
                'wt' => 85.000,
                'qty' => 3,
                'img' => '/images/samples/temple_haram.jpg',
            ],
            [
                'product_code' => 'PROD-KDA-003',
                'name' => '22K Floral Designer Bangle Set',
                'cat' => 'CAT-BNGL',
                'sub' => 'SUB-KDA',
                'wt' => 60.000,
                'qty' => 8,
                'img' => '/images/samples/bangle_set.jpg',
            ],
            [
                'product_code' => 'PROD-SLR-004',
                'name' => '18K Solitaire Diamond Ring',
                'cat' => 'CAT-RING',
                'sub' => 'SUB-SLR',
                'wt' => 12.400,
                'qty' => 10,
                'img' => '/images/samples/diamond_ring.jpg',
            ],
            [
                'product_code' => 'PROD-JHM-005',
                'name' => '22K Traditional Gold Jhumkas',
                'cat' => 'CAT-EAR',
                'sub' => 'SUB-JHM',
                'wt' => 28.500,
                'qty' => 6,
                'img' => '/images/samples/gold_jhumkas.jpg',
            ],
            [
                'product_code' => 'PROD-SLV-006',
                'name' => 'Silver Handicraft Kada Bangle Pair',
                'cat' => 'CAT-SLV',
                'sub' => 'SUB-SKD',
                'wt' => 140.000,
                'qty' => 12,
                'img' => '/images/samples/silver_kada.jpg',
            ],
        ];

        $productsMap = [];
        foreach ($productsData as $pd) {
            $cat = $categoriesMap[$pd['cat']] ?? null;
            $sub = $subcategoriesMap[$pd['sub']] ?? null;

            $p = Product::updateOrCreate(
                ['product_code' => $pd['product_code']],
                [
                    'category_id' => $cat?->id,
                    'subcategory_id' => $sub?->id,
                    'name' => $pd['name'],
                    'opening_stock_qty' => $pd['qty'],
                    'current_stock_qty' => $pd['qty'],
                    'opening_stock_weight' => $pd['wt'],
                    'opening_stock_rate' => 6850.0,
                    'opening_stock_date' => now()->toDateString(),
                    'image' => $pd['img'],
                    'status' => 'active',
                    'attributes' => [
                        'source' => 'inventory',
                        'gross_wt' => $pd['wt'],
                        'karat' => '22K (916)',
                    ],
                ]
            );
            $productsMap[$pd['product_code']] = $p;
        }

        // 7. Raw Materials Vault Seed
        $rawMaterials = [
            [
                'material_type' => 'gold_24k',
                'name' => 'Gold 24K (999 Fine Pure)',
                'unit' => 'g',
                'purchased_weight' => 500.000,
                'allocated_weight' => 50.000,
                'current_balance' => 450.000,
            ],
            [
                'material_type' => 'gold_22k',
                'name' => 'Gold 22K (916 Standard)',
                'unit' => 'g',
                'purchased_weight' => 1250.000,
                'allocated_weight' => 400.000,
                'current_balance' => 850.000,
            ],
            [
                'material_type' => 'silver',
                'name' => 'Silver 925 Sterling Fine',
                'unit' => 'g',
                'purchased_weight' => 3500.000,
                'allocated_weight' => 700.000,
                'current_balance' => 2800.000,
            ],
            [
                'material_type' => 'diamond',
                'name' => 'Diamond VVS-EF Certified Loose',
                'unit' => 'ct',
                'purchased_weight' => 45.500,
                'allocated_weight' => 13.500,
                'current_balance' => 32.000,
            ],
        ];

        foreach ($rawMaterials as $rm) {
            RawMaterial::updateOrCreate(['material_type' => $rm['material_type']], $rm);
        }

        // 8. Work Orders (Populate across all 5 dashboard sections)
        $today = Carbon::today();
        $adminUser = User::where('role', 'Super Admin')->first() ?? User::first();

        $workOrdersData = [
            // --- SECTION 1: WORK IN PROGRESS (ONGOING / ASSIGNED / IN PROGRESS) ---
            [
                'work_order_number' => 'WO-2026-0001',
                'customer_name' => 'Malabar Gold & Diamonds',
                'client_code' => 'CL-1001',
                'product_code' => 'PROD-CHK-001',
                'product_name' => '22K Antique Peacock Choker',
                'karigar_code' => 'K-1001',
                'material_type' => 'Gold 22K (916)',
                'priority' => 'High',
                'allotted_date' => $today->copy()->subDays(3)->toDateString(),
                'delivery_date' => $today->copy()->addDays(5)->toDateString(),
                'allotted_weight' => 45.500,
                'completed_weight' => 15.200,
                'pending_weight' => 30.300,
                'wastage_allowed_percent' => 1.5,
                'making_charge_per_gram' => 120.0,
                'total_making_charges' => 5460.0,
                'total_price' => 311675.0,
                'current_stage' => 'work_in_progress',
                'status' => 'assigned',
            ],
            [
                'work_order_number' => 'WO-2026-0002',
                'customer_name' => 'Kalyan Jewellers Showroom',
                'client_code' => 'CL-1002',
                'product_code' => 'PROD-HRM-002',
                'product_name' => '22K Temple Design Antique Haram',
                'karigar_code' => 'K-1002',
                'material_type' => 'Gold 22K (916)',
                'priority' => 'Normal',
                'allotted_date' => $today->copy()->subDays(2)->toDateString(),
                'delivery_date' => $today->copy()->addDays(7)->toDateString(),
                'allotted_weight' => 85.000,
                'completed_weight' => 32.500,
                'pending_weight' => 52.500,
                'wastage_allowed_percent' => 1.8,
                'making_charge_per_gram' => 110.0,
                'total_making_charges' => 9350.0,
                'total_price' => 582250.0,
                'current_stage' => 'work_started',
                'status' => 'ongoing',
            ],
            [
                'work_order_number' => 'WO-2026-0003',
                'customer_name' => 'Senco Gold & Diamonds',
                'client_code' => 'CL-1003',
                'product_code' => 'PROD-KDA-003',
                'product_name' => '22K Floral Designer Bangle Set',
                'karigar_code' => 'K-1003',
                'material_type' => 'Gold 22K (916)',
                'priority' => 'Normal',
                'allotted_date' => $today->copy()->subDays(1)->toDateString(),
                'delivery_date' => $today->copy()->addDays(6)->toDateString(),
                'allotted_weight' => 60.000,
                'completed_weight' => 20.000,
                'pending_weight' => 40.000,
                'wastage_allowed_percent' => 2.0,
                'making_charge_per_gram' => 105.0,
                'total_making_charges' => 6300.0,
                'total_price' => 411000.0,
                'current_stage' => 'work_in_progress',
                'status' => 'assigned',
            ],

            // --- SECTION 2: DELAYED / OVERDUE WORK ORDERS ---
            [
                'work_order_number' => 'WO-2026-0004',
                'customer_name' => 'Malabar Gold & Diamonds',
                'client_code' => 'CL-1001',
                'product_code' => 'PROD-CHK-001',
                'product_name' => '22K Royal Kundan Bridals',
                'karigar_code' => 'K-1004',
                'material_type' => 'Gold 22K (916)',
                'priority' => 'Urgent',
                'allotted_date' => $today->copy()->subDays(15)->toDateString(),
                'delivery_date' => $today->copy()->subDays(8)->toDateString(), // 8 days overdue!
                'allotted_weight' => 120.000,
                'completed_weight' => 40.000,
                'pending_weight' => 80.000,
                'wastage_allowed_percent' => 2.2,
                'making_charge_per_gram' => 140.0,
                'total_making_charges' => 16800.0,
                'total_price' => 838800.0,
                'current_stage' => 'delayed',
                'status' => 'ongoing',
            ],
            [
                'work_order_number' => 'WO-2026-0005',
                'customer_name' => 'Ananya Sharma (Retail VIP)',
                'client_code' => 'CL-1004',
                'product_code' => 'PROD-SLR-004',
                'product_name' => '18K Diamond Cocktail Ring',
                'karigar_code' => 'K-1005',
                'material_type' => 'Gold 18K + Diamond',
                'priority' => 'High',
                'allotted_date' => $today->copy()->subDays(10)->toDateString(),
                'delivery_date' => $today->copy()->subDays(4)->toDateString(), // 4 days overdue!
                'allotted_weight' => 18.500,
                'completed_weight' => 5.000,
                'pending_weight' => 13.500,
                'wastage_allowed_percent' => 1.9,
                'making_charge_per_gram' => 150.0,
                'total_making_charges' => 2775.0,
                'total_price' => 126775.0,
                'current_stage' => 'delayed',
                'status' => 'ongoing',
            ],

            // --- SECTION 3: WASTE DETAILS (SCRAP & WASTAGE REPORTING) ---
            [
                'work_order_number' => 'WO-2026-0006',
                'customer_name' => 'Kalyan Jewellers Showroom',
                'client_code' => 'CL-1002',
                'product_code' => 'PROD-KDA-003',
                'product_name' => '22K Machine Cut Chains (10 Pcs)',
                'karigar_code' => 'K-1002',
                'material_type' => 'Gold 22K (916)',
                'priority' => 'Normal',
                'allotted_date' => $today->copy()->subDays(5)->toDateString(),
                'delivery_date' => $today->copy()->addDays(2)->toDateString(),
                'allotted_weight' => 150.000,
                'completed_weight' => 147.200,
                'pending_weight' => 0.000,
                'wastage_weight' => 2.800,
                'wastage_allowed_percent' => 2.0,
                'making_charge_per_gram' => 95.0,
                'total_making_charges' => 14250.0,
                'total_price' => 1027500.0,
                'current_stage' => 'work_completed',
                'status' => 'ongoing',
            ],
            [
                'work_order_number' => 'WO-2026-0007',
                'customer_name' => 'Malabar Gold & Diamonds',
                'client_code' => 'CL-1001',
                'product_code' => 'PROD-KDA-003',
                'product_name' => '22K Antique Kada Bangle Pair',
                'karigar_code' => 'K-1001',
                'material_type' => 'Gold 22K (916)',
                'priority' => 'High',
                'allotted_date' => $today->copy()->subDays(6)->toDateString(),
                'delivery_date' => $today->copy()->addDays(1)->toDateString(),
                'allotted_weight' => 80.000,
                'completed_weight' => 78.600,
                'pending_weight' => 0.000,
                'wastage_weight' => 1.400,
                'wastage_allowed_percent' => 1.8,
                'making_charge_per_gram' => 120.0,
                'total_making_charges' => 9600.0,
                'total_price' => 548000.0,
                'current_stage' => 'work_completed',
                'status' => 'ongoing',
            ],

            // --- SECTION 4: QUALITY CHECK & FINAL RECEIVE (QC PENDING) ---
            [
                'work_order_number' => 'WO-2026-0008',
                'customer_name' => 'Senco Gold & Diamonds',
                'client_code' => 'CL-1003',
                'product_code' => 'PROD-JHM-005',
                'product_name' => '22K Traditional Gold Jhumkas',
                'karigar_code' => 'K-1004',
                'material_type' => 'Gold 22K (916)',
                'priority' => 'High',
                'allotted_date' => $today->copy()->subDays(4)->toDateString(),
                'delivery_date' => $today->toDateString(),
                'allotted_weight' => 28.500,
                'completed_weight' => 28.350,
                'pending_weight' => 0.150,
                'wastage_allowed_percent' => 1.5,
                'making_charge_per_gram' => 140.0,
                'total_making_charges' => 3990.0,
                'total_price' => 195225.0,
                'current_stage' => 'sent_for_approval',
                'status' => 'pending_approval',
            ],
            [
                'work_order_number' => 'WO-2026-0009',
                'customer_name' => 'Ananya Sharma (Retail VIP)',
                'client_code' => 'CL-1004',
                'product_code' => 'PROD-SLR-004',
                'product_name' => '18K Solitaire Diamond Ring',
                'karigar_code' => 'K-1001',
                'material_type' => 'Gold 18K + Diamond',
                'priority' => 'Normal',
                'allotted_date' => $today->copy()->subDays(3)->toDateString(),
                'delivery_date' => $today->toDateString(),
                'allotted_weight' => 12.400,
                'completed_weight' => 12.380,
                'pending_weight' => 0.020,
                'wastage_allowed_percent' => 1.0,
                'making_charge_per_gram' => 160.0,
                'total_making_charges' => 1984.0,
                'total_price' => 84944.0,
                'current_stage' => 'quality_check',
                'status' => 'pending_approval',
            ],

            // --- SECTION 5: HISTORY / COMPLETED WORK ORDERS ---
            [
                'work_order_number' => 'WO-2026-0010',
                'customer_name' => 'Malabar Gold & Diamonds',
                'client_code' => 'CL-1001',
                'product_code' => 'PROD-CHK-001',
                'product_name' => '22K Gold Ruby Studded Necklace',
                'karigar_code' => 'K-1003',
                'material_type' => 'Gold 22K (916)',
                'priority' => 'Normal',
                'allotted_date' => $today->copy()->subDays(20)->toDateString(),
                'delivery_date' => $today->copy()->subDays(12)->toDateString(),
                'allotted_weight' => 52.000,
                'completed_weight' => 51.500,
                'pending_weight' => 0.000,
                'wastage_weight' => 0.500,
                'wastage_allowed_percent' => 1.5,
                'making_charge_per_gram' => 110.0,
                'total_making_charges' => 5720.0,
                'total_price' => 356200.0,
                'current_stage' => 'completed',
                'status' => 'completed',
            ],
            [
                'work_order_number' => 'WO-2026-0011',
                'customer_name' => 'Kalyan Jewellers Showroom',
                'client_code' => 'CL-1002',
                'product_code' => 'PROD-SLV-006',
                'product_name' => 'Silver Handicraft Kada Bangle Pair',
                'karigar_code' => 'K-1005',
                'material_type' => 'Silver 925 Sterling',
                'priority' => 'Normal',
                'allotted_date' => $today->copy()->subDays(18)->toDateString(),
                'delivery_date' => $today->copy()->subDays(10)->toDateString(),
                'allotted_weight' => 140.000,
                'completed_weight' => 139.000,
                'pending_weight' => 0.000,
                'wastage_weight' => 1.000,
                'wastage_allowed_percent' => 1.0,
                'making_charge_per_gram' => 15.0,
                'total_making_charges' => 2100.0,
                'total_price' => 14420.0,
                'current_stage' => 'final_received',
                'status' => 'completed',
            ],
        ];

        foreach ($workOrdersData as $wo) {
            $cli = $clientsMap[$wo['client_code']] ?? null;
            $prod = $productsMap[$wo['product_code']] ?? null;
            $kar = $karigarsMap[$wo['karigar_code']] ?? null;

            unset($wo['client_code'], $wo['product_code'], $wo['karigar_code']);

            $wo['client_id'] = $cli?->id;
            $wo['product_id'] = $prod?->id;
            $wo['category_id'] = $prod?->category_id;
            $wo['subcategory_id'] = $prod?->subcategory_id;
            $wo['karigar_id'] = $kar?->id;
            $wo['karigar_name'] = $kar?->name;
            $wo['created_by'] = $adminUser->id;
            $wo['image_url'] = $prod?->image;
            $wo['design_code'] = 'DES-' . rand(1000, 9999);
            $wo['checklist'] = [
                'product_received' => true,
                'weight_verified' => true,
                'stone_verified' => true,
                'design_verified' => true,
                'work_completed' => in_array($wo['status'], ['completed', 'pending_approval']),
                'quality_checked' => in_array($wo['status'], ['completed']),
                'documents_verified' => true,
            ];

            $order = WorkOrder::updateOrCreate(
                ['work_order_number' => $wo['work_order_number']],
                $wo
            );

            // Create initial timeline event
            WorkOrderTimeline::updateOrCreate(
                [
                    'work_order_id' => $order->id,
                    'stage' => 'created',
                ],
                [
                    'stage_label' => 'Work Order Created',
                    'completed_weight_at_step' => 0,
                    'pending_weight_at_step' => $order->allotted_weight,
                    'status' => 'completed',
                    'notes' => 'Work Order created and material allocated.',
                    'user_id' => $adminUser->id,
                    'action_by_name' => $adminUser->name,
                    'created_at' => Carbon::parse($order->allotted_date),
                ]
            );

            // Assign timeline event
            if ($order->karigar_id) {
                WorkOrderTimeline::updateOrCreate(
                    [
                        'work_order_id' => $order->id,
                        'stage' => 'assigned',
                    ],
                    [
                        'stage_label' => "Assigned to Artisan ({$order->karigar_name})",
                        'completed_weight_at_step' => 0,
                        'pending_weight_at_step' => $order->allotted_weight,
                        'status' => 'completed',
                        'notes' => "Work order assigned to artisan {$order->karigar_name}.",
                        'user_id' => $adminUser->id,
                        'action_by_name' => $adminUser->name,
                        'created_at' => Carbon::parse($order->allotted_date)->addMinutes(10),
                    ]
                );

                WorkOrderNotification::updateOrCreate(
                    [
                        'work_order_id' => $order->id,
                        'karigar_id' => $order->karigar_id,
                        'type' => 'assigned',
                    ],
                    [
                        'title' => "Work Order Assigned: {$order->work_order_number}",
                        'message' => "Work Order {$order->work_order_number} ({$order->product_name}) assigned to Karigar {$order->karigar_name}.",
                        'data' => [
                            'order_id' => $order->id,
                            'work_order_number' => $order->work_order_number,
                            'product_name' => $order->product_name,
                            'allotted_weight' => $order->allotted_weight,
                            'status' => $order->status,
                            'target_role' => 'karigar',
                        ],
                        'is_read' => false,
                    ]
                );
            }
        }

        $this->command->info('Sample data seeded successfully across all modules!');
    }
}
