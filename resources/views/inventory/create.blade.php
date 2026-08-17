@extends('layouts.app')

@section('title', 'Add New Item')

@section('content')
<div class="max-w-7xl mx-auto pb-10">

    <!-- Top Stepper -->
    <div class="flex items-center justify-center max-w-xl mx-auto mb-10 pt-4 relative">
        <!-- Connecting Line -->
        <div class="absolute top-5 left-[15%] right-[15%] h-[2px] bg-gray-200 -z-10"></div>
        
        <div class="flex-1 flex flex-col items-center gap-2">
            <div class="w-10 h-10 rounded-full bg-[#b01622] text-white flex items-center justify-center font-bold text-lg border-4 border-[#fcfcfc] shadow-sm z-10">
                1
            </div>
            <div class="text-[#b01622] font-bold text-xs">Upload File</div>
        </div>
        
        <div class="flex-1 flex flex-col items-center gap-2">
            <div class="w-10 h-10 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center font-bold text-lg border-4 border-[#fcfcfc] shadow-sm z-10">
                2
            </div>
            <div class="text-gray-800 font-bold text-xs">Valid Data</div>
        </div>
        
        <div class="flex-1 flex flex-col items-center gap-2">
            <div class="w-10 h-10 rounded-full bg-gray-100 text-gray-800 flex items-center justify-center font-bold text-lg border-4 border-[#fcfcfc] shadow-sm z-10">
                3
            </div>
            <div class="text-gray-800 font-bold text-xs">Complete</div>
        </div>
    </div>

    <!-- Main Content Area -->
    <div class="max-w-4xl mx-auto flex flex-col gap-6">
        
        <!-- Category Selection -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
            <div class="flex items-center gap-3 mb-6">
                <div class="bg-[#b01622] rounded flex items-center justify-center w-8 h-8 text-white">
                    <i class="fa-solid fa-box-open text-xs"></i>
                </div>
                <div class="flex flex-col gap-0.5">
                    <h2 class="text-[15px] font-bold text-gray-900">Select Inventory Category</h2>
                    <p class="text-[11px] font-bold text-gray-500">Choose the category you want to manage from below</p>
                </div>
            </div>

            <!-- Categories Grid -->
            <div class="grid grid-cols-5 gap-4">
                
                <!-- Diamond (Active State) -->
                <div class="border border-red-200 rounded-xl p-5 flex flex-col items-center text-center cursor-pointer shadow-sm bg-gradient-to-b from-white to-red-50/30 transition-shadow relative">
                    <div class="text-red-400 mb-3"><i class="fa-solid fa-gem text-xl"></i></div>
                    <div class="text-[11px] font-bold text-[#b01622] mb-1.5">Diamond</div>
                    <p class="text-[8px] font-bold text-gray-400 leading-tight">Elegant designs crafted<br>to perfection</p>
                </div>

                <!-- Ornaments -->
                <div class="border border-gray-100 rounded-xl p-5 flex flex-col items-center text-center cursor-pointer hover:border-red-200 hover:shadow-sm hover:bg-gradient-to-b hover:from-white hover:to-red-50/30 transition-all">
                    <div class="text-red-400 mb-3"><i class="fa-solid fa-medal text-xl"></i></div>
                    <div class="text-[11px] font-bold text-[#b01622] mb-1.5">Ornaments</div>
                    <p class="text-[8px] font-bold text-gray-400 leading-tight">Luxury ornaments for every occasion</p>
                </div>

                <!-- Gold -->
                <div class="border border-gray-100 rounded-xl p-5 flex flex-col items-center text-center cursor-pointer hover:border-red-200 hover:shadow-sm hover:bg-gradient-to-b hover:from-white hover:to-red-50/30 transition-all">
                    <div class="text-amber-400 mb-3"><i class="fa-solid fa-layer-group text-xl"></i></div>
                    <div class="text-[11px] font-bold text-[#b01622] mb-1.5">Gold</div>
                    <p class="text-[8px] font-bold text-gray-400 leading-tight">Premium gold for fine craftsmanship</p>
                </div>

                <!-- Stone -->
                <div class="border border-gray-100 rounded-xl p-5 flex flex-col items-center text-center cursor-pointer hover:border-red-200 hover:shadow-sm hover:bg-gradient-to-b hover:from-white hover:to-red-50/30 transition-all">
                    <div class="text-red-500 mb-3"><i class="fa-solid fa-cube text-xl"></i></div>
                    <div class="text-[11px] font-bold text-[#b01622] mb-1.5">Stone</div>
                    <p class="text-[8px] font-bold text-gray-400 leading-tight">Rare gemstones with lasting brilliance</p>
                </div>

                <!-- Silver -->
                <div class="border border-gray-100 rounded-xl p-5 flex flex-col items-center text-center cursor-pointer hover:border-red-200 hover:shadow-sm hover:bg-gradient-to-b hover:from-white hover:to-red-50/30 transition-all">
                    <div class="text-amber-200 mb-3"><i class="fa-solid fa-ring text-xl"></i></div>
                    <div class="text-[11px] font-bold text-[#b01622] mb-1.5">Silver</div>
                    <p class="text-[8px] font-bold text-gray-400 leading-tight">Quality silver for timeless creations</p>
                </div>
            </div>
        </div>

        <!-- Upload Section -->
        <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-12 flex flex-col items-center justify-center min-h-[320px]">
            
            <div class="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-gray-800 mb-6 shadow-sm">
                <i class="fa-solid fa-cloud-arrow-up text-xl"></i>
            </div>
            
            <h3 class="text-[15px] font-bold text-gray-900 mb-1.5">Drag and drop your CSV/Excel file here</h3>
            <p class="text-[11px] font-bold text-gray-400 mb-8">or click to browse your local storage</p>
            
            <button class="bg-[#b01622] text-white px-8 py-2.5 rounded text-[11px] font-bold shadow-sm hover:bg-[#90121b] transition-colors">
                Select File
            </button>
            
        </div>
        
        <!-- Bottom Actions -->
        <div class="flex items-center justify-center gap-4 mt-2">
            <button class="px-8 py-2 border border-gray-300 text-gray-700 rounded text-[11px] font-bold hover:bg-gray-50 transition-colors bg-white">
                Cancel
            </button>
            <button class="px-8 py-2 bg-[#b01622] text-white rounded text-[11px] font-bold hover:bg-[#90121b] shadow-sm transition-colors">
                Process Upload
            </button>
        </div>

    </div>

</div>
@endsection
