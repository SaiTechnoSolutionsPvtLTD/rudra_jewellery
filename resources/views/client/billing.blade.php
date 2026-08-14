@extends('layouts.app')

@section('title', 'Billing Dashboard')

@section('content')
<div class="max-w-7xl mx-auto pb-10">
    
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
            <div class="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                <span>Administrative Portal</span>
                <i class="fa-solid fa-chevron-right text-[8px]"></i>
                <span class="text-[#b01622]">Billing Overview</span>
            </div>
            <h1 class="text-2xl font-bold text-gray-900">Billing Dashboard</h1>
        </div>
        <div class="flex items-center gap-4">
            <button class="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-[13px] font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors">
                <i class="fa-solid fa-filter text-gray-400 text-xs"></i>
                Month
                <i class="fa-solid fa-chevron-down text-gray-400 text-[10px] ml-1"></i>
            </button>
            <button class="px-4 py-2.5 border border-[#b01622] text-[#b01622] rounded-md text-[13px] font-semibold hover:bg-red-50 transition-colors shadow-sm flex items-center gap-2">
                <i class="fa-solid fa-arrow-up-from-bracket"></i> Export Report
            </button>
            <button class="px-4 py-2.5 bg-[#b01622] text-white rounded-md text-[13px] font-semibold hover:bg-[#90121b] transition-colors shadow-sm flex items-center gap-2">
                <i class="fa-solid fa-plus"></i> Create Invoice
            </button>
        </div>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <!-- Card 1 -->
        <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-[#b01622]">
                    <i class="fa-solid fa-receipt"></i>
                </div>
                <span class="text-[13px] font-medium text-gray-500">Today Invoices</span>
            </div>
            <div class="text-2xl font-bold text-gray-900 mb-2">1,254</div>
            <div class="flex items-center text-[11px]">
                <span class="text-green-500 flex items-center gap-1 font-semibold"><i class="fa-solid fa-arrow-trend-up"></i> 10.2%</span>
                <span class="text-gray-400 ml-1.5">vs last month</span>
            </div>
        </div>
        <!-- Card 2 -->
        <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-8 h-8 rounded bg-amber-50 flex items-center justify-center text-amber-500">
                    <i class="fa-solid fa-money-bill-1-wave"></i>
                </div>
                <span class="text-[13px] font-medium text-gray-500">Today's Billings</span>
            </div>
            <div class="text-2xl font-bold text-gray-900 mb-2">28.75 L</div>
            <div class="flex items-center text-[11px]">
                <span class="text-green-500 flex items-center gap-1 font-semibold"><i class="fa-solid fa-arrow-trend-up"></i> 15.5%</span>
                <span class="text-gray-400 ml-1.5">vs yesterday</span>
            </div>
        </div>
        <!-- Card 3 -->
        <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-[#b01622]">
                    <i class="fa-solid fa-file-invoice"></i>
                </div>
                <span class="text-[13px] font-medium text-gray-500">Pending Bills</span>
            </div>
            <div class="text-2xl font-bold text-gray-900 mb-2">₹ 12.45 L</div>
            <div class="flex items-center text-[11px]">
                <span class="text-red-500 flex items-center gap-1 font-semibold"><i class="fa-solid fa-arrow-trend-down"></i> 5.3%</span>
                <span class="text-gray-400 ml-1.5">vs last month</span>
            </div>
        </div>
        <!-- Card 4 -->
        <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div class="flex items-center gap-3 mb-3">
                <div class="w-8 h-8 rounded bg-amber-50 flex items-center justify-center text-amber-500">
                    <i class="fa-solid fa-user-plus"></i>
                </div>
                <span class="text-[13px] font-medium text-gray-500">Total Revenue (FY)</span>
            </div>
            <div class="text-2xl font-bold text-gray-900 mb-2">14.2 Cr</div>
            <div class="flex items-center text-[11px]">
                <span class="text-green-500 flex items-center gap-1 font-semibold"><i class="fa-solid fa-arrow-trend-up"></i> 8.2%</span>
                <span class="text-gray-400 ml-1.5">vs last year</span>
            </div>
        </div>
    </div>

    <!-- Filters Bar -->
    <div class="bg-white rounded-t-xl border-x border-t border-gray-100 p-5 pb-0 flex flex-wrap items-end gap-5">
        <div class="flex-1 min-w-[150px]">
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Date Range</label>
            <button class="w-full text-left px-3 py-2.5 bg-white border border-gray-200 rounded-md text-[13px] text-gray-700 flex items-center gap-2 focus:outline-none focus:border-[#b01622]">
                <i class="fa-regular fa-calendar text-gray-400"></i> Last 30 Days
            </button>
        </div>
        <div class="flex-1 min-w-[150px]">
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Client Tier</label>
            <div class="relative">
                <select class="w-full bg-white border border-gray-200 rounded-md pl-3 pr-8 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-[#b01622] appearance-none">
                    <option>All Tiers</option>
                </select>
                <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none"></i>
            </div>
        </div>
        <div class="flex-1 min-w-[150px]">
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Payment Status</label>
            <div class="relative">
                <select class="w-full bg-white border border-gray-200 rounded-md pl-3 pr-8 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-[#b01622] appearance-none">
                    <option>All Status</option>
                </select>
                <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none"></i>
            </div>
        </div>
        <div class="flex-1 min-w-[150px]">
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Invoice Type</label>
            <div class="relative">
                <select class="w-full bg-white border border-gray-200 rounded-md pl-3 pr-8 py-2.5 text-[13px] text-gray-700 focus:outline-none focus:border-[#b01622] appearance-none">
                    <option>B2B Tax Invoice</option>
                </select>
                <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none"></i>
            </div>
        </div>
        <div class="flex items-center gap-4 mb-[2px]">
            <button class="px-4 py-2.5 bg-[#b01622] text-white rounded-md text-[13px] font-semibold hover:bg-[#90121b] transition-colors shadow-sm flex items-center gap-2">
                <i class="fa-solid fa-align-left"></i> Quick Add Clients
            </button>
            <a href="#" class="text-[13px] font-medium text-gray-500 hover:text-gray-800">Reset</a>
        </div>
    </div>

    <!-- Table Card -->
    <div class="bg-white border border-gray-100 rounded-b-xl shadow-sm mt-5">
        
        <div class="px-6 py-5 flex items-center justify-between border-b border-gray-100">
            <h2 class="text-[15px] font-bold text-gray-900">Recent Invoices</h2>
            <span class="text-[11px] text-gray-500">Showing 1-10 of 1,254 entries</span>
        </div>

        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="text-gray-700 text-[11px] uppercase tracking-wider font-bold border-b border-gray-100">
                        <th class="py-4 px-6">Invoice ID</th>
                        <th class="py-4 px-6">Client Details</th>
                        <th class="py-4 px-6">Date</th>
                        <th class="py-4 px-6">Amount</th>
                        <th class="py-4 px-6">GST</th>
                        <th class="py-4 px-6">Total</th>
                        <th class="py-4 px-6 text-center">Status</th>
                        <th class="py-4 px-6 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 text-[13px]">
                    <!-- Row 1 -->
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-4 px-6 font-bold text-[#b01622] whitespace-nowrap">INV- 2026-1254</td>
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-[#fcefb4] text-[#b48a04] flex items-center justify-center font-bold text-[11px] shrink-0">MS</div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <div class="font-bold text-gray-900 whitespace-nowrap">Meera Singhania</div>
                                        <span class="px-1.5 py-0.5 rounded bg-[#fbdc69] text-gray-900 text-[8px] font-bold uppercase tracking-wider">Elite</span>
                                    </div>
                                    <div class="text-[11px] text-gray-500">meera.s@regal.com</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-6 text-gray-600 whitespace-nowrap">23<br>Jul,2026</td>
                        <td class="py-4 px-6 text-gray-900 font-medium whitespace-nowrap">₹ 85,000</td>
                        <td class="py-4 px-6 text-gray-900 font-medium whitespace-nowrap">₹ 4,250</td>
                        <td class="py-4 px-6 text-gray-900 font-bold whitespace-nowrap">₹ 89,250</td>
                        <td class="py-4 px-6 text-center">
                            <div class="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eef8f2]">
                                <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                <span class="text-green-600 font-bold text-[9px] uppercase tracking-wider">Paid</span>
                            </div>
                        </td>
                        <td class="py-4 px-6">
                            <div class="flex items-center justify-center gap-3 text-gray-400">
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye"></i></button>
                                <button class="hover:text-gray-700 transition-colors hidden"><i class="fa-regular fa-pen-to-square"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-print"></i></button>
                                <button class="hover:text-[#b01622] transition-colors"><i class="fa-regular fa-trash-can text-[#b01622]"></i></button>
                            </div>
                        </td>
                    </tr>
                    <!-- Row 2 -->
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-4 px-6 font-bold text-[#b01622] whitespace-nowrap">INV- 2026-1254</td>
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-[#f0f0f0] text-gray-500 flex items-center justify-center font-bold text-[11px] shrink-0">RK</div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <div class="font-bold text-gray-900 whitespace-nowrap">Rajesh Khanna</div>
                                        <span class="px-1.5 py-0.5 rounded bg-[#e3e3e3] text-gray-900 text-[8px] font-bold uppercase tracking-wider">Gold</span>
                                    </div>
                                    <div class="text-[11px] text-gray-500">khanna.r@rkgroup.in</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-6 text-gray-600 whitespace-nowrap">23<br>Jul,2026</td>
                        <td class="py-4 px-6 text-gray-900 font-medium whitespace-nowrap">₹ 1,25,000</td>
                        <td class="py-4 px-6 text-gray-900 font-medium whitespace-nowrap">₹ 6,250</td>
                        <td class="py-4 px-6 text-gray-900 font-bold whitespace-nowrap">₹ 1,31,250</td>
                        <td class="py-4 px-6 text-center">
                            <div class="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fdf2f2]">
                                <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                                <span class="text-red-600 font-bold text-[9px] uppercase tracking-wider">Pending</span>
                            </div>
                        </td>
                        <td class="py-4 px-6">
                            <div class="flex items-center justify-center gap-3 text-gray-400">
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-regular fa-pen-to-square"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-print"></i></button>
                                <button class="hover:text-[#b01622] transition-colors"><i class="fa-regular fa-trash-can text-[#b01622]"></i></button>
                            </div>
                        </td>
                    </tr>
                    <!-- Row 3 -->
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-4 px-6 font-bold text-[#b01622] whitespace-nowrap">INV- 2028-1254</td>
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-[#e8e8e8] text-gray-500 flex items-center justify-center font-bold text-[11px] shrink-0">AI</div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <div class="font-bold text-gray-900 whitespace-nowrap">Ananya Iyer</div>
                                        <span class="px-1.5 py-0.5 rounded bg-[#dedede] text-gray-900 text-[8px] font-bold uppercase tracking-wider">Silver</span>
                                    </div>
                                    <div class="text-[11px] text-gray-500">ananya.i@techcorp.com</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-6 text-gray-600 whitespace-nowrap">23<br>Jul,2026</td>
                        <td class="py-4 px-6 text-gray-900 font-medium whitespace-nowrap">₹ 56,750</td>
                        <td class="py-4 px-6 text-gray-900 font-medium whitespace-nowrap">₹ 2,838</td>
                        <td class="py-4 px-6 text-gray-900 font-bold whitespace-nowrap">₹ 59,588</td>
                        <td class="py-4 px-6 text-center">
                            <div class="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fff8eb]">
                                <span class="w-1.5 h-1.5 rounded-full bg-[#e9bc47]"></span>
                                <span class="text-[#e9bc47] font-bold text-[9px] uppercase tracking-wider">Partial</span>
                            </div>
                        </td>
                        <td class="py-4 px-6">
                            <div class="flex items-center justify-center gap-3 text-gray-400">
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-regular fa-pen-to-square"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-print"></i></button>
                                <button class="hover:text-[#b01622] transition-colors"><i class="fa-regular fa-trash-can text-[#b01622]"></i></button>
                            </div>
                        </td>
                    </tr>
                    <!-- Row 4 -->
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-4 px-6 font-bold text-[#b01622] whitespace-nowrap">INV- 2026-1254</td>
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-[#fcefb4] text-[#b48a04] flex items-center justify-center font-bold text-[11px] shrink-0">VM</div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <div class="font-bold text-gray-900 whitespace-nowrap">Vikram Malhotra</div>
                                        <span class="px-1.5 py-0.5 rounded bg-[#fbdc69] text-gray-900 text-[8px] font-bold uppercase tracking-wider">Elite</span>
                                    </div>
                                    <div class="text-[11px] text-gray-500">vikram.m@heritage.in</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-6 text-gray-600 whitespace-nowrap">23<br>Jul,2026</td>
                        <td class="py-4 px-6 text-gray-900 font-medium whitespace-nowrap">₹ 2,35,000</td>
                        <td class="py-4 px-6 text-gray-900 font-medium whitespace-nowrap">₹ 11,750</td>
                        <td class="py-4 px-6 text-gray-900 font-bold whitespace-nowrap">₹ 2,46,750</td>
                        <td class="py-4 px-6 text-center">
                            <div class="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eef8f2]">
                                <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                <span class="text-green-600 font-bold text-[9px] uppercase tracking-wider">Paid</span>
                            </div>
                        </td>
                        <td class="py-4 px-6">
                            <div class="flex items-center justify-center gap-3 text-gray-400">
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-regular fa-pen-to-square"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-print"></i></button>
                                <button class="hover:text-[#b01622] transition-colors"><i class="fa-regular fa-trash-can text-[#b01622]"></i></button>
                            </div>
                        </td>
                    </tr>
                    <!-- Row 5 -->
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-4 px-6 font-bold text-[#b01622] whitespace-nowrap">INV- 2026-1254</td>
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-[#f0f0f0] text-gray-500 flex items-center justify-center font-bold text-[11px] shrink-0">SR</div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <div class="font-bold text-gray-900 whitespace-nowrap">Sneha Reddy</div>
                                        <span class="px-1.5 py-0.5 rounded bg-[#e3e3e3] text-gray-900 text-[8px] font-bold uppercase tracking-wider">Gold</span>
                                    </div>
                                    <div class="text-[11px] text-gray-500">sneha@reddy.me</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-6 text-gray-600 whitespace-nowrap">23<br>Jul,2026</td>
                        <td class="py-4 px-6 text-gray-900 font-medium whitespace-nowrap">₹ 75,500</td>
                        <td class="py-4 px-6 text-gray-900 font-medium whitespace-nowrap">₹ 3,775</td>
                        <td class="py-4 px-6 text-gray-900 font-bold whitespace-nowrap">₹ 79,275</td>
                        <td class="py-4 px-6 text-center">
                            <div class="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-[#eef8f2]">
                                <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                <span class="text-green-600 font-bold text-[9px] uppercase tracking-wider">Paid</span>
                            </div>
                        </td>
                        <td class="py-4 px-6">
                            <div class="flex items-center justify-center gap-3 text-gray-400">
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-regular fa-pen-to-square"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-print"></i></button>
                                <button class="hover:text-[#b01622] transition-colors"><i class="fa-regular fa-trash-can text-[#b01622]"></i></button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="px-6 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-1">
                <button class="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 bg-white"><i class="fa-solid fa-chevron-left text-[10px]"></i></button>
                <button class="w-7 h-7 rounded bg-[#b01622] text-white flex items-center justify-center text-xs font-semibold shadow-sm">1</button>
                <button class="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 bg-white text-xs">2</button>
                <button class="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 bg-white text-xs">3</button>
                <span class="text-gray-400 text-xs px-1">...</span>
                <button class="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 bg-white text-xs">251</button>
                <button class="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 bg-white"><i class="fa-solid fa-chevron-right text-[10px]"></i></button>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-[11px] font-medium text-gray-500">Items per page:</span>
                <div class="relative">
                    <select class="border border-gray-200 bg-white rounded-md pl-2 pr-6 py-1.5 text-[11px] font-medium text-gray-700 focus:outline-none focus:border-[#b01622] appearance-none">
                        <option>10</option>
                    </select>
                    <i class="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none"></i>
                </div>
            </div>
        </div>

    </div>

</div>
@endsection
