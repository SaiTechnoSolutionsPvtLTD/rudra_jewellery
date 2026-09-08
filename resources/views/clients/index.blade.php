@extends('layouts.app')

@section('title', 'Client Management')

@section('content')
<div class="max-w-7xl mx-auto pb-10">

    <!-- Header Section -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
            <h1 class="text-2xl font-bold text-gray-900">Quick Points</h1>
        </div>
        <div class="flex items-center gap-2">
            <button class="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm transition-colors">
                <i class="fa-solid fa-[#6b7280] fa-sliders text-sm"></i>
            </button>
            <button class="px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors">
                Month
                <i class="fa-solid fa-chevron-down text-gray-400 text-[10px]"></i>
            </button>
        </div>
    </div>

    <!-- 3 Metric Cards Grid -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- Card 1: Today Clients -->
        <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-red-50 text-red-400 flex items-center justify-center text-lg shrink-0">
                <i class="fa-solid fa-users"></i>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 mb-1">Today Clients</p>
                <div class="text-2xl font-bold text-gray-900 tracking-tight">2,842</div>
            </div>
        </div>

        <!-- Card 2: Active Members -->
        <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-lg shrink-0">
                <i class="fa-regular fa-star"></i>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 mb-1">Active Members</p>
                <div class="text-2xl font-bold text-gray-900 tracking-tight">1,958</div>
            </div>
        </div>

        <!-- Card 3: New Reg -->
        <div class="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
            <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center text-lg shrink-0">
                <i class="fa-solid fa-user-plus"></i>
            </div>
            <div>
                <p class="text-xs font-medium text-gray-400 mb-1">New Reg</p>
                <div class="text-2xl font-bold text-gray-900 tracking-tight">84</div>
            </div>
        </div>
    </div>

    <!-- Actions & Filter Bar -->
    <div class="flex items-center justify-between mb-6">
        <div>
            <a href="{{ route('clients.create') }}" class="px-5 py-2.5 bg-[#b01622] text-white text-sm font-semibold rounded-lg hover:bg-[#90121b] shadow-sm flex items-center gap-2 transition-colors inline-flex">
                <i class="fa-solid fa-plus text-xs"></i>
                Quick Add Client
            </a>
        </div>
        <div class="flex items-center gap-2">
            <button class="w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm transition-colors">
                <i class="fa-solid fa-sliders text-sm"></i>
            </button>
            <button class="px-3.5 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors">
                Month
                <i class="fa-solid fa-chevron-down text-gray-400 text-[10px]"></i>
            </button>
        </div>
    </div>

    <!-- Client Data Table -->
    <div class="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden mb-8">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-[#f6eee9] border-b border-gray-200/60 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                        <th class="px-6 py-4">CLIENT NAME</th>
                        <th class="px-6 py-4">CODE</th>
                        <th class="px-6 py-4 text-center">TIER</th>
                        <th class="px-6 py-4 text-center">TOTAL PURCHASES</th>
                        <th class="px-6 py-4">LAST VISIT</th>
                        <th class="px-6 py-4 text-center">STATUS</th>
                        <th class="px-6 py-4 text-center">ACTIONS</th>
                    </tr>
                </thead>
                <tbody class="text-sm divide-y divide-gray-100">
                    
                    <!-- Row 1: Meera Singhania -->
                    <tr class="hover:bg-gray-50/60 transition-colors">
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80" alt="Meera Singhania" class="w-10 h-10 rounded-full object-cover shrink-0">
                                <div>
                                    <div class="font-semibold text-gray-900">Meera Singhania</div>
                                    <div class="text-xs text-gray-400 mt-0.5">meera.s@regal.com</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 font-medium text-gray-600">RJ-EL-1024</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-block bg-[#fde68a] text-[#854d0e] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                PLATINUM ELITE
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center font-medium text-gray-700">₹84.50 Lakh</td>
                        <td class="px-6 py-4 text-gray-600">14 Oct, 2023</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs font-semibold px-3 py-1 rounded-full">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Active
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <div class="flex items-center justify-center gap-2 text-gray-400">
                                <button class="p-1 hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye text-sm"></i></button>
                                <button class="p-1 hover:text-red-600 transition-colors"><i class="fa-regular fa-trash-can text-sm"></i></button>
                                <button class="p-1 hover:text-gray-700 transition-colors"><i class="fa-solid fa-ellipsis-vertical text-sm"></i></button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 2: Rajesh Khanna -->
                    <tr class="hover:bg-gray-50/60 transition-colors">
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="Rajesh Khanna" class="w-10 h-10 rounded-full object-cover shrink-0">
                                <div>
                                    <div class="font-semibold text-gray-900">Rajesh Khanna</div>
                                    <div class="text-xs text-gray-400 mt-0.5">khanna.ra@rkgroup.in</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 font-medium text-gray-600">RJ-EL-1024</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-block bg-gray-200 text-gray-700 text-[10px] font-bold px-3.5 py-1 rounded-full uppercase tracking-wider">
                                GOLD
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center font-medium text-gray-700">₹42.20 Lakh</td>
                        <td class="px-6 py-4 text-gray-600">02 Nov, 2023</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs font-semibold px-3 py-1 rounded-full">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Active
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <div class="flex items-center justify-center gap-2 text-gray-400">
                                <button class="p-1 hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye text-sm"></i></button>
                                <button class="p-1 hover:text-red-600 transition-colors"><i class="fa-regular fa-trash-can text-sm"></i></button>
                                <button class="p-1 hover:text-gray-700 transition-colors"><i class="fa-solid fa-ellipsis-vertical text-sm"></i></button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 3: Ananya Iyer -->
                    <tr class="hover:bg-gray-50/60 transition-colors">
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="Ananya Iyer" class="w-10 h-10 rounded-full object-cover shrink-0">
                                <div>
                                    <div class="font-semibold text-gray-900">Ananya Iyer</div>
                                    <div class="text-xs text-gray-400 mt-0.5">ananya.i@techcorp.com</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 font-medium text-gray-600">RJ-EL-1024</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-block bg-gray-200 text-gray-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                SILVER
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center font-medium text-gray-700">₹18.75 Lakh</td>
                        <td class="px-6 py-4 text-gray-600">29 Sep, 2023</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 text-xs font-semibold px-3 py-1 rounded-full">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Inactive
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <div class="flex items-center justify-center gap-2 text-gray-400">
                                <button class="p-1 hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye text-sm"></i></button>
                                <button class="p-1 hover:text-red-600 transition-colors"><i class="fa-regular fa-trash-can text-sm"></i></button>
                                <button class="p-1 hover:text-gray-700 transition-colors"><i class="fa-solid fa-ellipsis-vertical text-sm"></i></button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 4: Vikram Malhotra -->
                    <tr class="hover:bg-gray-50/60 transition-colors">
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80" alt="Vikram Malhotra" class="w-10 h-10 rounded-full object-cover shrink-0">
                                <div>
                                    <div class="font-semibold text-gray-900">Vikram Malhotra</div>
                                    <div class="text-xs text-gray-400 mt-0.5">v.malhotra@heritage.in</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 font-medium text-gray-600">RJ-EL-1024</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-block bg-[#fde68a] text-[#854d0e] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                PLATINUM ELITE
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center font-medium text-gray-700">₹1.24 Cr</td>
                        <td class="px-6 py-4 text-gray-600">09 Nov, 2023</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs font-semibold px-3 py-1 rounded-full">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Active
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <div class="flex items-center justify-center gap-2 text-gray-400">
                                <button class="p-1 hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye text-sm"></i></button>
                                <button class="p-1 hover:text-red-600 transition-colors"><i class="fa-regular fa-trash-can text-sm"></i></button>
                                <button class="p-1 hover:text-gray-700 transition-colors"><i class="fa-solid fa-ellipsis-vertical text-sm"></i></button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 5: Ananya Iyer -->
                    <tr class="hover:bg-gray-50/60 transition-colors">
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80" alt="Ananya Iyer" class="w-10 h-10 rounded-full object-cover shrink-0">
                                <div>
                                    <div class="font-semibold text-gray-900">Ananya Iyer</div>
                                    <div class="text-xs text-gray-400 mt-0.5">ananya.i@techcorp.com</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 font-medium text-gray-600">RJ-EL-1024</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-block bg-gray-200 text-gray-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                SILVER
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center font-medium text-gray-700">₹19.75 Lakh</td>
                        <td class="px-6 py-4 text-gray-600">29 Sep, 2023</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-flex items-center gap-1.5 bg-amber-50 text-amber-600 text-xs font-semibold px-3 py-1 rounded-full">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                Inactive
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <div class="flex items-center justify-center gap-2 text-gray-400">
                                <button class="p-1 hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye text-sm"></i></button>
                                <button class="p-1 hover:text-red-600 transition-colors"><i class="fa-regular fa-trash-can text-sm"></i></button>
                                <button class="p-1 hover:text-gray-700 transition-colors"><i class="fa-solid fa-ellipsis-vertical text-sm"></i></button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 6: Rajesh Khanna -->
                    <tr class="hover:bg-gray-50/60 transition-colors">
                        <td class="px-6 py-4">
                            <div class="flex items-center gap-3">
                                <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80" alt="Rajesh Khanna" class="w-10 h-10 rounded-full object-cover shrink-0">
                                <div>
                                    <div class="font-semibold text-gray-900">Rajesh Khanna</div>
                                    <div class="text-xs text-gray-400 mt-0.5">khanna.ra@rkgroup.in</div>
                                </div>
                            </div>
                        </td>
                        <td class="px-6 py-4 font-medium text-gray-600">RJ-EL-1024</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-block bg-[#fde68a] text-[#854d0e] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                                PLATINUM ELITE
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center font-medium text-gray-700">₹28.50 Lakh</td>
                        <td class="px-6 py-4 text-gray-600">14 Oct, 2023</td>
                        <td class="px-6 py-4 text-center">
                            <span class="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs font-semibold px-3 py-1 rounded-full">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                Active
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center">
                            <div class="flex items-center justify-center gap-2 text-gray-400">
                                <button class="p-1 hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye text-sm"></i></button>
                                <button class="p-1 hover:text-red-600 transition-colors"><i class="fa-regular fa-trash-can text-sm"></i></button>
                                <button class="p-1 hover:text-gray-700 transition-colors"><i class="fa-solid fa-ellipsis-vertical text-sm"></i></button>
                            </div>
                        </td>
                    </tr>

                </tbody>
            </table>
        </div>
    </div>

    <!-- Pagination Footer -->
    <div class="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#8c7873]">
        <div>
            Showing 1 to 4 of 2,842 clients
        </div>
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
                142
            </button>
            <button class="w-8 h-8 flex items-center justify-center border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </button>
        </div>
    </div>

</div>
@endsection
