<?php
require 'vendor/autoload.php';
$app = require_once 'bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$updated = App\Models\PurchaseEntry::where('metal_type', 'diamond')
    ->where('purity', 'like', '%916%')
    ->update(['purity' => 'IGI']);

echo "Updated {$updated} diamond purchase records from 22K (916) to IGI.\n";

$diaPurchases = App\Models\PurchaseEntry::where('metal_type', 'diamond')->get();
foreach ($diaPurchases as $p) {
    echo "ID: {$p->id}, Item: {$p->item_name}, Purity/Stamp: {$p->purity}, Gross: {$p->weight}, Less: {$p->less_weight}, Net: {$p->net_weight}, Count: {$p->count_qty}\n";
}
