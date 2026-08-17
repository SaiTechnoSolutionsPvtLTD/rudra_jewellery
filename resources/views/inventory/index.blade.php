@extends('layouts.app')

@section('title', 'Inventory Management')

@section('content')
<div class="max-w-7xl mx-auto pb-10">
    
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
            <h1 class="text-xl font-bold text-gray-900">Inventory Management</h1>
            <p class="text-[13px] text-gray-500 mt-1 font-medium">Real-time status of Imperial Heritage collections</p>
        </div>
        <div class="flex items-center gap-3">
            <a href="{{ route('inventory.bulk') }}" class="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-semibold hover:bg-gray-50 flex items-center gap-2 shadow-sm bg-white">
                <i class="fa-solid fa-file-import"></i>
                Bulk Upload
            </a>
            <a href="{{ route('inventory.create') }}" class="px-4 py-2 bg-[#b01622] text-white rounded-lg text-sm font-semibold hover:bg-[#90121b] flex items-center gap-2 shadow-sm">
                <i class="fa-solid fa-plus"></i>
                Add New Item
            </a>
        </div>
    </div>

    <!-- Raw Values Section -->
    <div class="mb-8">
        <div class="inline-block bg-[#b01622] text-white text-[11px] font-bold px-4 py-1.5 rounded-md mb-4 shadow-sm">
            Raw Values
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            
            <!-- Gold Value -->
            <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <div class="text-[10px] text-gray-400 font-bold tracking-wide mb-2">Gold Value</div>
                <div class="flex items-center gap-2 mb-1">
                    <div class="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                        <i class="fa-solid fa-coins text-[10px]"></i>
                    </div>
                    <div class="text-[17px] font-bold text-gray-900">12.40 kg</div>
                </div>
                <div class="flex items-center gap-1.5 mt-1">
                    <span class="text-[11px] text-gray-500 font-bold">₹24,75,000</span>
                    <span class="text-[10px] text-green-500 font-bold flex items-center"><i class="fa-solid fa-arrow-up mr-0.5 text-[8px]"></i> 4.5%</span>
                </div>
            </div>

            <!-- Diamond Value -->
            <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <div class="text-[10px] text-gray-400 font-bold tracking-wide mb-2">Diamond Value</div>
                <div class="flex items-center gap-2 mb-1">
                    <div class="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center text-[#b01622]">
                        <i class="fa-regular fa-gem text-[10px]"></i>
                    </div>
                    <div class="text-[17px] font-bold text-gray-900">42.5 ct</div>
                </div>
                <div class="flex items-center gap-1.5 mt-1">
                    <span class="text-[11px] text-gray-500 font-bold">₹24,75,000</span>
                    <span class="text-[10px] text-green-500 font-bold flex items-center"><i class="fa-solid fa-arrow-up mr-0.5 text-[8px]"></i> 4.5%</span>
                </div>
            </div>

            <!-- Stone Value -->
            <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <div class="text-[10px] text-gray-400 font-bold tracking-wide mb-2">Stone Value</div>
                <div class="flex items-center gap-2 mb-1">
                    <div class="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                        <div class="w-2 h-2 bg-amber-400 rounded-full"></div>
                    </div>
                    <div class="text-[17px] font-bold text-gray-900">880 units</div>
                </div>
                <div class="flex items-center gap-1.5 mt-1">
                    <span class="text-[11px] text-gray-500 font-bold">₹24,75,000</span>
                    <span class="text-[10px] text-green-500 font-bold flex items-center"><i class="fa-solid fa-arrow-up mr-0.5 text-[8px]"></i> 4.5%</span>
                </div>
            </div>

            <!-- Silver Value -->
            <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <div class="text-[10px] text-gray-400 font-bold tracking-wide mb-2">Silver Value</div>
                <div class="flex items-center gap-2 mb-1">
                    <div class="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center text-[#b01622]">
                        <div class="w-2 h-1 bg-[#b01622] rounded-full"></div>
                    </div>
                    <div class="text-[17px] font-bold text-gray-900">12.80 kg</div>
                </div>
                <div class="flex items-center gap-1.5 mt-1">
                    <span class="text-[11px] text-gray-500 font-bold">₹24,75,000</span>
                    <span class="text-[10px] text-green-500 font-bold flex items-center"><i class="fa-solid fa-arrow-up mr-0.5 text-[8px]"></i> 4.5%</span>
                </div>
            </div>

            <!-- Silver Value (Dup for visual balance) -->
            <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center">
                <div class="text-[10px] text-gray-400 font-bold tracking-wide mb-2">Silver Value</div>
                <div class="flex items-center gap-2 mb-1">
                    <div class="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center text-[#b01622]">
                        <div class="w-2 h-1 bg-[#b01622] rounded-full"></div>
                    </div>
                    <div class="text-[17px] font-bold text-gray-900">12.80 kg</div>
                </div>
                <div class="flex items-center gap-1.5 mt-1">
                    <span class="text-[11px] text-gray-500 font-bold">₹24,75,000</span>
                    <span class="text-[10px] text-green-500 font-bold flex items-center"><i class="fa-solid fa-arrow-up mr-0.5 text-[8px]"></i> 4.5%</span>
                </div>
            </div>
            
        </div>
    </div>

    <!-- Jewel Value Section -->
    <div class="mb-10">
        <div class="inline-block bg-[#b01622] text-white text-[11px] font-bold px-4 py-1.5 rounded-md mb-4 shadow-sm">
            Jewel Value
        </div>
        
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5">
            
            <!-- Gold Value -->
            <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center lg:col-span-1">
                <div class="text-[10px] text-gray-400 font-bold tracking-wide mb-2">Gold Value</div>
                <div class="flex items-center gap-2 mb-1">
                    <div class="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                        <i class="fa-solid fa-coins text-[10px]"></i>
                    </div>
                    <div class="text-[17px] font-bold text-gray-900">12.40 kg</div>
                </div>
                <div class="flex items-center gap-1.5 mt-1">
                    <span class="text-[11px] text-gray-500 font-bold">₹24,75,000</span>
                    <span class="text-[10px] text-green-500 font-bold flex items-center"><i class="fa-solid fa-arrow-up mr-0.5 text-[8px]"></i> 4.5%</span>
                </div>
            </div>

            <!-- Stone Value -->
            <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center lg:col-span-1">
                <div class="text-[10px] text-gray-400 font-bold tracking-wide mb-2">Stone Value</div>
                <div class="flex items-center gap-2 mb-1">
                    <div class="w-5 h-5 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                        <div class="w-2 h-2 bg-amber-400 rounded-full"></div>
                    </div>
                    <div class="text-[17px] font-bold text-gray-900">880 units</div>
                </div>
                <div class="flex items-center gap-1.5 mt-1">
                    <span class="text-[11px] text-gray-500 font-bold">₹24,75,000</span>
                    <span class="text-[10px] text-green-500 font-bold flex items-center"><i class="fa-solid fa-arrow-up mr-0.5 text-[8px]"></i> 4.5%</span>
                </div>
            </div>

            <!-- Silver Value -->
            <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center lg:col-span-1">
                <div class="text-[10px] text-gray-400 font-bold tracking-wide mb-2">Silver Value</div>
                <div class="flex items-center gap-2 mb-1">
                    <div class="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center text-[#b01622]">
                        <div class="w-2 h-1 bg-[#b01622] rounded-full"></div>
                    </div>
                    <div class="text-[17px] font-bold text-gray-900">12.80 kg</div>
                </div>
                <div class="flex items-center gap-1.5 mt-1">
                    <span class="text-[11px] text-gray-500 font-bold">₹24,75,000</span>
                    <span class="text-[10px] text-green-500 font-bold flex items-center"><i class="fa-solid fa-arrow-up mr-0.5 text-[8px]"></i> 4.5%</span>
                </div>
            </div>

            <!-- Diamond Value -->
            <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex flex-col items-center text-center lg:col-span-1">
                <div class="text-[10px] text-gray-400 font-bold tracking-wide mb-2">Diamond Value</div>
                <div class="flex items-center gap-2 mb-1">
                    <div class="w-5 h-5 rounded-full bg-red-50 flex items-center justify-center text-[#b01622]">
                        <i class="fa-regular fa-gem text-[10px]"></i>
                    </div>
                    <div class="text-[17px] font-bold text-gray-900">42.5 ct</div>
                </div>
                <div class="flex items-center gap-1.5 mt-1">
                    <span class="text-[11px] text-gray-500 font-bold">₹24,75,000</span>
                    <span class="text-[10px] text-green-500 font-bold flex items-center"><i class="fa-solid fa-arrow-up mr-0.5 text-[8px]"></i> 4.5%</span>
                </div>
            </div>
            
        </div>
    </div>

    <!-- Filters & Table -->
    <div class="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden">
        
        <!-- Filters -->
        <div class="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center gap-4 bg-white">
            <div class="relative flex-1">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <i class="fa-solid fa-magnifying-glass text-gray-400 text-sm"></i>
                </div>
                <input type="text" class="block w-full pl-9 pr-4 py-2 border border-gray-100 bg-gray-50/50 rounded-lg text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] placeholder-gray-400" placeholder="Search by SKU, product name...">
            </div>
            
            <div class="flex items-center gap-3">
                <div class="relative">
                    <select class="block w-full pl-3 pr-8 py-2 border border-gray-100 bg-gray-50/50 rounded-lg text-xs font-bold text-gray-600 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] appearance-none">
                        <option>All Categories</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                        <i class="fa-solid fa-chevron-down text-gray-400 text-[9px]"></i>
                    </div>
                </div>
                <div class="relative">
                    <select class="block w-full pl-3 pr-8 py-2 border border-gray-100 bg-gray-50/50 rounded-lg text-xs font-bold text-gray-600 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] appearance-none">
                        <option>Stock Status</option>
                    </select>
                    <div class="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                        <i class="fa-solid fa-chevron-down text-gray-400 text-[9px]"></i>
                    </div>
                </div>
                <button class="text-[#b01622] text-xs font-bold ml-1">Clear All</button>
            </div>
        </div>

        <!-- Low Stock Alerts Banner -->
        <div class="bg-amber-50/30 border-b border-amber-100/50 p-5 flex gap-4">
            <div class="flex items-start">
                <i class="fa-solid fa-triangle-exclamation text-amber-500 text-lg mt-0.5"></i>
            </div>
            <div class="flex-1 flex flex-col gap-4">
                <div class="text-[13px] font-bold text-amber-500">Low Stock Alerts</div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <!-- Alert 1 -->
                    <div class="bg-white border border-amber-100/50 rounded-md p-4 flex items-center justify-between shadow-sm">
                        <div class="flex flex-col gap-1">
                            <div class="text-[11px] font-bold text-gray-900">Eternal Solitaire Ring</div>
                            <div class="text-[10px] font-bold text-[#b01622]">Current Stock: 02 units</div>
                        </div>
                        <button class="text-[#b01622] text-[10px] font-bold">! Restock</button>
                    </div>

                    <!-- Alert 2 -->
                    <div class="bg-white border border-amber-100/50 rounded-md p-4 flex items-center justify-between shadow-sm">
                        <div class="flex flex-col gap-1">
                            <div class="text-[11px] font-bold text-gray-900">Imperial Meena Bangles</div>
                            <div class="text-[10px] font-bold text-[#b01622]">Out of Stock (00)</div>
                        </div>
                        <button class="text-[#b01622] text-[10px] font-bold">! Restock</button>
                    </div>

                    <!-- Alert 3 -->
                    <div class="bg-white border border-amber-100/50 rounded-md p-4 flex items-center justify-between shadow-sm">
                        <div class="flex flex-col gap-1">
                            <div class="text-[11px] font-bold text-gray-900">Nakshatra Bridal Necklace</div>
                            <div class="text-[10px] font-bold text-[#b01622]">Current Stock: 08 units</div>
                        </div>
                        <button class="text-[#b01622] text-[10px] font-bold">! Restock</button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Table -->
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead class="bg-gray-50/30 border-b border-gray-100 text-[10px] text-gray-800 font-bold">
                    <tr>
                        <th class="py-4 px-6">Product Name & SKU</th>
                        <th class="py-4 px-4 text-center">Category</th>
                        <th class="py-4 px-4 text-center">Purity/Quality</th>
                        <th class="py-4 px-4 text-center">Weight & Price</th>
                        <th class="py-4 px-4 text-center">Stock QTY</th>
                        <th class="py-4 px-4 text-center">Location</th>
                        <th class="py-4 px-4 text-center">Status</th>
                        <th class="py-4 px-6 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody class="text-[11px] font-semibold text-gray-800 bg-white">
                    
                    <!-- Row 1 -->
                    <tr class="border-b border-gray-50 hover:bg-gray-50/50">
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 bg-gray-100 rounded overflow-hidden shrink-0">
                                    <img src="https://images.unsplash.com/photo-1599643478514-4a820cbf311e?w=100&h=100&fit=crop" class="w-full h-full object-cover">
                                </div>
                                <div class="flex flex-col gap-0.5">
                                    <div class="font-bold text-gray-900 text-xs">Nakshatra Bridal<br>Necklace</div>
                                    <div class="text-gray-400 text-[9px] font-bold">RJ-C-18294</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-4 text-center text-gray-600">Jewels</td>
                        <td class="py-4 px-4 text-center text-gray-600">22K Hallmark</td>
                        <td class="py-4 px-4 text-center">
                            <div class="flex flex-col">
                                <span class="text-gray-900 font-bold">48.50g</span>
                                <span class="text-gray-400 text-[10px]">₹4,85,000</span>
                            </div>
                        </td>
                        <td class="py-4 px-4 text-center text-xs font-bold text-gray-900">08</td>
                        <td class="py-4 px-4 text-center text-gray-600">Central<br>Vault</td>
                        <td class="py-4 px-4 text-center">
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100/50 text-green-600 text-[9px] font-bold border border-green-200">
                                <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div> Healthy
                            </span>
                        </td>
                        <td class="py-4 px-6 text-center">
                            <div class="flex items-center justify-center gap-3 text-gray-500 text-xs">
                                <button class="hover:text-gray-800"><i class="fa-solid fa-pen"></i></button>
                                <button class="hover:text-gray-800"><i class="fa-solid fa-eye"></i></button>
                                <button class="hover:text-gray-800"><i class="fa-regular fa-trash-can"></i></button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 2 -->
                    <tr class="border-b border-gray-50 hover:bg-gray-50/50">
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 bg-gray-100 rounded overflow-hidden shrink-0">
                                    <img src="https://images.unsplash.com/photo-1605100804763-247f66150ce8?w=100&h=100&fit=crop" class="w-full h-full object-cover">
                                </div>
                                <div class="flex flex-col gap-0.5">
                                    <div class="font-bold text-gray-900 text-xs">Eternal Solitaire<br>Ring</div>
                                    <div class="text-gray-400 text-[9px] font-bold">RJ-D-28381</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-4 text-center text-gray-600">Raw<br>Diamond</td>
                        <td class="py-4 px-4 text-center text-gray-600">VVS1 - E Color</td>
                        <td class="py-4 px-4 text-center">
                            <div class="flex flex-col">
                                <span class="text-gray-900 font-bold">4.20g</span>
                                <span class="text-gray-400 text-[10px]">₹2,45,000</span>
                            </div>
                        </td>
                        <td class="py-4 px-4 text-center text-xs font-bold text-gray-900">02</td>
                        <td class="py-4 px-4 text-center text-gray-600">Main<br>Display</td>
                        <td class="py-4 px-4 text-center">
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100/50 text-amber-500 text-[9px] font-bold border border-amber-200">
                                <div class="w-1.5 h-1.5 rounded-full bg-amber-500"></div> Low Stock
                            </span>
                        </td>
                        <td class="py-4 px-6 text-center">
                            <div class="flex items-center justify-center gap-3 text-gray-500 text-xs">
                                <button class="hover:text-gray-800"><i class="fa-solid fa-pen"></i></button>
                                <button class="hover:text-gray-800"><i class="fa-solid fa-eye"></i></button>
                                <button class="hover:text-gray-800"><i class="fa-regular fa-trash-can"></i></button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 3 -->
                    <tr class="border-b border-gray-50 hover:bg-gray-50/50">
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 bg-gray-100 rounded overflow-hidden shrink-0">
                                    <img src="https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=100&h=100&fit=crop" class="w-full h-full object-cover">
                                </div>
                                <div class="flex flex-col gap-0.5">
                                    <div class="font-bold text-gray-900 text-xs">Imperial Meena<br>Bangles</div>
                                    <div class="text-gray-400 text-[9px] font-bold">RJ-G-99238</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-4 text-center text-gray-600">Raw Gold</td>
                        <td class="py-4 px-4 text-center text-gray-600">22K KDM</td>
                        <td class="py-4 px-4 text-center">
                            <div class="flex flex-col">
                                <span class="text-gray-900 font-bold">112.00g</span>
                                <span class="text-gray-400 text-[10px]">₹8,96,000</span>
                            </div>
                        </td>
                        <td class="py-4 px-4 text-center text-xs font-bold text-gray-900">00</td>
                        <td class="py-4 px-4 text-center text-gray-600">N/A</td>
                        <td class="py-4 px-4 text-center">
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100/50 text-[#b01622] text-[9px] font-bold border border-red-200">
                                <div class="w-1.5 h-1.5 rounded-full bg-[#b01622]"></div> Out of Stock
                            </span>
                        </td>
                        <td class="py-4 px-6 text-center">
                            <div class="flex items-center justify-center gap-3 text-gray-500 text-xs">
                                <button class="hover:text-gray-800"><i class="fa-solid fa-pen"></i></button>
                                <button class="hover:text-gray-800"><i class="fa-solid fa-eye"></i></button>
                                <button class="hover:text-gray-800"><i class="fa-regular fa-trash-can"></i></button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 4 -->
                    <tr class="hover:bg-gray-50/50">
                        <td class="py-4 px-6">
                            <div class="flex items-center gap-3">
                                <div class="w-9 h-9 bg-gray-100 rounded overflow-hidden shrink-0">
                                    <img src="https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=100&h=100&fit=crop" class="w-full h-full object-cover">
                                </div>
                                <div class="flex flex-col gap-0.5">
                                    <div class="font-bold text-gray-900 text-xs">Emerald Drop<br>Earrings</div>
                                    <div class="text-gray-400 text-[9px] font-bold">RJ-E-38492</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-4 px-4 text-center text-gray-600">Raw<br>Stone</td>
                        <td class="py-4 px-4 text-center text-gray-600">18K White +<br>Emerald</td>
                        <td class="py-4 px-4 text-center">
                            <div class="flex flex-col">
                                <span class="text-gray-900 font-bold">12.80g</span>
                                <span class="text-gray-400 text-[10px]">₹3,20,000</span>
                            </div>
                        </td>
                        <td class="py-4 px-4 text-center text-xs font-bold text-gray-900">15</td>
                        <td class="py-4 px-4 text-center text-gray-600">Branch -<br>Bandra</td>
                        <td class="py-4 px-4 text-center">
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100/50 text-green-600 text-[9px] font-bold border border-green-200">
                                <div class="w-1.5 h-1.5 rounded-full bg-green-500"></div> Healthy
                            </span>
                        </td>
                        <td class="py-4 px-6 text-center">
                            <div class="flex items-center justify-center gap-3 text-gray-500 text-xs">
                                <button class="hover:text-gray-800"><i class="fa-solid fa-pen"></i></button>
                                <button class="hover:text-gray-800"><i class="fa-solid fa-eye"></i></button>
                                <button class="hover:text-gray-800"><i class="fa-regular fa-trash-can"></i></button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Pagination -->
        <div class="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div class="text-[11px] text-gray-500 font-bold">Showing 1 to 4 of 1,240 items</div>
            <div class="flex items-center gap-2 text-xs font-bold">
                <button class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"><i class="fa-solid fa-chevron-left text-[9px]"></i></button>
                <button class="w-6 h-6 flex items-center justify-center rounded bg-[#b01622] text-white">1</button>
                <button class="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded">2</button>
                <button class="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded">3</button>
                <span class="w-6 h-6 flex items-center justify-center text-gray-400">..</span>
                <button class="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-200 rounded">310</button>
                <button class="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600"><i class="fa-solid fa-chevron-right text-[9px]"></i></button>
            </div>
        </div>

    </div>
</div>
@endsection
