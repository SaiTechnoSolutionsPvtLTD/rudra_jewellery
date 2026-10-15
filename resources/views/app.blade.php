<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rudra Jewellery</title>
    <link rel="icon" type="image/png" sizes="32x32" href="{{ asset('favicon.png') }}">
    <link rel="shortcut icon" href="{{ asset('favicon.ico') }}">
    <link rel="apple-touch-icon" href="{{ asset('favicon.png') }}">
    
    <!-- Instant Preload Local FontAwesome Icon Fonts for Zero-Delay Loading -->
    <link rel="preload" href="{{ asset('webfonts/fa-solid-900.woff2') }}" as="font" type="font/woff2" crossorigin>
    <link rel="preload" href="{{ asset('webfonts/fa-regular-400.woff2') }}" as="font" type="font/woff2" crossorigin>

    <!-- Google Fonts (Non-blocking) -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600;700;800&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <noscript><link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@500;600;700;800&family=Poppins:wght@300;400;500;600&display=swap" rel="stylesheet"></noscript>

    <!-- Local FontAwesome Icons (Instant Local Load + Async Fallback) -->
    <link rel="stylesheet" href="{{ asset('css/all.min.css') }}">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" media="print" onload="this.media='all'">
    <noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"></noscript>

    @php
        $host = request()->getHost();
        $isLocalHost = in_array($host, ['127.0.0.1', 'localhost', '::1']) ||
            str_starts_with($host, '192.168.') ||
            str_starts_with($host, '10.') ||
            str_starts_with($host, '172.');
        $hotFile = public_path('hot');
        $hasHot = file_exists($hotFile);
        $isLocalDev = app()->isLocal() && $isLocalHost && $hasHot;

        // Prevent net::ERR_ADDRESS_INVALID by replacing non-routable 0.0.0.0 with the client request host
        if ($isLocalDev) {
            $hotContent = trim(@file_get_contents($hotFile));
            if (str_contains($hotContent, '0.0.0.0')) {
                $targetHost = in_array($host, ['127.0.0.1', 'localhost', '::1']) ? 'localhost' : $host;
                $fixedHot = str_replace('0.0.0.0', $targetHost, $hotContent);
                @file_put_contents($hotFile, $fixedHot);
            }
        }
    @endphp

    @if ($isLocalDev)
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @else
        @php
            $manifestPath = public_path('build/manifest.json');
            $manifest = file_exists($manifestPath) ? json_decode(file_get_contents($manifestPath), true) : [];
            $cssFile = $manifest['resources/css/app.css']['file'] ?? null;
            $jsFile = $manifest['resources/js/app.jsx']['file'] ?? null;
        @endphp
        @if ($cssFile)
            <link rel="stylesheet" href="{{ asset('build/' . $cssFile) }}">
        @endif
        @if ($jsFile)
            <script type="module" src="{{ asset('build/' . $jsFile) }}"></script>
        @endif
    @endif
</head>
<body class="text-gray-800 antialiased bg-[#f8fafc]">
    <div id="app"></div>
</body>
</html>
