<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Work Order - {{ $order->work_order_number }}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 8mm 8mm 10mm 8mm;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #262626;
            line-height: 1.4;
            margin: 0;
            padding: 0;
        }
        thead {
            display: table-header-group;
        }
        tr {
            page-break-inside: avoid;
        }
        .header-table {
            width: 100%;
            border-bottom: 2px solid #b01622;
            padding-bottom: 12px;
            margin-bottom: 14px;
        }
        .logo-text {
            font-size: 20px;
            font-weight: 800;
            color: #b01622;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .tagline {
            font-size: 9px;
            color: #666;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 2px;
        }
        .store-info {
            font-size: 9px;
            color: #555;
            margin-top: 4px;
        }
        .doc-title {
            text-align: right;
        }
        .doc-title h1 {
            font-size: 22px;
            margin: 0;
            color: #b01622;
            font-weight: 900;
            letter-spacing: 1px;
        }
        .order-badge {
            background-color: #fdf2f2;
            border: 1px solid #f8b4b4;
            color: #b01622;
            padding: 3px 8px;
            font-weight: bold;
            font-size: 11px;
            display: inline-block;
            margin-top: 4px;
            border-radius: 4px;
            font-family: monospace;
        }
        .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 14px;
            background: #fafafa;
            border: 1px solid #e5e5e5;
            border-radius: 6px;
        }
        .meta-table td {
            padding: 7px 10px;
            vertical-align: top;
            font-size: 10px;
            border: 1px solid #eee;
        }
        .meta-label {
            color: #888;
            font-size: 9px;
            text-transform: uppercase;
            font-weight: bold;
            margin-bottom: 2px;
        }
        .meta-val {
            font-weight: bold;
            color: #111;
            font-size: 11px;
        }
        .section-title {
            font-size: 11px;
            font-weight: bold;
            color: #b01622;
            text-transform: uppercase;
            border-bottom: 1px solid #f1c0c5;
            padding-bottom: 4px;
            margin-top: 12px;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }
        .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 12px;
        }
        .data-table th {
            background-color: #f7f7f7;
            color: #444;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 9px;
            padding: 7px 8px;
            border: 1px solid #e0e0e0;
            text-align: left;
        }
        .data-table td {
            padding: 7px 8px;
            border: 1px solid #e8e8e8;
            font-size: 10px;
        }
        .data-table tr:nth-child(even) td {
            background-color: #fafafa;
        }
        .summary-grid {
            width: 100%;
            margin-top: 14px;
            margin-bottom: 14px;
        }
        .summary-box {
            background-color: #b01622;
            color: white;
            text-align: center;
            padding: 8px 4px;
            border-radius: 4px;
        }
        .summary-box .label {
            font-size: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            opacity: 0.9;
        }
        .summary-box .value {
            font-size: 14px;
            font-weight: 900;
            margin-top: 2px;
            font-family: monospace;
        }
        .notes-box {
            background: #fffdfa;
            border: 1px solid #fce8cc;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 10px;
            color: #664d03;
            margin-bottom: 16px;
        }
        .signatures-table {
            width: 100%;
            margin-top: 25px;
            border-top: 1px solid #e0e0e0;
            padding-top: 15px;
        }
        .signatures-table td {
            text-align: center;
            font-size: 9px;
            color: #666;
            vertical-align: top;
        }
        .sig-line {
            width: 80%;
            border-top: 1px dashed #999;
            margin: 30px auto 4px auto;
        }
        .barcode-text {
            font-family: monospace;
            font-size: 14px;
            font-weight: bold;
            letter-spacing: 4px;
            color: #333;
            text-align: center;
            margin-top: 8px;
        }
    </style>
