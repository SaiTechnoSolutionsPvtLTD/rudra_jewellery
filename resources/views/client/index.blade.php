@extends('layouts.app')

@section('title', 'Client Management')

@section('content')
<div class="max-w-7xl mx-auto pb-10">
    
    <!-- Quick Points Header -->
    <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-gray-800">Quick Points</h2>
        <button class="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors">
            <i class="fa-solid fa-filter text-gray-400 text-xs"></i>
            Month
            <i class="fa-solid fa-chevron-down text-gray-400 text-[10px] ml-1"></i>
        </button>
    </div>

    <!-- Stats Cards -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- Card 1 -->
        <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-center">
            <div class="flex items-center gap-3 mb-2">
                <div class="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-[#b01622]">
                    <i class="fa-solid fa-users"></i>
                </div>
                <span class="text-sm font-medium text-gray-500">Today Clients</span>
            </div>
            <div class="text-2xl font-bold text-gray-900 mt-1">2,842</div>
        </div>
        <!-- Card 2 -->
        <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-center">
            <div class="flex items-center gap-3 mb-2">
                <div class="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center text-amber-500">
                    <i class="fa-regular fa-star"></i>
                </div>
                <span class="text-sm font-medium text-gray-500">Active Members</span>
            </div>
            <div class="text-2xl font-bold text-gray-900 mt-1">1,958</div>
        </div>
        <!-- Card 3 -->
        <div class="bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex flex-col justify-center">
            <div class="flex items-center gap-3 mb-2">
                <div class="w-8 h-8 rounded-full bg-yellow-50 flex items-center justify-center text-yellow-600">
                    <i class="fa-solid fa-user-plus"></i>
                </div>
                <span class="text-sm font-medium text-gray-500">New Reg</span>
            </div>
            <div class="text-2xl font-bold text-gray-900 mt-1">84</div>
        </div>
    </div>

    <!-- Actions and Filters -->
    <div class="flex items-center justify-between mb-6">
        <a href="{{ route('client.create') }}" class="inline-flex px-4 py-2.5 bg-[#b01622] text-white rounded-md text-sm font-semibold hover:bg-[#90121b] transition-colors shadow-sm items-center gap-2">
            <i class="fa-solid fa-plus"></i> Quick Add Client
        </a>
        <button class="px-3 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors">
            <i class="fa-solid fa-filter text-gray-400 text-xs"></i>
            Month
            <i class="fa-solid fa-chevron-down text-gray-400 text-[10px] ml-1"></i>
        </button>
    </div>

    <!-- Clients Table -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
                <thead>
                    <tr class="bg-[#fcf5f5] text-[#90121b] text-[11px] uppercase tracking-wider font-bold border-b border-gray-100">
                        <th class="py-2.5 px-4">Client Name</th>
                        <th class="py-2.5 px-4 text-center">Code</th>
                        <th class="py-2.5 px-4 text-center">Tier</th>
                        <th class="py-2.5 px-4 text-center">Total Purchases</th>
                        <th class="py-2.5 px-4 text-center">Last Visit</th>
                        <th class="py-2.5 px-4 text-center">Status</th>
                        <th class="py-2.5 px-4 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 text-sm">
                    <!-- Row 1 -->
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-2.5 px-4">
                            <div class="flex items-center gap-3">
                                <img src="https://i.pravatar.cc/150?img=1" alt="Avatar" class="w-9 h-9 rounded-full object-cover shadow-sm">
                                <div>
                                    <div class="font-bold text-gray-900 text-[13px]">Meera Singhania</div>
                                    <div class="text-[11px] text-gray-500">meera.s@regal.com</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-2.5 px-4 text-gray-600 text-center font-medium text-[13px]">RJ-EL-1024</td>
                        <td class="py-2.5 px-4 text-center">
                            <span class="inline-flex items-center justify-center px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-900 bg-[#fbdc69] rounded-full">Platinum Elite</span>
                        </td>
                        <td class="py-2.5 px-4 text-gray-700 text-center font-medium text-[13px]">₹84.50 Lakh</td>
                        <td class="py-2.5 px-4 text-gray-500 text-center text-[12px]">14 Oct, 2023</td>
                        <td class="py-2.5 px-4 text-center">
                            <div class="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#eef8f2]">
                                <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                <span class="text-green-600 font-semibold text-[11px]">Active</span>
                            </div>
                        </td>
                        <td class="py-2.5 px-4">
                            <div class="flex items-center justify-center gap-4 text-gray-400">
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-list-ul"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Row 2 -->
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-2.5 px-4">
                            <div class="flex items-center gap-3">
                                <img src="https://i.pravatar.cc/150?img=11" alt="Avatar" class="w-9 h-9 rounded-full object-cover shadow-sm">
                                <div>
                                    <div class="font-bold text-gray-900 text-[13px]">Rajesh Khanna</div>
                                    <div class="text-[11px] text-gray-500">khanna.ra@rkgroup.in</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-2.5 px-4 text-gray-600 text-center font-medium text-[13px]">RJ-EL-1024</td>
                        <td class="py-2.5 px-4 text-center">
                            <span class="inline-flex items-center justify-center px-4 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-900 bg-[#e3e3e3] rounded-full">Gold</span>
                        </td>
                        <td class="py-2.5 px-4 text-gray-700 text-center font-medium text-[13px]">₹42.20 Lakh</td>
                        <td class="py-2.5 px-4 text-gray-500 text-center text-[12px]">02 Nov, 2023</td>
                        <td class="py-2.5 px-4 text-center">
                            <div class="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#eef8f2]">
                                <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                <span class="text-green-600 font-semibold text-[11px]">Active</span>
                            </div>
                        </td>
                        <td class="py-2.5 px-4">
                            <div class="flex items-center justify-center gap-4 text-gray-400">
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-list-ul"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 3 -->
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-2.5 px-4">
                            <div class="flex items-center gap-3">
                                <img src="https://i.pravatar.cc/150?img=5" alt="Avatar" class="w-9 h-9 rounded-full object-cover shadow-sm">
                                <div>
                                    <div class="font-bold text-gray-900 text-[13px]">Ananya Iyer</div>
                                    <div class="text-[11px] text-gray-500">ananya.i@techcorp.com</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-2.5 px-4 text-gray-600 text-center font-medium text-[13px]">RJ-EL-1024</td>
                        <td class="py-2.5 px-4 text-center">
                            <span class="inline-flex items-center justify-center px-4 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-900 bg-[#dedede] rounded-full">Silver</span>
                        </td>
                        <td class="py-2.5 px-4 text-gray-700 text-center font-medium text-[13px]">₹18.75 Lakh</td>
                        <td class="py-2.5 px-4 text-gray-500 text-center text-[12px]">29 Sep, 2023</td>
                        <td class="py-2.5 px-4 text-center">
                            <div class="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fff8eb]">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                <span class="text-amber-600 font-semibold text-[11px]">Inactive</span>
                            </div>
                        </td>
                        <td class="py-2.5 px-4">
                            <div class="flex items-center justify-center gap-4 text-gray-400">
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-list-ul"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Row 4 -->
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-2.5 px-4">
                            <div class="flex items-center gap-3">
                                <img src="https://i.pravatar.cc/150?img=12" alt="Avatar" class="w-9 h-9 rounded-full object-cover shadow-sm">
                                <div>
                                    <div class="font-bold text-gray-900 text-[13px]">Vikram Malhotra</div>
                                    <div class="text-[11px] text-gray-500">v.malhotra@heritage.in</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-2.5 px-4 text-gray-600 text-center font-medium text-[13px]">RJ-EL-1024</td>
                        <td class="py-2.5 px-4 text-center">
                            <span class="inline-flex items-center justify-center px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-900 bg-[#fbdc69] rounded-full">Platinum Elite</span>
                        </td>
                        <td class="py-2.5 px-4 text-gray-700 text-center font-medium text-[13px]">₹1.24 Cr</td>
                        <td class="py-2.5 px-4 text-gray-500 text-center text-[12px]">09 Nov, 2023</td>
                        <td class="py-2.5 px-4 text-center">
                            <div class="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#eef8f2]">
                                <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                <span class="text-green-600 font-semibold text-[11px]">Active</span>
                            </div>
                        </td>
                        <td class="py-2.5 px-4">
                            <div class="flex items-center justify-center gap-4 text-gray-400">
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-list-ul"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                            </div>
                        </td>
                    </tr>

                    <!-- Row 5 (Duplicate of Ananya to pad table as shown in image) -->
                    <tr class="hover:bg-gray-50 transition-colors">
                        <td class="py-2.5 px-4">
                            <div class="flex items-center gap-3">
                                <img src="https://i.pravatar.cc/150?img=5" alt="Avatar" class="w-9 h-9 rounded-full object-cover shadow-sm">
                                <div>
                                    <div class="font-bold text-gray-900 text-[13px]">Ananya Iyer</div>
                                    <div class="text-[11px] text-gray-500">ananya.i@techcorp.com</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-2.5 px-4 text-gray-600 text-center font-medium text-[13px]">RJ-EL-1024</td>
                        <td class="py-2.5 px-4 text-center">
                            <span class="inline-flex items-center justify-center px-4 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-900 bg-[#dedede] rounded-full">Silver</span>
                        </td>
                        <td class="py-2.5 px-4 text-gray-700 text-center font-medium text-[13px]">₹19.75 Lakh</td>
                        <td class="py-2.5 px-4 text-gray-500 text-center text-[12px]">29 Sep, 2023</td>
                        <td class="py-2.5 px-4 text-center">
                            <div class="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#fff8eb]">
                                <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                <span class="text-amber-600 font-semibold text-[11px]">Inactive</span>
                            </div>
                        </td>
                        <td class="py-2.5 px-4">
                            <div class="flex items-center justify-center gap-4 text-gray-400">
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-list-ul"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                            </div>
                        </td>
                    </tr>
                    
                    <!-- Row 6 (Duplicate of Rajesh to pad table) -->
                    <tr class="hover:bg-gray-50 transition-colors border-b-0">
                        <td class="py-2.5 px-4">
                            <div class="flex items-center gap-3">
                                <img src="https://i.pravatar.cc/150?img=11" alt="Avatar" class="w-9 h-9 rounded-full object-cover shadow-sm">
                                <div>
                                    <div class="font-bold text-gray-900 text-[13px]">Rajesh Khanna</div>
                                    <div class="text-[11px] text-gray-500">khanna.ra@rkgroup.in</div>
                                </div>
                            </div>
                        </td>
                        <td class="py-2.5 px-4 text-gray-600 text-center font-medium text-[13px]">RJ-EL-1024</td>
                        <td class="py-2.5 px-4 text-center">
                            <span class="inline-flex items-center justify-center px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gray-900 bg-[#fbdc69] rounded-full">Platinum Elite</span>
                        </td>
                        <td class="py-2.5 px-4 text-gray-700 text-center font-medium text-[13px]">₹28.50 Lakh</td>
                        <td class="py-2.5 px-4 text-gray-500 text-center text-[12px]">14 Oct, 2023</td>
                        <td class="py-2.5 px-4 text-center">
                            <div class="inline-flex items-center justify-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#eef8f2]">
                                <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                                <span class="text-green-600 font-semibold text-[11px]">Active</span>
                            </div>
                        </td>
                        <td class="py-2.5 px-4">
                            <div class="flex items-center justify-center gap-4 text-gray-400">
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-regular fa-eye"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-list-ul"></i></button>
                                <button class="hover:text-gray-700 transition-colors"><i class="fa-solid fa-ellipsis-vertical"></i></button>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Pagination -->
    <div class="flex justify-between items-center pt-8">
        <span class="text-[13px] text-gray-500">Showing 1 to 4 of 2,842 clients</span>
        <div class="flex items-center gap-1">
            <button class="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-400 hover:bg-gray-50 bg-white"><i class="fa-solid fa-chevron-left text-[10px]"></i></button>
            <button class="w-7 h-7 rounded bg-[#b01622] text-white flex items-center justify-center text-xs font-semibold shadow-sm">1</button>
            <button class="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 bg-white text-xs">2</button>
            <button class="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 bg-white text-xs">3</button>
            <span class="text-gray-400 text-xs px-1">...</span>
            <button class="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 bg-white text-xs">142</button>
            <button class="w-7 h-7 rounded border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 bg-white"><i class="fa-solid fa-chevron-right text-[10px]"></i></button>
        </div>
    </div>

</div>
@endsection
