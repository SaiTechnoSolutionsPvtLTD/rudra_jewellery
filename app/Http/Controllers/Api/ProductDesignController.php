<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProductDesign;
use App\Models\Style;
use App\Models\GoldType;
use App\Models\DiamondRange;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Barryvdh\DomPDF\Facade\Pdf;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Color;

class ProductDesignController extends Controller
{
    /**
     * Display a listing of product designs with filters & pagination.
     */
    public function index(Request $request)
    {
        $query = ProductDesign::query();

        // Filter by IDs (for selection / step 3 & 4)
        if ($request->filled('ids')) {
            $ids = is_array($request->ids) ? $request->ids : explode(',', $request->ids);
            $ids = array_filter(array_map('intval', $ids));
            if (!empty($ids)) {
                $query->whereIn('id', $ids);
            }
        }

        // Search by design number
        if ($request->filled('search')) {
            $query->where('design_no', 'like', '%' . $request->search . '%');
        }

        // Filter by Gold Type
        if ($request->filled('gold_type') && $request->gold_type !== 'all' && $request->gold_type !== '') {
            $query->where('gold_type', $request->gold_type);
        }

        // Filter by Setting Style
        if ($request->filled('setting_style') && $request->setting_style !== 'all' && $request->setting_style !== '') {
            $query->where('setting_style', $request->setting_style);
        }

        // Filter by Net Weight From
        if ($request->filled('net_wt_from') && is_numeric($request->net_wt_from)) {
            $query->where('net_wt', '>=', (float) $request->net_wt_from);
        }

        // Filter by Net Weight To
        if ($request->filled('net_wt_to') && is_numeric($request->net_wt_to)) {
            $query->where('net_wt', '<=', (float) $request->net_wt_to);
        }

        // Filter by Diamond Wt range
        if ($request->filled('dia_wt_range') && $request->dia_wt_range !== 'all' && $request->dia_wt_range !== '') {
            $rangeCode = $request->dia_wt_range;
            $rangeObj = DiamondRange::where('code', $rangeCode)->first();
            if ($rangeObj) {
                if (!is_null($rangeObj->min_ct) && !is_null($rangeObj->max_ct)) {
                    $query->whereBetween('dia_wt_ct', [(float)$rangeObj->min_ct, (float)$rangeObj->max_ct]);
                } elseif (!is_null($rangeObj->min_ct)) {
                    $query->where('dia_wt_ct', '>=', (float)$rangeObj->min_ct);
                } elseif (!is_null($rangeObj->max_ct)) {
                    $query->where('dia_wt_ct', '<=', (float)$rangeObj->max_ct);
                }
            } else {
                switch ($rangeCode) {
                    case 'under_1':
                        $query->where('dia_wt_ct', '<', 1);
                        break;
                    case '1_to_2':
                        $query->whereBetween('dia_wt_ct', [1, 2]);
                        break;
                    case 'above_2':
                        $query->where('dia_wt_ct', '>', 2);
                        break;
                }
            }
        }

        $perPage = (int) $request->input('per_page', 20);
        $designs = $query->latest()->paginate($perPage);

        // Append public image URLs to each item
        $designs->getCollection()->transform(function ($design) {
            $images = is_array($design->image_path) ? $design->image_path : [];
            $design->image_urls = array_map(function ($path) {
                return asset('storage/' . $path);
            }, $images);
            return $design;
        });

        return response()->json($designs);
    }

    /**
     * Get metadata: list of styles, gold types, and diamond ranges.
     */
    public function meta()
    {
        $styles = Style::orderBy('name')->get();

        $goldTypesList = GoldType::orderBy('sort_order')->orderBy('name')->get();
        $goldNames = $goldTypesList->pluck('name')->toArray();

        $existingGold = ProductDesign::whereNotNull('gold_type')
            ->where('gold_type', '!=', '')
            ->distinct()
            ->pluck('gold_type')
            ->toArray();
        $defaultGold = ['18 Carat', '22 Carat', '24 Carat', '14 Carat'];
        $goldTypes = array_values(array_unique(array_merge($goldNames, $defaultGold, $existingGold)));

        $diamondRanges = DiamondRange::orderBy('min_ct')->get();

        return response()->json([
            'styles' => $styles,
            'gold_types' => $goldTypes,
            'gold_types_list' => $goldTypesList,
            'diamond_ranges' => $diamondRanges,
        ]);
    }

