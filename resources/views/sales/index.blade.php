@extends('layouts.app')

@section('title', 'Sales Dashboard')

@section('content')
<div class="max-w-7xl mx-auto pb-10">
    
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
            <h1 class="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
            <p class="text-sm text-gray-500 mt-1">Welcome back, here's your business summary.</p>
        </div>
        <div class="flex items-center gap-3">
            <button class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors">
                <i class="fa-solid fa-filter text-gray-400 text-xs"></i>
                Month
                <i class="fa-solid fa-chevron-down text-gray-400 text-[10px] ml-1"></i>
            </button>
            <button class="px-4 py-2 bg-white border border-[#b01622] text-[#b01622] rounded-md text-sm font-medium hover:bg-red-50 shadow-sm transition-colors flex items-center gap-2">
                <i class="fa-solid fa-file-pdf text-[#b01622] text-xs"></i>
                Export PDF
            </button>
        </div>
    </div>

    <!-- Main Content -->
    <div class="flex flex-col gap-6">
        
        <!-- Row 1: Today's Rate and Purchase Metal -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Today's Rate -->
            <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:col-span-1 h-full">
                <h3 class="font-bold text-gray-900 flex items-center gap-2 text-sm">
                    <i class="fa-regular fa-calendar text-[#b01622]"></i>
                    Today's Rate
                </h3>
                <ul class="space-y-4 mt-6 flex-1 flex flex-col justify-center">
                    <li class="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <span class="w-2 h-2 rounded-full bg-yellow-400"></span>
                        Gold - 24 K - 0
                    </li>
                    <li class="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <span class="w-2 h-2 rounded-full bg-yellow-400"></span>
                        Gold - 22 K - 0
                    </li>
                    <li class="flex items-center gap-3 text-sm font-medium text-gray-700">
                        <span class="w-2 h-2 rounded-full bg-gray-300"></span>
                        Silver - 0
                    </li>
                </ul>
            </div>

            <!-- Purchase Metal -->
            <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-2 flex flex-col h-full">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-gray-900 flex items-center gap-2 text-sm">
                        <i class="fa-solid fa-layer-group text-[#b01622]"></i>
                        Purchase Metal
                    </h3>
                    <button class="px-3 py-1 text-xs border border-red-200 bg-red-50 text-[#b01622] rounded hover:bg-red-100 font-medium">Sell</button>
                </div>
                <div class="overflow-x-auto flex-1 flex flex-col justify-center">
                    <table class="w-full text-left mt-2">
                        <thead class="text-[11px] text-gray-400 font-medium">
                            <tr>
                                <th class="pb-3 font-medium">Metal</th>
                                <th class="pb-3 font-medium text-center">Weight</th>
                                <th class="pb-3 font-medium text-center">Avg. Rate</th>
                                <th class="pb-3 font-medium text-center">Cur. Rate</th>
                                <th class="pb-3 font-medium text-right">L / P</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm font-medium text-gray-700">
                            <tr class="border-t border-gray-100">
                                <td class="py-4 flex items-center gap-3 text-xs">
                                    <div class="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-500"><i class="fa-solid fa-coins text-[10px]"></i></div>
                                    Gold
                                </td>
                                <td class="py-4 text-center text-xs">100GM</td>
                                <td class="py-4 text-center text-xs">2,58,000</td>
                                <td class="py-4 text-center text-xs">2,85,000</td>
                                <td class="py-4 text-right text-xs text-green-500">0 &uarr;</td>
                            </tr>
                            <tr class="border-t border-gray-100">
                                <td class="py-4 flex items-center gap-3 text-xs">
                                    <div class="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500"><i class="fa-solid fa-coins text-[10px]"></i></div>
                                    Silver
                                </td>
                                <td class="py-4 text-center text-xs">100GM</td>
                                <td class="py-4 text-center text-xs">1,35,000</td>
                                <td class="py-4 text-center text-xs">1,52,000</td>
                                <td class="py-4 text-right text-xs text-green-500">0 &uarr;</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
        </div>

        <!-- Row 2: Amount Received & Right Stack -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Amount Received -->
            <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col lg:col-span-2 h-full">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-bold text-gray-900">Amount Received</h3>
                    <div class="flex items-center gap-2">
                        <button class="px-3 py-1.5 text-xs border border-red-200 bg-red-50 text-[#b01622] rounded flex items-center gap-1 font-medium hover:bg-red-100">Online <i class="fa-solid fa-chevron-down text-[10px]"></i></button>
                        <button class="px-3 py-1.5 text-xs border border-gray-200 rounded text-gray-600 hover:bg-gray-50 flex items-center gap-1 font-medium">This Month <i class="fa-solid fa-chevron-down text-[10px]"></i></button>
                    </div>
                </div>
                
                <div class="flex-1 min-h-[220px] mt-4 relative w-full">
                    <!-- Y Axis Labels -->
                    <div class="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-xs text-gray-400 font-medium">
                        <span>₹20L</span>
                        <span>₹15L</span>
                        <span>₹10L</span>
                        <span>₹5L</span>
                        <span>₹0</span>
                    </div>
                    
                    <!-- Chart area -->
                    <div class="absolute left-10 right-0 top-2 bottom-6">
                        <!-- Horizontal Lines -->
                        <div class="flex flex-col justify-between h-full w-full absolute inset-0">
                            <div class="w-full border-t border-gray-100 border-dashed"></div>
                            <div class="w-full border-t border-gray-100 border-dashed"></div>
                            <div class="w-full border-t border-gray-100 border-dashed"></div>
                            <div class="w-full border-t border-gray-100 border-dashed"></div>
                            <div class="w-full border-t border-gray-100 border-dashed"></div>
                        </div>
                        
                        <!-- SVG Path (mocked) -->
                        <svg class="w-full h-full relative z-10" viewBox="0 0 1000 200" preserveAspectRatio="none">
                            <defs>
                                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stop-color="#b01622" stop-opacity="0.25"/>
                                    <stop offset="100%" stop-color="#b01622" stop-opacity="0.0"/>
                                </linearGradient>
                            </defs>
                            <path d="M0,160 C50,150 100,120 150,140 C200,160 250,90 300,110 C350,130 400,60 450,100 C500,140 550,80 600,60 C650,40 700,90 750,110 C800,130 850,110 900,120 L1000,20 L1000,200 L0,200 Z" fill="url(#chartGradient)"></path>
                            <path d="M0,160 C50,150 100,120 150,140 C200,160 250,90 300,110 C350,130 400,60 450,100 C500,140 550,80 600,60 C650,40 700,90 750,110 C800,130 850,110 900,120 L1000,20" fill="none" stroke="#b01622" stroke-width="3"></path>
                            <!-- Dots -->
                            <circle cx="150" cy="140" r="5" fill="#b01622" stroke="white" stroke-width="2"/>
                            <circle cx="300" cy="110" r="5" fill="#b01622" stroke="white" stroke-width="2"/>
                            <circle cx="450" cy="100" r="5" fill="#b01622" stroke="white" stroke-width="2"/>
                            <circle cx="600" cy="60" r="5" fill="#b01622" stroke="white" stroke-width="2"/>
                            <circle cx="750" cy="110" r="5" fill="#b01622" stroke="white" stroke-width="2"/>
                            <circle cx="900" cy="120" r="5" fill="#b01622" stroke="white" stroke-width="2"/>
                            <circle cx="1000" cy="20" r="5" fill="#b01622" stroke="white" stroke-width="2"/>
                        </svg>
                    </div>
                    
                    <!-- X Axis Labels -->
                    <div class="absolute left-10 right-0 bottom-0 flex justify-between text-xs text-gray-400 font-medium">
                        <span>1 July</span>
                        <span>5 July</span>
                        <span>11 July</span>
                        <span>16 July</span>
                        <span>21 July</span>
                        <span>26 July</span>
                        <span>30 July</span>
                    </div>
                </div>
            </div>

            <!-- Right Column for Row 2 -->
            <div class="flex flex-col gap-6 lg:col-span-1">
                
                <!-- GST Amount -->
                <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col justify-center">
                    <div class="flex justify-between items-center mb-6">
                        <h3 class="font-bold text-gray-900 flex items-center gap-2 text-sm">GST Amount <i class="fa-regular fa-eye text-gray-400 text-xs cursor-pointer hover:text-gray-600"></i></h3>
                        <button class="px-2 py-1 text-xs border border-gray-200 rounded text-gray-500 hover:bg-gray-50 flex items-center gap-1 font-medium">This Month <i class="fa-solid fa-chevron-down text-[10px]"></i></button>
                    </div>
                    <div class="flex justify-between items-center divide-x divide-gray-100">
                        <!-- Inward -->
                        <div class="flex-1 text-center px-1">
                            <div class="flex flex-col items-center justify-center gap-1.5 mb-2">
                                <div class="w-7 h-7 rounded-full border border-green-200 text-green-500 flex items-center justify-center"><i class="fa-solid fa-arrows-rotate text-[10px]"></i></div>
                                <span class="text-[11px] text-gray-500 font-medium">Inward</span>
                            </div>
                            <div class="font-bold text-gray-900 text-sm">₹ 2,40,000</div>
                        </div>
                        <!-- Outward -->
                        <div class="flex-1 text-center px-1">
                            <div class="flex flex-col items-center justify-center gap-1.5 mb-2">
                                <div class="w-7 h-7 rounded-full border border-red-200 text-red-500 flex items-center justify-center"><i class="fa-solid fa-arrows-rotate text-[10px]"></i></div>
                                <span class="text-[11px] text-gray-500 font-medium">Outward</span>
                            </div>
                            <div class="font-bold text-gray-900 text-sm">₹ 2,40,000</div>
                        </div>
                        <!-- Payable -->
                        <div class="flex-1 text-center px-1">
                            <div class="flex flex-col items-center justify-center gap-1.5 mb-2">
                                <div class="w-7 h-7 rounded-full border border-blue-200 text-blue-500 flex items-center justify-center"><i class="fa-solid fa-indian-rupee-sign text-[10px]"></i></div>
                                <span class="text-[11px] text-gray-500 font-medium">Payable</span>
                            </div>
                            <div class="font-bold text-gray-900 text-sm">₹ 2,40,000</div>
                        </div>
                    </div>
                </div>

                <!-- Pay & Received Management -->
                <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex-1 flex flex-col justify-center">
                    <div class="flex justify-between items-center mb-5">
                        <h3 class="font-bold text-gray-900 flex items-center gap-2 text-sm">Pay & Recived <i class="fa-regular fa-eye text-gray-400 text-xs cursor-pointer hover:text-gray-600"></i></h3>
                        <button class="px-2 py-1 text-xs border border-gray-200 rounded text-gray-500 hover:bg-gray-50 flex items-center gap-1 font-medium">This Month <i class="fa-solid fa-chevron-down text-[10px]"></i></button>
                    </div>
                    
                    <!-- Tabs -->
                    <div class="flex justify-between border-b border-gray-100 mb-6 px-1 text-xs font-medium text-gray-400">
                        <button class="pb-2 px-2 hover:text-gray-900 transition-colors cursor-pointer">Today</button>
                        <button class="pb-2 px-2 hover:text-gray-900 transition-colors cursor-pointer">Week</button>
                        <button class="pb-2 px-2 text-gray-900 border-b-2 border-[#b01622] font-semibold">Month</button>
                        <button class="pb-2 px-2 hover:text-gray-900 transition-colors cursor-pointer">Year</button>
                    </div>
                    
                    <div class="flex justify-between items-center px-2">
                        <div class="text-left">
                            <div class="text-xl font-bold text-gray-900 mb-1">₹ 2,40,000</div>
                            <div class="text-[10px] font-bold text-[#b01622] uppercase tracking-wide">Amount Paid</div>
                        </div>
                        <div class="text-right">
                            <div class="text-xl font-bold text-gray-900 mb-1">₹ 3,50,000</div>
                            <div class="text-[10px] font-bold text-green-500 uppercase tracking-wide">Amount Recived</div>
                        </div>
                    </div>
                </div>

            </div>

        </div>

        <!-- Row 3: Total Sales, Total Purchase, Stock Analysis -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            <!-- Total Sales -->
            <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full lg:col-span-1 relative">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-gray-900 flex items-center gap-2 text-sm">Total Sales <i class="fa-regular fa-eye text-gray-400 text-xs cursor-pointer hover:text-gray-600"></i></h3>
                    <button class="px-2 py-1 text-xs border border-gray-200 rounded text-gray-500 hover:bg-gray-50 flex items-center gap-1 font-medium">This Month <i class="fa-solid fa-chevron-down text-[10px]"></i></button>
                </div>
                <div class="flex flex-col items-center justify-center flex-1 pb-2">
                    <div class="flex items-center gap-2 text-xs text-gray-400 mb-3 font-medium">
                        <div class="w-4 h-4 bg-yellow-50 text-yellow-500 rounded flex items-center justify-center"><i class="fa-solid fa-coins text-[8px]"></i></div>
                        Values of August
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="text-3xl font-bold text-gray-900 tracking-tight">₹8,45,670</div>
                        <div class="text-left flex flex-col justify-center">
                            <span class="text-green-500 text-[11px] font-bold leading-none mb-1">24.5%</span>
                            <span class="text-gray-400 text-[10px] font-medium leading-none">vs last Month</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Total Purchase -->
            <div class="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full lg:col-span-1 relative">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="font-bold text-gray-900 flex items-center gap-2 text-sm">Total Purchase <i class="fa-regular fa-eye text-gray-400 text-xs cursor-pointer hover:text-gray-600"></i></h3>
                    <button class="px-2 py-1 text-xs border border-gray-200 rounded text-gray-500 hover:bg-gray-50 flex items-center gap-1 font-medium">This Month <i class="fa-solid fa-chevron-down text-[10px]"></i></button>
                </div>
                <div class="flex flex-col items-center justify-center flex-1 pb-2">
                    <div class="flex items-center gap-2 text-xs text-gray-400 mb-3 font-medium">
                        <div class="w-4 h-4 bg-yellow-50 text-yellow-500 rounded flex items-center justify-center"><i class="fa-solid fa-coins text-[8px]"></i></div>
                        Values of August
                    </div>
                    <div class="flex items-center gap-3">
                        <div class="text-3xl font-bold text-gray-900 tracking-tight">₹8,45,670</div>
                        <div class="text-left flex flex-col justify-center">
                            <span class="text-green-500 text-[11px] font-bold leading-none mb-1">24.5%</span>
                            <span class="text-gray-400 text-[10px] font-medium leading-none">vs last Month</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stock Analysis -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-full lg:col-span-1 relative overflow-hidden">
                <!-- Header -->
                <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-white relative z-20">
                    <h3 class="font-bold text-gray-900 flex items-center gap-2 text-sm">Stock Analysis <i class="fa-regular fa-eye text-gray-400 text-xs cursor-pointer hover:text-gray-600"></i></h3>
                    <button class="px-2 py-1 text-xs border border-gray-200 rounded text-gray-500 hover:bg-gray-50 flex items-center gap-1 font-medium bg-white">This Month <i class="fa-solid fa-chevron-down text-[10px]"></i></button>
                </div>
                
                <!-- Body -->
                <div class="p-5 pt-4 flex-1 flex flex-col relative z-10">
                    <div class="flex items-center gap-2 mb-2">
                        <div class="text-[22px] font-bold text-gray-900 tracking-tight flex items-baseline gap-1">
                            <span class="text-base text-gray-700">₹</span>6,45,670
                        </div>
                        <div class="text-[11px] text-green-500 font-bold ml-1">18.5% <span class="text-gray-400 font-medium">vs last week</span></div>
                    </div>
                    
                    <div class="flex-1 relative w-full min-h-[90px] mt-4">
                        <!-- Y Axis & Grid -->
                        <div class="absolute inset-0 -right-5 -bottom-5 pointer-events-none flex flex-col justify-between pb-8 pt-2">
                            <div class="w-full flex items-center">
                                <span class="text-[10px] text-gray-400 font-medium w-10 text-left relative z-20">₹20L</span>
                                <div class="flex-1 border-t border-gray-100"></div>
                            </div>
                            <div class="w-full flex items-center">
                                <span class="text-[10px] text-gray-400 font-medium w-10 text-left relative z-20">₹15L</span>
                                <div class="flex-1 border-t border-gray-100"></div>
                            </div>
                        </div>
                        
                        <!-- Chart -->
                        <div class="absolute pl-10 -right-5 -bottom-5 left-0 top-0 pointer-events-none">
                            <svg class="w-full h-full" viewBox="0 0 360 100" preserveAspectRatio="none">
                                <defs>
                                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stop-color="#a855f7" stop-opacity="0.30"/>
                                        <stop offset="100%" stop-color="#a855f7" stop-opacity="0.0"/>
                                    </linearGradient>
                                </defs>
                                <path d="M 0,35 L 60,25 L 120,55 L 220,5 L 290,40 L 360,2 L 360,100 L 0,100 Z" fill="url(#purpleGradient)"></path>
                                <path d="M 0,35 L 60,25 L 120,55 L 220,5 L 290,40 L 360,2" fill="none" stroke="#a855f7" stroke-width="2"></path>
                                <!-- Dots -->
                                <circle cx="0" cy="35" r="2.5" fill="#a855f7" stroke="white" stroke-width="1.5"/>
                                <circle cx="60" cy="25" r="2.5" fill="#a855f7" stroke="white" stroke-width="1.5"/>
                                <circle cx="120" cy="55" r="2.5" fill="#a855f7" stroke="white" stroke-width="1.5"/>
                                <circle cx="220" cy="5" r="2.5" fill="#a855f7" stroke="white" stroke-width="1.5"/>
                                <circle cx="290" cy="40" r="2.5" fill="#a855f7" stroke="white" stroke-width="1.5"/>
                                <circle cx="360" cy="2" r="2.5" fill="#a855f7" stroke="white" stroke-width="1.5"/>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

        </div>

    </div>
</div>
@endsection
