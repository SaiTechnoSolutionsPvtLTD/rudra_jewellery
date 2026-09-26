<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Rudhra Jewellers - Product Selection Catalog</title>
    <style>
        @page {
            margin-top: 12mm;
            margin-left: 10mm;
            margin-right: 10mm;
            margin-bottom: 36mm;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #1e293b;
            background-color: #ffffff;
            margin: 0;
            padding: 0;
        }
        thead {
            display: table-header-group;
        }
        tr {
            page-break-inside: avoid;
        }

        /* Header Section */
        .company-name {
            font-size: 20px;
            font-weight: 800;
            color: #b01622;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin: 0 0 3px 0;
        }
        .subtitle {
            font-size: 11px;
            font-weight: 700;
            color: #475569;
            margin: 0 0 4px 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .meta-line {
            font-size: 9.5px;
            color: #64748b;
            margin: 0;
        }

        /* KPI Summary Box */
        .summary-box {
            width: 100%;
            border: 1px solid #cbd5e1;
            background-color: #f8fafc;
            border-radius: 6px;
            margin-bottom: 16px;
            padding: 8px 0;
        }
        .summary-table {
            width: 100%;
            border-collapse: collapse;
        }
        .summary-table td {
            width: 25%;
            text-align: center;
            border-right: 1px solid #e2e8f0;
            padding: 0 8px;
        }
        .summary-table td:last-child {
            border-right: none;
        }
        .kpi-label {
            font-size: 8.5px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            display: block;
            margin-bottom: 2px;
        }
        .kpi-value {
            font-size: 12px;
            font-weight: 800;
            color: #0f172a;
        }
        .kpi-value-highlight {
            color: #b01622;
        }

        /* Design Table */
        .designs-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 4px;
        }
        .designs-table thead tr {
            background-color: #b01622;
            color: #ffffff;
        }
        .designs-table th {
            padding: 9px 6px;
            font-size: 9.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: 1px solid #99111d;
            text-align: center;
        }
        .designs-table td {
            padding: 8px 6px;
            border: 1px solid #e2e8f0;
            text-align: center;
            vertical-align: middle;
            font-size: 10.5px;
        }
        .designs-table tbody tr:nth-child(even) {
            background-color: #f8fafc;
        }

        /* Full Size Image Frame Card */
        .img-container {
            width: 78px;
            height: 78px;
            border: 1.5px solid #cbd5e1;
            border-radius: 6px;
            background-color: #ffffff;
            margin: 0 auto;
            padding: 2px;
            text-align: center;
            box-sizing: border-box;
            display: block;
        }
        .img-preview {
            width: 100%;
            height: 100%;
            max-width: 74px;
            max-height: 74px;
            object-fit: contain;
            vertical-align: middle;
        }

        /* Text Formatting */
        .design-no {
            font-weight: 800;
            font-size: 12px;
            color: #0f172a;
        }
        .spec-badge {
            font-size: 9.5px;
            color: #475569;
            font-weight: 600;
            margin-top: 3px;
        }
        .val-gold {
            font-weight: 700;
            color: #b45309;
        }

        /* Fixed Bottom Footer Section */
        .pdf-footer-fixed {
            position: fixed;
            bottom: -31mm;
            left: 0;
            right: 0;
            height: 30mm;
        }
        .footer-note {
            padding: 7px 10px;
            background-color: #fffbeb;
            border: 1px solid #fef08a;
            border-radius: 5px;
            font-size: 8.5px;
            color: #78350f;
            line-height: 1.35;
            margin-bottom: 12px;
        }
        .signature-table {
            width: 100%;
            border-collapse: collapse;
        }
        .signature-table td {
            vertical-align: bottom;
            font-size: 9.5px;
            color: #64748b;
        }
        .signature-line {
            border-bottom: 1.5px solid #94a3b8;
            width: 175px;
            margin-left: auto;
            margin-bottom: 4px;
        }
    </style>
