@extends('layouts.app')

@section('title', 'Bulk Inventory Upload')

@section('content')
<div class="max-w-7xl mx-auto pb-10">
    
    <!-- Page Header -->
    <div class="flex flex-col mb-8">
        <a href="{{ route('inventory.index') }}" class="text-gray-400 hover:text-gray-600 text-sm mb-2 inline-block">
            <i class="fa-solid fa-chevron-left text-[11px]"></i>
        </a>
        <h1 class="text-xl font-bold text-gray-900">Bulk Inventory Upload</h1>
        <p class="text-[11px] text-gray-500 mt-1 font-bold">Upload CSV or Excel files to update your heritage collection in real-time.</p>
    </div>

    <!-- Main Content Box -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center max-w-4xl mx-auto mt-6">
        
        <!-- Dashed Upload Area -->
        <div class="border-2 border-dashed border-gray-200 rounded-xl w-full py-20 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
            
            <div class="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-[#90121b] mb-4">
                <i class="fa-solid fa-cloud-arrow-up text-lg"></i>
            </div>
            
            <h3 class="text-[13px] font-bold text-gray-900 mb-2">Drop your files here or click to browse</h3>
            <p class="text-[11px] font-bold text-gray-400">Standardized inventory data format required</p>
            
        </div>
        
        <!-- Bottom Action Area -->
        <div class="w-full flex items-center justify-between mt-6">
            <div class="flex items-center gap-2 text-gray-500">
                <i class="fa-regular fa-circle-question text-gray-400 text-sm"></i>
                <span class="text-[10px] font-bold">Files are validated instantly against our heritage standards.</span>
            </div>
            <button class="bg-[#90121b] text-white px-6 py-2.5 rounded text-[11px] font-bold shadow-sm hover:bg-[#7a0f17] transition-colors">
                Upload & Preview
            </button>
        </div>
        
    </div>

</div>
@endsection
