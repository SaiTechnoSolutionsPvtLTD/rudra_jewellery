@extends('layouts.app')

@section('title', 'Register New Client')

@section('content')
<div class="max-w-7xl mx-auto pb-12">
    
    <form action="{{ route('clients.index') }}" method="GET" enctype="multipart/form-data">
        <!-- Top Breadcrumb & Action Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
            <div>
                <div class="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                    CUSTOMERS <span class="text-gray-300 mx-1">▸</span> <span class="text-gray-500">NEW CLIENT</span>
                </div>
                <h1 class="text-2xl font-bold text-gray-900">Register New Client</h1>
            </div>
            
            <div class="flex items-center gap-3">
                <a href="{{ route('clients.index') }}" class="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
                    Cancel
                </a>
                <button type="button" class="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors">
                    <i class="fa-solid fa-cart-shopping text-gray-500 text-xs"></i>
                    Save & Create Transaction
                </button>
                <button type="submit" class="px-5 py-2.5 bg-[#b01622] hover:bg-[#90121b] text-white text-sm font-semibold rounded-lg shadow-sm flex items-center gap-2 transition-colors">
                    <i class="fa-regular fa-floppy-disk text-xs"></i>
                    Save Client
                </button>
            </div>
        </div>

        <!-- Main Layout: 2 Columns -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- Left Column (Personal Info, Contact, Company & Price List) -->
            <div class="lg:col-span-2 space-y-6">
                
                <!-- Personal Information -->
                <div class="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6">
                    <div class="flex items-center gap-2.5 text-sm font-bold text-[#b01622] mb-6">
                        <i class="fa-regular fa-user text-base"></i>
                        <span>Personal Information</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-2">Full Name</label>
                            <input type="text" name="full_name" placeholder="e.g. Alexandra Sterling" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-2">Gender</label>
                            <div class="relative">
                                <select name="gender" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 appearance-none focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                                    <option value="male" selected>Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                                <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                                    <i class="fa-solid fa-chevron-down text-xs"></i>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-2">Date of Birth</label>
                            <input type="date" name="dob" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-2">Anniversary Date (Optional)</label>
                            <input type="date" name="anniversary_date" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                        </div>
                    </div>
                </div>

                <!-- Contact Details -->
                <div class="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6">
                    <div class="flex items-center gap-2.5 text-sm font-bold text-[#b01622] mb-6">
                        <i class="fa-regular fa-address-card text-base"></i>
                        <span>Contact Details</span>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-2">Primary Phone</label>
                            <input type="tel" name="primary_phone" placeholder="+91 98765 43210" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-2">Secondary Phone</label>
                            <input type="tel" name="secondary_phone" placeholder="+91 98765 00000" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-2">Email Address</label>
                            <input type="email" name="email" placeholder="alexandra.s@example.com" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                        </div>
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-2">Aadhar Number</label>
                            <input type="text" name="aadhar_number" placeholder="4555-5254-5243" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                        <div>
                            <label class="block text-xs font-semibold text-gray-700 mb-2">Pan Number</label>
                            <input type="text" name="pan_number" placeholder="EJDF785632" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                        </div>
                    </div>

                    <!-- Detailed Address -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-2">Detailed Address</label>
                        <input type="text" name="street_address" placeholder="Street Address, Building, Ap..." class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors mb-3">
                        
                        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <input type="text" name="city" placeholder="City" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                            <input type="text" name="state" placeholder="State/Province" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                            <input type="text" name="zip_code" placeholder="ZIP Code" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                        </div>
                    </div>
                </div>

                <!-- Bottom Cards Grid: Company Info & Price List -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <!-- Company Information (Optional) -->
                    <div class="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6 flex flex-col justify-between">
                        <div>
                            <div class="flex items-center gap-2.5 text-sm font-bold text-[#b01622] mb-6">
                                <i class="fa-regular fa-building text-base"></i>
                                <span>Company Information (Optional)</span>
                            </div>

                            <div class="space-y-4">
                                <div>
                                    <label class="block text-xs font-semibold text-gray-700 mb-2">Company Name</label>
                                    <input type="text" name="company_name" placeholder="e.g. Sterling Enterprises" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-gray-700 mb-2">GST Number / Tax ID</label>
                                    <input type="text" name="gst_number" placeholder="Enter GST or Tax ID" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-gray-700 mb-2">Designation</label>
                                    <input type="text" name="designation" placeholder="e.g. Managing Director" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Price List -->
                    <div class="bg-[#f8f9fa] rounded-xl border border-gray-200/80 shadow-sm p-6 flex flex-col justify-between">
                        <div>
                            <div class="flex items-center gap-2.5 text-sm font-bold text-[#b01622] mb-6">
                                <i class="fa-solid fa-table-cells text-base"></i>
                                <span>Price List</span>
                            </div>

                            <div class="space-y-4">
                                <div>
                                    <label class="block text-xs font-semibold text-gray-700 mb-2">Invoice ID</label>
                                    <input type="text" name="invoice_id" value="INV-2026-1254" placeholder="INV-2026-1254" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                                </div>
                                <div>
                                    <label class="block text-xs font-semibold text-gray-700 mb-2">Select Price List</label>
                                    <div class="relative">
                                        <select name="price_list" class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 appearance-none focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors">
                                            <option value="pl-02" selected>PL-02 (Standard Price List)</option>
                                            <option value="pl-01">PL-01 (Wholesale Price List)</option>
                                            <option value="pl-03">PL-03 (VIP Platinum List)</option>
                                        </select>
                                        <div class="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                                            <i class="fa-solid fa-chevron-down text-xs"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

            </div>

            <!-- Right Column Sidebar (Photo, Preferences, Quick Notes) -->
            <div class="space-y-6">
                
                <!-- Client Photo -->
                <div class="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6 text-center">
                    <div class="relative w-28 h-28 mx-auto mb-4">
                        <div class="w-28 h-28 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 overflow-hidden shadow-inner" id="photoPreview">
                            <i class="fa-regular fa-user text-4xl"></i>
                        </div>
                        <label for="clientPhotoInput" class="absolute bottom-1 right-1 w-8 h-8 rounded-full bg-[#b01622] text-white flex items-center justify-center cursor-pointer shadow-md hover:bg-[#90121b] transition-colors" title="Upload Client Photo">
                            <i class="fa-solid fa-pencil text-xs"></i>
                            <input type="file" id="clientPhotoInput" name="photo" accept="image/*" class="hidden" onchange="previewImage(this)">
                        </label>
                    </div>
                    <h3 class="font-bold text-gray-900 text-sm">Client Photo</h3>
                    <p class="text-xs text-gray-400 mt-1">Upload a clear portrait for identification</p>
                </div>

                <!-- Preferences -->
                <div class="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6">
                    <div class="flex items-center gap-2.5 text-sm font-bold text-[#b01622] mb-5">
                        <i class="fa-solid fa-[#b01622] fa-ribbon text-base"></i>
                        <span>Preferences</span>
                    </div>

                    <!-- Membership Tier -->
                    <div class="mb-6">
                        <label class="block text-xs font-semibold text-gray-700 mb-3">Membership Tier</label>
                        
                        <div class="space-y-2.5" id="tierGroup">
                            <!-- Platinum Elite -->
                            <label class="tier-card flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 cursor-pointer hover:border-gray-300 transition-all">
                                <input type="radio" name="membership_tier" value="platinum_elite" class="text-[#b01622] focus:ring-[#b01622]" onchange="updateTierSelection(this)">
                                <div class="flex-1 flex items-center justify-between">
                                    <div>
                                        <div class="text-sm font-semibold text-gray-900">Platinum Elite</div>
                                        <div class="text-[9px] font-bold text-amber-600 tracking-wider uppercase mt-0.5">PRIORITY ACCESS</div>
                                    </div>
                                </div>
                            </label>

                            <!-- Gold Member -->
                            <label class="tier-card flex items-center gap-3 p-3.5 rounded-xl border border-gray-200 cursor-pointer hover:border-gray-300 transition-all">
                                <input type="radio" name="membership_tier" value="gold" class="text-[#b01622] focus:ring-[#b01622]" onchange="updateTierSelection(this)">
                                <span class="text-sm font-semibold text-gray-900">Gold Member</span>
                            </label>

                            <!-- Silver Member (Checked by default) -->
                            <label class="tier-card active-tier flex items-center gap-3 p-3.5 rounded-xl border border-amber-300 bg-amber-50/50 cursor-pointer transition-all">
                                <input type="radio" name="membership_tier" value="silver" checked class="text-[#b01622] focus:ring-[#b01622]" onchange="updateTierSelection(this)">
                                <span class="text-sm font-semibold text-gray-900">Silver Member</span>
                            </label>
                        </div>
                    </div>

                    <!-- Preferred Communication -->
                    <div>
                        <label class="block text-xs font-semibold text-gray-700 mb-3">Preferred Communication</label>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="setCommMode(this)" class="comm-btn px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all">
                                WhatsApp
                            </button>
                            <button type="button" onclick="setCommMode(this)" class="comm-btn active-comm px-4 py-2 rounded-full bg-[#b01622] text-xs font-medium text-white shadow-sm transition-all">
                                Email
                            </button>
                            <button type="button" onclick="setCommMode(this)" class="comm-btn px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all">
                                Phone Call
                            </button>
                        </div>
                        <input type="hidden" name="preferred_communication" id="preferredCommInput" value="Email">
                    </div>
                </div>

                <!-- Quick Notes -->
                <div class="bg-white rounded-xl border border-gray-200/80 shadow-sm p-6">
                    <div class="flex items-center gap-2.5 text-sm font-bold text-[#b01622] mb-5">
                        <i class="fa-solid fa-notes-medical text-base"></i>
                        <span>Quick Notes</span>
                    </div>

                    <textarea name="quick_notes" rows="4" placeholder="Enter bespoke requests, personal preferences, or family connections..." class="w-full px-3.5 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] transition-colors mb-4 resize-none"></textarea>

                    <div class="p-3.5 bg-amber-50/80 border border-amber-200/70 rounded-lg text-xs text-amber-900 leading-relaxed italic">
                        "Client has a strong preference for 22K yellow gold and traditional floral motifs."
                    </div>
                </div>

            </div>

        </div>
    </form>
</div>

@push('scripts')
<script>
    // Live image upload preview
    function previewImage(input) {
        if (input.files && input.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                const preview = document.getElementById('photoPreview');
                preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover rounded-full" />`;
            }
            reader.readAsDataURL(input.files[0]);
        }
    }

    // Tier selection radio visual toggle
    function updateTierSelection(radio) {
        document.querySelectorAll('.tier-card').forEach(card => {
            card.classList.remove('border-amber-300', 'bg-amber-50/50', 'active-tier');
            card.classList.add('border-gray-200');
        });
        const parentLabel = radio.closest('.tier-card');
        if (parentLabel) {
            parentLabel.classList.remove('border-gray-200');
            parentLabel.classList.add('border-amber-300', 'bg-amber-50/50', 'active-tier');
        }
    }

    // Communication method button toggle
    function setCommMode(btn) {
        document.querySelectorAll('.comm-btn').forEach(b => {
            b.className = 'comm-btn px-4 py-2 rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 transition-all';
        });
        btn.className = 'comm-btn active-comm px-4 py-2 rounded-full bg-[#b01622] text-xs font-medium text-white shadow-sm transition-all';
        document.getElementById('preferredCommInput').value = btn.textContent.trim();
    }
</script>
@endpush
@endsection
