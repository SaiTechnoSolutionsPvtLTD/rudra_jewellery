@extends('layouts.app')

@section('title', 'Price List')

@section('content')
<div class="max-w-7xl mx-auto pb-10">
    <!-- Header -->
    <div class="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
        <div>
            <div class="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                <span>Client Management</span>
                <i class="fa-solid fa-chevron-right text-[8px]"></i>
                <span class="text-[#b01622]">Price List</span>
            </div>
            <h1 class="text-2xl font-bold text-gray-900">Live Rates & Price List</h1>
        </div>
        <div class="flex items-center gap-3">
            <button class="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors shadow-sm">
                <i class="fa-solid fa-filter text-[11px]"></i>
            </button>
            <button class="px-4 py-2 border border-[#b01622] text-[#b01622] rounded-md text-[13px] font-semibold hover:bg-red-50 transition-colors shadow-sm flex items-center gap-2">
                <i class="fa-solid fa-arrow-up-from-bracket"></i> Import Price List
            </button>
            <button class="px-4 py-2 bg-[#b01622] text-white rounded-md text-[13px] font-semibold hover:bg-[#90121b] transition-colors shadow-sm flex items-center gap-2">
                <i class="fa-solid fa-plus"></i> Create New Price List
            </button>
        </div>
    </div>

    <!-- Top Card: Client Selector -->
    <div class="bg-gray-50/70 rounded-xl border border-gray-100 p-5 mb-6 flex flex-col md:flex-row md:items-center gap-6 shadow-sm">
        <div class="flex-1 max-w-sm">
            <label class="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Select Client</label>
            <a href="{{ route('client.pricelist.details') }}" class="bg-white border border-gray-200 rounded-md p-2 flex items-center justify-between cursor-pointer hover:border-[#b01622] transition-colors group block">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded bg-red-50 flex items-center justify-center text-[#b01622] group-hover:bg-[#b01622] group-hover:text-white transition-colors">
                        <i class="fa-regular fa-user text-lg"></i>
                    </div>
                    <div>
                        <div class="text-[13px] font-bold text-gray-900 group-hover:text-[#b01622] transition-colors">Meera Singhania <span class="text-gray-500 font-normal">(Elite)</span></div>
                        <div class="text-[10px] text-gray-500 mt-0.5">meera.s@gmail.com • +91 98765 43210</div>
                    </div>
                </div>
                <div class="flex flex-col text-gray-400 px-2 gap-0.5 group-hover:text-[#b01622] transition-colors">
                    <i class="fa-solid fa-arrow-right text-[12px]"></i>
                </div>
            </a>
        </div>
        
        <div class="flex flex-wrap items-center gap-8 md:gap-12 md:pl-6 md:border-l border-gray-200">
            <div>
                <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Client Code</div>
                <div class="text-[13px] font-semibold text-gray-900">RJ-EL-1024</div>
            </div>
            <div>
                <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Client Tier</div>
                <span class="inline-flex px-2 py-0.5 rounded bg-[#fbdc69] text-gray-900 text-[10px] font-bold uppercase tracking-wider">Elite</span>
            </div>
            <div>
                <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Default GST</div>
                <div class="text-[13px] font-semibold text-gray-900">-</div>
            </div>
            <div>
                <div class="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Last Updated</div>
                <div class="text-[13px] font-semibold text-gray-900">23 Jul 2026 • 10:30 AM</div>
            </div>
        </div>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left Column (Span 2) -->
        <div class="lg:col-span-2 space-y-6">
            
            <!-- Diamond Stone Rate -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="px-5 py-4 flex flex-wrap items-center justify-between border-b border-gray-100 gap-4">
                    <h2 class="text-[15px] font-bold text-gray-900">1. Diamond Stone Rate <span class="text-gray-400 font-normal text-[11px] ml-1">(Per Carat)</span></h2>
                    <div class="flex items-center gap-2">
                        <button class="px-3 py-1.5 border border-gray-200 rounded text-[11px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5">
                            <i class="fa-solid fa-arrow-up-from-bracket text-gray-400"></i> Import from Excel
                        </button>
                        <button class="px-3 py-1.5 bg-[#b01622] text-white rounded text-[11px] font-semibold hover:bg-[#90121b] transition-colors flex items-center gap-1.5 shadow-sm">
                            <i class="fa-solid fa-plus text-[9px]"></i> Add Stone Rate
                        </button>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-[12px]">
                        <thead>
                            <tr class="text-gray-400 text-[9px] uppercase tracking-wider font-bold border-b border-gray-100">
                                <th class="py-3 px-5">Shape</th>
                                <th class="py-3 px-5">Quality</th>
                                <th class="py-3 px-5 text-center">Sieve</th>
                                <th class="py-3 px-5 text-center">Stone Cents</th>
                                <th class="py-3 px-5 text-right">Rate / CT (₹)</th>
                                <th class="py-3 px-5 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 text-gray-600">
                            <!-- Rows... -->
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="py-3 px-5">Round Diamond</td>
                                <td class="py-3 px-5">EF-VVS</td>
                                <td class="py-3 px-5 text-center">-2</td>
                                <td class="py-3 px-5 text-center">0.000-0.01</td>
                                <td class="py-3 px-5 text-right font-bold text-gray-900">60,000</td>
                                <td class="py-3 px-5">
                                    <div class="flex items-center justify-center gap-3 text-gray-300">
                                        <i class="fa-solid fa-pen hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                        <i class="fa-regular fa-trash-can hover:text-red-500 cursor-pointer text-[10px]"></i>
                                    </div>
                                </td>
                            </tr>
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="py-3 px-5">Round Diamond</td>
                                <td class="py-3 px-5">EF-VVS</td>
                                <td class="py-3 px-5 text-center">(+2 - 6)</td>
                                <td class="py-3 px-5 text-center">0.011-0.019</td>
                                <td class="py-3 px-5 text-right font-bold text-gray-900">60,000</td>
                                <td class="py-3 px-5">
                                    <div class="flex items-center justify-center gap-3 text-gray-300">
                                        <i class="fa-solid fa-pen hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                        <i class="fa-regular fa-trash-can hover:text-red-500 cursor-pointer text-[10px]"></i>
                                    </div>
                                </td>
                            </tr>
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="py-3 px-5">Round Diamond</td>
                                <td class="py-3 px-5">EF-VVS</td>
                                <td class="py-3 px-5 text-center">(+6 - 9)</td>
                                <td class="py-3 px-5 text-center">0.02-0.05</td>
                                <td class="py-3 px-5 text-right font-bold text-gray-900">56,000</td>
                                <td class="py-3 px-5">
                                    <div class="flex items-center justify-center gap-3 text-gray-300">
                                        <i class="fa-solid fa-pen hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                        <i class="fa-regular fa-trash-can hover:text-red-500 cursor-pointer text-[10px]"></i>
                                    </div>
                                </td>
                            </tr>
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="py-3 px-5">Round Diamond</td>
                                <td class="py-3 px-5">EF-VVS</td>
                                <td class="py-3 px-5 text-center">(+9 - 10.5)</td>
                                <td class="py-3 px-5 text-center">0.06-0.07</td>
                                <td class="py-3 px-5 text-right font-bold text-gray-900">58,000</td>
                                <td class="py-3 px-5">
                                    <div class="flex items-center justify-center gap-3 text-gray-300">
                                        <i class="fa-solid fa-pen hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                        <i class="fa-regular fa-trash-can hover:text-red-500 cursor-pointer text-[10px]"></i>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="px-5 py-3 border-t border-gray-100 text-[10px] text-gray-400">
                    Showing 1 to 8 of 8 entries
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Color Stone Charges -->
                <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    <div class="px-5 py-4 flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <h2 class="text-[13px] font-bold text-gray-800 leading-tight">Color Stone <br>Charges</h2>
                            <span class="text-gray-900 font-bold text-[9px]">(Per Carat)</span>
                        </div>
                        <button class="px-3 py-1.5 border border-red-200 text-[#b01622] rounded text-[9px] font-bold hover:bg-red-50 transition-colors flex items-center gap-1.5 text-center">
                            <span class="text-red-400 font-normal">+</span> <span class="leading-tight">Add<br>Stone</span>
                        </button>
                    </div>
                    <table class="w-full text-left border-collapse text-[11px] flex-1">
                        <thead>
                            <tr class="text-gray-500 text-[9px] uppercase tracking-wider font-bold border-y border-gray-100 bg-gray-50/50">
                                <th class="py-2.5 px-5">Stone</th>
                                <th class="py-2.5 px-5 text-center">Rate / CT (₹)</th>
                                <th class="py-2.5 px-5 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 text-gray-600">
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="py-3 px-5 text-[11px]">Navaratna Stones</td>
                                <td class="py-3 px-5 text-center">1,800 / CT</td>
                                <td class="py-3 px-5">
                                    <div class="flex items-center justify-center gap-2.5 text-gray-300">
                                        <i class="fa-solid fa-pen hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                        <i class="fa-regular fa-trash-can hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                    </div>
                                </td>
                            </tr>
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="py-3 px-5 text-[11px]">Emerald</td>
                                <td class="py-3 px-5 text-center">2,000 / CT</td>
                                <td class="py-3 px-5">
                                    <div class="flex items-center justify-center gap-2.5 text-gray-300">
                                        <i class="fa-solid fa-pen hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                        <i class="fa-regular fa-trash-can hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                    </div>
                                </td>
                            </tr>
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="py-3 px-5 text-[11px]">Onyx</td>
                                <td class="py-3 px-5 text-center">550 / CT</td>
                                <td class="py-3 px-5">
                                    <div class="flex items-center justify-center gap-2.5 text-gray-300">
                                        <i class="fa-solid fa-pen hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                        <i class="fa-regular fa-trash-can hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- 4. Additional Charges -->
                <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
                    <h2 class="text-[13px] font-bold text-gray-700 mb-5">4. Additional Charges</h2>
                    
                    <div class="grid grid-cols-3 gap-3 mb-5">
                        <div>
                            <label class="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 h-6">Minimum<br>Labour</label>
                            <div class="relative">
                                <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">₹</span>
                                <input type="text" value="1,500" class="w-full bg-gray-50/50 border border-gray-100 rounded px-1.5 pl-5 py-1.5 text-[11px] font-bold text-gray-900 focus:outline-none">
                            </div>
                            <div class="text-[7px] text-gray-400 mt-1 leading-tight">Per Piece for below<br>1.00 gms items</div>
                        </div>
                        <div>
                            <label class="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 h-6">Single Nose<br>Pin</label>
                            <div class="relative">
                                <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">₹</span>
                                <input type="text" value="850" class="w-full bg-gray-50/50 border border-gray-100 rounded px-1.5 pl-5 py-1.5 text-[11px] font-bold text-gray-900 focus:outline-none">
                            </div>
                            <div class="text-[7px] text-gray-400 mt-1">Per Piece</div>
                        </div>
                        <div>
                            <label class="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 h-6 flex items-end">Multi Stones</label>
                            <div class="relative">
                                <span class="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">₹</span>
                                <input type="text" value="1,000" class="w-full bg-gray-50/50 border border-gray-100 rounded px-1.5 pl-5 py-1.5 text-[11px] font-bold text-gray-900 focus:outline-none">
                            </div>
                            <div class="text-[7px] text-gray-400 mt-1">Per Piece</div>
                        </div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-3 mt-auto">
                        <div>
                            <label class="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Step Nose Pin</label>
                            <div class="relative">
                                <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">₹</span>
                                <input type="text" placeholder="-" class="w-full bg-gray-50/50 border border-gray-100 rounded px-2 pl-6 py-1.5 text-[11px] font-bold text-gray-900 focus:outline-none placeholder-gray-300">
                            </div>
                        </div>
                        <div>
                            <label class="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Tongai</label>
                            <div class="relative">
                                <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[10px]">₹</span>
                                <input type="text" placeholder="-" class="w-full bg-gray-50/50 border border-gray-100 rounded px-2 pl-6 py-1.5 text-[11px] font-bold text-gray-900 focus:outline-none placeholder-gray-300">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Making Charges -->
            <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mt-6">
                <div class="px-5 py-4 flex items-center justify-between">
                    <h2 class="text-[14px] font-bold text-gray-700">Making Charges</h2>
                    <button class="px-3 py-1.5 border border-red-200 text-[#b01622] rounded text-[9px] font-bold hover:bg-red-50 transition-colors flex items-center gap-1.5">
                        <span class="text-red-400 font-normal">+</span> Add Making Charge
                    </button>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse text-[11px]">
                        <thead>
                            <tr class="text-gray-500 text-[9px] uppercase tracking-wider font-bold border-y border-gray-100 bg-gray-50/50">
                                <th class="py-3 px-5">Type / Design</th>
                                <th class="py-3 px-5 text-center">Wastage (%)</th>
                                <th class="py-3 px-5">Labour Charge</th>
                                <th class="py-3 px-5 text-center">Gold Purity</th>
                                <th class="py-3 px-5 text-center">On WT</th>
                                <th class="py-3 px-5 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 text-gray-600">
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="py-3 px-5 text-[11px]">22KT: Close Setting</td>
                                <td class="py-3 px-5 text-center">6%</td>
                                <td class="py-3 px-5 text-[11px]">Rs. 500/- per gms wt</td>
                                <td class="py-3 px-5 text-center">916</td>
                                <td class="py-3 px-5 text-center">92%</td>
                                <td class="py-3 px-5">
                                    <div class="flex items-center justify-center gap-3 text-gray-300">
                                        <i class="fa-solid fa-pen hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                        <i class="fa-regular fa-trash-can hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                    </div>
                                </td>
                            </tr>
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="py-3 px-5 text-[11px]">18KT: Open Setting</td>
                                <td class="py-3 px-5 text-center">6%</td>
                                <td class="py-3 px-5 text-[11px]">Rs. 450/- per gms wt</td>
                                <td class="py-3 px-5 text-center">916</td>
                                <td class="py-3 px-5 text-center">92%</td>
                                <td class="py-3 px-5">
                                    <div class="flex items-center justify-center gap-3 text-gray-300">
                                        <i class="fa-solid fa-pen hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                        <i class="fa-regular fa-trash-can hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                    </div>
                                </td>
                            </tr>
                            <tr class="hover:bg-gray-50 transition-colors">
                                <td class="py-3 px-5 text-[11px]">18KT: Open / Close</td>
                                <td class="py-3 px-5 text-center">6%</td>
                                <td class="py-3 px-5 text-[11px]">Rs. 500/- per gms wt</td>
                                <td class="py-3 px-5 text-center">750</td>
                                <td class="py-3 px-5 text-center">76%</td>
                                <td class="py-3 px-5">
                                    <div class="flex items-center justify-center gap-3 text-gray-300">
                                        <i class="fa-solid fa-pen hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                        <i class="fa-regular fa-trash-can hover:text-gray-600 cursor-pointer text-[10px]"></i>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <!-- Instruction for Inscription on Product (Stamping) -->
                <div class="bg-white rounded-xl border border-gray-100 p-6 shadow-sm relative overflow-hidden">
                    <h2 class="text-[13px] font-bold text-gray-700 mb-6 leading-tight">Instruction for Inscription on Product<br>(Stamping)</h2>
                    
                    <div class="grid grid-cols-2 gap-x-6 gap-y-5">
                        <div>
                            <label class="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Stamping Detail</label>
                            <input type="text" value="DIA WT/NO OF DIA/ RJ Seal" class="w-full bg-gray-50/50 border border-gray-50 rounded px-3 py-2 text-[9px] font-medium text-gray-700 focus:outline-none cursor-default" readonly>
                        </div>
                        <div>
                            <label class="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Certification</label>
                            <input type="text" value="-" class="w-full bg-gray-50/50 border border-gray-50 rounded px-3 py-2 text-[10px] font-medium text-gray-700 focus:outline-none cursor-default" readonly>
                        </div>
                        <div>
                            <label class="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Hallmark / HUID</label>
                            <input type="text" value="NO" class="w-full bg-gray-50/50 border border-gray-50 rounded px-3 py-2 text-[10px] font-medium text-gray-700 focus:outline-none cursor-default" readonly>
                        </div>
                        <div>
                            <label class="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Metal Colour</label>
                            <input type="text" value="-" class="w-full bg-gray-50/50 border border-gray-50 rounded px-3 py-2 text-[10px] font-medium text-gray-700 focus:outline-none cursor-default" readonly>
                        </div>
                        <div>
                            <label class="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Client QC Before Bill:</label>
                            <input type="text" value="NO" class="w-full bg-gray-50/50 border border-gray-50 rounded px-3 py-2 text-[10px] font-medium text-gray-700 focus:outline-none cursor-default" readonly>
                        </div>
                        <div>
                            <label class="block text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Necklace Back Chain</label>
                            <input type="text" value="-" class="w-full bg-gray-50/50 border border-gray-50 rounded px-3 py-2 text-[10px] font-medium text-gray-700 focus:outline-none cursor-default" readonly>
                        </div>
                    </div>
                </div>

                <!-- Payment Terms -->
                <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div class="px-5 py-5">
                        <h3 class="text-[13px] font-bold text-gray-700">Payment Terms</h3>
                    </div>
                    <table class="w-full text-left text-[11px]">
                        <thead>
                            <tr class="bg-gray-50/50 text-gray-400 text-[9px] uppercase tracking-wider font-bold border-y border-gray-100">
                                <th class="py-2.5 px-5">Type</th>
                                <th class="py-2.5 px-5 text-center">Terms</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 text-gray-600">
                            <tr>
                                <td class="py-3 px-5 text-[11px]">Gold</td>
                                <td class="py-3 px-5 text-center font-bold text-gray-700">COD</td>
                            </tr>
                            <tr>
                                <td class="py-3 px-5 text-[11px]">Diamond</td>
                                <td class="py-3 px-5 text-center font-bold text-gray-700">COD</td>
                            </tr>
                            <tr>
                                <td class="py-3 px-5 text-[11px]">MC</td>
                                <td class="py-3 px-5 text-center font-bold text-gray-700">COD</td>
                            </tr>
                            <tr>
                                <td class="py-3 px-5 text-[11px]">MC</td>
                                <td class="py-3 px-5 text-center font-bold text-gray-700">COD</td>
                            </tr>
                            <tr>
                                <td class="py-3 px-5 text-[11px]">Diamond</td>
                                <td class="py-3 px-5 text-center font-bold text-gray-700">COD</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

        </div>

        <!-- Right Column (Span 1) -->
        <div class="space-y-6">
            
            <!-- Current Active Version -->
            <div class="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
                <h3 class="text-[14px] font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <i class="fa-regular fa-clipboard text-[#b01622]"></i> Current Active Version
                </h3>
                
                <div class="space-y-5">
                    <div>
                        <div class="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">Client</div>
                        <div class="text-[13px] font-bold text-gray-900">Sri KMS Jewelers(Coimbatore)</div>
                        <div class="text-[9px] text-gray-400 mt-0.5">Code: SLJ-TR-001</div>
                    </div>
                    
                    <div class="flex justify-between items-center">
                        <div>
                            <div class="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">Version</div>
                            <div class="text-[14px] font-bold text-gray-900">02</div>
                        </div>
                        <div class="text-right">
                            <div class="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</div>
                            <div class="text-[11px] font-bold text-green-500">Active</div>
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-center border-t border-gray-100 pt-4">
                        <div>
                            <div class="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">Effective From</div>
                            <div class="text-[12px] font-bold text-gray-900">01 Aug 2026</div>
                        </div>
                        <div class="text-right">
                            <div class="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">Effective To</div>
                            <div class="text-[12px] font-bold text-gray-900">Open / Till Updated</div>
                        </div>
                    </div>
                    
                    <div class="flex justify-between items-end border-t border-gray-100 pt-4">
                        <div>
                            <div class="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">Last Updated</div>
                            <div class="text-[12px] font-bold text-gray-900">23 Jul 2026 • 10:30 AM</div>
                        </div>
                        <div class="text-[9px] text-gray-400">
                            by Arvind (Admin)
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Actions -->
            <div class="bg-transparent mt-2">
                <h3 class="text-[10px] font-bold text-[#b01622] uppercase tracking-wider mb-3">Quick Actions</h3>
                <div class="space-y-3">
                    <button class="w-full px-4 py-3.5 bg-white border border-red-200 rounded-md text-[11px] font-bold text-[#b01622] flex items-center gap-3 hover:bg-red-50 transition-colors text-left shadow-sm">
                        <i class="fa-regular fa-copy w-4 text-[14px]"></i> Duplicate Price List
                    </button>
                    <button class="w-full px-4 py-3.5 bg-white border border-red-200 rounded-md text-[11px] font-bold text-[#b01622] flex items-center gap-3 hover:bg-red-50 transition-colors text-left shadow-sm">
                        <i class="fa-regular fa-file-pdf w-4 text-[14px]"></i> Export Price List (PDF)
                    </button>
                    <button class="w-full px-4 py-3.5 bg-white border border-red-200 rounded-md text-[11px] font-bold text-[#b01622] flex items-center gap-3 hover:bg-red-50 transition-colors text-left shadow-sm">
                        <i class="fa-solid fa-table-cells w-4 text-[14px]"></i> Export to Excel
                    </button>
                    <button class="w-full px-4 py-3.5 bg-white border border-red-200 rounded-md text-[11px] font-bold text-[#b01622] flex items-center gap-3 hover:bg-red-50 transition-colors text-left shadow-sm">
                        <i class="fa-regular fa-eye w-4 text-[14px]"></i> View Price List History
                    </button>
                </div>
            </div>

    </div>

</div>
@endsection
