@extends('layouts.app')

@section('title', 'Price Listing')

@section('content')
<div class="max-w-7xl mx-auto pb-10">
    
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 border-b border-gray-100 pb-4">
        <div>
            <h1 class="text-xl font-bold text-gray-900">Price Listing / Rate Update</h1>
            <p class="text-sm text-gray-500 mt-1">Update gold and silver rates. Changes will be reflected in the dashboard.</p>
        </div>
        <div class="text-sm text-gray-500 font-medium flex items-center gap-2">
            <a href="{{ route('dashboard') }}" class="hover:text-gray-900">Dashboard</a>
            <i class="fa-solid fa-chevron-right text-[10px]"></i>
            <a href="#" class="hover:text-gray-900">Price Listing</a>
            <i class="fa-solid fa-chevron-right text-[10px]"></i>
            <span class="text-[#b01622]">Rate Update</span>
        </div>
    </div>

    <!-- Main Content -->
    <div class="flex flex-col gap-6">
        
        <!-- Row 1: 2 Columns (40/60 Split) -->
        <div class="grid grid-cols-1 md:grid-cols-5 gap-6">
            
            <!-- Update Rate Box -->
            <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full md:col-span-2">
                <h2 class="text-base font-bold text-gray-900 mb-5">Update Rate</h2>
                
                <div class="mb-5">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Select Metal</label>
                    <div class="flex flex-wrap gap-3">
                        <button class="px-6 py-2 rounded-md border border-yellow-500 text-yellow-600 bg-yellow-50 font-medium text-sm transition-colors">
                            Gold 24K (999)
                        </button>
                        <button class="px-6 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-colors">
                            Gold 22K (916)
                        </button>
                        <button class="px-6 py-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium text-sm transition-colors">
                            Silver
                        </button>
                    </div>
                </div>

                <div class="mb-5">
                    <label class="block text-sm font-medium text-gray-700 mb-2">New Rate (per gram)</label>
                    <div class="relative w-full xl:w-4/5">
                        <input type="text" value="₹ 7,238" class="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] font-medium" placeholder="₹ 0">
                    </div>
                </div>

                <div class="mb-6 flex-1">
                    <label class="block text-sm font-medium text-gray-700 mb-2">Purity</label>
                    <div class="relative w-full xl:w-4/5">
                        <select class="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] appearance-none font-medium">
                            <option>24K (999)</option>
                            <option>22K (916)</option>
                        </select>
                        <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <i class="fa-solid fa-chevron-down text-gray-400 text-[10px]"></i>
                        </div>
                    </div>
                </div>

                <div class="flex flex-wrap items-center gap-4 pt-2">
                    <button class="px-6 py-2 bg-[#b01622] text-white rounded-md text-sm font-medium hover:bg-[#90121b] transition-colors shadow-sm">
                        Update Rate
                    </button>
                    <div class="flex items-center gap-2 text-green-600 text-xs font-semibold bg-green-50/50 px-3 py-2 rounded-md border border-green-100">
                        <i class="fa-regular fa-circle-check text-sm"></i>
                        Rate updated successfully!
                    </div>
                </div>
            </div>

            <!-- Rate Comparison Box -->
            <div class="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full md:col-span-3">
                <h2 class="text-base font-bold text-gray-900 mb-6">Rate Comparison</h2>
                
                <div class="grid grid-cols-3 gap-4 mb-6">
                    <!-- Previous Rate -->
                    <div class="border border-gray-100 rounded-lg p-4 text-center bg-gray-50/50 flex flex-col justify-center">
                        <div class="text-xs text-gray-500 font-medium mb-2">Previous Rate</div>
                        <div class="text-xl font-bold text-gray-900 mb-1">₹ 7,200</div>
                        <div class="text-[10px] font-medium text-gray-400">(22 July 2026)</div>
                    </div>
                    <!-- New Rate -->
                    <div class="border border-gray-100 rounded-lg p-4 text-center bg-gray-50/50 flex flex-col justify-center">
                        <div class="text-xs text-gray-500 font-medium mb-2">New Rate</div>
                        <div class="text-xl font-bold text-gray-900 mb-1">₹ 7,238</div>
                        <div class="text-[10px] font-medium text-[#b01622]">(23 July 2026)</div>
                    </div>
                    <!-- Change -->
                    <div class="border border-green-100 rounded-lg p-4 text-center bg-green-50/30 flex flex-col justify-center">
                        <div class="text-xs text-gray-500 font-medium mb-2">Change</div>
                        <div class="text-lg font-bold text-green-600 flex items-center justify-center gap-1">
                            + ₹ 38 (0.53%) <i class="fa-solid fa-arrow-up text-sm"></i>
                        </div>
                    </div>
                </div>
                
                <div class="bg-green-50 border border-green-200 rounded-lg p-3 flex items-start gap-3 mt-auto">
                    <i class="fa-regular fa-circle-info text-green-600 mt-0.5 text-sm"></i>
                    <p class="text-xs text-green-800 font-medium leading-relaxed">
                        System compares previous rate with new rate and calculates the change automatically.
                    </p>
                </div>
            </div>

        </div>

        <!-- Row 2: 3 Columns -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Example 1 -->
            <div class="bg-green-50/30 p-5 rounded-xl border border-green-100 flex flex-col h-full shadow-sm">
                <div class="flex items-center gap-2 text-green-600 font-semibold text-sm mb-4">
                    <div class="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center"><i class="fa-solid fa-arrow-up text-[10px]"></i></div>
                    Example 1: Rate Increased
                </div>
                
                <div class="grid grid-cols-3 gap-2 text-center mb-6">
                    <div>
                        <div class="text-[10px] text-gray-500 font-medium mb-1">Previous Rate</div>
                        <div class="font-bold text-gray-900 text-sm">₹ 7,200</div>
                    </div>
                    <div>
                        <div class="text-[10px] text-gray-500 font-medium mb-1">New Rate</div>
                        <div class="font-bold text-gray-900 text-sm">₹ 7,238</div>
                    </div>
                    <div>
                        <div class="text-[10px] text-gray-500 font-medium mb-1">Change</div>
                        <div class="font-bold text-green-600 text-sm flex items-center justify-center gap-1">
                            + ₹ 38 <br> <span class="text-[9px]">(0.53%)</span> <i class="fa-solid fa-arrow-up text-[10px]"></i>
                        </div>
                    </div>
                </div>
                
                <div class="mt-auto bg-green-50/50 p-3 rounded-lg border border-green-100 flex justify-between items-center text-xs font-semibold">
                    <span class="text-gray-600">Dashboard Shows</span>
                    <span class="text-gray-900 flex items-center gap-3">
                        Gold 24K <span class="text-base font-bold">₹ 7,238</span>
                        <span class="text-green-600 text-[11px]">+ ₹ 38 (0.53%) <i class="fa-solid fa-arrow-up"></i></span>
                    </span>
                </div>
            </div>

            <!-- Example 2 -->
            <div class="bg-red-50/30 p-5 rounded-xl border border-red-100 flex flex-col h-full shadow-sm">
                <div class="flex items-center gap-2 text-[#b01622] font-semibold text-sm mb-4">
                    <div class="w-6 h-6 rounded-full bg-[#b01622] text-white flex items-center justify-center"><i class="fa-solid fa-arrow-down text-[10px]"></i></div>
                    Example 2: Rate Decreased
                </div>
                
                <div class="grid grid-cols-3 gap-2 text-center mb-6">
                    <div>
                        <div class="text-[10px] text-gray-500 font-medium mb-1">Previous Rate</div>
                        <div class="font-bold text-gray-900 text-sm">₹ 7,238</div>
                    </div>
                    <div>
                        <div class="text-[10px] text-gray-500 font-medium mb-1">New Rate</div>
                        <div class="font-bold text-gray-900 text-sm">₹ 7,150</div>
                    </div>
                    <div>
                        <div class="text-[10px] text-gray-500 font-medium mb-1">Change</div>
                        <div class="font-bold text-[#b01622] text-sm flex items-center justify-center gap-1">
                            - ₹ 88 <br> <span class="text-[9px]">(1.10%)</span> <i class="fa-solid fa-arrow-down text-[10px]"></i>
                        </div>
                    </div>
                </div>
                
                <div class="mt-auto bg-red-50/50 p-3 rounded-lg border border-red-100 flex justify-between items-center text-xs font-semibold">
                    <span class="text-gray-600">Dashboard Shows</span>
                    <span class="text-gray-900 flex items-center gap-3">
                        Gold 24K <span class="text-base font-bold">₹ 7,150</span>
                        <span class="text-[#b01622] text-[11px]">- ₹ 88 (1.10%) <i class="fa-solid fa-arrow-down"></i></span>
                    </span>
                </div>
            </div>

            <!-- Dashboard - Today's Rate -->
            <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
                <h2 class="text-sm font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <i class="fa-solid fa-chart-simple text-[#b01622]"></i> Dashboard - Today's Rate (Live)
                </h2>
                
                <div class="overflow-x-auto flex-1">
                    <table class="w-full text-left">
                        <thead class="text-[10px] text-gray-500 font-medium border-b border-gray-100">
                            <tr>
                                <th class="pb-3">Metal</th>
                                <th class="pb-3 text-center">Rate (per gram)</th>
                                <th class="pb-3 text-right">Change</th>
                            </tr>
                        </thead>
                        <tbody class="text-xs font-semibold text-gray-900">
                            <tr class="border-b border-gray-50">
                                <td class="py-3 flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-yellow-400"></span>
                                    Gold 24K (999)
                                </td>
                                <td class="py-3 text-center">₹ 7,238</td>
                                <td class="py-3 text-right text-green-600 text-[10px] whitespace-nowrap">
                                    + ₹ 38 (0.53%) <i class="fa-solid fa-arrow-up ml-0.5"></i>
                                </td>
                            </tr>
                            <tr class="border-b border-gray-50">
                                <td class="py-3 flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-yellow-400"></span>
                                    Gold 22K (916)
                                </td>
                                <td class="py-3 text-center">₹ 6,632</td>
                                <td class="py-3 text-right text-[#b01622] text-[10px] whitespace-nowrap">
                                    - ₹ 24 (0.36%) <i class="fa-solid fa-arrow-down ml-0.5"></i>
                                </td>
                            </tr>
                            <tr>
                                <td class="py-3 flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-gray-300"></span>
                                    Silver
                                </td>
                                <td class="py-3 text-center">₹ 87.50</td>
                                <td class="py-3 text-right text-green-600 text-[10px] whitespace-nowrap">
                                    + ₹ 0.30 (0.34%) <i class="fa-solid fa-arrow-up ml-0.5"></i>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>

        <!-- Important Footer -->
        <div class="bg-[#f0f7ff] border border-[#d6e8fa] rounded-xl p-5 flex items-start gap-4 shadow-sm">
            <i class="fa-regular fa-circle-info text-blue-600 text-lg mt-0.5"></i>
            <div>
                <p class="text-sm text-blue-900 font-semibold mb-1">
                    Important: Rate change should come only from Price Listing <i class="fa-solid fa-arrow-right-long text-xs mx-1 text-blue-400"></i> Rate Update <i class="fa-solid fa-arrow-right-long text-xs mx-1 text-blue-400"></i> Dashboard.
                </p>
                <p class="text-xs text-blue-700 font-medium">
                    It should not come from Sales or Purchase modules.
                </p>
            </div>
        </div>

    </div>

</div>
@endsection
