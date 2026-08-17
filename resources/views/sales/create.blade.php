@extends('layouts.app')

@section('title', 'Create Sale')

@section('content')
<div class="max-w-7xl mx-auto pb-10">
    
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 pb-4">
        <div>
            <div class="text-xs text-gray-500 font-medium flex items-center gap-2 mb-2">
                <a href="#" class="hover:text-gray-900">Sales</a>
                <span class="text-gray-400">/</span>
                <span class="text-gray-900 font-semibold">Create Sale</span>
            </div>
            <h1 class="text-xl font-bold text-gray-900">Create Sale</h1>
            <p class="text-sm text-gray-500 mt-1">Add new metal sale and update stock</p>
        </div>
    </div>

    <!-- Main Content -->
    <div class="flex flex-col gap-6">
        
        <!-- Top Row: 60/40 Split -->
        <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
            
            <!-- Sale Details Box -->
            <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full lg:col-span-3">
                <h2 class="text-sm font-bold text-gray-900 mb-6">Sale Details</h2>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mb-6">
                    <!-- Select Metal -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-900 mb-2">Select Metal <span class="text-red-500">*</span></label>
                        <div class="relative w-full">
                            <select class="block w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] appearance-none font-medium bg-white">
                                <option>Gold</option>
                                <option>Silver</option>
                            </select>
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <div class="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center text-[8px] text-white font-bold">₹</div>
                            </div>
                            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <i class="fa-solid fa-chevron-down text-gray-400 text-[10px]"></i>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Weight -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-900 mb-2">Weight (in GM) <span class="text-red-500">*</span></label>
                        <div class="relative w-full">
                            <input type="text" value="20" class="block w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] font-medium placeholder-gray-400">
                            <div class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                                <span class="text-gray-500 text-xs font-medium">GM</span>
                            </div>
                        </div>
                    </div>

                    <!-- Rate per GM -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-900 mb-2">Rate per GM (₹)</label>
                        <input type="text" value="7,238" class="block w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] font-medium" placeholder="0">
                    </div>

                    <!-- Total Amount -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-900 mb-2">Total Amount (₹)</label>
                        <input type="text" value="1,44,760" disabled class="block w-full px-4 py-2.5 border border-gray-100 rounded-lg text-sm text-gray-500 bg-gray-50 font-medium cursor-not-allowed">
                    </div>

                    <!-- Customer -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-900 mb-2">Customer (Optional)</label>
                        <div class="relative w-full">
                            <select class="block w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] appearance-none font-medium bg-white">
                                <option>Select Customer</option>
                            </select>
                            <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <i class="fa-solid fa-chevron-down text-gray-400 text-[10px]"></i>
                            </div>
                        </div>
                    </div>

                    <!-- Sale Date -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-900 mb-2">Sale Date <span class="text-red-500">*</span></label>
                        <div class="relative w-full">
                            <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                                <i class="fa-regular fa-calendar text-gray-400 text-sm"></i>
                            </div>
                            <input type="text" value="23/07/2026" class="block w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] font-medium">
                        </div>
                    </div>
                </div>

                <!-- Notes -->
                <div class="mb-8 flex-1">
                    <label class="block text-xs font-semibold text-gray-900 mb-2">Notes (Optional)</label>
                    <textarea rows="3" class="block w-full px-4 py-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] font-medium placeholder-gray-400 resize-none" placeholder="Enter notes..."></textarea>
                </div>

                <!-- Buttons -->
                <div class="flex items-center justify-between pt-4 border-t border-gray-50 mt-auto">
                    <button class="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors">
                        Cancel
                    </button>
                    <button class="px-8 py-2.5 bg-[#b01622] text-white rounded-lg text-sm font-semibold hover:bg-[#90121b] transition-colors shadow-sm">
                        Save Sale
                    </button>
                </div>
            </div>

            <!-- Stock Update Summary Box -->
            <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full lg:col-span-2">
                <h2 class="text-sm font-bold text-gray-900 mb-6">Stock Update Summary</h2>
                
                <div class="flex flex-col gap-5">
                    
                    <!-- First Block -->
                    <div class="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                        <div class="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center text-center">
                            <div class="text-[10px] text-gray-500 font-medium">Existing Stock</div>
                            <div></div>
                            <div class="text-[10px] text-gray-500 font-medium">Sale</div>
                            <div></div>
                            <div class="text-[10px] text-gray-500 font-medium">New Stock</div>
                            
                            <div class="text-[13px] font-bold text-gray-900 mt-2">150 GM</div>
                            <div class="text-gray-400 font-bold mt-2 mx-1">-</div>
                            <div class="text-[13px] font-bold text-gray-900 mt-2">- 20 GM</div>
                            <div class="text-gray-400 font-bold mt-2 mx-1">=</div>
                            <div class="text-[13px] font-bold text-gray-900 mt-2">130 GM</div>
                        </div>
                    </div>

                    <!-- Second Block -->
                    <div class="border border-gray-200 rounded-xl p-5 bg-white shadow-sm">
                        <div class="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center text-center">
                            <div class="text-[13px] font-bold text-gray-900 mb-2">150 GM</div>
                            <div class="text-gray-400 font-bold mb-2 mx-1">-</div>
                            <div class="text-[13px] font-bold text-gray-900 mb-2">20 GM</div>
                            <div class="text-gray-400 font-bold mb-2 mx-1">=</div>
                            <div class="text-[13px] font-bold text-green-500 mb-2">130 GM</div>
                            
                            <div class="text-[10px] text-gray-500 font-medium">Existing Stock</div>
                            <div></div>
                            <div class="text-[10px] text-gray-500 font-medium">Sale</div>
                            <div></div>
                            <div class="text-[10px] text-green-500 font-medium">New Stock</div>
                        </div>
                    </div>

                </div>
            </div>

        </div>

        <!-- Current Stock Overview Table Box -->
        <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col">
            <h2 class="text-sm font-bold text-gray-900 mb-6">Current Stock Overview</h2>
            
            <div class="border border-gray-100 rounded-xl overflow-hidden mb-6">
                <table class="w-full text-center">
                    <thead class="bg-gray-50/50 border-b border-gray-100 text-[11px] text-gray-500 font-semibold">
                        <tr>
                            <th class="py-3 px-4 text-left font-semibold">Metal</th>
                            <th class="py-3 px-4 font-semibold">Existing Stock (GM)</th>
                            <th class="py-3 px-4 font-semibold">Sale (GM)</th>
                            <th class="py-3 px-4 font-semibold">New Stock (GM)</th>
                            <th class="py-3 px-4 font-semibold">Status</th>
                        </tr>
                    </thead>
                    <tbody class="text-[11px] font-semibold text-gray-900">
                        <tr class="border-b border-gray-50">
                            <td class="py-4 px-4 text-left flex items-center gap-2">
                                <div class="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center text-[10px] text-white font-bold">₹</div>
                                Gold
                            </td>
                            <td class="py-4 px-4 text-gray-500">150 GM</td>
                            <td class="py-4 px-4 text-red-500">- 20 GM</td>
                            <td class="py-4 px-4 text-green-500">130 GM</td>
                            <td class="py-4 px-4">
                                <span class="bg-green-50 text-green-600 border border-green-100 px-3 py-1 rounded-md text-[10px] font-bold">Updated</span>
                            </td>
                        </tr>
                        <tr>
                            <td class="py-4 px-4 text-left flex items-center gap-2">
                                <div class="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-[10px] text-white font-bold text-gray-500">S</div>
                                <span class="text-gray-500">Silver</span>
                            </td>
                            <td class="py-4 px-4 text-gray-500">200 GM</td>
                            <td class="py-4 px-4 text-gray-500">- 0 GM</td>
                            <td class="py-4 px-4 text-gray-500">200 GM</td>
                            <td class="py-4 px-4">
                                <span class="bg-gray-100 text-gray-500 border border-gray-200 px-2 py-1 rounded-md text-[10px] font-bold">No Change</span>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Success Alert -->
            <div class="bg-green-50/80 border border-green-200 rounded-lg p-3 flex items-center gap-3">
                <i class="fa-regular fa-circle-check text-green-600 text-sm"></i>
                <p class="text-[11px] text-green-800 font-semibold">
                    Sale saved successfully. Stock updated.
                </p>
            </div>
            
        </div>

    </div>
</div>
@endsection
