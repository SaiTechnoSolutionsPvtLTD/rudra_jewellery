<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;

class JobController extends Controller
{
    public function getNewId()
    {
        return response()->json([
            'workOrderId' => 'WO-2024-0012'
        ]);
    }

    public function show($id)
    {
        return response()->json([
            'workOrderId' => $id,
            'artisan' => 'Rajesh Vishwakarma',
            'department' => 'Senior Goldsmith - Master Studio 4',
            'receiveDate' => 'October 24, 2024',
            'designCode' => 'BR-SKU-9921',
            'estimatedDelivery' => 'Oct 26, 2024',
            'itemType' => 'Royal Bridal Necklace',
            'quantity' => '01 Unit',
            'priority' => 'URGENT (Tier 1)',
            'summary' => [
                'jobId' => 'RJ-2026-000125',
                'jobType' => 'Gold Necklace',
                'category' => 'Necklace',
                'material' => 'Gold 22K',
                'weight' => '25.500 gm',
                'dueDate' => '24 Apr 2026',
                'totalAmount' => '₹ 1,49,175.00'
            ]
        ]);
    }

    public function store(Request $request)
    {
        return response()->json([
            'status' => 'success',
            'message' => 'Work order created successfully',
            'workOrderId' => $request->input('work_order_id', 'WO-2024-0012')
        ]);
    }
}