    /**
     * Store a newly created product design.
     */
    public function store(Request $request)
    {
        $request->validate([
            'design_no' => 'required|string|unique:product_designs,design_no',
            'net_wt' => 'required|numeric',
            'gold_type' => 'required|string',
            'setting_style' => 'required|string',
            'dia_wt_ct' => 'nullable|string',
            'dia_wt_range' => 'nullable|string',
            'image' => 'nullable',
            'image.*' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $imagePaths = [];
        if ($request->hasFile('image')) {
            $files = is_array($request->file('image')) ? $request->file('image') : [$request->file('image')];
            foreach ($files as $file) {
                $imagePaths[] = $file->store('product_designs', 'public');
            }
        }

        // Auto-create setting style in styles table if not exists
        $settingStyle = trim($request->setting_style ?? '');
        if (!empty($settingStyle)) {
            Style::firstOrCreate(['name' => $settingStyle]);
        }

        $diaWt = $request->dia_wt_ct;
        if (empty($diaWt) && $request->filled('dia_wt_range')) {
            $diaWt = match($request->dia_wt_range) {
                'under_1' => '0.50',
                '1_to_2'  => '1.50',
                'above_2' => '2.50',
                default   => null,
            };
        }

        $design = ProductDesign::create([
            'design_no' => $request->design_no,
            'image_path' => $imagePaths,
            'dia_wt_ct' => $diaWt,
            'net_wt' => $request->net_wt,
            'gold_type' => $request->gold_type ?: null,
            'setting_style' => $settingStyle ?: null,
            'status' => 'Uploaded',
        ]);

        $images = is_array($design->image_path) ? $design->image_path : [];
        $design->image_urls = array_map(fn($path) => asset('storage/' . $path), $images);

        return response()->json([
            'message' => 'Design uploaded successfully!',
            'data' => $design,
        ], 201);
    }

    /**
     * Display the specified product design.
     */
    public function show($id)
    {
        $design = ProductDesign::findOrFail($id);
        $images = is_array($design->image_path) ? $design->image_path : [];
        $design->image_urls = array_map(fn($path) => asset('storage/' . $path), $images);

        return response()->json($design);
    }

    /**
     * Update the specified product design.
     */
    public function update(Request $request, $id)
    {
        $design = ProductDesign::findOrFail($id);

        $request->validate([
            'design_no' => 'required|string|unique:product_designs,design_no,' . $id,
            'net_wt' => 'nullable|numeric',
            'gold_type' => 'nullable|string',
            'setting_style' => 'nullable|string',
            'dia_wt_ct' => 'nullable|string',
            'image' => 'nullable',
            'image.*' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ]);

        $imagePaths = $design->image_path;

        if ($request->hasFile('image')) {
            // Delete old images
            if (is_array($imagePaths)) {
                foreach ($imagePaths as $img) {
                    Storage::disk('public')->delete($img);
                }
            }

            $imagePaths = [];
            $files = is_array($request->file('image')) ? $request->file('image') : [$request->file('image')];
            foreach ($files as $file) {
                $imagePaths[] = $file->store('product_designs', 'public');
            }
        }

        $settingStyle = trim($request->setting_style ?? '');
        if (!empty($settingStyle)) {
            Style::firstOrCreate(['name' => $settingStyle]);
        }

        $design->update([
            'design_no' => $request->design_no,
            'image_path' => $imagePaths,
            'dia_wt_ct' => $request->dia_wt_ct,
            'net_wt' => $request->net_wt,
            'gold_type' => $request->gold_type ?: null,
            'setting_style' => $settingStyle ?: null,
        ]);

        $images = is_array($design->image_path) ? $design->image_path : [];
        $design->image_urls = array_map(fn($path) => asset('storage/' . $path), $images);

        return response()->json([
            'message' => 'Design updated successfully!',
            'data' => $design,
        ]);
    }

    /**
     * Remove the specified product design from storage.
     */
    public function destroy($id)
    {
        $design = ProductDesign::findOrFail($id);

        $images = $design->image_path;
        if (is_array($images)) {
            foreach ($images as $img) {
                Storage::disk('public')->delete($img);
            }
        }

        $design->delete();

        return response()->json([
            'message' => 'Design deleted successfully!',
        ]);
    }

    /**
     * Export designs to PDF.
     */
    public function exportPdf(Request $request)
    {
        $query = ProductDesign::query();

        if ($request->filled('ids')) {
            $ids = is_array($request->ids) ? $request->ids : explode(',', $request->ids);
            $ids = array_filter(array_map('intval', $ids));
            if (!empty($ids)) {
                $query->whereIn('id', $ids);
            }
        } else {
            if ($request->filled('net_wt_from')) $query->where('net_wt', '>=', (float) $request->net_wt_from);
            if ($request->filled('net_wt_to'))   $query->where('net_wt', '<=', (float) $request->net_wt_to);
            if ($request->filled('dia_wt_range')) {
                match($request->dia_wt_range) {
                    'under_1' => $query->where('dia_wt_ct', '<', 1),
                    '1_to_2'  => $query->whereBetween('dia_wt_ct', [1, 2]),
                    'above_2' => $query->where('dia_wt_ct', '>', 2),
                    default   => null,
                };
            }
            if ($request->filled('search')) {
                $query->where('design_no', 'like', '%' . $request->search . '%');
            }
            if ($request->filled('gold_type') && $request->gold_type !== 'all') {
                $query->where('gold_type', $request->gold_type);
            }
            if ($request->filled('setting_style') && $request->setting_style !== 'all') {
                $query->where('setting_style', $request->setting_style);
            }
        }

        $designs = $query->latest()->get();

        $pdf = Pdf::loadView('product-upload.pdf', compact('designs'));
        return $pdf->download('designs.pdf');
    }

    /**
     * Export designs to Excel.
     */
    public function exportExcel(Request $request)
    {
        $query = ProductDesign::query();

        if ($request->filled('ids')) {
            $ids = is_array($request->ids) ? $request->ids : explode(',', $request->ids);
            $ids = array_filter(array_map('intval', $ids));
            if (!empty($ids)) {
                $query->whereIn('id', $ids);
            }
        } else {
            if ($request->filled('net_wt_from')) $query->where('net_wt', '>=', (float) $request->net_wt_from);
            if ($request->filled('net_wt_to'))   $query->where('net_wt', '<=', (float) $request->net_wt_to);
            if ($request->filled('dia_wt_range')) {
                match($request->dia_wt_range) {
                    'under_1' => $query->where('dia_wt_ct', '<', 1),
                    '1_to_2'  => $query->whereBetween('dia_wt_ct', [1, 2]),
                    'above_2' => $query->where('dia_wt_ct', '>', 2),
                    default   => null,
                };
            }
            if ($request->filled('search')) {
                $query->where('design_no', 'like', '%' . $request->search . '%');
            }
            if ($request->filled('gold_type') && $request->gold_type !== 'all') {
                $query->where('gold_type', $request->gold_type);
            }
            if ($request->filled('setting_style') && $request->setting_style !== 'all') {
                $query->where('setting_style', $request->setting_style);
            }
        }

        $designs = $query->latest()->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Designs');

        // Headers
        $sheet->setCellValue('A1', 'S.No');
        $sheet->setCellValue('B1', 'Preview');
        $sheet->setCellValue('C1', 'Design No');
        $sheet->setCellValue('D1', 'DIA WT (CT)');
        $sheet->setCellValue('E1', 'NET WT (G)');

        // Header Styling
        $sheet->getStyle('A1:E1')->getFont()->setBold(true)->setColor(new Color('FFFFFF'));
        $sheet->getStyle('A1:E1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFB01622');
        $sheet->getStyle('A1:E1')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER)->setVertical(Alignment::VERTICAL_CENTER);
        $sheet->getRowDimension(1)->setRowHeight(28);

        $rowNumber = 2;
        foreach ($designs as $index => $design) {
            $sheet->setCellValue('A' . $rowNumber, $index + 1);

            // Add Image if available
            $images = is_array($design->image_path) ? $design->image_path : [];
            $firstImage = count($images) > 0 ? public_path('storage/' . $images[0]) : '';

            if ($firstImage && file_exists($firstImage)) {
                $drawing = new Drawing();
                $drawing->setName($design->design_no);
                $drawing->setDescription('Product Image');
                $drawing->setPath($firstImage);
                $drawing->setCoordinates('B' . $rowNumber);

                $imgInfo = @getimagesize($firstImage);
                $imgW = $imgInfo ? $imgInfo[0] : 1;
                $imgH = $imgInfo ? $imgInfo[1] : 1;
                $maxW = 68;
                $maxH = 52;
                $ratio = min($maxW / max(1, $imgW), $maxH / max(1, $imgH));
                $renderW = max(20, round($imgW * $ratio));
                $renderH = max(20, round($imgH * $ratio));

                $drawing->setWidth($renderW);
                $drawing->setHeight($renderH);

                $cellWidthPx = 135;
                $cellHeightPx = 67;
                $drawing->setOffsetX(max(4, round(($cellWidthPx - $renderW) / 2)));
                $drawing->setOffsetY(max(3, round(($cellHeightPx - $renderH) / 2)));

                $drawing->setWorksheet($sheet);
                $sheet->getRowDimension($rowNumber)->setRowHeight(50);
            } else {
                $sheet->setCellValue('B' . $rowNumber, '-');
                $sheet->getRowDimension($rowNumber)->setRowHeight(28);
            }

            $sheet->setCellValue('C' . $rowNumber, $design->design_no);
            $sheet->setCellValue('D' . $rowNumber, $design->dia_wt_ct ?? '-');
            $sheet->setCellValue('E' . $rowNumber, $design->net_wt ? number_format($design->net_wt, 3) : '-');

            $sheet->getStyle('A' . $rowNumber . ':E' . $rowNumber)->getAlignment()
                ->setHorizontal(Alignment::HORIZONTAL_CENTER)
                ->setVertical(Alignment::VERTICAL_CENTER);

            $rowNumber++;
        }

        $sheet->getColumnDimension('A')->setWidth(10);
        $sheet->getColumnDimension('B')->setWidth(18);
        $sheet->getColumnDimension('C')->setWidth(20);
        $sheet->getColumnDimension('D')->setWidth(18);
        $sheet->getColumnDimension('E')->setWidth(18);

        $fileName = 'designs.xlsx';
        $writer = new Xlsx($spreadsheet);

        return response()->streamDownload(function() use ($writer) {
            $writer->save('php://output');
        }, $fileName, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Cache-Control' => 'max-age=0',
        ]);
    }
}