</head>
<body>

    @php
        $companyInfo = \DB::table('company_infos')->where('is_default', true)->first()
            ?? \DB::table('company_infos')->where('is_active', true)->first()
            ?? \DB::table('company_infos')->first();

        $logoPath = public_path('logo.png');
        $logoBase64 = '';
        if (file_exists($logoPath)) {
            $logoData = file_get_contents($logoPath);
            $logoBase64 = 'data:image/png;base64,' . base64_encode($logoData);
        }

        $companyName = $companyInfo->company_name ?? 'Rudhra Jewellers Pvt. Ltd.';
        $tagline = $companyInfo->tagline ?? 'Executive Enterprise Product Selection Catalog';
        $gstin = $companyInfo->gstin ?? '33AAACR1234F1Z0';
        $regNo = $companyInfo->reg_no ?? 'CHN/2026/JEW/9912';
        $hallmark = $companyInfo->hallmark_license ?? 'HM-339018274';
    @endphp

    <!-- Header Section -->
    <table style="width:100%; border-collapse:collapse; margin-bottom:14px; border-bottom: 3.5px solid #b01622; padding-bottom: 10px;">
        <tr>
            @if($logoBase64)
                <td style="width: 75px; vertical-align: middle; padding-right: 12px;">
                    <img src="{{ $logoBase64 }}" style="max-height: 54px; width: auto; display: block;">
                </td>
            @endif
            <td style="vertical-align: middle; text-align: left;">
                <div class="company-name">{{ $companyName }}</div>
                <div class="subtitle">{{ $tagline }}</div>
                <div class="meta-line">GSTIN: {{ $gstin }} | Reg No: {{ $regNo }} | BIS Hallmark: {{ $hallmark }}</div>
            </td>
            <td style="vertical-align: middle; text-align: right; width: 170px;">
                <div style="font-size: 9px; font-weight: 800; color: #b01622; background-color: #fff1f2; border: 1px solid #fecdd3; padding: 3px 8px; border-radius: 4px; text-transform: uppercase; display: inline-block; margin-bottom: 4px;">
                    Official Product Catalog
                </div>
                <div style="font-size: 10px; font-weight: 700; color: #334155;">DATE: {{ date('d M Y') }}</div>
                <div style="font-size: 9px; color: #64748b; margin-top: 2px;">TIME: {{ date('h:i A') }}</div>
            </td>
        </tr>
    </table>

    @php
        $totalCount = count($designs);
        $totalNetWt = 0;
        $totalDiaWt = 0;
        foreach($designs as $d) {
            $totalNetWt += (float) ($d->net_wt ?? 0);
            $totalDiaWt += (float) ($d->dia_wt_ct ?? 0);
        }
    @endphp

    <!-- KPI Summary Row -->
    <div class="summary-box">
        <table class="summary-table">
            <tr>
                <td>
                    <span class="kpi-label">Selected Designs</span>
                    <span class="kpi-value">{{ $totalCount }} Items</span>
                </td>
                <td>
                    <span class="kpi-label">Total Net Weight</span>
                    <span class="kpi-value kpi-value-highlight">{{ number_format($totalNetWt, 3) }} g</span>
                </td>
                <td>
                    <span class="kpi-label">Total Diamond Weight</span>
                    <span class="kpi-value">{{ number_format($totalDiaWt, 2) }} CT</span>
                </td>
                <td>
                    <span class="kpi-label">Catalog Status</span>
                    <span class="kpi-value" style="color:#166534; font-size:10.5px;">VERIFIED CATALOG</span>
                </td>
            </tr>
        </table>
    </div>

    <!-- Main Catalog Table -->
    <table class="designs-table">
        <thead>
            <tr>
                <th style="width: 6%;">S.NO</th>
                <th style="width: 22%;">PREVIEW</th>
                <th style="width: 24%;">DESIGN NO</th>
                <th style="width: 16%;">GOLD TYPE</th>
                <th style="width: 16%;">DIA WT (CT)</th>
                <th style="width: 16%;">NET WT (G)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($designs as $index => $design)
                <tr>
                    <td style="font-weight:700; color:#64748b;">{{ $index + 1 }}</td>
                    <td>
                        @php
                            $images = is_array($design->image_path) ? $design->image_path : [];
                            $firstImage = count($images) > 0 ? public_path('storage/' . $images[0]) : '';
                        @endphp
                        @if($firstImage && file_exists($firstImage))
                            <div class="img-container">
                                <img src="{{ $firstImage }}" class="img-preview">
                            </div>
                        @else
                            <span style="color:#cbd5e1; font-size:9px;">No Image</span>
                        @endif
                    </td>
                    <td>
                        <div class="design-no">{{ $design->design_no }}</div>
                        @if(!empty($design->setting_style))
                            <div class="spec-badge">{{ $design->setting_style }}</div>
                        @endif
                    </td>
                    <td>
                        <span class="val-gold">{{ $design->gold_type ?: '-' }}</span>
                    </td>
                    <td>
                        <span style="font-weight:700; color:#0f172a;">{{ $design->dia_wt_ct ? $design->dia_wt_ct . ' CT' : '-' }}</span>
                    </td>
                    <td>
                        <span style="font-weight:800; color:#b01622;">{{ $design->net_wt ? number_format($design->net_wt, 3) . ' g' : '-' }}</span>
                    </td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Fixed Footer pinned at the absolute bottom of A4 page -->
    <div class="pdf-footer-fixed">
        <div class="footer-note">
            <strong>Enterprise Product Catalog Certification:</strong> This catalog is digitally compiled directly from the enterprise product database of Rudhra Jewellers Pvt. Ltd. All metal weights, purity grades, and diamond specifications listed are verified for official client selection and manufacturing records.
        </div>

        <table class="signature-table">
            <tr>
                <td style="text-align:left;">
                    <strong style="color:#0f172a;">Rudhra Jewellers Pvt. Ltd.</strong><br>
                    Corporate Office: Chennai, Tamil Nadu, India<br>
                    Generated: {{ date('d M Y, h:i A') }}
                </td>
                <td style="text-align:right;">
                    <div class="signature-line"></div>
                    <strong style="color:#0f172a; text-transform:uppercase;">Authorized Catalog Manager</strong><br>
                    <span>Rudhra Product &amp; Quality Control</span>
                </td>
            </tr>
        </table>
    </div>

    <script type="text/php">
        if (isset($pdf)) {
            $text = "Page {PAGE_NUM} of {PAGE_COUNT}";
            $font = $fontMetrics->get_font("Helvetica", "bold");
            $size = 8;
            $color = array(0.4, 0.4, 0.4);
            $pdf->page_text(500, 810, $text, $font, $size, $color);
        }
    </script>
</body>
</html>
