<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$tables = Illuminate\Support\Facades\Schema::getTableListing();
echo "Tables:\n";
foreach ($tables as $t) {
    echo "- $t\n";
}
