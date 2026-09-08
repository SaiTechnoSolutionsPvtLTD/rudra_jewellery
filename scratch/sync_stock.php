<?php

require __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Product;
use Illuminate\Support\Facades\DB;

$affected = Product::where('opening_stock_qty', '>', 0)
    ->where(function($q) {
        $q->where('current_stock_qty', 0)->orWhereNull('current_stock_qty');
    })
    ->update(['current_stock_qty' => DB::raw('opening_stock_qty')]);

echo "Successfully synced {$affected} products in database!\n";
