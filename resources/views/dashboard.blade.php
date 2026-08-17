@extends('layouts.app')

@section('title', 'Dashboard')

@section('content')
<div class="max-w-7xl mx-auto pb-10">
    
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
            <h1 class="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p class="text-sm text-gray-500 mt-1">Real-time Artisan performance and order distribution tracking.</p>
        </div>
        <div class="flex items-center gap-3">
            <button class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors">
                <i class="fa-solid fa-filter text-gray-400 text-xs"></i>
                Month
                <i class="fa-solid fa-chevron-down text-gray-400 text-[10px] ml-1"></i>
            </button>
            <button class="px-4 py-2 bg-white border border-[#b01622] text-[#b01622] rounded-md text-sm font-medium hover:bg-red-50 shadow-sm transition-colors">
                Download Report
            </button>
            <a href="{{ route('job.new') }}" class="px-4 py-2 bg-[#b01622] text-white rounded-md text-sm font-medium hover:bg-[#90121b] shadow-sm flex items-center gap-2 transition-colors">
                <i class="fa-solid fa-plus text-xs"></i>
                New Work Order
            </a>
        </div>
    </div>

    <!-- Summary Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <!-- Card 1 -->
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div class="flex justify-between items-start mb-2">
                <div class="w-10 h-10 rounded-md bg-red-50 flex items-center justify-center text-[#b01622]">
                    <i class="fa-solid fa-users-gear"></i>
                </div>
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                    +3 New
                </span>
            </div>
            <div>
                <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">ACTIVE ARTISANS</p>
                <div class="text-2xl font-bold text-gray-900 mb-1">42</div>
                <div class="flex items-center text-xs text-gray-500">
                    <span class="text-green-600 flex items-center gap-1 font-medium mr-1">
                        <i class="fa-solid fa-arrow-trend-up text-[10px]"></i> 12%
                    </span>
                    vs last month
                </div>
            </div>
        </div>

        <!-- Card 2 -->
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div class="w-10 h-10 rounded-md bg-orange-50 flex items-center justify-center text-orange-500 mb-2">
                <i class="fa-regular fa-calendar-minus"></i>
            </div>
            <div>
                <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">PENDING ORDERS</p>
                <div class="text-2xl font-bold text-gray-900 mb-1">18</div>
                <div class="flex items-center text-xs text-gray-500">
                    <span class="text-red-500 flex items-center gap-1 font-medium mr-1 bg-red-50 px-1.5 py-0.5 rounded">
                        <i class="fa-solid fa-triangle-exclamation text-[10px]"></i> 4
                    </span>
                    Overdue items
                </div>
            </div>
        </div>

        <!-- Card 3 -->
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div class="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center text-blue-500 mb-2">
                <i class="fa-solid fa-clipboard-check"></i>
            </div>
            <div>
                <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">QC PENDING</p>
                <div class="text-2xl font-bold text-gray-900 mb-1">18</div>
                <div class="flex items-center text-xs text-gray-500">
                    <span class="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium mr-1 flex items-center gap-1">
                        <i class="fa-solid fa-arrow-up text-[10px]"></i> 3
                    </span>
                    this week
                </div>
            </div>
        </div>

        <!-- Card 4 -->
        <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
            <div class="w-10 h-10 rounded-md bg-green-50 flex items-center justify-center text-green-600 mb-2">
                <i class="fa-solid fa-check-double"></i>
            </div>
            <div>
                <p class="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">COMPLETED JOBS</p>
                <div class="text-2xl font-bold text-gray-900 mb-1">64</div>
                <div class="flex items-center text-xs text-gray-500">
                    <i class="fa-solid fa-indian-rupee-sign mr-1 text-[10px]"></i> Value: 6,74,820
                </div>
            </div>
        </div>
    </div>

    <!-- Two Column Section -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        <!-- Left: Live Job Status -->
        <div class="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div class="p-5 border-b border-gray-200 flex justify-between items-center">
                <h2 class="text-base font-semibold text-gray-900">Live Job creation Status</h2>
                <a href="#" class="text-xs font-medium text-[#b01622] hover:underline">View Full Queue</a>
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left border-collapse">
                    <thead>
                        <tr class="bg-gray-50/50 border-b border-gray-200 text-[10px] uppercase tracking-wider text-gray-500">
                            <th class="px-5 py-3 font-semibold">ARTISAN NAME</th>
                            <th class="px-5 py-3 font-semibold">ORDER ID</th>
                            <th class="px-5 py-3 font-semibold">ITEM TYPE</th>
                            <th class="px-5 py-3 font-semibold">STAGE</th>
                            <th class="px-5 py-3 font-semibold">DUE DATE</th>
                            <th class="px-5 py-3 font-semibold text-right"></th>
                        </tr>
                    </thead>
                    <tbody class="text-sm divide-y divide-gray-100">
                        <!-- Row 1 -->
                        <tr class="hover:bg-gray-50/50 transition-colors">
                            <td class="px-5 py-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">RV</div>
                                    <span class="font-medium text-gray-900">Rajesh Varma</span>
                                </div>
                            </td>
                            <td class="px-5 py-4 text-gray-600">MO - 882</td>
                            <td class="px-5 py-4 text-gray-600">Bridal Necklace</td>
                            <td class="px-5 py-4">
                                <span class="inline-flex items-center px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-[10px] font-bold uppercase tracking-wider">
                                    STONE SETTING
                                </span>
                            </td>
                            <td class="px-5 py-4 text-gray-600">Oct 24, 2023</td>
                            <td class="px-5 py-4 text-right">
                                <button class="text-gray-400 hover:text-gray-600"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                            </td>
                        </tr>
                        <!-- Row 2 -->
                        <tr class="hover:bg-gray-50/50 transition-colors">
                            <td class="px-5 py-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">AK</div>
                                    <span class="font-medium text-gray-900">Amin Khan</span>
                                </div>
                            </td>
                            <td class="px-5 py-4 text-gray-600">MO - 901</td>
                            <td class="px-5 py-4 text-gray-600">Gold Filigree Cuff</td>
                            <td class="px-5 py-4">
                                <span class="inline-flex items-center px-2 py-1 rounded bg-green-100 text-green-800 text-[10px] font-bold uppercase tracking-wider">
                                    POLISHING
                                </span>
                            </td>
                            <td class="px-5 py-4 text-gray-600">Oct 26, 2023</td>
                            <td class="px-5 py-4 text-right">
                                <button class="text-gray-400 hover:text-gray-600"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                            </td>
                        </tr>
                        <!-- Row 3 -->
                        <tr class="hover:bg-gray-50/50 transition-colors">
                            <td class="px-5 py-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">MS</div>
                                    <span class="font-medium text-gray-900">Mohit Sharma</span>
                                </div>
                            </td>
                            <td class="px-5 py-4 text-gray-600">MO - 745</td>
                            <td class="px-5 py-4 text-gray-600">Solitaire Ring</td>
                            <td class="px-5 py-4">
                                <span class="inline-flex items-center px-2 py-1 rounded bg-red-100 text-red-800 text-[10px] font-bold uppercase tracking-wider">
                                    CASTING
                                </span>
                            </td>
                            <td class="px-5 py-4 text-[#b01622] font-medium">Oct 20, 2023</td>
                            <td class="px-5 py-4 text-right">
                                <button class="text-gray-400 hover:text-gray-600"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                            </td>
                        </tr>
                        <!-- Row 4 -->
                        <tr class="hover:bg-gray-50/50 transition-colors border-transparent">
                            <td class="px-5 py-4">
                                <div class="flex items-center gap-3">
                                    <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">SL</div>
                                    <span class="font-medium text-gray-900">Suresh Lal</span>
                                </div>
                            </td>
                            <td class="px-5 py-4 text-gray-600">MO - 912</td>
                            <td class="px-5 py-4 text-gray-600">Temple Earring Set</td>
                            <td class="px-5 py-4">
                                <span class="inline-flex items-center px-2 py-1 rounded bg-orange-100 text-orange-800 text-[10px] font-bold uppercase tracking-wider">
                                    ENAMELING
                                </span>
                            </td>
                            <td class="px-5 py-4 text-gray-600">Oct 28, 2023</td>
                            <td class="px-5 py-4 text-right">
                                <button class="text-gray-400 hover:text-gray-600"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Right: Material Allocation -->
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <div class="p-5 border-b border-gray-200">
                <h2 class="text-base font-semibold text-gray-900">Material Allocation</h2>
            </div>
            <div class="p-5 flex-1 flex flex-col gap-6">
                <!-- Item 1 -->
                <div class="relative pl-3">
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500 rounded-full"></div>
                    <div class="flex justify-between items-start mb-1">
                        <div>
                            <div class="font-medium text-sm text-gray-900">Rajesh Varma</div>
                            <div class="text-[10px] text-gray-500 mt-0.5">22K Gold Issued</div>
                        </div>
                        <div class="text-right">
                            <div class="font-bold text-sm text-gray-900">342g</div>
                            <div class="text-[10px] text-gray-500 mt-0.5">Bal: 12g</div>
                        </div>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-1 mt-2">
                        <div class="bg-yellow-500 h-1 rounded-full" style="width: 85%"></div>
                    </div>
                </div>

                <!-- Item 2 -->
                <div class="relative pl-3">
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-gray-600 rounded-full"></div>
                    <div class="flex justify-between items-start mb-1">
                        <div>
                            <div class="font-medium text-sm text-gray-900">Amin Khan</div>
                            <div class="text-[10px] text-gray-500 mt-0.5">Fine Silver Issued</div>
                        </div>
                        <div class="text-right">
                            <div class="font-bold text-sm text-gray-900">1,250g</div>
                            <div class="text-[10px] text-gray-500 mt-0.5">Bal: 245g</div>
                        </div>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-1 mt-2">
                        <div class="bg-gray-600 h-1 rounded-full" style="width: 70%"></div>
                    </div>
                </div>

                <!-- Item 3 -->
                <div class="relative pl-3">
                    <div class="absolute left-0 top-0 bottom-0 w-1 bg-blue-300 rounded-full"></div>
                    <div class="flex justify-between items-start mb-1">
                        <div>
                            <div class="font-medium text-sm text-gray-900">Mohit Sharma</div>
                            <div class="text-[10px] text-gray-500 mt-0.5">Diamonds (VVS-1)</div>
                        </div>
                        <div class="text-right">
                            <div class="font-bold text-sm text-gray-900">14.5ct</div>
                            <div class="text-[10px] text-gray-500 mt-0.5">Bal: 0.2ct</div>
                        </div>
                    </div>
                    <div class="w-full bg-gray-100 rounded-full h-1 mt-2">
                        <div class="bg-blue-300 h-1 rounded-full" style="width: 95%"></div>
                    </div>
                </div>
            </div>
            <div class="p-4 border-t border-gray-100 mt-auto">
                <button class="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-md border border-gray-200 transition-colors">
                    Detailed Audit Log
                </button>
            </div>
        </div>
    </div>

    <!-- Quality Check Queue -->
    <div class="mb-6">
        <h2 class="text-base font-semibold text-gray-900 mb-4">Quality Check Queue (Final Approval)</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <!-- Product Card 1 -->
            <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col relative group">
                <div class="absolute top-2 right-2 bg-white px-2 py-0.5 rounded text-[9px] font-bold text-gray-800 shadow-sm z-10 border border-gray-100 uppercase">Priority</div>
                <div class="h-40 bg-gray-100 relative overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1605100804763-247f66150ce8?auto=format&fit=crop&w=400&q=80" alt="Maharaja Ruby Set" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                <div class="p-4 flex flex-col flex-1">
                    <div class="flex justify-between items-start mb-1">
                        <h3 class="text-sm font-semibold text-gray-900 truncate pr-2">Maharaja Ruby Set</h3>
                        <span class="text-[9px] text-gray-500 whitespace-nowrap pt-0.5">QC-441</span>
                    </div>
                    <p class="text-[10px] text-gray-500 mb-4">Artisan: Suresh Lal</p>
                    <div class="flex gap-2 mt-auto">
                        <button class="flex-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-medium py-1.5 rounded transition-colors">Approve</button>
                        <button class="flex-1 bg-white border border-red-500 hover:bg-red-50 text-red-600 text-[11px] font-medium py-1.5 rounded transition-colors">Reject</button>
                    </div>
                </div>
            </div>

            <!-- Product Card 2 -->
            <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col group">
                <div class="h-40 bg-gray-100 relative overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=400&q=80" alt="Diamond Drops" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                <div class="p-4 flex flex-col flex-1">
                    <div class="flex justify-between items-start mb-1">
                        <h3 class="text-sm font-semibold text-gray-900 truncate pr-2">Diamond Drops</h3>
                        <span class="text-[9px] text-gray-500 whitespace-nowrap pt-0.5">QC-445</span>
                    </div>
                    <p class="text-[10px] text-gray-500 mb-4">Artisan: Amin Khan</p>
                    <div class="flex gap-2 mt-auto">
                        <button class="flex-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-medium py-1.5 rounded transition-colors">Approve</button>
                        <button class="flex-1 bg-white border border-red-500 hover:bg-red-50 text-red-600 text-[11px] font-medium py-1.5 rounded transition-colors">Reject</button>
                    </div>
                </div>
            </div>

            <!-- Product Card 3 -->
            <div class="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col group">
                <div class="h-40 bg-gray-100 relative overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=400&q=80" alt="Antique Kangan" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
                </div>
                <div class="p-4 flex flex-col flex-1">
                    <div class="flex justify-between items-start mb-1">
                        <h3 class="text-sm font-semibold text-gray-900 truncate pr-2">Antique Kangan</h3>
                        <span class="text-[9px] text-gray-500 whitespace-nowrap pt-0.5">QC-448</span>
                    </div>
                    <p class="text-[10px] text-gray-500 mb-4">Artisan: Rajesh Varma</p>
                    <div class="flex gap-2 mt-auto">
                        <button class="flex-1 bg-green-600 hover:bg-green-700 text-white text-[11px] font-medium py-1.5 rounded transition-colors">Approve</button>
                        <button class="flex-1 bg-white border border-red-500 hover:bg-red-50 text-red-600 text-[11px] font-medium py-1.5 rounded transition-colors">Reject</button>
                    </div>
                </div>
            </div>

            <!-- More Items Card -->
            <div class="bg-[#fcfcfc] rounded-xl border border-dashed border-gray-300 hover:border-gray-400 hover:bg-gray-50 cursor-pointer overflow-hidden flex flex-col items-center justify-center min-h-[260px] transition-colors">
                <div class="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 mb-3">
                    <i class="fa-solid fa-plus text-lg"></i>
                </div>
                <h3 class="text-sm font-semibold text-gray-700">View 12 More Items</h3>
                <p class="text-[10px] text-gray-400 mt-1">Items waiting for floor manager<br>inspection</p>
            </div>
            
        </div>
    </div>

    <!-- Footer Status -->
    <div class="text-[13px] text-gray-500 mt-8 mb-4 flex justify-between items-center">
        <span>Showing 1 to 4 of 2,842 clients</span>
        <div class="hidden sm:flex gap-1">
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50 text-gray-400"><i class="fa-solid fa-chevron-left text-[10px]"></i></button>
            <button class="w-8 h-8 flex items-center justify-center border border-[#b01622] bg-[#b01622] text-white rounded">1</button>
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50 text-gray-600">2</button>
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50 text-gray-600">3</button>
            <span class="w-8 h-8 flex items-center justify-center text-gray-400">...</span>
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50 text-gray-600">142</button>
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded hover:bg-gray-50 text-gray-600"><i class="fa-solid fa-chevron-right text-[10px]"></i></button>
        </div>
    </div>
</div>
@endsection
