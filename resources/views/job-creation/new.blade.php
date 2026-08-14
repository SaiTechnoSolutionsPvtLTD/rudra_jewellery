@extends('layouts.app')

@section('title', 'Create New Work Order')

@section('content')
<div class="max-w-7xl mx-auto pb-10">
    
    <!-- Page Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
            <div class="flex items-center gap-3">
                <h1 class="text-2xl font-bold text-gray-900">Create New Work Order</h1>
                <span class="px-2 py-0.5 rounded bg-gray-200 text-gray-700 text-[10px] font-bold tracking-wider">DRAFT</span>
            </div>
            <p class="text-sm text-gray-500 mt-1">Drafting Job #WO-2024-0012</p>
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
            
            <!-- Basic Information -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden relative">
                <!-- Highlight border from image -->
                
                <div class="p-5 border-b border-gray-100 flex items-center gap-2">
                    <i class="fa-solid fa-circle-info text-[#b01622]"></i>
                    <h2 class="text-sm font-semibold text-gray-900">Basic Information</h2>
                </div>
                
                <div class="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-xs text-gray-500 mb-1.5">Work Order ID</label>
                        <input type="text" value="WO-2024-0012" class="w-full bg-gray-50 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900" readonly>
                    </div>
                    <div>
                        <label class="block text-xs text-gray-500 mb-1.5">Artisan Selection</label>
                        <select class="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]">
                            <option>Select Master Artisan</option>
                            <option>Rajesh Varma</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs text-gray-500 mb-1.5">Item Type</label>
                        <select class="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]">
                            <option>Select Category</option>
                            <option>Necklace</option>
                        </select>
                    </div>
                    
                    <div>
                        <label class="block text-xs text-gray-500 mb-1.5">Product Type</label>
                        <select class="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]">
                            <option>Select Product Type</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-xs text-gray-500 mb-1.5">Quantity</label>
                        <input type="number" value="1" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-500 mb-1.5">Client ID</label>
                        <input type="text" value="1" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]">
                    </div>

                    <div class="col-span-1 md:col-span-3 mt-2">
                        <label class="block text-xs text-gray-500 mb-1.5">Design Reference</label>
                        <div class="border-2 border-dashed border-[#b01622]/30 bg-red-50/30 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-red-50 transition-colors">
                            <i class="fa-solid fa-cloud-arrow-up text-[#b01622] text-xl mb-2"></i>
                            <div class="text-sm font-medium text-gray-700">Click to upload or drag & drop high-res design sketches</div>
                            <div class="text-[10px] text-gray-400 mt-1">JPEG, PNG or PDF (Max 25MB)</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Material Allocation -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="p-5 border-b border-gray-100 flex justify-between items-center">
                    <div class="flex items-center gap-2">
                        <i class="fa-solid fa-gem text-[#b01622]"></i>
                        <h2 class="text-sm font-semibold text-gray-900">Material Allocation</h2>
                    </div>
                    <button class="text-xs text-[#b01622] font-medium"><i class="fa-solid fa-plus mr-1"></i> Add Row</button>
                </div>
                
                <div class="p-5">
                    <div class="grid grid-cols-12 gap-3 mb-2 text-xs text-gray-500 font-medium px-2">
                        <div class="col-span-4">Material Type</div>
                        <div class="col-span-2 text-center">Weight (g)</div>
                        <div class="col-span-3 text-center">Carat / Size</div>
                        <div class="col-span-2 text-center">Clarity/Cut/Quality</div>
                        <div class="col-span-1 text-center">Action</div>
                    </div>

                    <!-- Row 1 -->
                    <div class="grid grid-cols-12 gap-3 mb-3 items-center">
                        <div class="col-span-4">
                            <select class="w-full bg-white border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#b01622]">
                                <option>22K Yellow Gold</option>
                            </select>
                        </div>
                        <div class="col-span-2">
                            <input type="text" value="0.00" class="w-full bg-gray-50 text-center border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900">
                        </div>
                        <div class="col-span-3">
                            <input type="text" value="-" class="w-full bg-gray-50 text-center border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-500" readonly>
                        </div>
                        <div class="col-span-2">
                            <input type="text" value="N/A" class="w-full bg-gray-50 text-center border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-500" readonly>
                        </div>
                        <div class="col-span-1 text-center">
                            <button class="text-red-500 hover:text-red-700"><i class="fa-regular fa-trash-can"></i></button>
                        </div>
                    </div>

                    <!-- Row 2 -->
                    <div class="grid grid-cols-12 gap-3 items-center">
                        <div class="col-span-4">
                            <select class="w-full bg-white border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#b01622]">
                                <option>Round Brilliant Diamond</option>
                            </select>
                        </div>
                        <div class="col-span-2">
                            <input type="text" value="-" class="w-full bg-gray-50 text-center border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-500" readonly>
                        </div>
                        <div class="col-span-3">
                            <input type="text" value="1.25" class="w-full bg-white text-center border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#b01622]">
                        </div>
                        <div class="col-span-2">
                            <input type="text" value="VVS1, Excellent" class="w-full bg-white text-center border border-gray-200 rounded-md px-2 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#b01622]">
                        </div>
                        <div class="col-span-1 text-center">
                            <button class="text-red-500 hover:text-red-700"><i class="fa-regular fa-trash-can"></i></button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Production Timeline -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="p-5 border-b border-gray-100 flex items-center gap-2">
                    <i class="fa-regular fa-calendar text-[#b01622]"></i>
                    <h2 class="text-sm font-semibold text-gray-900">Production Timeline</h2>
                </div>
                
                <div class="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-xs text-gray-500 mb-1.5">Estimated Start Date</label>
                        <input type="text" placeholder="mm/dd/yyyy" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-500 mb-1.5">Sent Date</label>
                        <input type="text" placeholder="mm/dd/yyyy" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]">
                    </div>
                    <div>
                        <label class="block text-xs text-gray-500 mb-1.5">Promised Due Date</label>
                        <input type="text" placeholder="mm/dd/yyyy" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622]">
                    </div>
                    
                    <div class="col-span-1 md:col-span-3 mt-2">
                        <label class="block text-xs text-gray-500 mb-1.5">Priority Level</label>
                        <div class="inline-flex bg-gray-50 border border-gray-200 rounded-md p-1">
                            <button class="px-4 py-1 text-xs font-semibold text-gray-500 hover:bg-white rounded transition-colors">LOW</button>
                            <button class="px-4 py-1 text-xs font-bold text-yellow-600 bg-white shadow-sm rounded">MEDIUM</button>
                            <button class="px-4 py-1 text-xs font-semibold text-gray-500 hover:bg-white rounded transition-colors">HIGH</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Crafting Instructions -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="p-5 border-b border-gray-100 flex items-center gap-2">
                    <i class="fa-solid fa-scroll text-[#b01622]"></i>
                    <h2 class="text-sm font-semibold text-gray-900">Crafting Instructions</h2>
                </div>
                
                <div class="p-5">
                    <textarea rows="3" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#b01622] resize-none" placeholder="Specify intricate design nuances, finish preferences (matte vs high polish), or specific stone placement details for the artisan..."></textarea>
                </div>
            </div>

        </div>

        <!-- Right Column: Summary & Breakdown -->
        <div class="space-y-6">
            
            <!-- Job Summary -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                <div class="absolute -right-6 -top-6 text-gray-50 opacity-50">
                    <i class="fa-regular fa-gem text-9xl"></i>
                </div>
                <div class="p-5 border-b border-gray-100 relative z-10">
                    <h2 class="text-sm font-semibold text-[#b01622]">Job Summary</h2>
                </div>
                <div class="p-5 space-y-4 relative z-10">
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-500">Allocated Gold</span>
                        <span class="font-medium text-gray-900">42.50 g</span>
                    </div>
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-500">Stone Count</span>
                        <span class="font-medium text-gray-900">12 Pcs</span>
                    </div>
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-500">Total Carats</span>
                        <span class="font-medium text-gray-900">1.25 ct</span>
                    </div>
                    <div class="flex justify-between items-center text-sm">
                        <span class="text-gray-500">Est. Wastage</span>
                        <span class="font-medium text-gray-900">0.00 g</span>
                    </div>
                    <div class="pt-4 border-t border-gray-100 flex justify-between items-center text-sm">
                        <span class="text-gray-700 font-medium">Est. Material Cost</span>
                        <span class="font-bold text-[#b01622]">₹3,42,000</span>
                    </div>

                    <div class="mt-4 bg-red-50/50 border border-[#b01622]/20 rounded-lg p-3 flex gap-3">
                        <i class="fa-solid fa-map-pin text-[#b01622] text-xs mt-0.5"></i>
                        <p class="text-[9px] text-gray-600 leading-relaxed">
                            Current gold rate used for estimation: <br>
                            <span class="font-bold text-gray-800">₹7,240/g (22K)</span>. Final cost adjusted upon job completion.
                        </p>
                    </div>
                </div>
            </div>

            <!-- Workflow Step -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">WORKFLOW STEP</h2>
                
                <div class="flex items-center justify-between mb-4 relative">
                    <div class="absolute left-0 top-1/2 -translate-y-1/2 w-full h-px bg-gray-200 z-0"></div>
                    
                    <div class="relative z-10 w-8 h-8 rounded-full bg-[#b01622] text-white flex items-center justify-center text-xs font-bold border-4 border-white shadow-sm">1</div>
                    <div class="relative z-10 w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-bold border-4 border-white shadow-sm">2</div>
                    <div class="relative z-10 w-8 h-8 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center text-xs font-bold border-4 border-white shadow-sm">3</div>
                </div>
                
                <p class="text-[11px] text-gray-600 leading-relaxed">
                    Job drafting is the first stage. Once assigned, stock will be blocked from the main vault.
                </p>
            </div>

            <!-- Material Breakdown -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="p-5 border-b border-gray-100">
                    <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">MATERIAL BREAKDOWN</h2>
                </div>
                <div class="p-5 space-y-3">
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-gray-600">Gold Value(22K)</span>
                        <span class="font-medium text-gray-900">₹ 1,30,050.00</span>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-gray-600">Making Charges</span>
                        <span class="font-medium text-gray-900">₹ 15,000.00</span>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-gray-600">Stone Charges</span>
                        <span class="font-medium text-gray-900">₹ 2,500.00</span>
                    </div>
                    <div class="flex justify-between items-center text-xs">
                        <span class="text-gray-600">Other Charges</span>
                        <span class="font-medium text-gray-900">₹ 1,625.00</span>
                    </div>
                    
                    <div class="pt-3 border-t border-gray-100 flex justify-between items-center">
                        <span class="text-sm font-bold text-gray-900">Total Amount</span>
                        <span class="font-bold text-gray-900">₹ 1,49,175.00</span>
                    </div>
                </div>
            </div>

            <!-- Documents -->
            <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div class="p-5 border-b border-gray-100">
                    <h2 class="text-xs font-semibold text-gray-500 uppercase tracking-wider">DOCUMENTS</h2>
                </div>
                <div class="p-4 space-y-2">
                    <div class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                        <div class="w-8 h-8 rounded bg-orange-50 flex items-center justify-center text-orange-500">
                            <i class="fa-regular fa-image text-xs"></i>
                        </div>
                        <div>
                            <p class="text-xs font-medium text-gray-900">Reference</p>
                            <p class="text-[10px] text-gray-500">Image.jpg</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                        <div class="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-red-500">
                            <i class="fa-regular fa-file-pdf text-xs"></i>
                        </div>
                        <div>
                            <p class="text-xs font-medium text-gray-900">Design File</p>
                            <p class="text-[10px] text-gray-500">Document.pdf</p>
                        </div>
                    </div>
                </div>
            </div>

        </div>
    </div>
</div>
@endsection
