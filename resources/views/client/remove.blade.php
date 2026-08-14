@extends('layouts.app')

@section('title', 'Remove Page')

@section('content')
<div class="max-w-7xl mx-auto pb-10">
    
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
        <div>
            <div class="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                <span>Client Management</span>
                <i class="fa-solid fa-chevron-right text-[8px]"></i>
                <span class="text-[#b01622]">Remove Page</span>
            </div>
            <h1 class="text-2xl font-bold text-gray-900">Remove Page</h1>
        </div>
        <div class="flex items-center gap-3">
            <button class="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors shadow-sm">
                <i class="fa-solid fa-filter text-[11px]"></i>
            </button>
            <div class="relative">
                <select class="appearance-none bg-white border border-gray-200 rounded-md pl-4 pr-10 py-2 text-[13px] font-semibold text-gray-700 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-[#b01622] cursor-pointer shadow-sm">
                    <option>Month</option>
                    <option>Week</option>
                    <option>Year</option>
                </select>
                <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                    <i class="fa-solid fa-chevron-down text-[10px]"></i>
                </div>
            </div>
        </div>
    </div>

    <!-- Stats Row -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        <!-- Active Clients -->
        <div class="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col relative">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-[#b01622]">
                    <i class="fa-solid fa-chart-simple text-[13px]"></i>
                </div>
                <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Active Clients</div>
            </div>
            <div class="text-3xl font-bold text-gray-900 mb-2">1,958</div>
            <div class="text-[10px] font-medium mt-auto">
                <span class="text-green-500 font-bold">+5.4%</span> <span class="text-gray-400">vs last month</span>
            </div>
        </div>

        <!-- Removed Clients -->
        <div class="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col relative">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded bg-orange-50 flex items-center justify-center text-orange-500">
                    <i class="fa-solid fa-user-minus text-[13px]"></i>
                </div>
                <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Removed Clients</div>
            </div>
            <div class="text-3xl font-bold text-gray-900 mb-2">342</div>
            <div class="text-[10px] font-medium mt-auto">
                <span class="text-green-500 font-bold">+12.6%</span> <span class="text-gray-400">vs last month</span>
            </div>
        </div>

        <!-- This Month Removed -->
        <div class="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col relative">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-red-500">
                    <i class="fa-regular fa-trash-can text-[13px]"></i>
                </div>
                <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">This Month Removed</div>
            </div>
            <div class="text-3xl font-bold text-gray-900 mb-2">28</div>
            <div class="text-[10px] font-medium mt-auto">
                <span class="text-green-500 font-bold">+8.2%</span> <span class="text-gray-400">vs last month</span>
            </div>
        </div>

        <!-- Can Be Restored -->
        <div class="bg-white rounded-xl p-5 border border-gray-100 shadow-sm flex flex-col relative">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded bg-yellow-50 flex items-center justify-center text-yellow-600">
                    <i class="fa-solid fa-rotate-left text-[13px]"></i>
                </div>
                <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Can Be Restored</div>
            </div>
            <div class="text-3xl font-bold text-gray-900 mb-2">289</div>
            <div class="text-[10px] font-medium mt-auto">
                <a href="#" class="text-[#b01622] font-bold hover:underline">View removed clients</a>
            </div>
        </div>

    </div>

    <!-- Filters Row -->
    <div class="flex flex-wrap items-center gap-4 mb-6">
        <div class="relative flex-1 min-w-[250px]">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <i class="fa-solid fa-magnifying-glass text-gray-400 text-sm"></i>
            </div>
            <input type="text" class="block w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-[13px] placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622]" placeholder="Search client name, email, mobile...">
        </div>
        
        <div class="relative w-40">
            <input type="text" class="block w-full pl-3 pr-9 py-2 border border-gray-200 rounded-md text-[13px] placeholder-gray-500 text-gray-700 focus:outline-none cursor-pointer" placeholder="Remove Date">
            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                <i class="fa-regular fa-calendar"></i>
            </div>
        </div>

        <div class="relative w-44">
            <select class="appearance-none block w-full pl-3 pr-9 py-2 border border-gray-200 rounded-md text-[13px] text-gray-500 focus:outline-none focus:border-[#b01622] cursor-pointer">
                <option value="" disabled selected>Remove Reason</option>
                <option>Client Request</option>
                <option>Not Interested</option>
                <option>Account Inactive</option>
                <option>Duplicate Entry</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                <i class="fa-solid fa-chevron-down text-[10px]"></i>
            </div>
        </div>

        <div class="relative w-44">
            <select class="appearance-none block w-full pl-3 pr-9 py-2 border border-gray-200 rounded-md text-[13px] text-gray-500 focus:outline-none focus:border-[#b01622] cursor-pointer">
                <option value="" disabled selected>Can Be Restored</option>
                <option>Yes</option>
                <option>No</option>
            </select>
            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                <i class="fa-solid fa-chevron-down text-[10px]"></i>
            </div>
        </div>
    </div>

    <!-- Table Section -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[1000px]">
                <thead>
                    <tr class="bg-red-50/30 text-[#b01622] text-[10px] uppercase tracking-wider font-bold border-b border-red-50">
                        <th class="py-4 px-6 font-bold">Client Name</th>
                        <th class="py-4 px-4 font-bold">Email / Mobile</th>
                        <th class="py-4 px-4 font-bold">Total<br>Purchases</th>
                        <th class="py-4 px-4 font-bold">Remove<br>Date</th>
                        <th class="py-4 px-4 font-bold">Remove<br>Reason</th>
                        <th class="py-4 px-4 font-bold text-center">Can Be<br>Restored</th>
                        <th class="py-4 px-4 font-bold">Removed<br>By</th>
                        <th class="py-4 px-6 font-bold text-center">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 text-gray-600 text-[12px]">
                    <!-- Row 1 -->
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-[10px] font-bold">
                                    MS
                                </div>
                                <div class="font-bold text-gray-900 text-[13px]">Meera Singhania</div>
                            </div>
                        </td>
                        <td class="py-4 px-4">
                            <div class="text-[11px] font-medium text-gray-700">meera.s@email.com</div>
                            <div class="text-[10px] text-gray-400">+91 98765 43210</div>
                        </td>
                        <td class="py-4 px-4 font-bold text-gray-700">
                            ₹84.50 Lakh
                        </td>
                        <td class="py-4 px-4">
                            <div class="text-[11px] font-medium text-gray-700">23 Jul, 2026</div>
                            <div class="text-[10px] text-gray-400">10:30 AM</div>
                        </td>
                        <td class="py-4 px-4 text-[12px] text-gray-600">
                            Client Request
                        </td>
                        <td class="py-4 px-4 text-center">
                            <span class="inline-block px-2.5 py-1 rounded bg-green-50 text-green-600 text-[9px] font-bold uppercase">Yes</span>
                        </td>
                        <td class="py-4 px-4">
                            <div class="text-[11px] text-gray-700 font-medium">Arvind</div>
                            <div class="text-[10px] text-gray-400">(Admin)</div>
                        </td>
                        <td class="py-4 px-6">
                            <div class="flex items-center justify-center gap-3 text-gray-400">
                                <button class="hover:text-gray-600 transition-colors tooltip-trigger" title="View details">
                                    <i class="fa-regular fa-eye text-[14px]"></i>
                                </button>
                                <button class="hover:text-green-600 transition-colors tooltip-trigger" title="Restore">
                                    <i class="fa-solid fa-rotate-left text-[14px]"></i>
                                </button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 2 -->
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-bold">
                                    RK
                                </div>
                                <div class="font-bold text-gray-900 text-[13px]">Rajesh Khanna</div>
                            </div>
                        </td>
                        <td class="py-4 px-4">
                            <div class="text-[11px] font-medium text-gray-700">rajesh.k@email.com</div>
                            <div class="text-[10px] text-gray-400">+91 91234 56789</div>
                        </td>
                        <td class="py-4 px-4 font-bold text-gray-700">
                            ₹42.20 Lakh
                        </td>
                        <td class="py-4 px-4">
                            <div class="text-[11px] font-medium text-gray-700">22 Jul, 2026</div>
                            <div class="text-[10px] text-gray-400">04:15 PM</div>
                        </td>
                        <td class="py-4 px-4 text-[12px] text-gray-600">
                            Not Interested
                        </td>
                        <td class="py-4 px-4 text-center">
                            <span class="inline-block px-2.5 py-1 rounded bg-green-50 text-green-600 text-[9px] font-bold uppercase">Yes</span>
                        </td>
                        <td class="py-4 px-4">
                            <div class="text-[11px] text-gray-700 font-medium">Arvind</div>
                            <div class="text-[10px] text-gray-400">(Admin)</div>
                        </td>
                        <td class="py-4 px-6">
                            <div class="flex items-center justify-center gap-3 text-gray-400">
                                <button class="hover:text-gray-600 transition-colors tooltip-trigger" title="View details">
                                    <i class="fa-regular fa-eye text-[14px]"></i>
                                </button>
                                <button class="hover:text-green-600 transition-colors tooltip-trigger" title="Restore">
                                    <i class="fa-solid fa-rotate-left text-[14px]"></i>
                                </button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 3 -->
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center text-[10px] font-bold">
                                    AI
                                </div>
                                <div class="font-bold text-gray-900 text-[13px]">Ananya Iyer</div>
                            </div>
                        </td>
                        <td class="py-4 px-4">
                            <div class="text-[11px] font-medium text-gray-700">ananya.i@email.com</div>
                            <div class="text-[10px] text-gray-400">+91 99887 76655</div>
                        </td>
                        <td class="py-4 px-4 font-bold text-gray-700">
                            ₹18.75 Lakh
                        </td>
                        <td class="py-4 px-4">
                            <div class="text-[11px] font-medium text-gray-700">21 Jul, 2026</div>
                            <div class="text-[10px] text-gray-400">11:45 AM</div>
                        </td>
                        <td class="py-4 px-4 text-[12px] text-gray-600">
                            Account Inactive
                        </td>
                        <td class="py-4 px-4 text-center">
                            <span class="inline-block px-2.5 py-1 rounded bg-green-50 text-green-600 text-[9px] font-bold uppercase">Yes</span>
                        </td>
                        <td class="py-4 px-4">
                            <div class="text-[11px] text-gray-700 font-medium">Arvind</div>
                            <div class="text-[10px] text-gray-400">(Admin)</div>
                        </td>
                        <td class="py-4 px-6">
                            <div class="flex items-center justify-center gap-3 text-gray-400">
                                <button class="hover:text-gray-600 transition-colors tooltip-trigger" title="View details">
                                    <i class="fa-regular fa-eye text-[14px]"></i>
                                </button>
                                <button class="hover:text-green-600 transition-colors tooltip-trigger" title="Restore">
                                    <i class="fa-solid fa-rotate-left text-[14px]"></i>
                                </button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 4 -->
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-[10px] font-bold">
                                    VM
                                </div>
                                <div class="font-bold text-gray-900 text-[13px]">Vikram Malhotra</div>
                            </div>
                        </td>
                        <td class="py-4 px-4">
                            <div class="text-[11px] font-medium text-gray-700">vikram.m@email.com</div>
                            <div class="text-[10px] text-gray-400">+91 90098 76543</div>
                        </td>
                        <td class="py-4 px-4 font-bold text-gray-700">
                            ₹1.24 Cr
                        </td>
                        <td class="py-4 px-4">
                            <div class="text-[11px] font-medium text-gray-700">20 Jul, 2026</div>
                            <div class="text-[10px] text-gray-400">03:20 PM</div>
                        </td>
                        <td class="py-4 px-4 text-[12px] text-gray-600">
                            Duplicate Entry
                        </td>
                        <td class="py-4 px-4 text-center">
                            <span class="inline-block px-2.5 py-1 rounded bg-green-50 text-green-600 text-[9px] font-bold uppercase">Yes</span>
                        </td>
                        <td class="py-4 px-4">
                            <div class="text-[11px] text-gray-700 font-medium">Arvind</div>
                            <div class="text-[10px] text-gray-400">(Admin)</div>
                        </td>
                        <td class="py-4 px-6">
                            <div class="flex items-center justify-center gap-3 text-gray-400">
                                <button class="hover:text-gray-600 transition-colors tooltip-trigger" title="View details">
                                    <i class="fa-regular fa-eye text-[14px]"></i>
                                </button>
                                <button class="hover:text-green-600 transition-colors tooltip-trigger" title="Restore">
                                    <i class="fa-solid fa-rotate-left text-[14px]"></i>
                                </button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 5 -->
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-bold">
                                    SR
                                </div>
                                <div class="font-bold text-gray-900 text-[13px]">Sneha Reddy</div>
                            </div>
                        </td>
                        <td class="py-4 px-4">
                            <div class="text-[11px] font-medium text-gray-700">sneha.r@email.com</div>
                            <div class="text-[10px] text-gray-400">+91 98989 12345</div>
                        </td>
                        <td class="py-4 px-4 font-bold text-gray-700">
                            ₹75.50 Lakh
                        </td>
                        <td class="py-4 px-4">
                            <div class="text-[11px] font-medium text-gray-700">19 Jul, 2026</div>
                            <div class="text-[10px] text-gray-400">09:10 AM</div>
                        </td>
                        <td class="py-4 px-4 text-[12px] text-gray-600">
                            Client Request
                        </td>
                        <td class="py-4 px-4 text-center">
                            <span class="inline-block px-2.5 py-1 rounded bg-red-50 text-red-600 text-[9px] font-bold uppercase">No</span>
                        </td>
                        <td class="py-4 px-4">
                            <div class="text-[11px] text-gray-700 font-medium">Arvind</div>
                            <div class="text-[10px] text-gray-400">(Admin)</div>
                        </td>
                        <td class="py-4 px-6">
                            <div class="flex items-center justify-center gap-3 text-gray-400">
                                <button class="hover:text-gray-600 transition-colors tooltip-trigger" title="View details">
                                    <i class="fa-regular fa-eye text-[14px]"></i>
                                </button>
                                <button class="opacity-30 cursor-not-allowed tooltip-trigger" title="Cannot restore" disabled>
                                    <i class="fa-solid fa-rotate-left text-[14px]"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="px-6 py-4 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div class="text-[11px] text-gray-500 font-medium">
                Showing <span class="font-bold text-gray-900">1</span> to <span class="font-bold text-gray-900">5</span> of <span class="font-bold text-gray-900">342</span> removed clients
            </div>
            
            <div class="flex items-center gap-1">
                <button class="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-400 hover:bg-gray-50 hover:text-gray-600 transition-colors disabled:opacity-50" disabled>
                    <i class="fa-solid fa-chevron-left text-[10px]"></i>
                </button>
                <button class="w-7 h-7 flex items-center justify-center rounded bg-[#b01622] text-white text-[11px] font-bold shadow-sm">
                    1
                </button>
                <button class="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-[11px] font-bold">
                    2
                </button>
                <button class="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-[11px] font-bold">
                    3
                </button>
                <span class="w-7 h-7 flex items-center justify-center text-gray-400 text-[11px]">
                    ...
                </span>
                <button class="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors text-[11px] font-bold">
                    69
                </button>
                <button class="w-7 h-7 flex items-center justify-center rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    <i class="fa-solid fa-chevron-right text-[10px]"></i>
                </button>
            </div>
        </div>
    </div>

</div>
@endsection
