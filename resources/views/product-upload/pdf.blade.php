<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Selected Designs</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
        th { background-color: #f2f2f2; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { margin: 0; color: #b01622; }
        .img-preview { max-width: 60px; max-height: 60px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Rudhra Jewellers</h1>
        <h3>Selected Designs List</h3>
        <p>Date: {{ date('d M Y') }}</p>
    </div>

    <table>
        <thead>
            <tr>
                <th>S.NO</th>
                <th>Preview</th>
                <th>Design No</th>
                <th>DIA WT (CT)</th>
                <th>NET WT (G)</th>
            </tr>
        </thead>
        <tbody>
            @foreach($designs as $index => $design)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>
                        @php
                            $images = is_array($design->image_path) ? $design->image_path : [];
                            $firstImage = count($images) > 0 ? public_path('storage/' . $images[0]) : '';
                        @endphp
                        @if($firstImage && file_exists($firstImage))
                            <img src="{{ $firstImage }}" class="img-preview">
                        @else
                            -
                        @endif
                    </td>
                    <td>{{ $design->design_no }}</td>
                    <td>{{ $design->dia_wt_ct ?? '-' }}</td>
                    <td>{{ $design->net_wt ? number_format($design->net_wt, 3) : '-' }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
</body>
</html>
