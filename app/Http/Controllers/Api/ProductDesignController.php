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
        if (ProductDesign::count() === 0 || $request->boolean('sync')) {
            $this->performInventorySync();
        }

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
                return $this->formatSingleImageUrl($path);
            }, $images);
            return $design;
        });

        return response()->json($designs);
    }

    /**
     * Format a single image path safely into a full URL.
     */
    public function formatSingleImageUrl($path)
    {
        if (empty($path)) return null;

        if (str_starts_with($path, 'data:image') || str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        $clean = ltrim($path, '/');
        if (str_starts_with($clean, 'storage/')) {
            $clean = substr($clean, 8);
        }

        if (str_starts_with($clean, 'images/')) {
            return asset($clean);
        }

        return asset('storage/' . $clean);
    }

    /**
     * Get metadata: list of styles, gold types, and diamond ranges.
     */
    public function meta()
    {
        $styles = Style::orderBy('name')->get();

        $goldTypesList = GoldType::orderBy('sort_order')->orderBy('name')->get();
        $goldNames = $goldTypesList->pluck('name')->toArray();

        $goldTypes = array_values(array_unique(array_merge($goldNames, $existingGold)));

        $diamondRanges = DiamondRange::orderBy('min_ct')->get();

        return response()->json([
            'styles' => $styles,
            'gold_types' => $goldTypes,
            'gold_types_list' => $goldTypesList,
            'diamond_ranges' => $diamondRanges,
        ]);
    }

    /**
     * Check if a design number is unique across product_designs and products tables.
     */
    public function checkDesignNo(Request $request)
    {
        $designNo = trim($request->input('design_no', ''));
        $ignoreId = $request->input('ignore_id');

        if (empty($designNo)) {
            return response()->json(['exists' => false, 'available' => true]);
        }

        $queryInDesigns = ProductDesign::where('design_no', $designNo);
        if ($ignoreId) {
            $queryInDesigns->where('id', '!=', $ignoreId);
        }
        $existsInDesigns = $queryInDesigns->exists();
        $existsInProducts = \App\Models\Product::where('product_code', $designNo)->exists();

        $exists = $existsInDesigns || $existsInProducts;
        $location = $existsInDesigns ? 'uploaded designs' : ($existsInProducts ? 'inventory products' : null);

        return response()->json([
            'exists' => $exists,
            'available' => !$exists,
            'location' => $location,
            'message' => $exists ? "Design Number '{$designNo}' already exists in {$location}." : "Design Number '{$designNo}' is available.",
        ]);
    }

    /**
     * Auto-generate a guaranteed unique design number across both product_designs and products tables.
     */
    public function generateDesignNo()
    {
        $prefix = 'DES-';
        $num = 1001;

        while (
            ProductDesign::where('design_no', $prefix . $num)->exists() ||
            \App\Models\Product::where('product_code', $prefix . $num)->exists()
        ) {
            $num++;
        }

        return response()->json([
            'design_no' => $prefix . $num,
        ]);
    }

    /**
     * Store a newly created product design.
     */
    public function store(Request $request)
    {
        $designNo = trim($request->design_no ?? '');

        if (\App\Models\Product::where('product_code', $designNo)->exists()) {
            return response()->json([
                'message' => "The Design Number '{$designNo}' is already used by an inventory product. Design numbers must be unique across all products.",
                'errors' => ['design_no' => ["Design Number '{$designNo}' already exists in inventory products."]]
            ], 422);
        }

        $request->validate([
            'design_no' => 'required|string|unique:product_designs,design_no',
            'net_wt' => 'required|numeric',
            'gold_type' => 'required|string',
            'setting_style' => 'required|string',
            'dia_wt_ct' => 'nullable|string',
            'dia_wt_range' => 'nullable|string',
            'image' => 'nullable',
            'image.*' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ], [
            'design_no.unique' => 'The Design Number ":input" is already taken. Design Numbers must be unique across all products.',
            'design_no.required' => 'Design Number is required.',
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

        $variants = $request->input('variants', []);
        if (is_string($variants)) {
            $variants = json_decode($variants, true) ?: [];
        }

        $design = ProductDesign::create([
            'design_no' => $request->design_no,
            'image_path' => $imagePaths,
            'dia_wt_ct' => $diaWt,
            'net_wt' => $request->net_wt,
            'gold_type' => $request->gold_type ?: null,
            'setting_style' => $settingStyle ?: null,
            'stamp' => $request->stamp ?: null,
            'stone_size' => $request->stone_size ?: null,
            'stone_color' => $request->stone_color ?: null,
            'variants' => $variants,
            'status' => 'Uploaded',
        ]);

        $images = is_array($design->image_path) ? $design->image_path : [];
        $design->image_urls = array_map(fn($path) => $this->formatSingleImageUrl($path), $images);

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
        $design->image_urls = array_map(fn($path) => $this->formatSingleImageUrl($path), $images);

        return response()->json($design);
    }

    /**
     * Update the specified product design.
     */
    public function update(Request $request, $id)
    {
        $design = ProductDesign::findOrFail($id);
        $designNo = trim($request->design_no ?? '');

        if (\App\Models\Product::where('product_code', $designNo)->exists()) {
            return response()->json([
                'message' => "The Design Number '{$designNo}' is already used by an inventory product. Design numbers must be unique across all products.",
                'errors' => ['design_no' => ["Design Number '{$designNo}' already exists in inventory products."]]
            ], 422);
        }

        $request->validate([
            'design_no' => 'required|string|unique:product_designs,design_no,' . $id,
            'net_wt' => 'nullable|numeric',
            'gold_type' => 'nullable|string',
            'setting_style' => 'nullable|string',
            'dia_wt_ct' => 'nullable|string',
            'image' => 'nullable',
            'image.*' => 'nullable|image|mimes:jpeg,png,jpg,webp|max:5120',
        ], [
            'design_no.unique' => 'The Design Number ":input" is already taken. Design Numbers must be unique across all products.',
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

        $variants = $request->input('variants', $design->variants ?? []);
        if (is_string($variants)) {
            $variants = json_decode($variants, true) ?: [];
        }

        $design->update([
            'design_no' => $request->design_no,
            'image_path' => $imagePaths,
            'dia_wt_ct' => $request->dia_wt_ct,
            'net_wt' => $request->net_wt,
            'gold_type' => $request->gold_type ?: null,
            'setting_style' => $settingStyle ?: null,
            'stamp' => $request->input('stamp', $design->stamp),
            'stone_size' => $request->input('stone_size', $design->stone_size),
            'stone_color' => $request->input('stone_color', $design->stone_color),
            'variants' => $variants,
        ]);

        $images = is_array($design->image_path) ? $design->image_path : [];
        $design->image_urls = array_map(fn($path) => $this->formatSingleImageUrl($path), $images);

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

    /**
     * Automatically sync all inventory products to product upload & catalog.
     */
    public function syncInventory(Request $request)
    {
        $count = $this->performInventorySync();
        return response()->json([
            'message' => "Successfully synced {$count} products from Inventory to Catalog!",
            'synced_count' => $count,
        ]);
    }

    public function performInventorySync()
    {
        $syncedCount = 0;
        try {
            if (!\Illuminate\Support\Facades\Schema::hasTable('products')) {
                return 0;
            }

            $inventoryProducts = \App\Models\Product::with(['category', 'subcategory'])->get();

            foreach ($inventoryProducts as $prod) {
                $code = $prod->product_code ?: ('PRD-' . sprintf('%04d', $prod->id));
                $attrs = is_array($prod->attributes) ? $prod->attributes : json_decode($prod->attributes ?? '[]', true);

                $netWt = (float) ($attrs['net_weight'] ?? $prod->opening_stock_weight ?? 1.500);
                $purityRaw = $attrs['purity'] ?? '22K';
                $purity = '22 Carat';
                if (str_contains(strtolower($purityRaw), '18')) $purity = '18 Carat';
                elseif (str_contains(strtolower($purityRaw), '24')) $purity = '24 Carat';
                elseif (str_contains(strtolower($purityRaw), '14')) $purity = '14 Carat';

                $settingStyle = $attrs['setting_style'] ?? ($prod->category ? $prod->category->name : 'Studded');
                $diaWt = (string) ($attrs['diamond_wt'] ?? '0.50');
                $imagePath = [];
                if (!empty($prod->image)) {
                    $imagePath[] = $prod->image;
                }
                if (!empty($prod->thumbnail) && $prod->thumbnail !== $prod->image) {
                    $imagePath[] = $prod->thumbnail;
                }

                $design = ProductDesign::updateOrCreate(
                    ['design_no' => $code],
                    [
                        'net_wt' => $netWt,
                        'gold_type' => $purity,
                        'setting_style' => $settingStyle,
                        'dia_wt_ct' => $diaWt,
                        'image_path' => $imagePath,
                        'status' => 'Uploaded',
                    ]
                );

                $syncedCount++;

                if (!empty($settingStyle)) {
                    Style::firstOrCreate(['name' => $settingStyle]);
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::warning('Inventory sync error: ' . $e->getMessage());
        }

        return $syncedCount;
    }
}
