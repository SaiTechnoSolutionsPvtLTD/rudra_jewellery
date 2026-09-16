<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

foreach (['client_orders', 'client_order_items', 'karigars', 'work_specifications', 'products'] as $table) {
    if (Illuminate\Support\Facades\Schema::hasTable($table)) {
        echo "=== TABLE: $table ===\n";
        $columns = Illuminate\Support\Facades\Schema::getColumnListing($table);
        echo implode(', ', $columns) . "\n\n";
    }
}
