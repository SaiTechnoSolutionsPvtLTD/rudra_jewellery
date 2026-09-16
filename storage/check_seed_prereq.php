<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$karigars = App\Models\Karigar::take(5)->get(['id', 'name', 'karigar_code', 'workshop_name']);
echo "Karigars count: " . $karigars->count() . "\n";
foreach ($karigars as $k) {
    echo "- ID: {$k->id}, Name: {$k->name}, Code: {$k->karigar_code}\n";
}

$products = App\Models\Product::take(5)->get(['id', 'name', 'product_code', 'category_id', 'subcategory_id', 'image']);
echo "Products count: " . $products->count() . "\n";
foreach ($products as $p) {
    echo "- ID: {$p->id}, Name: {$p->name}, Code: {$p->product_code}\n";
}
