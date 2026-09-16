<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\WorkOrder;
use App\Models\WorkOrderTimeline;
use App\Models\Karigar;
use App\Models\Product;
use Carbon\Carbon;

if (WorkOrder::count() == 0) {
    echo "Seeding initial sample work orders...\n";

    $p1 = Product::find(10) ?? Product::first();
    $k1 = Karigar::find(1) ?? Karigar::first();

    $wo1 = WorkOrder::create([
        'work_order_number' => 'WO-2026-0001',
        'product_id' => $p1?->id,
        'product_name' => $p1?->name ?? '22KT Traditional Peacock Choker Necklace',
        'category_id' => $p1?->category_id,
        'subcategory_id' => $p1?->subcategory_id,
        'karigar_id' => $k1?->id,
        'karigar_name' => $k1?->name ?? 'Rajesh Varma',
        'material_type' => 'Gold 22K (916)',
        'priority' => 'Urgent (Tier 1)',
        'allotted_date' => Carbon::now()->subDays(5)->toDateString(),
        'delivery_date' => Carbon::now()->addDays(2)->toDateString(),
        'allotted_weight' => 38.200,
        'completed_weight' => 38.200,
        'pending_weight' => 0.000,
        'expected_return_weight' => 38.200,
        'wastage_allowed_percent' => 2.5,
        'wastage_weight' => 0.450,
        'making_charge_per_gram' => 450,
        'total_making_charges' => 17190,
        'total_price' => 265000,
        'current_stage' => 'sent_for_approval',
        'status' => 'pending_approval',
        'quality_status' => 'pending',
        'checklist' => [
            'product_received' => true,
            'weight_verified' => true,
            'stone_verified' => true,
            'design_verified' => true,
            'work_completed' => true,
            'quality_checked' => false,
            'documents_verified' => true,
        ],
        'stone_details' => [
            ['type' => 'Natural Ruby', 'expected' => 14, 'received' => 14, 'diff' => 0, 'notes' => 'Prong set tightly'],
            ['type' => 'Emerald Drops', 'expected' => 6, 'received' => 6, 'diff' => 0, 'notes' => 'Hanging verified'],
        ],
        'pricing_details' => [
            'metal_rate' => 6850,
            'making_charges' => 17190,
            'stone_cost' => 12000,
            'gst_amount' => 8825,
            'final_amount' => 265000
        ],
        'design_code' => 'NCK-RJ-9901',
        'image_url' => $p1?->image ?? $p1?->thumbnail ?? '/placeholder-jewelry.png',
        'notes' => 'Peacock choker with antique red meenakari enamel work and certified temple gems.',
        'created_by' => 1,
    ]);

    WorkOrderTimeline::create([
        'work_order_id' => $wo1->id,
        'stage' => 'created',
        'stage_label' => 'Work Order Created',
        'completed_weight_at_step' => 0,
        'pending_weight_at_step' => 38.200,
        'notes' => 'Work order initiated.',
        'action_by_name' => 'Admin',
        'created_at' => Carbon::now()->subDays(5),
    ]);

    WorkOrderTimeline::create([
        'work_order_id' => $wo1->id,
        'stage' => 'work_completed',
        'stage_label' => 'Work Completed by Artisan',
        'completed_weight_at_step' => 38.200,
        'pending_weight_at_step' => 0,
        'notes' => 'Crafting finished. All gems mounted.',
        'action_by_name' => 'Receiver',
        'created_at' => Carbon::now()->subHours(4),
    ]);

    // Order 2: In progress
    $p2 = Product::find(8) ?? Product::first();
    $k2 = Karigar::find(2) ?? Karigar::first();

    $wo2 = WorkOrder::create([
        'work_order_number' => 'WO-2026-0002',
        'product_id' => $p2?->id,
        'product_name' => $p2?->name ?? '22KT Royal Temple Antique Kada Bangles (Pair)',
        'category_id' => $p2?->category_id,
        'subcategory_id' => $p2?->subcategory_id,
        'karigar_id' => $k2?->id,
        'karigar_name' => $k2?->name ?? 'Suresh Achari',
        'material_type' => 'Gold 22K (916)',
        'priority' => 'Normal',
        'allotted_date' => Carbon::now()->subDays(3)->toDateString(),
        'delivery_date' => Carbon::now()->addDays(5)->toDateString(),
        'allotted_weight' => 28.500,
        'completed_weight' => 18.000,
        'pending_weight' => 10.500,
        'expected_return_weight' => 28.500,
        'wastage_allowed_percent' => 2.0,
        'wastage_weight' => 0.200,
        'making_charge_per_gram' => 380,
        'total_making_charges' => 10830,
        'total_price' => 198000,
        'current_stage' => 'work_in_progress',
        'status' => 'ongoing',
        'checklist' => [
            'product_received' => true,
            'weight_verified' => true,
            'stone_verified' => true,
            'design_verified' => true,
            'work_completed' => false,
            'quality_checked' => false,
            'documents_verified' => true,
        ],
        'stone_details' => [],
        'pricing_details' => [
            'metal_rate' => 6850,
            'making_charges' => 10830,
            'stone_cost' => 0,
            'gst_amount' => 6250,
            'final_amount' => 198000
        ],
        'design_code' => 'BGL-RJ-4022',
        'image_url' => $p2?->image ?? $p2?->thumbnail ?? '/placeholder-jewelry.png',
        'notes' => 'Antique screw-lock kada pair with Gajraj elephant heads motif.',
        'created_by' => 1,
    ]);

    WorkOrderTimeline::create([
        'work_order_id' => $wo2->id,
        'stage' => 'work_in_progress',
        'stage_label' => 'Work in Progress',
        'completed_weight_at_step' => 18.000,
        'pending_weight_at_step' => 10.500,
        'notes' => 'Outer rim embossed. Hinge casting under progress.',
        'action_by_name' => 'Suresh Achari',
        'created_at' => Carbon::now()->subDays(1),
    ]);

    // Order 3: Delayed
    $p3 = Product::find(7) ?? Product::first();
    $k3 = Karigar::find(4) ?? Karigar::first();

    $wo3 = WorkOrder::create([
        'work_order_number' => 'WO-2026-0003',
        'product_id' => $p3?->id,
        'product_name' => $p3?->name ?? '22KT Test Gold Necklace',
        'category_id' => $p3?->category_id,
        'subcategory_id' => $p3?->subcategory_id,
        'karigar_id' => $k3?->id,
        'karigar_name' => $k3?->name ?? 'Babu Mistry',
        'material_type' => 'Gold 22K (916)',
        'priority' => 'High',
        'allotted_date' => Carbon::now()->subDays(8)->toDateString(),
        'delivery_date' => Carbon::now()->subDays(2)->toDateString(), // Overdue by 2 days!
        'allotted_weight' => 12.497,
        'completed_weight' => 4.000,
        'pending_weight' => 8.497,
        'expected_return_weight' => 12.497,
        'wastage_allowed_percent' => 1.8,
        'wastage_weight' => 0.100,
        'making_charge_per_gram' => 350,
        'total_making_charges' => 4373,
        'total_price' => 88000,
        'current_stage' => 'work_started',
        'status' => 'ongoing',
        'design_code' => 'NCK-GOL-6085',
        'image_url' => $p3?->image ?? $p3?->thumbnail ?? '/placeholder-jewelry.png',
        'notes' => 'Choker chain link repair and safety lock replacement.',
        'created_by' => 1,
    ]);

    // Order 4: Ready for final receive
    $p4 = Product::find(9) ?? Product::first();
    $k4 = Karigar::find(3) ?? Karigar::first();

    $wo4 = WorkOrder::create([
        'work_order_number' => 'WO-2026-0004',
        'product_id' => $p4?->id,
        'product_name' => $p4?->name ?? '18KT Solitaire Diamond Engagement Ring',
        'category_id' => $p4?->category_id,
        'subcategory_id' => $p4?->subcategory_id,
        'karigar_id' => $k4?->id,
        'karigar_name' => $k4?->name ?? 'Gopal Das',
        'material_type' => 'Gold 18K / Diamond',
        'priority' => 'Normal',
        'allotted_date' => Carbon::now()->subDays(7)->toDateString(),
        'delivery_date' => Carbon::now()->subDays(1)->toDateString(),
        'allotted_weight' => 4.650,
        'completed_weight' => 4.650,
        'pending_weight' => 0.000,
        'expected_return_weight' => 4.650,
        'wastage_allowed_percent' => 1.0,
        'wastage_weight' => 0.020,
        'making_charge_per_gram' => 800,
        'total_making_charges' => 3720,
        'total_price' => 68000,
        'current_stage' => 'ready',
        'status' => 'ready',
        'quality_status' => 'passed',
        'quality_checked_at' => Carbon::now()->subDays(1),
        'approved_at' => Carbon::now()->subDays(1),
        'design_code' => 'RNG-SOL-1003',
        'image_url' => $p4?->image ?? $p4?->thumbnail ?? '/placeholder-jewelry.png',
        'notes' => '1.02 ct Solitaire prong set in 18KT Rose Gold mount. VVS1 Certified.',
        'created_by' => 1,
    ]);

    echo "Seeded 4 sample work orders successfully!\n";
} else {
    echo "Work orders already present (" . WorkOrder::count() . " records).\n";
}
