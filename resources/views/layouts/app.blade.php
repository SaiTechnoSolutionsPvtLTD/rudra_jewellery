<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rudra Jewellery - Dashboard</title>
    <link rel="icon" type="image/png" href="{{ asset('favicon.png') }}?v=2">
    
    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- FontAwesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">

    <!-- Vite Styles -->
    @if (file_exists(public_path('build/manifest.json')) || file_exists(public_path('hot')))
        @vite(['resources/css/app.css', 'resources/js/app.js'])
    @else
        <!-- Fallback for Tailwind if Vite isn't running -->
        <script src="https://cdn.tailwindcss.com"></script>
        <script>
            tailwind.config = {
                theme: {
                    extend: {
                        colors: {
                            brand: '#b01622',
                            'brand-dark': '#90121b',
                            'brand-light': '#fdf2f2',
                        },
                        fontFamily: {
                            sans: ['Inter', 'sans-serif'],
                        }
                    }
                }
            }
        </script>
    @endif
    
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #f8fafc; }
        /* Custom scrollbar for sidebar */
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.1); border-radius: 4px; }
    </style>
    
    @stack('styles')
</head>
<body class="text-gray-800 antialiased overflow-hidden flex h-screen">

    <!-- Sidebar -->
    <aside class="w-64 bg-white text-gray-600 border-r border-gray-200 flex flex-col h-full shrink-0 relative z-20 transition-all duration-300" id="sidebar">
        <!-- Logo Area -->
        <div class="h-32 bg-[#b01622] flex items-center justify-center border-b border-white/10 p-2">
            <img src="{{ asset('logo.png') }}" alt="Rudra Jewellers" class="h-full w-full object-contain">
        </div>

        <!-- Navigation -->
        <nav class="flex-1 overflow-y-auto sidebar-scroll py-4 px-3 flex flex-col gap-1">
            <a href="{{ route('dashboard') }}" class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors {{ request()->routeIs('dashboard') ? 'bg-red-50 text-[#b01622] border-l-4 border-[#b01622]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900' }}">
                <i class="fa-solid fa-house w-5 text-center"></i>
                Dashboard
            </a>
            
            <a href="#" class="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-chart-line w-5 text-center"></i>
                    Sales
                </div>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </a>

            <a href="#" class="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-box w-5 text-center"></i>
                    Inventory
                </div>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </a>

            <!-- Job Creation (Active Accordion Group) -->
            @php
                $isJobCreationActive = request()->routeIs('job.*');
            @endphp
            <div class="mt-1 mb-1">
                <button class="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors {{ $isJobCreationActive ? 'text-[#b01622]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900' }}" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.fa-chevron-down').classList.toggle('rotate-180')">
                    <div class="flex items-center gap-3">
                        <i class="fa-regular fa-calendar-plus w-5 text-center"></i>
                        Job Creation
                    </div>
                    <i class="fa-solid fa-chevron-down text-[10px] {{ $isJobCreationActive ? 'rotate-180' : '' }} transition-transform"></i>
                </button>
                <div class="flex flex-col gap-1 mt-1 pl-4 pr-2 {{ $isJobCreationActive ? 'block' : 'hidden' }}">
                    <a href="{{ route('job.new') }}" class="flex items-center py-2 px-3 rounded-md text-sm {{ request()->routeIs('job.new') ? 'bg-red-50 text-[#b01622] font-semibold border-l-2 border-[#b01622]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900' }}">
                        New Work Order
                    </a>
                    <a href="{{ route('job.receive') }}" class="flex items-center py-2 px-3 rounded-md text-sm {{ request()->routeIs('job.receive') ? 'bg-red-50 text-[#b01622] font-semibold border-l-2 border-[#b01622]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900' }}">
                        Receive Worker
                    </a>
                    <a href="{{ route('job.order') }}" class="flex items-center py-2 px-3 rounded-md text-sm {{ request()->routeIs('job.order') ? 'bg-red-50 text-[#b01622] font-semibold border-l-2 border-[#b01622]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900' }}">
                        Job Order
                    </a>
                </div>
            </div>

            <a href="#" class="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-file-invoice-dollar w-5 text-center"></i>
                    Billing \ POS
                </div>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </a>

            <a href="#" class="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-users-gear w-5 text-center"></i>
                    Karigar Management
                </div>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </a>

            <a href="#" class="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-pen-ruler w-5 text-center"></i>
                    Product Design
                </div>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </a>

            <!-- Client Accordion Group -->
            @php
                $isClientActive = request()->routeIs('clients.*');
            @endphp
            <div class="mt-1 mb-1">
                <button class="w-full flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors {{ $isClientActive ? 'text-[#b01622]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900' }}" onclick="this.nextElementSibling.classList.toggle('hidden'); this.querySelector('.fa-chevron-down').classList.toggle('rotate-180')">
                    <div class="flex items-center gap-3">
                        <i class="fa-regular fa-user w-5 text-center"></i>
                        Client
                    </div>
                    <i class="fa-solid fa-chevron-down text-[10px] {{ $isClientActive ? 'rotate-180' : '' }} transition-transform"></i>
                </button>
                <div class="flex flex-col gap-1 mt-1 pl-4 pr-2 {{ $isClientActive ? 'block' : 'hidden' }}">
                    <a href="{{ route('clients.index') }}" class="flex items-center py-2 px-3 rounded-md text-sm {{ request()->routeIs('clients.index') ? 'bg-red-50 text-[#b01622] font-semibold border-l-2 border-[#b01622]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900' }}">
                        Dashboard
                    </a>
                    <a href="{{ route('clients.billing') }}" class="flex items-center py-2 px-3 rounded-md text-sm {{ request()->routeIs('clients.billing') ? 'bg-red-50 text-[#b01622] font-semibold border-l-2 border-[#b01622]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900' }}">
                        Billing
                    </a>
                    <a href="#" class="flex items-center py-2 px-3 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                        Price List
                    </a>
                    <a href="#" class="flex items-center py-2 px-3 rounded-md text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                        Remove
                    </a>
                </div>
            </div>

            <a href="#" class="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-layer-group w-5 text-center"></i>
                    Stock Management
                </div>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </a>

            <a href="#" class="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-arrow-right-arrow-left w-5 text-center"></i>
                    Exchange
                </div>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </a>

            <a href="#" class="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                <div class="flex items-center gap-3">
                    <i class="fa-regular fa-file-lines w-5 text-center"></i>
                    Report
                </div>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </a>

            <a href="#" class="flex items-center justify-between px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-gray-600 hover:bg-gray-50 hover:text-gray-900">
                <div class="flex items-center gap-3">
                    <i class="fa-solid fa-cart-shopping w-5 text-center"></i>
                    Purchase
                </div>
                <i class="fa-solid fa-chevron-right text-[10px]"></i>
            </a>
        </nav>

        <!-- Bottom Area -->
        <div class="p-4 flex flex-col gap-2 border-t border-gray-100">
            <a href="#" class="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md">
                <i class="fa-solid fa-plug w-5 text-center"></i>
                Integration
            </a>
            <a href="#" class="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-md">
                <i class="fa-solid fa-gear w-5 text-center"></i>
                Settings
            </a>
            
            <div class="mt-4 bg-red-50 hover:bg-red-100 cursor-pointer rounded-lg p-3 text-center border border-red-200 shadow-sm transition-colors">
                <i class="fa-solid fa-headset text-[#b01622] mb-1 text-lg"></i>
                <div class="text-[#b01622] font-semibold text-sm">Need Support ?</div>
                <div class="text-[10px] text-gray-500 mt-1">We're Here When You Need Us</div>
            </div>
        </div>
    </aside>

    <!-- Main Content Wrapper -->
    <div class="flex-1 flex flex-col h-screen overflow-hidden">
        
        <!-- Top Header -->
        <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 shrink-0 z-10">
            <!-- Left Side -->
            <div class="flex items-center gap-4 flex-1">
                <button class="text-gray-500 hover:text-gray-700 lg:hidden">
                    <i class="fa-solid fa-bars text-xl"></i>
                </button>
                
                <div class="relative w-full max-w-md hidden sm:block">
                    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i class="fa-solid fa-magnifying-glass text-gray-400 text-sm"></i>
                    </div>
                    <input type="text" class="block w-full pl-9 pr-12 py-2 border border-gray-200 rounded-md text-sm placeholder-gray-400 focus:outline-none focus:border-[#b01622] focus:ring-1 focus:ring-[#b01622] bg-gray-50/50" placeholder="Search...">
                    <div class="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <span class="text-gray-400 text-xs flex gap-1">
                            <kbd class="border border-gray-200 rounded px-1 text-[10px] bg-white">⌘</kbd>
                            <kbd class="border border-gray-200 rounded px-1 text-[10px] bg-white">F</kbd>
                        </span>
                    </div>
                </div>
            </div>

            <!-- Right Side -->
            <div class="flex items-center gap-6">
                <!-- Gold Rate Widget -->
                <div class="hidden md:flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-full px-4 py-1.5">
                    <div class="w-7 h-7 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        ₹
                    </div>
                    <div class="flex flex-col">
                        <span class="text-[10px] text-gray-600 font-medium">Today's Gold Rate : <span class="text-gray-800">23 July 2026</span></span>
                        <div class="flex gap-2 text-[10px] font-semibold mt-0.5">
                            <span class="text-amber-600">24K (999) <span class="text-[#b01622]">₹7,236</span></span>
                            <span class="text-gray-300">|</span>
                            <span class="text-amber-600">22K (916) <span class="text-[#b01622]">₹6,632</span></span>
                        </div>
                    </div>
                </div>

                <!-- Icons -->
                <div class="flex items-center gap-3">
                    <button class="relative p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors border border-gray-200">
                        <i class="fa-regular fa-bell"></i>
                        <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </button>
                    <button class="relative p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors border border-gray-200">
                        <i class="fa-regular fa-comment-dots"></i>
                        <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                    </button>
                </div>

                <!-- User Profile -->
                <button class="flex items-center gap-2 pl-2 border-l border-gray-200">
                    <div class="text-right hidden sm:block">
                        <div class="text-sm font-semibold text-[#b01622]">Arvind <span class="text-gray-500 font-normal text-xs">(Super Admin)</span></div>
                    </div>
                    <i class="fa-solid fa-chevron-down text-gray-400 text-xs ml-1"></i>
                </button>
            </div>
        </header>

        <!-- Main View Content -->
        <main class="flex-1 overflow-y-auto bg-[#fcfcfc] p-6">
            @yield('content')
        </main>
        
    </div>

    @stack('scripts')
</body>
</html>
