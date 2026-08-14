@extends('layouts.app')

@section('title', 'Create New Work Order')

@section('content')
<div class="max-w-6xl mx-auto pb-10">
    
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
            <h1 class="text-2xl font-bold text-[#b01622]">Create New Work Order</h1>
            <p class="text-sm text-gray-500 mt-1">Fill in the details to create a new job order.</p>
        </div>
        <div class="flex items-center gap-3">
            <button class="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors">
                <i class="fa-solid fa-filter text-gray-400 text-xs"></i>
                Month
                <i class="fa-solid fa-chevron-down text-gray-400 text-[10px] ml-1"></i>
            </button>
        </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Left Column: Form Sections -->
        <div class="lg:col-span-2 space-y-6">
            
            <!-- Job ID -->
            <div class="bg-white rounded-xl border border-red-100 p-5 relative overflow-hidden">
                <div class="flex justify-between items-center">
                    <div class="w-1/2">
                        <label class="block text-xs font-semibold text-gray-500 mb-2">Job ID [Auto Generated]</label>
                        <div class="bg-gray-100 rounded-md px-4 py-2 inline-block">
                            <span class="text-sm font-semibold text-gray-800">RJ-5636-000125</span>
                        </div>
                    </div>
                    <div class="text-red-100 text-3xl font-light">#</div>
                </div>
            </div>

            <!-- Customer Details -->
            <div class="bg-white rounded-xl border border-red-100 p-6">
                <h2 class="text-base font-bold text-gray-900 mb-5">Customer Details</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1.5">Customer Name <span class="text-red-500">*</span></label>
                        <input type="text" placeholder="Enter Customer Name" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1.5">Phone Number</label>
                        <input type="text" placeholder="Enter Phone Number" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-gray-700 mb-1.5">Due Date <span class="text-red-500">*</span></label>
                    <input type="text" placeholder="mm/dd/yyyy" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                </div>
            </div>

            <!-- Worker Assignment -->
            <div class="bg-white rounded-xl border border-red-100 p-6">
                <h2 class="text-base font-bold text-gray-900 mb-5">Worker Assignment</h2>
                
                <div class="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1.5">Assign Worker <span class="text-red-500">*</span></label>
                        <div class="relative">
                            <select class="w-full bg-white border border-gray-200 rounded-md pl-3 pr-8 py-2.5 text-sm text-gray-600 focus:outline-none focus:border-[#b01622] appearance-none">
                                <option>Select Worker</option>
                            </select>
                            <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none"></i>
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-1.5">Department <span class="text-red-500">*</span></label>
                        <div class="relative">
                            <select class="w-full bg-white border border-gray-200 rounded-md pl-3 pr-8 py-2.5 text-sm text-gray-600 focus:outline-none focus:border-[#b01622] appearance-none">
                                <option>Select Department</option>
                            </select>
                            <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none"></i>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Special Instructions -->
            <div class="bg-white rounded-xl border border-red-100 p-6">
                <h2 class="text-base font-bold text-gray-900 mb-5">Special Instructions</h2>
                
                <div>
                    <textarea rows="4" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400 resize-none" placeholder="Enter any special instructions for this job..."></textarea>
                </div>
            </div>

            <!-- Buttons -->
            <div class="flex gap-4 pt-2">
                <button class="px-6 py-2.5 bg-[#b01622] text-white rounded-md text-sm font-semibold hover:bg-[#90121b] transition-colors shadow-sm">
                    Create Work Order
                </button>
                <button class="px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-md text-sm font-semibold hover:bg-gray-50 transition-colors shadow-sm">
                    Reset
                </button>
            </div>
            
            <!-- Pagination / Footer text (from screenshot) -->
            <div class="flex justify-between items-center pt-8">
                <span class="text-xs text-gray-500">Showing 1 to 4 of 2,842 clients</span>
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

        <!-- Right Column -->
        <div class="space-y-6">
            
            <!-- Material Information -->
            <div class="bg-white rounded-xl border border-red-100 p-6">
                <h2 class="text-base font-bold text-gray-900 mb-5">Material Information</h2>
                
                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-[11px] font-semibold text-gray-700 mb-1.5">Material Type <span class="text-red-500">*</span></label>
                        <div class="relative">
                            <select class="w-full bg-white border border-gray-200 rounded-md pl-3 pr-8 py-2 text-xs text-gray-600 focus:outline-none focus:border-[#b01622] appearance-none">
                                <option>Select Material</option>
                            </select>
                            <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none"></i>
                        </div>
                    </div>
                    <div>
                        <label class="block text-[11px] font-semibold text-gray-700 mb-1.5">Purity (K)</label>
                        <div class="relative">
                            <select class="w-full bg-white border border-gray-200 rounded-md pl-3 pr-8 py-2 text-xs text-gray-600 focus:outline-none focus:border-[#b01622] appearance-none">
                                <option>Select Purity</option>
                            </select>
                            <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none"></i>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label class="block text-[11px] font-semibold text-gray-700 mb-1.5">Weight (gm)</label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span class="text-gray-400 text-xs">₹</span>
                            </div>
                            <input type="text" placeholder="0.00" class="w-full bg-white border border-gray-200 rounded-md pl-7 pr-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#b01622]">
                        </div>
                    </div>
                    <div>
                        <label class="block text-[11px] font-semibold text-gray-700 mb-1.5">Making Charges</label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span class="text-gray-400 text-xs">₹</span>
                            </div>
                            <input type="text" placeholder="0.00" class="w-full bg-white border border-gray-200 rounded-md pl-7 pr-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#b01622]">
                        </div>
                    </div>
                </div>

                <div class="mb-4">
                    <label class="block text-[11px] font-semibold text-gray-700 mb-1.5">Stone details</label>
                    <input type="text" placeholder="Enter Stone Details (e.g., Diamond, Ruby)" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                </div>

                <div class="mb-6">
                    <label class="block text-[11px] font-semibold text-gray-700 mb-1.5">Other Charges</label>
                    <div class="relative">
                        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span class="text-gray-400 text-xs">₹</span>
                        </div>
                        <input type="text" placeholder="0.00" class="w-full bg-white border border-gray-200 rounded-md pl-7 pr-3 py-2 text-xs text-gray-900 focus:outline-none focus:border-[#b01622] text-right">
                    </div>
                </div>

                <div class="bg-gray-100 rounded-md p-3 flex justify-between items-center border border-gray-200">
                    <span class="text-[11px] font-bold text-gray-800">Estimated Total Amount</span>
                    <span class="text-xs font-bold text-[#b01622]">₹ 0.00</span>
                </div>
            </div>

            <!-- Upload Reference -->
            <div class="bg-white rounded-xl border border-red-100 p-6">
                <div class="flex justify-between items-center mb-4">
                    <h2 class="text-base font-bold text-gray-900">Upload Reference</h2>
                    <span class="bg-gray-100 text-gray-500 text-[10px] font-semibold px-2 py-1 rounded">Optional</span>
                </div>
                
                <div class="border-2 border-dashed border-red-200 bg-red-50/30 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-red-50 transition-colors">
                    <div class="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-yellow-600 mb-3 shadow-sm border border-yellow-200">
                        <i class="fa-solid fa-file-arrow-up"></i>
                    </div>
                    <div class="text-[11px] font-bold text-gray-800 mb-1">Click to upload files</div>
                    <div class="text-[10px] text-gray-500 mb-1">or drag and drop</div>
                    <div class="text-[9px] text-gray-400">JPG, PNG, PDF (Max 5MB)</div>
                </div>
            </div>

        </div>
    </div>
</div>
@endsection
