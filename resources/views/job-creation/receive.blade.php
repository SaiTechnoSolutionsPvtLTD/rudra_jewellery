@extends('layouts.app')

@section('title', 'Receive Work Order')

@section('content')
<div class="max-w-7xl mx-auto pb-10">
    
    <!-- Breadcrumbs & Header -->
    <div class="mb-6">
        <div class="text-[10px] font-medium text-gray-500 flex items-center gap-2 mb-2 uppercase tracking-wider">
            <a href="#" class="hover:text-[#b01622]">Manufacturing</a>
            <i class="fa-solid fa-chevron-right text-[8px]"></i>
            <a href="#" class="hover:text-[#b01622]">Job Orders</a>
            <i class="fa-solid fa-chevron-right text-[8px]"></i>
            <span class="text-gray-900">Reception</span>
        </div>
        
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3">
                <h1 class="text-2xl font-bold text-gray-900">Receive Work Order #WO-2024-0012</h1>
                <span class="px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 text-[10px] font-bold tracking-wider flex items-center gap-1">
                    <i class="fa-regular fa-folder-open text-[10px]"></i> In-Review
                </span>
            </div>
            <button class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors">
                Print Voucher
            </button>
        </div>
    </div>

    <!-- Assigned Artisan Summary -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
        <!-- Artisan -->
        <div class="flex items-center gap-4 flex-1 pb-4 md:pb-0 md:pr-4">
            <div class="w-12 h-12 rounded-full bg-red-50 text-[#b01622] flex items-center justify-center text-xl">
                <i class="fa-regular fa-user"></i>
            </div>
            <div>
                <div class="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-0.5">ASSIGNED ARTISAN</div>
                <div class="font-bold text-sm text-gray-900">Rajesh Vishwakarma</div>
                <div class="text-[10px] text-gray-500">Senior Goldsmith - Master Studio 4</div>
            </div>
        </div>
        <!-- Receive Date -->
        <div class="flex-1 py-4 md:py-0 md:px-4 flex items-center">
            <div>
                <div class="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">RECEIVE DATE</div>
                <div class="font-medium text-sm text-gray-900 flex items-center gap-2">
                    <i class="fa-regular fa-calendar text-[#b01622]"></i> October 24, 2024
                </div>
            </div>
        </div>
        <!-- Design Reference -->
        <div class="flex-1 py-4 md:py-0 md:px-4 flex items-center">
            <div>
                <div class="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">DESIGN REFERENCE CODE</div>
                <div class="font-bold text-sm text-[#b01622]">BR-SKU-9921</div>
            </div>
        </div>
        <!-- Estimated Delivery -->
        <div class="flex-1 pt-4 md:pt-0 md:pl-4 flex items-center">
            <div>
                <div class="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">ESTIMATED DELIVERY</div>
                <div class="font-medium text-sm text-gray-900 flex items-center gap-2">
                    <i class="fa-regular fa-calendar-check text-[#b01622]"></i> Oct 26, 2024
                </div>
            </div>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column -->
        <div class="lg:col-span-2 space-y-6">
            
            <!-- Weight Confirmation Table -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 class="text-sm font-semibold text-gray-900">Weight Confirmation Table</h2>
                    <span class="text-[10px] text-gray-500 flex items-center gap-1">
                        <i class="fa-solid fa-circle-info"></i> Allowed tolerance: ±0.05%
                    </span>
                </div>
                
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="text-[10px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
                                <th class="px-5 py-3 font-semibold">Material Type</th>
                                <th class="px-5 py-3 font-semibold text-center">Allocated<br>Weight</th>
                                <th class="px-5 py-3 font-semibold text-center">Received Weight</th>
                                <th class="px-5 py-3 font-semibold text-center">Wastage (g)</th>
                                <th class="px-5 py-3 font-semibold text-center">Wastage (%)</th>
                                <th class="px-5 py-3 font-semibold text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-gray-100">
                            <!-- Gold Row -->
                            <tr>
                                <td class="px-5 py-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded bg-yellow-50 text-yellow-600 flex items-center justify-center">
                                            <i class="fa-solid fa-layer-group"></i>
                                        </div>
                                        <div>
                                            <div class="font-medium text-gray-900">22K Yellow Gold</div>
                                            <div class="text-[9px] text-gray-500">BIS Hallmark Standard</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-5 py-4 text-center text-gray-600">124.50g</td>
                                <td class="px-5 py-4 text-center">
                                    <input type="text" value="122.12" class="w-20 bg-gray-50 text-center border border-gray-200 rounded px-2 py-1 text-xs text-gray-900 focus:outline-none focus:border-brand focus:bg-white">
                                </td>
                                <td class="px-5 py-4 text-center font-bold text-[#b01622]">2.38g</td>
                                <td class="px-5 py-4 text-center text-gray-600">1.91%</td>
                                <td class="px-5 py-4 text-center">
                                    <span class="inline-flex items-center gap-1 text-[10px] text-gray-500">
                                        <span class="w-1.5 h-1.5 rounded-full bg-[#b01622]"></span> Calculating
                                    </span>
                                </td>
                            </tr>
                            <!-- Diamond Row -->
                            <tr>
                                <td class="px-5 py-4">
                                    <div class="flex items-center gap-3">
                                        <div class="w-8 h-8 rounded bg-red-50 text-red-500 flex items-center justify-center">
                                            <i class="fa-regular fa-gem"></i>
                                        </div>
                                        <div>
                                            <div class="font-medium text-gray-900">Round Brilliant<br>Diamonds</div>
                                            <div class="text-[9px] text-gray-500">VVS1 Clarity • F Color</div>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-5 py-4 text-center text-gray-600">1.25ct</td>
                                <td class="px-5 py-4 text-center">
                                    <input type="text" placeholder="Enter cts" class="w-20 bg-gray-50 text-center border border-gray-200 rounded px-2 py-1 text-xs text-gray-400 focus:outline-none focus:border-brand focus:bg-white">
                                </td>
                                <td class="px-5 py-4 text-center text-gray-400">-</td>
                                <td class="px-5 py-4 text-center text-gray-400">-</td>
                                <td class="px-5 py-4 text-center">
                                    <span class="text-[10px] text-gray-400">Awaiting Input</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Tracking Timeline & Worker Time Wrapper -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Tracking Timeline -->
                <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:col-span-2">
                    <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-6">TRACKING TIMELINE</h2>
                    
                    <div class="flex justify-between items-start relative pb-4">
                        <div class="absolute top-4 left-6 right-6 h-px bg-gray-200 z-0"></div>
                        <div class="absolute top-4 left-6 w-1/3 h-px bg-gray-800 z-0"></div>
                        
                        <!-- Step 1 -->
                        <div class="relative z-10 flex flex-col items-center gap-2 text-center w-20">
                            <div class="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs shadow-sm">
                                <i class="fa-solid fa-check"></i>
                            </div>
                            <div>
                                <div class="text-[10px] font-bold text-gray-900 leading-tight">Job Created</div>
                                <div class="text-[9px] text-gray-500 mt-0.5">20 Apr 2026<br>09:15 AM</div>
                            </div>
                        </div>
                        
                        <!-- Step 2 -->
                        <div class="relative z-10 flex flex-col items-center gap-2 text-center w-20">
                            <div class="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center text-xs shadow-sm">
                                <i class="fa-solid fa-check"></i>
                            </div>
                            <div>
                                <div class="text-[10px] font-bold text-gray-900 leading-tight">Assigned</div>
                                <div class="text-[9px] text-gray-500 mt-0.5">20 Apr 2026<br>09:30 AM</div>
                            </div>
                        </div>
                        
                        <!-- Step 3 -->
                        <div class="relative z-10 flex flex-col items-center gap-2 text-center w-20">
                            <div class="w-8 h-8 rounded-full bg-white border border-gray-800 text-gray-800 flex items-center justify-center text-xs shadow-sm">
                                <i class="fa-solid fa-hammer"></i>
                            </div>
                            <div>
                                <div class="text-[10px] font-bold text-gray-900 leading-tight">Work Started</div>
                                <div class="text-[9px] text-gray-500 mt-0.5">20 Apr 2026<br>10:00 AM</div>
                            </div>
                        </div>
                        
                        <!-- Step 4 -->
                        <div class="relative z-10 flex flex-col items-center gap-2 text-center w-20 opacity-40">
                            <div class="w-8 h-8 rounded-full bg-white border border-gray-300 text-gray-300 flex items-center justify-center text-xs shadow-sm">
                                <i class="fa-solid fa-circle"></i>
                            </div>
                            <div>
                                <div class="text-[10px] font-bold text-gray-900 leading-tight">QC Pending</div>
                                <div class="text-[9px] text-gray-500 mt-0.5">-</div>
                            </div>
                        </div>
                        
                        <!-- Step 5 -->
                        <div class="relative z-10 flex flex-col items-center gap-2 text-center w-20 opacity-40">
                            <div class="w-8 h-8 rounded-full bg-white border border-gray-300 text-gray-300 flex items-center justify-center text-xs shadow-sm">
                                <i class="fa-solid fa-circle"></i>
                            </div>
                            <div>
                                <div class="text-[10px] font-bold text-gray-900 leading-tight">Ready</div>
                                <div class="text-[9px] text-gray-500 mt-0.5">-</div>
                            </div>
                        </div>

                        <!-- Step 6 -->
                        <div class="relative z-10 flex flex-col items-center gap-2 text-center w-20 opacity-40">
                            <div class="w-8 h-8 rounded-full bg-red-50 border border-red-200 text-[#b01622] flex items-center justify-center text-xs shadow-sm">
                                <i class="fa-solid fa-box"></i>
                            </div>
                            <div>
                                <div class="text-[10px] font-bold text-[#b01622] leading-tight">Delivered</div>
                                <div class="text-[9px] text-gray-500 mt-0.5">-</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Worker Time -->
                <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 md:col-span-2">
                    <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">WORKER TIME</h2>
                    
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div class="border border-gray-200 rounded p-3 text-center">
                            <div class="text-[9px] text-gray-500 uppercase tracking-wider mb-1">ASSIGNED TIME</div>
                            <div class="font-semibold text-sm text-gray-900">09:30 AM</div>
                        </div>
                        <div class="border border-gray-200 rounded p-3 text-center">
                            <div class="text-[9px] text-gray-500 uppercase tracking-wider mb-1">STARTED TIME</div>
                            <div class="font-semibold text-sm text-gray-900">10:00 AM</div>
                        </div>
                        <div class="border border-gray-100 bg-gray-50 rounded p-3 text-center opacity-50">
                            <div class="text-[9px] text-gray-500 uppercase tracking-wider mb-1">COMPLETED TIME</div>
                            <div class="font-semibold text-sm text-gray-400">--</div>
                        </div>
                        <div class="border border-gray-100 bg-gray-50 rounded p-3 text-center opacity-50">
                            <div class="text-[9px] text-gray-500 uppercase tracking-wider mb-1">TOTAL TIME</div>
                            <div class="font-semibold text-sm text-gray-400">--</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- QC & Return Wrapper -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- QC Checklist -->
                <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex flex-col">
                    <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">QC CHECKLIST</h2>
                    
                    <div class="space-y-4 flex-1">
                        <div class="flex items-center gap-3">
                            <div class="w-4 h-4 rounded bg-[#b01622] text-white flex items-center justify-center text-[10px]">
                                <i class="fa-solid fa-check"></i>
                            </div>
                            <span class="text-xs font-medium text-gray-900 w-24">Weight Verified</span>
                            <span class="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">Exact match</span>
                        </div>
                        
                        <div class="flex items-center gap-3 opacity-60">
                            <div class="w-4 h-4 rounded border border-gray-300"></div>
                            <span class="text-xs font-medium text-gray-700 w-24">Stone Count</span>
                            <input type="text" placeholder="Remarks..." class="flex-1 border-b border-gray-200 bg-transparent text-xs py-0.5 focus:outline-none">
                        </div>
                        
                        <div class="flex items-center gap-3 opacity-60">
                            <div class="w-4 h-4 rounded border border-gray-300"></div>
                            <span class="text-xs font-medium text-gray-700 w-24">Polish</span>
                        </div>
                        
                        <div class="flex items-center gap-3 opacity-60">
                            <div class="w-4 h-4 rounded border border-gray-300"></div>
                            <span class="text-xs font-medium text-gray-700 w-24">Hallmark</span>
                        </div>
                        
                        <div class="flex items-center gap-3 opacity-60">
                            <div class="w-4 h-4 rounded border border-gray-300"></div>
                            <span class="text-xs font-medium text-gray-700 w-24">Finish</span>
                        </div>
                    </div>
                    
                    <div class="flex gap-3 mt-6 pt-4 border-t border-gray-100">
                        <button class="flex-1 bg-gray-100 text-gray-400 text-xs font-medium py-2 rounded cursor-not-allowed">Approve</button>
                        <button class="flex-1 border border-[#b01622] text-[#b01622] hover:bg-red-50 text-xs font-medium py-2 rounded transition-colors">Reject / Return</button>
                    </div>
                </div>

                <!-- Return Details -->
                <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <h2 class="text-xs font-semibold text-[#b01622] uppercase tracking-wider mb-4">RETURN DETAILS <span class="text-gray-400 font-normal">(IF ANY)</span></h2>
                    
                    <div class="space-y-4">
                        <div>
                            <label class="block text-xs text-gray-700 mb-1.5">Return Reason</label>
                            <select class="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]">
                                <option>Select Reason</option>
                            </select>
                        </div>
                        
                        <div>
                            <label class="block text-xs text-gray-700 mb-1.5">Upload Return Photos</label>
                            <div class="border border-dashed border-[#b01622]/30 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-red-50/50 transition-colors bg-white">
                                <i class="fa-regular fa-image text-gray-400 text-lg mb-2"></i>
                                <div class="text-xs font-medium text-gray-700">Click to add photo</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- Right Column -->
        <div class="space-y-6">
            
            <!-- Job Summary -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">JOB SUMMARY</h2>
                
                <div class="space-y-3">
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-gray-500">Job ID</span>
                        <span class="font-medium text-gray-900">RJ-2026-000125</span>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-gray-500">Job Type</span>
                        <span class="font-medium text-gray-900">Gold Necklace</span>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-gray-500">Category</span>
                        <span class="font-medium text-gray-900">Necklace</span>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-gray-500">Material</span>
                        <span class="font-medium text-gray-900">Gold 22K</span>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-gray-500">Weight</span>
                        <span class="font-medium text-gray-900">25.500 gm</span>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-gray-500">Due Date</span>
                        <span class="font-medium text-gray-900">24 Apr 2026</span>
                    </div>
                    
                    <div class="pt-4 mt-2 border-t border-gray-100 flex justify-between items-center">
                        <span class="text-xs font-bold text-gray-900">Total Amount</span>
                        <span class="font-bold text-[#b01622] text-sm">₹ 1,49,175.00</span>
                    </div>
                </div>
            </div>

            <!-- Stone Count -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div class="flex items-center gap-2 mb-4">
                    <i class="fa-solid fa-cubes-stacked text-[#b01622]"></i>
                    <h2 class="text-xs font-semibold text-gray-900 uppercase tracking-wider">Stone Count</h2>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div class="bg-gray-50 rounded p-3">
                        <div class="text-[9px] text-gray-500 uppercase mb-1">Allocated</div>
                        <div class="text-xl font-bold text-gray-900">48</div>
                    </div>
                    <div class="bg-gray-50 rounded p-3">
                        <div class="text-[9px] text-gray-500 uppercase mb-1">Received</div>
                        <div class="text-xl font-bold text-gray-900">48</div>
                    </div>
                </div>
                
                <div class="flex items-center justify-between text-[10px] bg-green-50 text-green-700 px-3 py-2 rounded">
                    <span class="font-medium">Variance: 0</span>
                    <i class="fa-solid fa-circle-check"></i>
                </div>
            </div>

        </div>
    </div>
</div>
@endsection
