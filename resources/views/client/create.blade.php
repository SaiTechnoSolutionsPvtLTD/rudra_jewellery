@extends('layouts.app')

@section('title', 'Register New Client')

@section('content')
<div class="max-w-7xl mx-auto pb-10">
    
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-end justify-between mb-6 gap-4">
        <div>
            <div class="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                <span>Customers</span>
                <i class="fa-solid fa-chevron-right text-[8px]"></i>
                <span class="text-[#b01622]">New Client</span>
            </div>
            <h1 class="text-2xl font-bold text-[#b01622]">Register New Client</h1>
        </div>
        <div class="flex items-center gap-6 text-[13px]">
            <a href="{{ route('client.index') }}" class="text-gray-600 hover:text-gray-900 font-medium transition-colors">Cancel</a>
            <button class="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium transition-colors">
                <i class="fa-solid fa-cart-plus"></i> Save & Create Transaction
            </button>
            <button class="flex items-center gap-2 text-gray-900 font-bold hover:text-black transition-colors">
                <i class="fa-regular fa-floppy-disk text-lg"></i> Save Client
            </button>
        </div>
    </div>

    <!-- Main Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <!-- Left Column (Span 2) -->
        <div class="lg:col-span-2 space-y-6">
            
            <!-- Personal Information -->
            <div class="bg-white rounded-xl border border-gray-100 p-7 shadow-sm relative overflow-hidden">
                <h2 class="text-[13px] font-bold text-gray-800 flex items-center gap-2.5 mb-6">
                    <i class="fa-regular fa-user text-[#b01622] text-sm"></i> Personal Information
                </h2>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                    <div>
                        <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Full Name</label>
                        <input type="text" placeholder="e.g. Alexandra Sterling" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                    </div>
                    <div>
                        <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Gender</label>
                        <div class="relative">
                            <select class="w-full bg-white border border-gray-200 rounded-md pl-3 pr-8 py-2.5 text-[13px] text-gray-800 focus:outline-none focus:border-[#b01622] appearance-none">
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                            <i class="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[9px] pointer-events-none"></i>
                        </div>
                    </div>
                    <div>
                        <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Date of Birth</label>
                        <input type="text" placeholder="mm/dd/yyyy" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                    </div>
                    <div>
                        <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Anniversary Date (Optional)</label>
                        <input type="text" placeholder="mm/dd/yyyy" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                    </div>
                </div>
            </div>

            <!-- Contact Details -->
            <div class="bg-white rounded-xl border border-gray-100 p-7 shadow-sm">
                <h2 class="text-[13px] font-bold text-gray-800 flex items-center gap-2.5 mb-6">
                    <i class="fa-regular fa-address-card text-[#b01622] text-sm"></i> Contact Details
                </h2>
                
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 mb-5">
                    <div>
                        <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Primary Phone</label>
                        <input type="text" placeholder="+91 98765 43210" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                    </div>
                    <div>
                        <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Secondary Phone</label>
                        <input type="text" placeholder="+91 98765 00000" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                    </div>
                    <div>
                        <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Email Address</label>
                        <input type="text" placeholder="alexandra.s@example.com" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                    </div>
                    <div>
                        <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Aadhar Number</label>
                        <input type="text" placeholder="4555-5254-5243" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                    </div>
                    <div>
                        <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Pan Number</label>
                        <input type="text" placeholder="EJDF785632" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                    </div>
                </div>
                
                <div class="mb-5">
                    <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Detailed Address</label>
                    <input type="text" placeholder="Street Address, Building, Apt..." class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                </div>
                
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
                    <input type="text" placeholder="City" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                    <input type="text" placeholder="State/Province" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                    <input type="text" placeholder="ZIP Code" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                </div>
            </div>

            <!-- Bottom Row: Company Info & Price List -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Company Information -->
                <div class="bg-white rounded-xl border border-gray-100 p-7 shadow-sm">
                    <h2 class="text-[13px] font-bold text-gray-800 flex items-center gap-2.5 mb-6">
                        <i class="fa-regular fa-building text-[#b01622] text-sm"></i> Company Information (Optional)
                    </h2>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Company Name</label>
                            <input type="text" placeholder="e.g. Sterling Enterprises" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                        </div>
                        <div>
                            <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">GST Number / Tax ID</label>
                            <input type="text" placeholder="Enter GST or Tax ID" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                        </div>
                        <div>
                            <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Designation</label>
                            <input type="text" placeholder="e.g. Managing Director" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622] placeholder-gray-400">
                        </div>
                    </div>
                </div>

                <!-- Price List -->
                <div class="bg-[#fcfcfc] rounded-xl border border-gray-100 p-7 shadow-sm">
                    <h2 class="text-[13px] font-bold text-gray-800 flex items-center gap-2.5 mb-6">
                        <i class="fa-solid fa-list-ul text-[#b01622] text-sm"></i> Price List
                    </h2>
                    <div class="space-y-4">
                        <div>
                            <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Invoice ID</label>
                            <input type="text" value="INV-2026-1254" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622]" readonly>
                        </div>
                        <div>
                            <label class="block text-[11px] font-semibold text-gray-600 mb-1.5">Select Price List</label>
                            <input type="text" value="PL-02 (Standard Price List)" class="w-full bg-white border border-gray-200 rounded-md px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:border-[#b01622]" readonly>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <!-- Right Column (Span 1) -->
        <div class="space-y-6">
            
            <!-- Client Photo -->
            <div class="bg-white rounded-xl border border-gray-100 p-8 shadow-sm flex flex-col items-center text-center">
                <div class="relative mb-5">
                    <div class="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-[#b01622]">
                        <i class="fa-regular fa-user text-2xl"></i>
                    </div>
                    <button class="absolute bottom-0 right-0 w-7 h-7 bg-[#b01622] text-white rounded-full flex items-center justify-center text-[11px] border-2 border-white shadow-sm hover:bg-[#90121b] transition-colors">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                </div>
                <h3 class="text-sm font-bold text-gray-900 mb-1">Client Photo</h3>
                <p class="text-[11px] text-gray-500">Upload a clear portrait for identification</p>
            </div>

            <!-- Preferences -->
            <div class="bg-white rounded-xl border border-gray-100 p-7 shadow-sm">
                <h2 class="text-[13px] font-bold text-gray-800 flex items-center gap-2.5 mb-5">
                    <i class="fa-solid fa-medal text-[#b01622] text-sm"></i> Preferences
                </h2>
                
                <label class="block text-[11px] font-semibold text-gray-600 mb-3">Membership Tier</label>
                <div class="space-y-2 mb-6">
                    <!-- Option 1 -->
                    <label class="flex items-center gap-3 p-3.5 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                        <input type="radio" name="tier" class="accent-[#b01622]">
                        <div>
                            <div class="text-[13px] font-bold text-gray-900">Platinum Elite</div>
                            <div class="text-[9px] font-bold text-amber-600 uppercase tracking-wider mt-0.5">Priority Access</div>
                        </div>
                    </label>
                    <!-- Option 2 -->
                    <label class="flex items-center gap-3 p-3.5 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                        <input type="radio" name="tier" class="accent-[#b01622]">
                        <div class="text-[13px] font-bold text-gray-900">Gold Member</div>
                    </label>
                    <!-- Option 3 (Selected) -->
                    <label class="flex items-center gap-3 p-3.5 border border-amber-200 bg-[#fefaf3] rounded-md cursor-pointer">
                        <input type="radio" name="tier" class="accent-[#b01622]" checked>
                        <div class="text-[13px] font-bold text-gray-900">Silver Member</div>
                    </label>
                </div>

                <label class="block text-[11px] font-semibold text-gray-600 mb-3">Preferred Communication</label>
                <div class="flex flex-wrap gap-2">
                    <button class="px-3.5 py-1.5 rounded-full border border-gray-200 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors">WhatsApp</button>
                    <button class="px-3.5 py-1.5 rounded-full bg-[#b01622] text-white text-[11px] font-semibold shadow-sm">Email</button>
                    <button class="px-3.5 py-1.5 rounded-full border border-gray-200 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 transition-colors">Phone Call</button>
                </div>
            </div>

            <!-- Quick Notes -->
            <div class="bg-white rounded-xl border border-gray-100 p-7 shadow-sm">
                <h2 class="text-[13px] font-bold text-gray-800 flex items-center gap-2.5 mb-5">
                    <i class="fa-solid fa-align-left text-[#b01622] text-sm"></i> Quick Notes
                </h2>
                <textarea rows="4" class="w-full bg-white border border-gray-200 rounded-md p-3.5 text-[13px] text-gray-700 focus:outline-none focus:border-[#b01622] resize-none mb-4" placeholder="Enter bespoke requests, personal preferences, or family connections..."></textarea>
                
                <div class="bg-[#fef9eb] border-l-4 border-[#e9bc47] p-3.5 rounded-r-md">
                    <p class="text-[11px] text-gray-700 italic">"Client has a strong preference for 22K yellow gold and traditional floral motifs."</p>
                </div>
            </div>

        </div>

    </div>
</div>
@endsection
