<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Work Order - {{ $order->work_order_number }}</title>
    <style>
        @page {
            size: A4 portrait;
            margin: 15mm 15mm 15mm 15mm;
        }
        body {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 11px;
            color: #262626;
            line-height: 1.4;
            margin: 0;
            padding: 0;
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
                <div class="tagline">Heritage Gold, Diamond & Silver Crafts</div>
                <div class="store-info">
                    Plot No 14, Usman Road, T. Nagar, Chennai - 600017<br>
                    GSTIN: 33AAAAA0000A1Z5 | Phone: +91 98765 43210
                </div>
            </td>
            <td class="doc-title" style="width: 40%; vertical-align: top;">
                <h1>WORK ORDER</h1>
                <div class="order-badge">{{ $order->work_order_number }}</div>
                <div style="font-size: 9px; color: #777; margin-top: 3px;">
                    Date: <strong>{{ $order->allotted_date ? $order->allotted_date->format('d M, Y') : date('d M, Y') }}</strong>
                </div>
            </td>
        </tr>
    </table>

    <!-- Meta Details Table -->
    <table class="meta-table" cellpadding="0" cellspacing="0">
        <tr>
            <td style="width: 30%;">
                <div class="meta-label">Artisan / Aachari</div>
                <div class="meta-val">{{ $order->karigar_name ?? ($order->karigar?->name ?? 'Unassigned') }}</div>
                <div style="font-size: 9px; color: #666;">Code: {{ $order->karigar?->karigar_code ?? 'ART-01' }}</div>
            </td>
            <td style="width: 25%;">
                <div class="meta-label">Workshop / Unit</div>
                <div class="meta-val">{{ $order->karigar?->workshop_name ?? 'Master Studio 4' }}</div>
                <div style="font-size: 9px; color: #666;">{{ $order->karigar?->city ?? 'Chennai' }}</div>
            </td>
            <td style="width: 25%;">
                <div class="meta-label">Delivery Due Date</div>
                <div class="meta-val" style="color: #b01622;">{{ $order->delivery_date ? $order->delivery_date->format('d M, Y') : 'Prompt' }}</div>
                <div style="font-size: 9px; color: #666;">Priority: {{ $order->priority ?? 'Normal' }}</div>
            </td>
            <td style="width: 20%;">
                <div class="meta-label">Job Status</div>
                <div class="meta-val" style="text-transform: uppercase;">{{ str_replace('_', ' ', $order->status) }}</div>
                <div style="font-size: 9px; color: #666;">Stage: {{ WorkOrder::STAGES[$order->current_stage] ?? $order->current_stage }}</div>
            </td>
        </tr>
    </table>

    <!-- Item Specifications -->
    <div class="section-title">Item Specifications & Allocated Material</div>
    <table class="data-table" cellpadding="0" cellspacing="0">
        <thead>
            <tr>
                <th style="width: 30%;">Product / Design</th>
                <th style="width: 20%;">Material / Purity</th>
                <th style="width: 15%; text-align: right;">Allotted Weight</th>
                <th style="width: 15%; text-align: right;">Completed Wt</th>
                <th style="width: 20%; text-align: right;">Pending Wt</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    <strong>{{ $order->product_name }}</strong><br>
                    <span style="font-size: 8.5px; color: #777; font-family: monospace;">SKU/Design: {{ $order->design_code ?? 'DES-' . $order->id }}</span>
                </td>
                <td>{{ $order->material_type }}</td>
                <td style="text-align: right; font-family: monospace; font-weight: bold;">
                    {{ number_format($order->allotted_weight, 3) }} g
                </td>
                <td style="text-align: right; font-family: monospace;">
                    {{ number_format($order->completed_weight, 3) }} g
                </td>
                <td style="text-align: right; font-family: monospace; font-weight: bold; color: #b01622;">
                    {{ number_format($order->pending_weight, 3) }} g
                </td>
            </tr>
        </tbody>
    </table>

    <!-- Stone Breakdown -->
    @if (!empty($order->stone_details) && is_array($order->stone_details) && count($order->stone_details) > 0)
    <div class="section-title">Stone Breakdown / Embellishments</div>
    <table class="data-table" cellpadding="0" cellspacing="0">
        <thead>
            <tr>
                <th>Stone Type</th>
                <th style="text-align: center;">Expected Count</th>
                <th style="text-align: center;">Received Count</th>
                <th style="text-align: center;">Difference</th>
                <th>Notes</th>
            </tr>
        </thead>
        <tbody>
            @foreach($order->stone_details as $st)
            <tr>
                <td><strong>{{ $st['type'] ?? 'Stone' }}</strong></td>
                <td style="text-align: center;">{{ $st['expected'] ?? 0 }}</td>
                <td style="text-align: center;">{{ $st['received'] ?? 0 }}</td>
                <td style="text-align: center;">{{ $st['diff'] ?? 0 }}</td>
                <td>{{ $st['notes'] ?? '—' }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>
    @endif

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

</body>
</html>
