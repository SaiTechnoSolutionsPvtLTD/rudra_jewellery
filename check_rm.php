<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$rm = App\Models\RawMaterial::find(10);
echo "RawMaterial 10:\n";
echo json_encode($rm->toArray(), JSON_PRETTY_PRINT) . "\n";

echo "\nMaterialOpeningStock for diamond:\n";
echo json_encode(App\Models\MaterialOpeningStock::where('material_type', 'diamond')->get()->toArray(), JSON_PRETTY_PRINT) . "\n";

echo "\nPurchases for diamond:\n";
echo json_encode(App\Models\PurchaseEntry::where('metal_type', 'diamond')->get()->toArray(), JSON_PRETTY_PRINT) . "\n";

echo "\nWorkOrderItems allocating diamond:\n";
$woItems = App\Models\WorkOrderItem::whereNotNull('diamond_weight')->orWhereNotNull('stone_details')->get();
foreach ($woItems as $wi) {
    echo "Item ID: {$wi->id}, WO ID: {$wi->work_order_id}, Product: {$wi->product_name}, Status: {$wi->status}\n";
    echo "  allotted_weight: {$wi->allotted_weight}, pricing: " . json_encode($wi->pricing_details) . "\n";
}

echo "\nWorkOrders allocating diamond:\n";
$wos = App\Models\WorkOrder::all();
foreach ($wos as $w) {
    if ($w->specifications && (isset($w->specifications['total_dia_cts']) || isset($w->specifications['diamond_weight']))) {
        echo "WO ID: {$w->id}, Number: {$w->work_order_number}, Status: {$w->status}, Specs: " . json_encode($w->specifications) . "\n";
    }
}