</head>
<body>

    <!-- Header -->
    <table class="header-table" cellpadding="0" cellspacing="0">
        <tr>
            <td style="width: 60%; vertical-align: top;">
                <div class="logo-text">RUDHRA JEWELLERS</div>
                <div class="tagline">Heritage Gold, Diamond & Fine Jewellery Crafts</div>
                <div class="store-info">
                    Plot No 14, Usman Road, T. Nagar, Chennai - 600017<br>
                    GSTIN: 33AAAAA0000A1Z5 | Phone: +91 98765 43210
                </div>
            </td>
            <td class="doc-title" style="width: 40%; vertical-align: top;">
                <h1>WORK ORDER</h1>
                <div class="order-badge">{{ $order->work_order_number }}</div>
                <div style="font-size: 9px; color: #777; margin-top: 4px;">
                    Issued Date: <strong>{{ $order->allotted_date ? (is_string($order->allotted_date) ? $order->allotted_date : $order->allotted_date->format('d M, Y')) : date('d M, Y') }}</strong>
                </div>
            </td>
        </tr>
    </table>

    <!-- Meta Details Table (Created Date, Delivery Date, Priority, Customer, Artisan) -->
    <table class="meta-table" cellpadding="0" cellspacing="0">
        <tr>
            <td style="width: 20%;">
                <div class="meta-label">Created / Issued Date</div>
                <div class="meta-val">{{ $order->allotted_date ? (is_string($order->allotted_date) ? $order->allotted_date : $order->allotted_date->format('d M, Y')) : date('d M, Y') }}</div>
            </td>
            <td style="width: 20%;">
                <div class="meta-label">Delivery Due Date</div>
                <div class="meta-val" style="color: #b01622;">{{ $order->delivery_date ? (is_string($order->delivery_date) ? $order->delivery_date : $order->delivery_date->format('d M, Y')) : 'Prompt' }}</div>
            </td>
            <td style="width: 15%;">
                <div class="meta-label">Order Priority</div>
                <div class="meta-val" style="color: {{ ($order->priority === 'HIGH' || $order->priority === 'High') ? '#b01622' : '#d97706' }};">{{ strtoupper($order->priority ?? 'MEDIUM') }}</div>
            </td>
            <td style="width: 22%;">
                <div class="meta-label">Customer / Client Name</div>
                <div class="meta-val">{{ $order->customer_name ?? ($order->client?->full_name ?? 'Internal Showroom') }}</div>
            </td>
            <td style="width: 23%;">
                <div class="meta-label">Assigned Artisan / Karigar</div>
                <div class="meta-val">{{ $order->karigar_name ?? ($order->karigar?->name ?? 'Unassigned') }}</div>
            </td>
        </tr>
    </table>

    @php
        $pricing = is_array($order->pricing_details) ? $order->pricing_details : json_decode($order->pricing_details ?? '{}', true);
        $items = !empty($pricing['items']) && is_array($pricing['items'])
            ? $pricing['items']
            : (is_array($order->items) && count($order->items) > 0 ? $order->items : []);
        
        if (count($items) === 0) {
            $items = [[
                'form_no' => 'FRM-' . date('Y') . '-0001-01',
                'design_number' => $order->design_code ?? 'DG-4587',
                'gold_purity' => $order->material_type ?? '22K (916)',
                'setting_type' => 'Prong',
                'diamond_weight' => '0.500',
                'diamond_wt_from' => '0.100',
                'diamond_wt_to' => '0.500',
                'gold_weight' => number_format($order->allotted_weight ?? 10.000, 3),
                'gold_wt_from' => '8.000',
                'gold_wt_to' => '10.000',
                'need_pcs' => 1,
                'no_of_colour_stones' => 0,
                'total_gross_wt' => number_format($order->allotted_weight ?? 10.000, 3),
                'total_dia_cts' => '0.500',
                'remark' => $order->notes ?? '-',
            ]];
        }

        $totGold = 0;
        $totPcs = 0;
        $totDiaPcs = 0;
        $totStones = 0;
        $totGross = 0;
        $totDiaCts = 0;
    @endphp

    <!-- Items Specification Table -->
    <div class="section-title">Work Order Row Specifications</div>
    <table class="data-table" cellpadding="0" cellspacing="0" style="font-size: 7.5px; border: 1px solid #d8c8b0; width: 100%;">
        <thead>
            <tr style="background-color: #eedfce; color: #881337;">
                <th style="width: 3%; text-align: center; border: 1px solid #d8c8b0; white-space: nowrap;">S.NO</th>
                <th style="width: 9%; border: 1px solid #d8c8b0; white-space: nowrap;">WORK ORDER NO</th>
                <th style="width: 6%; border: 1px solid #d8c8b0; white-space: nowrap;">DESIGN</th>
                <th style="width: 8%; border: 1px solid #d8c8b0; white-space: nowrap;">PRODUCT NAME</th>
                <th style="width: 4%; text-align: center; border: 1px solid #d8c8b0; white-space: nowrap;">IMAGE</th>
                <th style="width: 6%; border: 1px solid #d8c8b0; white-space: nowrap;">GOLD PURITY</th>
                <th style="width: 6%; border: 1px solid #d8c8b0; white-space: nowrap;">SETTING</th>
                <th style="width: 5%; text-align: right; border: 1px solid #d8c8b0; white-space: nowrap;">DIA WT</th>
                <th style="width: 5%; text-align: right; border: 1px solid #d8c8b0; white-space: nowrap;">DIA FROM</th>
                <th style="width: 5%; text-align: right; border: 1px solid #d8c8b0; white-space: nowrap;">DIA TO</th>
                <th style="width: 5%; text-align: right; border: 1px solid #d8c8b0; white-space: nowrap;">GOLD WT</th>
                <th style="width: 5%; text-align: right; border: 1px solid #d8c8b0; white-space: nowrap;">GOLD FROM</th>
                <th style="width: 5%; text-align: right; border: 1px solid #d8c8b0; white-space: nowrap;">GOLD TO</th>
                <th style="width: 4%; text-align: center; border: 1px solid #d8c8b0; white-space: nowrap;">PCS</th>
                <th style="width: 5%; text-align: center; border: 1px solid #d8c8b0; white-space: nowrap;">DIA PCS</th>
                <th style="width: 5%; text-align: center; border: 1px solid #d8c8b0; white-space: nowrap;">STONES</th>
                <th style="width: 6%; text-align: right; border: 1px solid #d8c8b0; white-space: nowrap;">GROSS WT</th>
                <th style="width: 6%; text-align: right; border: 1px solid #d8c8b0; white-space: nowrap;">DIA CTS</th>
                <th style="width: 7%; border: 1px solid #d8c8b0; white-space: nowrap;">REMARKS</th>
            </tr>
        </thead>
        <tbody>
            @foreach($items as $idx => $row)
                @php
                    $gw = (float)($row['gold_weight'] ?? $row['total_weight'] ?? 0);
                    $dw = (float)($row['diamond_weight'] ?? 0);
                    $pcs = (int)($row['need_pcs'] ?? $row['qty'] ?? 1);
                    $diaPcs = (int)($row['no_of_diamonds'] ?? 0);
                    $cstones = (int)($row['no_of_colour_stones'] ?? 0);
                    $gross = (float)($row['total_gross_wt'] ?? ($gw * $pcs));
                    $diaCts = (float)($row['total_dia_cts'] ?? ($dw * $pcs));

                    $imgSrc = !empty($row['reference_image']) ? $row['reference_image'] : (!empty($row['image']) ? $row['image'] : null);
                    if ($imgSrc && str_starts_with($imgSrc, '/')) {
                        $imgSrc = public_path($imgSrc);
                    }

                    $totGold += $gw;
                    $totPcs += $pcs;
                    $totDiaPcs += $diaPcs;
                    $totStones += $cstones;
                    $totGross += $gross;
                    $totDiaCts += $diaCts;
                @endphp
                <tr style="background-color: {{ $idx % 2 === 0 ? '#ffffff' : '#fdfbf7' }}; border: 1px solid #e8e8e8;">
                    <td style="text-align: center; font-weight: bold; border: 1px solid #e8e8e8; white-space: nowrap;">{{ $idx + 1 }}</td>
                    <td style="font-family: monospace; font-weight: bold; color: #881337; border: 1px solid #e8e8e8; white-space: nowrap;">{{ $row['work_order_no'] ?? $row['form_no'] ?? $order->work_order_number }}</td>
                    <td style="font-family: monospace; font-weight: bold; border: 1px solid #e8e8e8; white-space: nowrap;">{{ $row['design_number'] ?? 'DG-4587' }}</td>
                    <td style="font-weight: bold; border: 1px solid #e8e8e8; white-space: nowrap;">{{ $row['product_name'] ?? $row['variant'] ?? 'Necklace' }}</td>
                    <td style="text-align: center; vertical-align: middle; border: 1px solid #e8e8e8; padding: 2px; white-space: nowrap;">
                        @if($imgSrc && file_exists($imgSrc))
                            <img src="data:image/jpeg;base64,{{ base64_encode(file_get_contents($imgSrc)) }}" style="max-height: 20px; max-width: 28px; border-radius: 2px; border: 1px solid #ccc;">
                        @elseif($imgSrc && str_starts_with($imgSrc, 'data:image'))
                            <img src="{{ $imgSrc }}" style="max-height: 20px; max-width: 28px; border-radius: 2px; border: 1px solid #ccc;">
                        @else
                            <span style="font-size: 7px; color: #888;">N/A</span>
                        @endif
                    </td>
                    <td style="border: 1px solid #e8e8e8; white-space: nowrap;">{{ $row['gold_purity'] ?? '22K (916)' }}</td>
                    <td style="border: 1px solid #e8e8e8; white-space: nowrap;">{{ $row['setting_type'] ?? 'Prong' }}</td>
                    <td style="text-align: right; font-family: monospace; border: 1px solid #e8e8e8; white-space: nowrap;">{{ number_format($dw, 3) }}</td>
                    <td style="text-align: right; font-family: monospace; color: #666; border: 1px solid #e8e8e8; white-space: nowrap;">{{ number_format((float)($row['diamond_wt_from'] ?? 0.1), 3) }}</td>
                    <td style="text-align: right; font-family: monospace; color: #666; border: 1px solid #e8e8e8; white-space: nowrap;">{{ number_format((float)($row['diamond_wt_to'] ?? 0.5), 3) }}</td>
                    <td style="text-align: right; font-family: monospace; font-weight: bold; border: 1px solid #e8e8e8; white-space: nowrap;">{{ number_format($gw, 3) }}g</td>
                    <td style="text-align: right; font-family: monospace; color: #666; border: 1px solid #e8e8e8; white-space: nowrap;">{{ number_format((float)($row['gold_wt_from'] ?? 8), 3) }}</td>
                    <td style="text-align: right; font-family: monospace; color: #666; border: 1px solid #e8e8e8; white-space: nowrap;">{{ number_format((float)($row['gold_wt_to'] ?? 10), 3) }}</td>
                    <td style="text-align: center; font-weight: bold; border: 1px solid #e8e8e8; white-space: nowrap;">{{ $pcs }}</td>
                    <td style="text-align: center; font-weight: bold; color: #047857; border: 1px solid #e8e8e8; white-space: nowrap;">{{ $diaPcs }}</td>
                    <td style="text-align: center; font-weight: bold; color: #6b21a8; border: 1px solid #e8e8e8; white-space: nowrap;">{{ $cstones }}</td>
                    <td style="text-align: right; font-family: monospace; font-weight: bold; color: #881337; border: 1px solid #e8e8e8; white-space: nowrap;">{{ number_format($gross, 3) }}g</td>
                    <td style="text-align: right; font-family: monospace; font-weight: bold; color: #047857; border: 1px solid #e8e8e8; white-space: nowrap;">{{ number_format($diaCts, 3) }}ct</td>
                    <td style="font-size: 7.5px; color: #555; border: 1px solid #e8e8e8; white-space: nowrap;">{{ $row['remark'] ?? '-' }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot>
            <tr style="background-color: #eedfce; color: #3b3228; font-weight: bold; border-top: 2px solid #881337;">
                <td colSpan="7" style="text-transform: uppercase; border: 1px solid #d8c8b0; padding: 4px; white-space: nowrap;">TOTAL SUMMARY</td>
                <td style="text-align: right; font-family: monospace; border: 1px solid #d8c8b0; white-space: nowrap;">{{ number_format(array_reduce($items, function($a, $r){ return $a + (float)($r['diamond_weight'] ?? 0); }, 0), 3) }}</td>
                <td colSpan="2" style="border: 1px solid #d8c8b0; white-space: nowrap;"></td>
                <td style="text-align: right; font-family: monospace; border: 1px solid #d8c8b0; white-space: nowrap;">{{ number_format($totGold, 3) }}g</td>
                <td colSpan="2" style="border: 1px solid #d8c8b0; white-space: nowrap;"></td>
                <td style="text-align: center; color: #881337; border: 1px solid #d8c8b0; white-space: nowrap;">{{ $totPcs }}</td>
                <td style="text-align: center; color: #047857; border: 1px solid #d8c8b0; white-space: nowrap;">{{ $totDiaPcs }}</td>
                <td style="text-align: center; color: #6b21a8; border: 1px solid #d8c8b0; white-space: nowrap;">{{ $totStones }}</td>
                <td style="text-align: right; font-family: monospace; color: #881337; border: 1px solid #d8c8b0; white-space: nowrap;">{{ number_format($totGross, 3) }}g</td>
                <td style="text-align: right; font-family: monospace; color: #047857; border: 1px solid #d8c8b0; white-space: nowrap;">{{ number_format($totDiaCts, 3) }}ct</td>
                <td style="border: 1px solid #d8c8b0; white-space: nowrap;"></td>
            </tr>
        </tfoot>
    </table>

    <!-- Work Instructions / Notes -->
    <div class="section-title">Artisan Instructions & Specifications</div>
    <div class="notes-box">
        <strong>Notes:</strong> {{ $order->notes ?? 'Adhere strictly to 916 BIS Hallmarking standards. Maintain mirror buff finish, verify clasp security, and ensure stones are set with prongs as per approved CAD master.' }}
    </div>

    <!-- 4 Red Metric Summary Boxes -->
    <table class="summary-grid" cellpadding="4" cellspacing="6">
        <tr>
            <td style="width: 25%;">
                <div class="summary-box">
                    <div class="label">Allotted Material</div>
                    <div class="value">{{ number_format($order->allotted_weight, 3) }} g</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="summary-box">
                    <div class="label">Expected Return</div>
                    <div class="value">{{ number_format($order->expected_return_weight ?: $order->allotted_weight, 3) }} g</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="summary-box">
                    <div class="label">Allowed Wastage</div>
                    <div class="value">{{ number_format($order->wastage_allowed_percent, 1) }}%</div>
                </div>
            </td>
            <td style="width: 25%;">
                <div class="summary-box">
                    <div class="label">Making Charges</div>
                    <div class="value">₹{{ number_format($order->total_making_charges, 2) }}</div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Barcode display -->
    <div style="text-align: center; margin-top: 15px;">
        <div class="barcode-text">||| | ||||| || |||| ||| ||||| ||</div>
        <div style="font-family: monospace; font-size: 10px; color: #555;">{{ $order->work_order_number }}</div>
    </div>

    <!-- Signatures -->
    <table class="signatures-table" cellpadding="0" cellspacing="0">
        <tr>
            <td style="width: 33%;">
                <div class="sig-line"></div>
                <strong>Prepared By</strong><br>
                {{ $order->creator?->name ?? 'Admin Desk' }}
            </td>
            <td style="width: 33%;">
                <div class="sig-line"></div>
                <strong>Quality / Approver</strong><br>
                {{ $order->approver?->name ?? 'Master Studio Head' }}
            </td>
            <td style="width: 33%;">
                <div class="sig-line"></div>
                <strong>Karigar / Aachari</strong><br>
                {{ $order->karigar_name ?? 'Artisan Signature' }}
            </td>
        </tr>
    </table>

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
