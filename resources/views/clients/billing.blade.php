@extends('layouts.app')

@section('title', 'Billing Dashboard')

@section('content')
<div class="max-w-7xl mx-auto pb-12">
    
    <!-- Top Breadcrumb & Header Bar -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
            <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                ADMINISTRATIVE PORTAL <span class="text-gray-300 mx-1">▸</span> <span class="text-gray-500">BILLING OVERVIEW</span>
            </div>
            <h1 class="text-2xl font-bold text-gray-900">Billing Dashboard</h1>
        </div>

        <div class="flex items-center gap-3">
            <button class="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm transition-colors">
                <i class="fa-solid fa-sliders text-sm"></i>
            </button>
            <button class="px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors">
                Month
                <i class="fa-solid fa-chevron-down text-gray-400 text-[10px]"></i>
            </button>

            <button onclick="exportBillingReport()" class="px-4 py-2.5 bg-white border border-[#b01622] text-[#b01622] hover:bg-red-50 text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors">
                <i class="fa-solid fa-arrow-up-from-bracket text-xs"></i>
                EXPORT REPORT
            </button>

            <button onclick="openCreateInvoiceModal()" class="px-4 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors">
                <i class="fa-solid fa-plus text-xs"></i>
                CREATE INVOICE
            </button>
        </div>
    </div>

    <!-- 4 Metric Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        
        <!-- Card 1: Today Invoices -->
        <div class="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div class="flex justify-between items-start mb-3">
                <div class="w-10 h-10 rounded-xl bg-red-50 text-[#b01622] flex items-center justify-center text-base">
                    <i class="fa-regular fa-file-lines"></i>
                </div>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 mb-1">Today Invoices</p>
                <div class="text-2xl font-bold text-gray-900 mb-1">1,254</div>
                <div class="flex items-center text-xs font-semibold text-emerald-600 gap-1">
                    <i class="fa-solid fa-arrow-trend-up text-[10px]"></i> 10.2% <span class="text-gray-400 font-normal">vs last month</span>
                </div>
            </div>
        </div>

        <!-- Card 2: Today's Billings -->
        <div class="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div class="flex justify-between items-start mb-3">
                <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-base">
                    <i class="fa-regular fa-credit-card"></i>
                </div>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 mb-1">Today's Billings</p>
                <div class="text-2xl font-bold text-gray-900 mb-1">28.75 L</div>
                <div class="flex items-center text-xs font-semibold text-emerald-600 gap-1">
                    <i class="fa-solid fa-arrow-trend-up text-[10px]"></i> 15.5% <span class="text-gray-400 font-normal">vs yesterday</span>
                </div>
            </div>
        </div>

        <!-- Card 3: Pending Bills -->
        <div class="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div class="flex justify-between items-start mb-3">
                <div class="w-10 h-10 rounded-xl bg-red-50 text-red-500 flex items-center justify-center text-base">
                    <i class="fa-regular fa-clock"></i>
                </div>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 mb-1">Pending Bills</p>
                <div class="text-2xl font-bold text-gray-900 mb-1">₹ 12.45 L</div>
                <div class="flex items-center text-xs font-semibold text-rose-500 gap-1">
                    <i class="fa-solid fa-arrow-trend-down text-[10px]"></i> 5.3% <span class="text-gray-400 font-normal">vs last month</span>
                </div>
            </div>
        </div>

        <!-- Card 4: Total Revenue (FY) -->
        <div class="bg-white p-5 rounded-xl border border-gray-200/80 shadow-sm flex flex-col justify-between">
            <div class="flex justify-between items-start mb-3">
                <div class="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-base">
                    <i class="fa-solid fa-user-plus"></i>
                </div>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 mb-1">Total Revenue (FY)</p>
                <div class="text-2xl font-bold text-gray-900 mb-1">14.2 Cr</div>
                <div class="flex items-center text-xs font-semibold text-emerald-600 gap-1">
                    <i class="fa-solid fa-arrow-trend-up text-[10px]"></i> 8.2% <span class="text-gray-400 font-normal">vs last year</span>
                </div>
            </div>
        </div>

    </div>

    <!-- Filters Bar Card -->
    <div class="bg-white rounded-xl border border-gray-200/80 shadow-sm p-4 mb-6">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            <!-- Filters Group -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 flex-1">
                <!-- Date Range -->
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">DATE RANGE</label>
                    <button class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center justify-between">
                        <span class="flex items-center gap-2">
                            <i class="fa-regular fa-calendar text-gray-400"></i>
                            Last 30 Days
                        </span>
                        <i class="fa-solid fa-chevron-down text-gray-400 text-[10px]"></i>
                    </button>
                </div>

                <!-- Client Tier -->
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">CLIENT TIER</label>
                    <select id="tierFilter" onchange="filterInvoicesTable()" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#b01622]">
                        <option value="all">All Tiers</option>
                        <option value="elite">Platinum Elite</option>
                        <option value="gold">Gold Member</option>
                        <option value="silver">Silver Member</option>
                    </select>
                </div>

                <!-- Payment Status -->
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">PAYMENT STATUS</label>
                    <select id="statusFilter" onchange="filterInvoicesTable()" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#b01622]">
                        <option value="all">All Status</option>
                        <option value="paid">Paid</option>
                        <option value="pending">Pending</option>
                        <option value="partial">Partial</option>
                    </select>
                </div>

                <!-- Invoice Type -->
                <div>
                    <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">INVOICE TYPE</label>
                    <select id="typeFilter" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:border-[#b01622]">
                        <option value="tax">B2B Tax Invoice</option>
                        <option value="retail">Retail Invoice</option>
                        <option value="proforma">Proforma Invoice</option>
                    </select>
                </div>
            </div>

            <!-- Right Buttons -->
            <div class="flex items-center gap-3 self-end lg:self-center">
                <a href="{{ route('clients.create') }}" class="px-4 py-2.5 bg-[#b01622] text-white text-xs font-bold rounded-lg hover:bg-[#90121b] transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap">
                    <i class="fa-solid fa-bars-staggered text-xs"></i>
                    Quick Add Clients
                </a>
                <button onclick="resetFilters()" class="text-xs font-bold text-gray-500 hover:text-gray-900 px-3 py-2.5 transition-colors">
                    Reset
                </button>
            </div>

        </div>
    </div>

    <!-- Table Section -->
    <div class="flex items-center justify-between mb-4">
        <h2 class="text-base font-bold text-gray-900">Recent Invoices</h2>
        <span class="text-xs text-gray-500">Showing 1-10 of 1,254 entries</span>
    </div>

    <!-- Invoices Table -->
    <div class="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden mb-6">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse" id="invoicesTable">
                <thead>
                    <tr class="bg-[#f6eee9] border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        <th class="px-6 py-4">INVOICE ID</th>
                        <th class="px-6 py-4">CLIENT DETAILS</th>
                        <th class="px-6 py-4">DATE</th>
                        <th class="px-6 py-4 text-right">AMOUNT</th>
                        <th class="px-6 py-4 text-right">GST</th>
                        <th class="px-6 py-4 text-right">TOTAL</th>
                        <th class="px-6 py-4 text-center">STATUS</th>
                        <th class="px-6 py-4 text-center">ACTIONS</th>
                    </tr>
                </thead>
                <tbody class="text-sm divide-y divide-gray-100" id="invoicesBody">
                    
                    <!-- Row 1: Meera Singhania -->
                    <tr class="invoice-row hover:bg-gray-50/60 transition-colors" data-status="paid" data-tier="elite">
                        <td class="px-6 py-4 font-bold text-[#b01622] text-xs">INV- 2026-1254</td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-[#fde68a] text-[#854d0e] flex items-center justify-center font-bold text-xs shrink-0">MS</div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="font-semibold text-gray-900 text-sm">Meera Singhania</span>
                                        <span class="bg-[#fde68a] text-[#854d0e] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">ELITE</span>
                                    </div>
                                    <div class="text-xs text-gray-400 mt-0.5">meera.s@regal.com</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-xs font-medium text-gray-600">23 Jul, 2026</td>
                        <td class="px-6 py-4 text-right font-medium text-gray-800">₹ 85,000</td>
                        <td class="px-6 py-4 text-right text-gray-500">₹ 4,250</td>
                        <td class="px-6 py-4 text-right font-bold text-gray-900">₹ 89,250</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> PAID
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <div class="flex items-center justify-center gap-2 text-gray-400">
                                <button onclick="viewInvoice('INV-2026-1254', 'Meera Singhania', '₹ 89,250', 'Paid')" class="p-1 hover:text-gray-700 transition-colors" title="View Invoice"><i class="fa-regular fa-eye text-sm"></i></button>
                                <button onclick="printInvoice('INV-2026-1254')" class="p-1 hover:text-gray-700 transition-colors" title="Print Invoice"><i class="fa-solid fa-print text-sm"></i></button>
                                <button onclick="deleteInvoiceRow(this)" class="p-1 hover:text-red-600 transition-colors" title="Delete Invoice"><i class="fa-regular fa-trash-can text-sm"></i></button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 2: Rajesh Khanna -->
                    <tr class="invoice-row hover:bg-gray-50/60 transition-colors" data-status="pending" data-tier="gold">
                        <td class="px-6 py-4 font-bold text-[#b01622] text-xs">INV- 2026-1254</td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">RK</div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="font-semibold text-gray-900 text-sm">Rajesh Khanna</span>
                                        <span class="bg-gray-200 text-gray-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">GOLD</span>
                                    </div>
                                    <div class="text-xs text-gray-400 mt-0.5">khanna.ra@rkgroup.in</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-xs font-medium text-gray-600">23 Jul, 2026</td>
                        <td class="px-6 py-4 text-right font-medium text-gray-800">₹1,25,000</td>
                        <td class="px-6 py-4 text-right text-gray-500">₹ 6,250</td>
                        <td class="px-6 py-4 text-right font-bold text-gray-900">₹ 1,31,250</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-flex items-center gap-1 bg-red-50 text-red-600 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase">
                                <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> PENDING
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <div class="flex items-center justify-center gap-2 text-gray-400">
                                <button onclick="viewInvoice('INV-2026-1254', 'Rajesh Khanna', '₹ 1,31,250', 'Pending')" class="p-1 hover:text-gray-700 transition-colors" title="View Invoice"><i class="fa-regular fa-eye text-sm"></i></button>
                                <button onclick="editInvoice('INV-2026-1254')" class="p-1 hover:text-gray-700 transition-colors" title="Edit Invoice"><i class="fa-regular fa-pen-to-square text-sm"></i></button>
                                <button onclick="printInvoice('INV-2026-1254')" class="p-1 hover:text-gray-700 transition-colors" title="Print Invoice"><i class="fa-solid fa-print text-sm"></i></button>
                                <button onclick="deleteInvoiceRow(this)" class="p-1 hover:text-red-600 transition-colors" title="Delete Invoice"><i class="fa-regular fa-trash-can text-sm"></i></button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 3: Ananya Iyer -->
                    <tr class="invoice-row hover:bg-gray-50/60 transition-colors" data-status="partial" data-tier="silver">
                        <td class="px-6 py-4 font-bold text-[#b01622] text-xs">INV- 2026-1254</td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">AI</div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="font-semibold text-gray-900 text-sm">Ananya Iyer</span>
                                        <span class="bg-gray-200 text-gray-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">SILVER</span>
                                    </div>
                                    <div class="text-xs text-gray-400 mt-0.5">ananya.i@techcorp.com</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-xs font-medium text-gray-600">23 Jul, 2026</td>
                        <td class="px-6 py-4 text-right font-medium text-gray-800">₹ 56,750</td>
                        <td class="px-6 py-4 text-right text-gray-500">₹ 2,838</td>
                        <td class="px-6 py-4 text-right font-bold text-gray-900">₹ 59,588</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> PARTIAL
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <div class="flex items-center justify-center gap-2 text-gray-400">
                                <button onclick="viewInvoice('INV-2026-1254', 'Ananya Iyer', '₹ 59,588', 'Partial')" class="p-1 hover:text-gray-700 transition-colors" title="View Invoice"><i class="fa-regular fa-eye text-sm"></i></button>
                                <button onclick="editInvoice('INV-2026-1254')" class="p-1 hover:text-gray-700 transition-colors" title="Edit Invoice"><i class="fa-regular fa-pen-to-square text-sm"></i></button>
                                <button onclick="printInvoice('INV-2026-1254')" class="p-1 hover:text-gray-700 transition-colors" title="Print Invoice"><i class="fa-solid fa-print text-sm"></i></button>
                                <button onclick="deleteInvoiceRow(this)" class="p-1 hover:text-red-600 transition-colors" title="Delete Invoice"><i class="fa-regular fa-trash-can text-sm"></i></button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 4: Vikram Malhotra -->
                    <tr class="invoice-row hover:bg-gray-50/60 transition-colors" data-status="paid" data-tier="elite">
                        <td class="px-6 py-4 font-bold text-[#b01622] text-xs">INV- 2026-1254</td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-[#fde68a] text-[#854d0e] flex items-center justify-center font-bold text-xs shrink-0">VM</div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="font-semibold text-gray-900 text-sm">Vikram Malhotra</span>
                                        <span class="bg-[#fde68a] text-[#854d0e] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">ELITE</span>
                                    </div>
                                    <div class="text-xs text-gray-400 mt-0.5">vikram.m@heritage.in</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-xs font-medium text-gray-600">23 Jul, 2026</td>
                        <td class="px-6 py-4 text-right font-medium text-gray-800">₹ 2,35,000</td>
                        <td class="px-6 py-4 text-right text-gray-500">₹ 11,750</td>
                        <td class="px-6 py-4 text-right font-bold text-gray-900">₹ 2,46,750</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> PAID
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <div class="flex items-center justify-center gap-2 text-gray-400">
                                <button onclick="viewInvoice('INV-2026-1254', 'Vikram Malhotra', '₹ 2,46,750', 'Paid')" class="p-1 hover:text-gray-700 transition-colors" title="View Invoice"><i class="fa-regular fa-eye text-sm"></i></button>
                                <button onclick="editInvoice('INV-2026-1254')" class="p-1 hover:text-gray-700 transition-colors" title="Edit Invoice"><i class="fa-regular fa-pen-to-square text-sm"></i></button>
                                <button onclick="printInvoice('INV-2026-1254')" class="p-1 hover:text-gray-700 transition-colors" title="Print Invoice"><i class="fa-solid fa-print text-sm"></i></button>
                                <button onclick="deleteInvoiceRow(this)" class="p-1 hover:text-red-600 transition-colors" title="Delete Invoice"><i class="fa-regular fa-trash-can text-sm"></i></button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 5: Sneha Reddy -->
                    <tr class="invoice-row hover:bg-gray-50/60 transition-colors" data-status="paid" data-tier="gold">
                        <td class="px-6 py-4 font-bold text-[#b01622] text-xs">INV- 2026-1254</td>
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center font-bold text-xs shrink-0">SR</div>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="font-semibold text-gray-900 text-sm">Sneha Reddy</span>
                                        <span class="bg-gray-200 text-gray-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">GOLD</span>
                                    </div>
                                    <div class="text-xs text-gray-400 mt-0.5">sneha@reddy.me</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 text-xs font-medium text-gray-600">23 Jul, 2026</td>
                        <td class="px-6 py-4 text-right font-medium text-gray-800">₹ 75,500</td>
                        <td class="px-6 py-4 text-right text-gray-500">₹ 3,775</td>
                        <td class="px-6 py-4 text-right font-bold text-gray-900">₹ 79,275</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> PAID
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <div class="flex items-center justify-center gap-2 text-gray-400">
                                <button onclick="viewInvoice('INV-2026-1254', 'Sneha Reddy', '₹ 79,275', 'Paid')" class="p-1 hover:text-gray-700 transition-colors" title="View Invoice"><i class="fa-regular fa-eye text-sm"></i></button>
                                <button onclick="editInvoice('INV-2026-1254')" class="p-1 hover:text-gray-700 transition-colors" title="Edit Invoice"><i class="fa-regular fa-pen-to-square text-sm"></i></button>
                                <button onclick="printInvoice('INV-2026-1254')" class="p-1 hover:text-gray-700 transition-colors" title="Print Invoice"><i class="fa-solid fa-print text-sm"></i></button>
                                <button onclick="deleteInvoiceRow(this)" class="p-1 hover:text-red-600 transition-colors" title="Delete Invoice"><i class="fa-regular fa-trash-can text-sm"></i></button>
                            </div>
                        </td>
                    </tr>

                </tbody>
            </table>
        </div>
    </div>

    <!-- Pagination Footer -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#8c7873]">
        <div class="flex items-center gap-1.5">
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-400 transition-colors">
                <i class="fa-solid fa-chevron-left text-[10px]"></i>
            </button>
            <button class="w-8 h-8 flex items-center justify-center border border-[#b01622] bg-[#b01622] text-white font-medium rounded-lg shadow-sm">
                1
            </button>
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                2
            </button>
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                3
            </button>
            <span class="w-8 h-8 flex items-center justify-center text-gray-400 font-medium">...</span>
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                251
            </button>
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
        </div>

        <div class="flex items-center gap-2 text-xs font-semibold text-gray-500">
            <span>Items per page:</span>
            <div class="relative">
                <select class="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 appearance-none pr-6 focus:outline-none focus:border-[#b01622]">
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                </select>
                <i class="fa-solid fa-chevron-down absolute right-2 top-1.5 text-[9px] text-gray-400 pointer-events-none"></i>
            </div>
        </div>
    </div>

</div>

<!-- CREATE INVOICE MODAL -->
<div id="createInvoiceModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
    <div class="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
        <div class="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
            <h3 class="text-lg font-bold text-gray-900">Create New Invoice</h3>
            <button onclick="closeCreateInvoiceModal()" class="text-gray-400 hover:text-gray-600 text-lg">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>

        <form onsubmit="handleCreateInvoiceSubmit(event)" class="space-y-4">
            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Select Client</label>
                <select id="modalClientSelect" required class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#b01622]">
                    <option value="Meera Singhania|meera.s@regal.com|elite">Meera Singhania (Platinum Elite)</option>
                    <option value="Rajesh Khanna|khanna.ra@rkgroup.in|gold">Rajesh Khanna (Gold Member)</option>
                    <option value="Ananya Iyer|ananya.i@techcorp.com|silver">Ananya Iyer (Silver Member)</option>
                    <option value="Vikram Malhotra|vikram.m@heritage.in|elite">Vikram Malhotra (Platinum Elite)</option>
                    <option value="Sneha Reddy|sneha@reddy.me|gold">Sneha Reddy (Gold Member)</option>
                </select>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">Amount (₹)</label>
                    <input type="number" id="modalAmount" required placeholder="85000" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#b01622]">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1">GST Rate (%)</label>
                    <input type="number" id="modalGst" value="5" required placeholder="5" class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#b01622]">
                </div>
            </div>

            <div>
                <label class="block text-xs font-semibold text-gray-700 mb-1">Payment Status</label>
                <select id="modalStatus" required class="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#b01622]">
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                </select>
            </div>

            <div class="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <button type="button" onclick="closeCreateInvoiceModal()" class="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">Cancel</button>
                <button type="submit" class="px-5 py-2 bg-[#b01622] hover:bg-[#90121b] text-white rounded-lg text-sm font-semibold shadow-sm">Generate Invoice</button>
            </div>
        </form>
    </div>
</div>

<!-- INVOICE PREVIEW MODAL -->
<div id="viewInvoiceModal" class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center hidden p-4">
    <div class="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
        <div class="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
            <div>
                <div class="text-xs font-bold text-[#b01622]" id="modalInvId">INV-2026-1254</div>
                <h3 class="text-base font-bold text-gray-900" id="modalInvClient">Meera Singhania</h3>
            </div>
            <button onclick="closeViewInvoiceModal()" class="text-gray-400 hover:text-gray-600 text-lg">
                <i class="fa-solid fa-xmark"></i>
            </button>
        </div>

        <div class="space-y-3 text-xs mb-6">
            <div class="flex justify-between py-1 border-b border-gray-50">
                <span class="text-gray-500">Invoice Date:</span>
                <span class="font-semibold text-gray-900">23 Jul, 2026</span>
            </div>
            <div class="flex justify-between py-1 border-b border-gray-50">
                <span class="text-gray-500">Payment Status:</span>
                <span class="font-bold text-emerald-600" id="modalInvStatus">Paid</span>
            </div>
            <div class="flex justify-between py-1 border-b border-gray-50">
                <span class="text-gray-500">Subtotal Amount:</span>
                <span class="font-semibold text-gray-900" id="modalInvSubtotal">₹ 85,000</span>
            </div>
            <div class="flex justify-between py-1 border-b border-gray-50">
                <span class="text-gray-500">GST Tax (5%):</span>
                <span class="font-semibold text-gray-900" id="modalInvGst">₹ 4,250</span>
            </div>
            <div class="flex justify-between py-2 text-sm font-bold bg-red-50 p-2.5 rounded-lg text-gray-900">
                <span>Total Amount:</span>
                <span class="text-[#b01622]" id="modalInvTotal">₹ 89,250</span>
            </div>
        </div>

        <div class="flex gap-2">
            <button onclick="printInvoice('INV-2026-1254')" class="flex-1 py-2 bg-[#b01622] text-white text-xs font-semibold rounded-lg hover:bg-[#90121b] transition-colors flex items-center justify-center gap-2">
                <i class="fa-solid fa-print"></i> Print Invoice
            </button>
            <button onclick="closeViewInvoiceModal()" class="px-4 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">Close</button>
        </div>
    </div>
</div>

@push('scripts')
<script>
    // Create Invoice Modal Controls
    function openCreateInvoiceModal() {
        document.getElementById('createInvoiceModal').classList.remove('hidden');
    }
    function closeCreateInvoiceModal() {
        document.getElementById('createInvoiceModal').classList.add('hidden');
    }

    // View Invoice Modal Controls
    function viewInvoice(id, client, total, status) {
        document.getElementById('modalInvId').textContent = id;
        document.getElementById('modalInvClient').textContent = client;
        document.getElementById('modalInvTotal').textContent = total;
        document.getElementById('modalInvStatus').textContent = status;
        document.getElementById('viewInvoiceModal').classList.remove('hidden');
    }
    function closeViewInvoiceModal() {
        document.getElementById('viewInvoiceModal').classList.add('hidden');
    }

    // Print Invoice Action
    function printInvoice(id) {
        alert('Printing Invoice ' + id + '...');
        window.print();
    }

    // Edit Invoice Action
    function editInvoice(id) {
        alert('Editing Invoice ' + id + '. You can update details in the modal or form.');
    }

    // Delete Invoice Row Action
    function deleteInvoiceRow(btn) {
        if(confirm('Are you sure you want to delete this invoice?')) {
            const row = btn.closest('tr');
            row.remove();
        }
    }

    // Export Billing Report Action
    function exportBillingReport() {
        const csvContent = "data:text/csv;charset=utf-8,Invoice ID,Client Name,Date,Amount,GST,Total,Status\nINV-2026-1254,Meera Singhania,23 Jul 2026,85000,4250,89250,Paid\nINV-2026-1254,Rajesh Khanna,23 Jul 2026,125000,6250,131250,Pending";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "billing_report_2026.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Dynamic Table Filtering by Tier & Status
    function filterInvoicesTable() {
        const tier = document.getElementById('tierFilter').value;
        const status = document.getElementById('statusFilter').value;
        const rows = document.querySelectorAll('.invoice-row');

        rows.forEach(row => {
            const rowTier = row.getAttribute('data-tier');
            const rowStatus = row.getAttribute('data-status');
            const matchTier = (tier === 'all' || rowTier === tier);
            const matchStatus = (status === 'all' || rowStatus === status);

            if (matchTier && matchStatus) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Reset Filters Action
    function resetFilters() {
        document.getElementById('tierFilter').value = 'all';
        document.getElementById('statusFilter').value = 'all';
        document.getElementById('typeFilter').value = 'tax';
        filterInvoicesTable();
    }

    // Add New Invoice to Table
    function handleCreateInvoiceSubmit(e) {
        e.preventDefault();
        const clientVal = document.getElementById('modalClientSelect').value.split('|');
        const clientName = clientVal[0];
        const clientEmail = clientVal[1];
        const clientTier = clientVal[2];
        const amount = parseFloat(document.getElementById('modalAmount').value) || 0;
        const gstRate = parseFloat(document.getElementById('modalGst').value) || 5;
        const gst = (amount * gstRate) / 100;
        const total = amount + gst;
        const status = document.getElementById('modalStatus').value;

        const initials = clientName.split(' ').map(n => n[0]).join('');
        const statusBadge = status === 'paid' 
            ? '<span class="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> PAID</span>'
            : (status === 'pending'
                ? '<span class="inline-flex items-center gap-1 bg-red-50 text-red-600 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase"><span class="w-1.5 h-1.5 rounded-full bg-red-500"></span> PENDING</span>'
                : '<span class="inline-flex items-center gap-1 bg-amber-50 text-amber-600 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> PARTIAL</span>');

        const newRowHTML = `
            <tr class="invoice-row hover:bg-gray-50/60 transition-colors" data-status="${status}" data-tier="${clientTier}">
                <td class="px-6 py-4 font-bold text-[#b01622] text-xs">INV- 2026-1254</td>
                <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full bg-[#fde68a] text-[#854d0e] flex items-center justify-center font-bold text-xs shrink-0">${initials}</div>
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="font-semibold text-gray-900 text-sm">${clientName}</span>
                                <span class="bg-[#fde68a] text-[#854d0e] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">${clientTier}</span>
                            </div>
                            <div class="text-xs text-gray-400 mt-0.5">${clientEmail}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 text-xs font-medium text-gray-600">Today</td>
                <td class="px-6 py-4 text-right font-medium text-gray-800">₹ ${amount.toLocaleString()}</td>
                <td class="px-6 py-4 text-right text-gray-500">₹ ${gst.toLocaleString()}</td>
                <td class="px-6 py-4 text-right font-bold text-gray-900">₹ ${total.toLocaleString()}</td>
                <td class="px-6 py-4 text-center">${statusBadge}</td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-2 text-gray-400">
                        <button onclick="viewInvoice('INV-2026-1254', '${clientName}', '₹ ${total.toLocaleString()}', '${status}')" class="p-1 hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye text-sm"></i></button>
                        <button onclick="printInvoice('INV-2026-1254')" class="p-1 hover:text-gray-700 transition-colors"><i class="fa-solid fa-print text-sm"></i></button>
                        <button onclick="deleteInvoiceRow(this)" class="p-1 hover:text-red-600 transition-colors"><i class="fa-regular fa-trash-can text-sm"></i></button>
                    </div>
                </td>
            </tr>
        `;

        document.getElementById('invoicesBody').insertAdjacentHTML('afterbegin', newRowHTML);
        closeCreateInvoiceModal();
    }
</script>
@endpush
@endsection
