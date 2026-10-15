<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

echo "=== PRODUCT DG-987 ===\n";
$p = App\Models\Product::where('design_no', 'DG-987')->first();
if ($p) {
    echo json_encode($p->toArray(), JSON_PRETTY_PRINT) . "\n";
} else {
    echo "No product found with design DG-987\n";
}

echo "\n=== ALL PRODUCTS (first 5) ===\n";
foreach (App\Models\Product::take(5)->get() as $pr) {
    echo "ID: {$pr->id}, Name: {$pr->product_name}, Design: {$pr->design_no}, Karat: {$pr->gold_karat}, Stamp: {$pr->gold_stamp}, Purity: {$pr->gold_purity}\n";
    echo "Attributes: " . json_encode($pr->attributes_data ?? $pr->attributes) . "\n";
}
