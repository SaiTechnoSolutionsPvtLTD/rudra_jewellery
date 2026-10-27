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

    <!-- Local FontAwesome Icons (Locally Hosted) -->
    <link rel="stylesheet" href="{{ asset('css/all.min.css') }}">

    @php
        $host = request()->getHost();
        $isLocalHost = in_array($host, ['127.0.0.1', 'localhost', '::1']);
        $hotFile = public_path('hot');
        $isLocalDev = false;

        if (app()->isLocal() && $isLocalHost && file_exists($hotFile)) {
            $hotContent = trim((string) @file_get_contents($hotFile));
            if (str_contains($hotContent, '0.0.0.0')) {
                $targetHost = in_array($host, ['127.0.0.1', 'localhost', '::1']) ? $host : '127.0.0.1';
                $hotContent = str_replace('0.0.0.0', $targetHost, $hotContent);
                @file_put_contents($hotFile, $hotContent);
            }

            // Verify Vite dev server port is actively responding with a non-blocking 50ms socket check
            // If Vite is not running or stopped, gracefully fall back to the built bundle instead of rendering a blank white page
            $parsedUrl = parse_url($hotContent);
            $viteHost = $parsedUrl['host'] ?? '127.0.0.1';
            $vitePort = (int) ($parsedUrl['port'] ?? 5173);

            $socket = @fsockopen($viteHost, $vitePort, $errno, $errstr, 0.05);
            if ($socket) {
                fclose($socket);
                $isLocalDev = true;
            } else {
                // Stale hot file detected (Vite is not active), remove it so subsequent loads are immediate
                @unlink($hotFile);
                $isLocalDev = false;
            }
        }
    @endphp

    @if ($isLocalDev)
        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.jsx'])
    @else
        @php
            $manifestPath = public_path('build/manifest.json');
            if (!file_exists($manifestPath) && file_exists(base_path('public_html/build/manifest.json'))) {
                $manifestPath = base_path('public_html/build/manifest.json');
            }
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
    <div id="app">
        <!-- Instant Native Brand Preloader: Displayed immediately while scripts load, replaced automatically once React mounts -->
        <div id="rudhra-initial-loader" style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; color: #1c1917; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
            <div style="position: relative; width: 64px; height: 64px; margin-bottom: 16px;">
                <div style="width: 64px; height: 64px; border: 4px solid #fecdd3; border-top: 4px solid #b01622; border-radius: 50%; animation: rudhraSpin 0.8s linear infinite;"></div>
                <div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 800; color: #b01622; font-family: 'Playfair Display', Georgia, serif;">R</div>
            </div>
            <h1 style="margin: 0 0 6px 0; font-size: 15px; font-weight: 700; color: #b01622; letter-spacing: 2.5px; text-transform: uppercase;">Rudra Jewellery</h1>
            <p style="margin: 0; font-size: 12px; color: #78716c; letter-spacing: 0.5px;">Initializing workspace...</p>
        </div>
        <style>
            @keyframes rudhraSpin { to { transform: rotate(360deg); } }
        </style>
    </div>
</body>
</html>
