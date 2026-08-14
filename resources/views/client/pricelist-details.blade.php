@extends('layouts.app')

@section('title', 'Price List Summary')

@section('content')
<div class="max-w-[1000px] mx-auto bg-white min-h-screen relative shadow-xl">
    
    <!-- Watermark -->
    <div class="pointer-events-none absolute inset-0 z-0 flex justify-center items-center overflow-hidden opacity-5">
        <h1 class="text-[120px] font-black text-gray-900 tracking-widest uppercase transform -rotate-45 whitespace-nowrap select-none">
            RUDHRA JEWELLERS
        </h1>
    </div>

    <!-- Printable Area Content -->
    <div class="relative z-10 p-8 md:p-12 h-full flex flex-col">
        
        <!-- Header -->
        <div class="flex justify-between items-start mb-10 border-b border-gray-100 pb-8">
            <div class="w-32 h-32 bg-[#b01622] flex flex-col items-center justify-center text-white">
                <div class="flex items-center gap-2 mb-2">
                    <i class="fa-solid fa-gem text-2xl"></i>
                    <span class="text-3xl font-serif">RJ</span>
                </div>
                <div class="text-[8px] tracking-[0.2em] uppercase text-center font-light mt-1">Rudra Jewellers<br>chennai</div>
            </div>
            
            <div class="text-center flex-1 pt-4">
                <h1 class="text-3xl font-bold text-[#b01622] uppercase tracking-wider mb-2">Price List</h1>
                <h2 class="text-gray-500 font-medium">Price List - 02</h2>
                <div class="w-16 h-px bg-gray-200 mx-auto mt-4 relative">
                    <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rotate-45 bg-[#b01622]"></div>
                </div>
            </div>
            
            <div class="text-right flex flex-col items-end gap-3 pt-2">
                <button class="px-4 py-1.5 border border-[#b01622] text-[#b01622] rounded text-[10px] font-bold uppercase tracking-wider hover:bg-red-50 transition-colors flex items-center gap-2 bg-white">
                    <i class="fa-solid fa-print"></i> Print Sheet
                </button>
                <div class="text-[8px] text-gray-400 uppercase tracking-wider font-semibold mt-2">
                    Date : 30 Jul 2026 | Time : 10:30 AM
                </div>
            </div>
        </div>

        <!-- Top Info Cards -->
        <div class="grid grid-cols-2 gap-8 mb-10">
            <!-- Client Details -->
            <div class="bg-gray-50/50 rounded-xl p-6 border border-gray-100">
                <h3 class="text-[10px] font-bold text-[#b01622] uppercase tracking-wider mb-5 flex items-center gap-2">
                    <i class="fa-regular fa-user"></i> Client Details
                </h3>
                <table class="w-full text-[11px] text-gray-600">
                    <tbody class="space-y-4">
                        <tr>
                            <td class="py-1.5 w-1/3">Client Name</td>
                            <td class="py-1.5 font-bold text-gray-900">: &nbsp;&nbsp;Meena Singhania (Elite)</td>
                        </tr>
                        <tr>
                            <td class="py-1.5">Client Code</td>
                            <td class="py-1.5 font-bold text-gray-900">: &nbsp;&nbsp;RJ-PL-1024</td>
                        </tr>
                        <tr>
                            <td class="py-1.5">Membership Tier</td>
                            <td class="py-1.5 font-bold text-gray-900">: &nbsp;&nbsp;Silver Member</td>
                        </tr>
                        <tr>
                            <td class="py-1.5">Email</td>
                            <td class="py-1.5 font-bold text-gray-900">: &nbsp;&nbsp;meena.singhania@gmail.com</td>
                        </tr>
                        <tr>
                            <td class="py-1.5">Phone</td>
                            <td class="py-1.5 font-bold text-gray-900">: &nbsp;&nbsp;+91 98765 43210</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- List Details -->
            <div class="bg-gray-50/50 rounded-xl p-6 border border-gray-100">
                <table class="w-full text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-4">
                    <tbody>
                        <tr>
                            <td class="py-2.5 w-2/5 flex items-center gap-2"><i class="fa-regular fa-calendar text-gray-400"></i> Starting From</td>
                            <td class="py-2.5 font-bold text-gray-900 normal-case text-[11px]">: &nbsp;&nbsp;01 Aug 2026</td>
                        </tr>
                        <tr>
                            <td class="py-2.5 flex items-center gap-2"><i class="fa-regular fa-calendar-xmark text-gray-400"></i> Ending To</td>
                            <td class="py-2.5 font-bold text-gray-900 normal-case text-[11px]">: &nbsp;&nbsp;—</td>
                        </tr>
                        <tr>
                            <td class="py-2.5 flex items-center gap-2"><i class="fa-regular fa-user-circle text-gray-400"></i> Created By</td>
                            <td class="py-2.5 font-bold text-gray-900 text-[10px]">: &nbsp;&nbsp;ARVIND SHARMA (SUPER ADMIN)</td>
                        </tr>
                        <tr>
                            <td class="py-2.5 flex items-center gap-2"><i class="fa-solid fa-clock-rotate-left text-gray-400"></i> Last Updated</td>
                            <td class="py-2.5 font-bold text-gray-900 normal-case text-[11px]">: &nbsp;&nbsp;30 Jul 2026 10:30 AM</td>
                        </tr>
                        <tr>
                            <td class="py-2.5 flex items-center gap-2"><i class="fa-solid fa-rotate text-gray-400"></i> Status</td>
                            <td class="py-2.5 font-bold text-green-500 text-[10px]">: &nbsp;&nbsp;ACTIVE</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Main Content Grid -->
        <div class="grid grid-cols-12 gap-8 mb-10">
            <!-- Left Column (Span 8) -->
            <div class="col-span-12 md:col-span-8 space-y-8">
                
                <!-- 1. Diamond Rates -->
                <div>
                    <h3 class="text-[11px] font-bold text-[#b01622] uppercase tracking-wider mb-4 flex items-center gap-2">
                        <i class="fa-regular fa-gem"></i> 1. Diamond Rates <span class="text-gray-400 font-normal normal-case ml-1">(per carat)</span>
                    </h3>
                    <table class="w-full text-left text-[11px]">
                        <thead>
                            <tr class="text-gray-400 text-[9px] uppercase tracking-wider font-bold border-b border-gray-100">
                                <th class="py-3 px-2">Shape</th>
                                <th class="py-3 px-2">Quality</th>
                                <th class="py-3 px-2 text-center">Size (CT)</th>
                                <th class="py-3 px-2 text-right">Rate / CT (₹)</th>
                                <th class="py-3 px-2 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 text-gray-700">
                            <tr>
                                <td class="py-3 px-2">Round Diamond</td>
                                <td class="py-3 px-2">IF - VVS</td>
                                <td class="py-3 px-2 text-center">0.00 - 0.10</td>
                                <td class="py-3 px-2 text-right font-bold text-gray-900">60,000</td>
                                <td class="py-3 px-2 text-center text-gray-300">—</td>
                            </tr>
                            <tr>
                                <td class="py-3 px-2">Round Diamond</td>
                                <td class="py-3 px-2">IF - VVS</td>
                                <td class="py-3 px-2 text-center">0.10 - 0.18</td>
                                <td class="py-3 px-2 text-right font-bold text-gray-900">62,000</td>
                                <td class="py-3 px-2 text-center text-gray-300">—</td>
                            </tr>
                            <tr>
                                <td class="py-3 px-2">Round Diamond</td>
                                <td class="py-3 px-2">IF - VS</td>
                                <td class="py-3 px-2 text-center">0.18 - 0.30</td>
                                <td class="py-3 px-2 text-right font-bold text-gray-900">58,500</td>
                                <td class="py-3 px-2 text-center text-gray-300">—</td>
                            </tr>
                            <tr>
                                <td class="py-3 px-2">Round Diamond</td>
                                <td class="py-3 px-2">SI - VS</td>
                                <td class="py-3 px-2 text-center">0.30 - 0.50</td>
                                <td class="py-3 px-2 text-right font-bold text-gray-900">56,000</td>
                                <td class="py-3 px-2 text-center text-gray-300">—</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="text-[8px] italic text-gray-400 mt-2">* Rates are exclusive of GST and other charges.</div>
                </div>

                <div class="grid grid-cols-2 gap-8">
                    <!-- 2. Color Stone Charges -->
                    <div>
                        <h3 class="text-[11px] font-bold text-[#b01622] uppercase tracking-wider mb-4 flex items-center gap-2">
                            <i class="fa-regular fa-file-lines"></i> 2. Color Stone Charges
                        </h3>
                        <table class="w-full text-left text-[11px]">
                            <thead>
                                <tr class="bg-red-50/50 text-gray-500 text-[9px] uppercase tracking-wider font-bold border-y border-red-50">
                                    <th class="py-2.5 px-3">Type</th>
                                    <th class="py-2.5 px-2 text-center">Override</th>
                                    <th class="py-2.5 px-3 text-right">Rate</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50 text-gray-700">
                                <tr>
                                    <td class="py-3 px-3">Ruby</td>
                                    <td class="py-3 px-2 text-center">+</td>
                                    <td class="py-3 px-3 text-right font-bold text-gray-900">1,500 / CT</td>
                                </tr>
                                <tr>
                                    <td class="py-3 px-3">Emerald</td>
                                    <td class="py-3 px-2 text-center">+</td>
                                    <td class="py-3 px-3 text-right font-bold text-gray-900">1,200 / CT</td>
                                </tr>
                                <tr>
                                    <td class="py-3 px-3">Sapphire</td>
                                    <td class="py-3 px-2 text-center">+</td>
                                    <td class="py-3 px-3 text-right font-bold text-gray-900">1,000 / CT</td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="text-[9px] text-gray-400 font-semibold mt-3 px-3 hover:text-gray-600 cursor-pointer">View All</div>
                    </div>

                    <!-- 3. Additional Charges -->
                    <div>
                        <h3 class="text-[11px] font-bold text-[#b01622] uppercase tracking-wider mb-4 flex items-center gap-2">
                            <i class="fa-solid fa-plus-minus text-gray-400"></i> 3. Additional Charges
                        </h3>
                        <table class="w-full text-left text-[11px]">
                            <thead>
                                <tr class="bg-gray-50/50 text-gray-500 text-[9px] uppercase tracking-wider font-bold border-y border-gray-100">
                                    <th class="py-2.5 px-3">Charge Type</th>
                                    <th class="py-2.5 px-2 text-center">Type</th>
                                    <th class="py-2.5 px-3 text-right">Rate (₹)</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-50 text-gray-700">
                                <tr>
                                    <td class="py-3 px-3">Tag Charges</td>
                                    <td class="py-3 px-2 text-center">Fixed</td>
                                    <td class="py-3 px-3 text-right font-bold text-gray-900">₹ 500</td>
                                </tr>
                                <tr>
                                    <td class="py-3 px-3">Certificate</td>
                                    <td class="py-3 px-2 text-center">Fixed</td>
                                    <td class="py-3 px-3 text-right font-bold text-gray-900">₹ 300</td>
                                </tr>
                                <tr>
                                    <td class="py-3 px-3">Hallmark</td>
                                    <td class="py-3 px-2 text-center">Fixed</td>
                                    <td class="py-3 px-3 text-right font-bold text-gray-900">₹ 250</td>
                                </tr>
                            </tbody>
                        </table>
                        <div class="text-[9px] text-gray-400 font-semibold mt-3 px-3 hover:text-gray-600 cursor-pointer">View All</div>
                    </div>
                </div>

                <!-- 4. Making Charges -->
                <div>
                    <h3 class="text-[11px] font-bold text-[#b01622] uppercase tracking-wider mb-4 flex items-center gap-2">
                        <i class="fa-regular fa-circle-dot text-[#b01622]"></i> 4. Making Charges
                    </h3>
                    <table class="w-full text-left text-[11px]">
                        <thead>
                            <tr class="text-gray-400 text-[9px] uppercase tracking-wider font-bold border-b border-gray-100">
                                <th class="py-3 px-2">Type (Category)</th>
                                <th class="py-3 px-2 text-center">Wastage (%)</th>
                                <th class="py-3 px-2">Labour Charge</th>
                                <th class="py-3 px-2 text-center">Gold Purity</th>
                                <th class="py-3 px-2 text-center">GST (%)</th>
                                <th class="py-3 px-2 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 text-gray-700">
                            <tr>
                                <td class="py-3 px-2 font-medium">22KT Gold Jewellery</td>
                                <td class="py-3 px-2 text-center">10%</td>
                                <td class="py-3 px-2 font-medium">Rs. 500 / per gram *</td>
                                <td class="py-3 px-2 text-center">91.40%</td>
                                <td class="py-3 px-2 text-center">18%</td>
                                <td class="py-3 px-2 text-center text-gray-300">—</td>
                            </tr>
                            <tr>
                                <td class="py-3 px-2 font-medium">18KT Gold Jewellery</td>
                                <td class="py-3 px-2 text-center">8%</td>
                                <td class="py-3 px-2 font-medium">Rs. 450 / per gram *</td>
                                <td class="py-3 px-2 text-center">75%</td>
                                <td class="py-3 px-2 text-center">18%</td>
                                <td class="py-3 px-2 text-center text-gray-300">—</td>
                            </tr>
                            <tr>
                                <td class="py-3 px-2 font-medium">Hall Mark / Open Close</td>
                                <td class="py-3 px-2 text-center">6%</td>
                                <td class="py-3 px-2 font-medium">Rs. 350 / per gram *</td>
                                <td class="py-3 px-2 text-center">22%</td>
                                <td class="py-3 px-2 text-center">18%</td>
                                <td class="py-3 px-2 text-center text-gray-300">—</td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="text-[8px] italic text-gray-400 mt-2">* Making charges are subject to change without prior notice.</div>
                </div>

            </div>

            <!-- Right Column (Span 4) -->
            <div class="col-span-12 md:col-span-4 space-y-6">
                
                <!-- Price List Summary -->
                <div class="bg-white rounded-xl border border-red-100 p-6 shadow-sm">
                    <h3 class="text-[10px] font-bold text-[#b01622] uppercase tracking-wider mb-4 flex items-center gap-2">
                        <i class="fa-solid fa-file-invoice text-[#b01622]"></i> Price List Summary
                    </h3>
                    <div class="text-[8px] font-bold text-[#b01622] uppercase tracking-wider mb-1">Current Active Version</div>
                    <div class="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                        <div class="text-[18px] font-bold text-gray-900">Price List - 02</div>
                        <span class="inline-block px-2 py-0.5 rounded bg-green-50 text-green-600 text-[9px] font-bold uppercase tracking-wider border border-green-100">Active</span>
                    </div>
                    
                    <table class="w-full text-[10px]">
                        <tbody class="space-y-2">
                            <tr>
                                <td class="py-1.5 text-gray-500">Effective From</td>
                                <td class="py-1.5 text-right font-medium text-gray-900">01 Aug 2026</td>
                            </tr>
                            <tr>
                                <td class="py-1.5 text-gray-500">Last Updated</td>
                                <td class="py-1.5 text-right font-medium text-gray-900">30 Jul 2026 10:30 AM</td>
                            </tr>
                            <tr>
                                <td class="py-1.5 text-gray-500">Updated By</td>
                                <td class="py-1.5 text-right font-medium text-gray-900">Arvind Sharma</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Instructions -->
                <div class="bg-gray-50/50 rounded-xl border border-gray-100 p-6">
                    <h3 class="text-[10px] font-bold text-[#b01622] uppercase tracking-wider leading-tight mb-5">
                        5. Instructions For Price Setting On Product (Stamper)
                    </h3>
                    <table class="w-full text-[10px] text-gray-500 font-medium">
                        <tbody class="space-y-3">
                            <tr>
                                <td class="py-1.5 uppercase">Diamond Loss (%)</td>
                                <td class="py-1.5 text-right font-bold text-gray-900">1.50</td>
                            </tr>
                            <tr>
                                <td class="py-1.5 uppercase">Stone Loss (%)</td>
                                <td class="py-1.5 text-right font-bold text-gray-900">2.00</td>
                            </tr>
                            <tr>
                                <td class="py-1.5 uppercase">Metal Loss (%)</td>
                                <td class="py-1.5 text-right font-bold text-gray-900">1.00</td>
                            </tr>
                            <tr>
                                <td class="py-1.5 uppercase">Wastage (%)</td>
                                <td class="py-1.5 text-right font-bold text-gray-900">0.00</td>
                            </tr>
                            <tr>
                                <td class="py-1.5 uppercase">Min. Charges (₹)</td>
                                <td class="py-1.5 text-right font-bold text-gray-900">500</td>
                            </tr>
                            <tr>
                                <td class="py-1.5 uppercase">Round Off (₹)</td>
                                <td class="py-1.5 text-right font-bold text-gray-900">10</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- Notes -->
                <div class="bg-gray-50/50 rounded-xl border border-gray-100 p-6">
                    <h3 class="text-[10px] font-bold text-[#b01622] uppercase tracking-wider mb-2 flex items-center gap-2">
                        <i class="fa-regular fa-file-lines text-[#b01622]"></i> Notes
                    </h3>
                    <div class="text-[10px] text-gray-400">Enter notes about this price list (optional)</div>
                </div>

                <!-- Payment Terms -->
                <div class="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div class="px-5 py-4">
                        <h3 class="text-[12px] font-bold text-gray-700">Payment Terms</h3>
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
                                <td class="py-2.5 px-5 text-[10px]">Gold</td>
                                <td class="py-2.5 px-5 text-center font-bold text-gray-900">COD</td>
                            </tr>
                            <tr>
                                <td class="py-2.5 px-5 text-[10px]">Diamond</td>
                                <td class="py-2.5 px-5 text-center font-bold text-gray-900">COD</td>
                            </tr>
                            <tr>
                                <td class="py-2.5 px-5 text-[10px]">MC</td>
                                <td class="py-2.5 px-5 text-center font-bold text-gray-900">COD</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

            </div>
        </div>

        <!-- Footer -->
        <div class="mt-auto border-t border-gray-200 pt-8 flex items-end justify-between text-gray-500">
            <!-- Left Stamp -->
            <div class="w-16 h-16 rounded-full border border-[#b01622] flex flex-col items-center justify-center relative bg-white z-10">
                <div class="absolute inset-0 rounded-full border border-[#b01622] transform scale-[0.9]"></div>
                <div class="text-[5px] uppercase font-bold text-[#b01622] text-center tracking-tighter leading-none mt-1">Rudra<br>Jewellers</div>
                <div class="text-[14px] font-bold text-[#b01622] font-serif leading-tight">RJ</div>
                <div class="text-[4px] uppercase font-bold text-[#b01622] tracking-widest mt-1 mb-1">Chennai</div>
            </div>

            <!-- Center Message -->
            <div class="text-center mb-2 flex-1">
                <div class="text-[11px] text-gray-600 font-medium">Thank you for your trust and continued partnership.</div>
                <div class="text-[9px] text-gray-400">This is a system generated price list.</div>
            </div>

            <!-- Right Signature -->
            <div class="text-center w-48">
                <div class="h-10 border-b border-gray-300 mb-2 flex items-end justify-center pb-1">
                    <span class="font-serif italic text-2xl text-gray-700">Rudhra</span>
                </div>
                <div class="text-[9px] font-bold uppercase tracking-wider text-gray-900">Authorized Signature</div>
                <div class="text-[7px] text-gray-400 mt-0.5">Rudra Jewellers, Chennai</div>
            </div>
        </div>

    </div>
</div>
@endsection
