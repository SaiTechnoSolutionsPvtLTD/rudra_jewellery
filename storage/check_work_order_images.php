<?php
require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\WorkOrder;
use App\Models\Product;

foreach (WorkOrder::all() as $wo) {
    echo "ID: {$wo->id}, WO#: {$wo->work_order_number}\n";
    echo "  wo->image_url: " . substr($wo->image_url ?? 'NULL', 0, 100) . "\n";
    echo "  wo->product->image: " . substr($wo->product?->image ?? 'NULL', 0, 100) . "\n";
    echo "  wo->product->image_url: " . substr($wo->product?->image_url ?? 'NULL', 0, 100) . "\n";
}
