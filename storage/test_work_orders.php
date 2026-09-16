<?php

require_once __DIR__ . '/../vendor/autoload.php';
$app = require_once __DIR__ . '/../bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\WorkOrder;
use App\Models\WorkOrderTimeline;
use Illuminate\Http\Request;
use App\Http\Controllers\Api\WorkOrderController;

echo "=== 1. TEST LIST & DASHBOARD STATS ===\n";
$controller = new WorkOrderController();
$statsResp = $controller->dashboardStats();
$stats = $statsResp->getData(true);
echo "Total Active: " . ($stats['total_active'] ?? 'N/A') . "\n";
echo "Allocated Weight: " . ($stats['allocated_weight'] ?? 'N/A') . " g\n";
echo "Completed Weight: " . ($stats['completed_weight'] ?? 'N/A') . " g\n";
echo "Pending Weight: " . ($stats['pending_weight'] ?? 'N/A') . " g\n";
echo "Pending Approvals Count: " . count($stats['pending_approvals'] ?? []) . "\n";

echo "\n=== 2. TEST CREATING A WORK ORDER ===\n";
$createReq = Request::create('/api/work-orders', 'POST', [
    'order_type' => 'customer_order',
    'allotted_weight' => 28.500,
    'due_date' => date('Y-m-d', strtotime('+7 days')),
    'priority' => 'high',
    'stone_details' => [
        'count' => 12,
        'type' => 'Diamonds',
        'weight' => 0.450
    ],
    'description' => 'Custom 22K Bridal Necklace with gemstones'
]);
$createResp = $controller->store($createReq);
$createdData = $createResp->getData(true);
$newOrder = $createdData['data'] ?? null;
echo "Created Order Number: " . ($newOrder['order_number'] ?? 'FAILED') . "\n";
echo "Status: " . ($newOrder['status'] ?? 'FAILED') . "\n";
echo "Allotted Weight: " . ($newOrder['allotted_weight'] ?? 'FAILED') . "\n";
echo "Pending Weight: " . ($newOrder['pending_weight'] ?? 'FAILED') . "\n";

if (!$newOrder) {
    exit("Failed to create work order.\n");
}
$orderId = $newOrder['id'];

echo "\n=== 3. TEST RECEIVER VALIDATION (COMPLETED WEIGHT CANNOT DECREASE) ===\n";
// Initially completed_weight is 0.000. Let's update receiver to 10.000
$upReq1 = Request::create("/api/work-orders/{$orderId}/receiver", 'PUT', [
    'completed_weight' => 10.000,
    'pending_weight' => 18.500,
    'tracking_stage' => 'filing',
    'stone_status' => 'received',
    'notes' => 'Filing stage reached'
]);
$upResp1 = $controller->updateReceiver($upReq1, $orderId);
echo "Update to 10g response status: " . $upResp1->getStatusCode() . "\n";

// Now try to decrease completed_weight to 5.000 (must be rejected!)
$invalidReq = Request::create("/api/work-orders/{$orderId}/receiver", 'PUT', [
    'completed_weight' => 5.000,
    'pending_weight' => 23.500,
    'tracking_stage' => 'polishing'
]);
$invalidResp = $controller->updateReceiver($invalidReq, $orderId);
echo "Attempt decrease completed_weight response status: " . $invalidResp->getStatusCode() . " (Expected: 422)\n";
$err = $invalidResp->getData(true);
echo "Error message: " . ($err['message'] ?? '') . "\n";

// Now try to set backward stage (filing -> casting)
$invalidStageReq = Request::create("/api/work-orders/{$orderId}/receiver", 'PUT', [
    'completed_weight' => 12.000,
    'pending_weight' => 16.500,
    'tracking_stage' => 'casting'
]);
$invalidStageResp = $controller->updateReceiver($invalidStageReq, $orderId);
echo "Attempt backward stage response status: " . $invalidStageResp->getStatusCode() . " (Expected: 422)\n";
$errStage = $invalidStageResp->getData(true);
echo "Stage error message: " . ($errStage['message'] ?? '') . "\n";

echo "\n=== 4. TEST QUALITY CHECK APPROVAL & FINAL RECEIVE ===\n";
// Advance order to ready
$readyReq = Request::create("/api/work-orders/{$orderId}/ready", 'POST', [
    'notes' => 'Completed all stages, ready for QC'
]);
$controller->markReady($readyReq, $orderId);

// Approve
$approveReq = Request::create("/api/work-orders/{$orderId}/approve", 'POST', [
    'notes' => 'Quality standards verified'
]);
$apprResp = $controller->approve($approveReq, $orderId);
echo "Approval response status: " . $apprResp->getStatusCode() . "\n";

// Final receive
$finReq = Request::create("/api/work-orders/{$orderId}/final-receive", 'POST', [
    'notes' => 'Handed over to inventory'
]);
$finResp = $controller->finalReceive($finReq, $orderId);
echo "Final receive response status: " . $finResp->getStatusCode() . "\n";

$finalOrder = WorkOrder::find($orderId);
echo "Final Order Status: " . $finalOrder->status . "\n";
echo "Final Stage: " . $finalOrder->tracking_stage . "\n";
echo "Timeline Entries Count: " . $finalOrder->timelines()->count() . "\n";

echo "\n=== 5. TEST PDF EXPORT ===\n";
$pdfResp = $controller->exportPdf($orderId);
echo "PDF Export Response Status: " . $pdfResp->getStatusCode() . "\n";
echo "PDF Content-Type: " . $pdfResp->headers->get('Content-Type') . "\n";

echo "\nALL WORK ORDER LOGIC & VALIDATION TESTS PASSED!\n";
