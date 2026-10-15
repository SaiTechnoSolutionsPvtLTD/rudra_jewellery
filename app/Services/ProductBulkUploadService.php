<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Category;
use App\Models\Subcategory;
use App\Models\Karat;
use App\Models\Stamp;
use App\Models\Unit;
use App\Models\InventoryMovement;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class ProductBulkUploadService
{
    /**
     * Parse and validate uploaded Excel or CSV file.
     * Returns structured preview data, statistics, errors, and warnings.
     */
    public function preview(UploadedFile $file, ?int $selectedCategoryId = null): array
    {
        $parsed = $this->parseFile($file, $selectedCategoryId);
        return $parsed;
    }

    /**
     * Commit parsed and validated products to the database in a single transaction.
     */
    public function import(UploadedFile $file, ?int $selectedCategoryId = null): array
    {
        $previewData = $this->parseFile($file, $selectedCategoryId);

        if (!$previewData['is_valid']) {
            return [
                'success' => false,
                'message' => 'Cannot import file with validation errors. Please correct the file and retry.',
                'errors' => $previewData['errors'],
                'warnings' => $previewData['warnings'],
            ];
        }

        if (empty($previewData['products'])) {
            return [
                'success' => false,
                'message' => 'No products found to import.',
                'errors' => ['No product rows detected in file.'],
                'warnings' => [],
            ];
        }

        $createdProducts = [];

        DB::beginTransaction();
        try {
            foreach ($previewData['products'] as $pData) {
                $code = $pData['product_code'];

                // Ensure SKU uniqueness in case user retries or existing exists
                if (Product::where('product_code', $code)->exists()) {
                    $code = $code . '-' . rand(10, 99);
                }

                $primaryImage = $pData['image_url'] ?: '/placeholder-jewelry.png';

                $attributes = [
                    'source' => 'inventory',
                    'is_inventory' => true,
                    'design_no' => $pData['design_no'] ?: null,
                    'gross_wt' => (float)$pData['gross_weight'],
                    'net_wt' => (float)$pData['gold_weight'],
                    'gold_weight' => (float)$pData['gold_weight'],
                    'pure_weight' => round((float)$pData['gold_weight'] * ($pData['purity_percent'] / 100), 3),
                    'purity' => $pData['purity'],
                    'karat' => $pData['karat'],
                    'stamp' => $pData['gold_stamp'] ?: ($pData['karat'] === '22K' ? '916' : ($pData['karat'] === '18K' ? '750' : null)),
                    'gold_type' => $pData['purity'],
                    'dia_wt_ct' => (float)$pData['total_diamond_carats'] > 0 ? (float)$pData['total_diamond_carats'] : null,
                    'diamond_count' => (int)$pData['total_diamond_pieces'] > 0 ? (int)$pData['total_diamond_pieces'] : null,
                    'diamond_stamp' => $pData['primary_diamond_stamp'] ?: null,
                    'stone_weight' => (float)$pData['total_stone_weight'] > 0 ? (float)$pData['total_stone_weight'] : null,
                    'stone_count' => (int)$pData['total_stone_pieces'] > 0 ? (int)$pData['total_stone_pieces'] : null,
                    'components' => $pData['components'],
                    'wastage_percent' => $pData['wastage_percent'] ?: '3.50',
                    'making_charge' => $pData['making_charge'] ?: '650',
                    'open_close_type' => 'Close',
                    'thumb_image' => $primaryImage,
                    'images' => [$primaryImage],
                ];

                $product = Product::create([
                    'category_id' => $pData['category_id'],
                    'subcategory_id' => $pData['subcategory_id'],
                    'name' => $pData['product_name'],
                    'product_code' => $code,
                    'design_no' => $pData['design_no'] ?: null,
                    'description' => $pData['description'] ?: null,
                    'attributes' => $attributes,
                    'opening_stock_qty' => (int)$pData['quantity'],
                    'opening_stock_weight' => (float)$pData['gross_weight'],
                    'opening_touch' => (float)$pData['purity_percent'],
                    'opening_fine_weight' => round((float)$pData['gold_weight'] * ($pData['purity_percent'] / 100), 3),
                    'current_stock_qty' => (int)$pData['quantity'],
                    'image' => $primaryImage,
                    'thumbnail' => $primaryImage,
                    'status' => 'active',
                ]);

                // Create Inventory Movement once per product (not once per component)
                InventoryMovement::create([
                    'product_id' => $product->id,
                    'movement_type' => 'purchase',
                    'quantity' => (int)$pData['quantity'],
                    'weight' => (float)$pData['gross_weight'],
                    'unit_cost' => (float)($pData['making_charge'] ?: 0),
                    'notes' => "Multi-component bulk upload ({$product->product_code}) with " . count($pData['components']) . " components",
                    'created_by' => auth()->id() ?? null,
                ]);

                $createdProducts[] = $product;
            }

            DB::commit();

            return [
                'success' => true,
                'message' => count($createdProducts) . ' jewellery products with all components successfully imported into Inventory!',
                'count' => count($createdProducts),
                'total_components' => $previewData['stats']['total_components'],
                'products' => $createdProducts,
            ];
        } catch (\Exception $e) {
            DB::rollBack();
            return [
                'success' => false,
                'message' => 'Bulk import failed: ' . $e->getMessage(),
                'errors' => [$e->getMessage()],
                'warnings' => [],
            ];
        }
    }

    /**
     * Parse Excel or CSV file into unified normalized product and component structures.
     */
    protected function parseFile(UploadedFile $file, ?int $selectedCategoryId = null): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $isExcel = in_array($extension, ['xlsx', 'xls']);

        // Load masters cache
        $masters = $this->loadMasters();

        if ($isExcel) {
            return $this->parseExcelWorkbook($file, $masters, $selectedCategoryId);
        }

        return $this->parseCsvFile($file, $masters, $selectedCategoryId);
    }

    /**
     * Preload active categories, subcategories, karats, stamps, and units.
     */
    protected function loadMasters(): array
    {
        $categories = Category::all();
        $subcategories = Subcategory::all();
        $karats = Karat::all();
        $stamps = Stamp::all();
        $units = Unit::all();

        return [
            'categories' => $categories,
            'categories_by_id' => $categories->keyBy('id'),
            'categories_by_name' => $categories->keyBy(fn($c) => strtolower(trim($c->name))),
            'categories_by_code' => $categories->keyBy(fn($c) => strtolower(trim($c->code))),

            'subcategories' => $subcategories,
            'subcategories_by_id' => $subcategories->keyBy('id'),
            'subcategories_by_name' => $subcategories->keyBy(fn($s) => strtolower(trim($s->name))),
            'subcategories_by_code' => $subcategories->keyBy(fn($s) => strtolower(trim($s->code))),

            'karats' => $karats,
            'stamps' => $stamps,
            'units' => $units,
        ];
    }

    /**
     * Parse multi-sheet or single-sheet Excel workbook using PhpSpreadsheet.
     */
    protected function parseExcelWorkbook(UploadedFile $file, array $masters, ?int $selectedCategoryId): array
    {
        $spreadsheet = IOFactory::load($file->getRealPath());
        $sheetNames = $spreadsheet->getSheetNames();

        $productsSheet = null;
        $componentsSheet = null;

        foreach ($sheetNames as $name) {
            $normalizedName = strtolower(trim($name));
            if (str_contains($normalizedName, 'product')) {
                $productsSheet = $spreadsheet->getSheetByName($name);
            } elseif (str_contains($normalizedName, 'component')) {
                $componentsSheet = $spreadsheet->getSheetByName($name);
            }
        }

        // If not named explicitly by "product" and "component", fallback to sheet index 0 and 1
        if (!$productsSheet && count($sheetNames) >= 1) {
            $productsSheet = $spreadsheet->getSheet(0);
            if (count($sheetNames) >= 2) {
                $componentsSheet = $spreadsheet->getSheet(1);
            }
        }

        $rawProducts = $productsSheet ? $this->sheetToAssocArray($productsSheet) : [];
        $rawComponents = $componentsSheet ? $this->sheetToAssocArray($componentsSheet) : [];

        // If only 1 sheet exists, check if it's formatted as unified CSV format
        if (empty($rawComponents) && !empty($rawProducts)) {
            return $this->processUnifiedRows($rawProducts, $masters, $selectedCategoryId, 'Sheet 1');
        }

        return $this->processTwoSheetRows($rawProducts, $rawComponents, $masters, $selectedCategoryId);
    }

    /**
     * Convert PhpSpreadsheet Worksheet to associative array using row 1 as normalized keys.
     */
    protected function sheetToAssocArray($worksheet): array
    {
        $rows = [];
        $highestRow = $worksheet->getHighestRow();
        $highestColumn = $worksheet->getHighestColumn();

        if ($highestRow < 2) {
            return [];
        }

        $headerRow = $worksheet->rangeToArray('A1:' . $highestColumn . '1', null, true, true, true)[1] ?? [];
        $headers = [];
        foreach ($headerRow as $colLetter => $val) {
            $clean = strtolower(trim(preg_replace('/[^a-zA-Z0-9_]/', '', str_replace([' ', '-'], '_', (string)$val))));
            if (!empty($clean)) {
                $headers[$colLetter] = $clean;
            }
        }

        if (empty($headers)) {
            return [];
        }

        for ($row = 2; $row <= $highestRow; $row++) {
            $rowData = $worksheet->rangeToArray('A' . $row . ':' . $highestColumn . $row, null, true, true, true)[$row] ?? [];
            if (empty(array_filter($rowData, fn($v) => !is_null($v) && trim((string)$v) !== ''))) {
                continue; // Skip empty line
            }

            $assoc = ['_row_number' => $row];
            foreach ($headers as $colLetter => $key) {
                $assoc[$key] = isset($rowData[$colLetter]) ? trim((string)$rowData[$colLetter]) : '';
            }
            $rows[] = $assoc;
        }

        return $rows;
    }

    /**
     * Parse CSV file with automatic multi-component group detection.
     */
    protected function parseCsvFile(UploadedFile $file, array $masters, ?int $selectedCategoryId): array
    {
        $handle = fopen($file->getRealPath(), 'r');
        if ($handle === false) {
            return [
                'is_valid' => false,
                'errors' => [['sheet' => 'CSV', 'row' => 1, 'field' => 'file', 'reason' => 'Unable to read uploaded CSV file']],
                'warnings' => [],
                'products' => [],
                'stats' => $this->emptyStats(),
            ];
        }

        // Strip UTF-8 BOM if present
        $bom = fread($handle, 3);
        if ($bom !== "\xEF\xBB\xBF") {
            rewind($handle);
        }

        $header = fgetcsv($handle);
        if (!$header) {
            fclose($handle);
            return [
                'is_valid' => false,
                'errors' => [['sheet' => 'CSV', 'row' => 1, 'field' => 'header', 'reason' => 'The uploaded file is empty']],
                'warnings' => [],
                'products' => [],
                'stats' => $this->emptyStats(),
            ];
        }

        $cleanHeader = array_map(function ($col) {
            return strtolower(trim(preg_replace('/[^a-zA-Z0-9_]/', '', str_replace([' ', '-'], '_', $col))));
        }, $header);

        $rows = [];
        $rowNum = 1;
        while (($row = fgetcsv($handle)) !== false) {
            $rowNum++;
            if (empty(array_filter($row, fn($v) => !is_null($v) && trim((string)$v) !== ''))) {
                continue;
            }

            $rowData = ['_row_number' => $rowNum];
            foreach ($cleanHeader as $idx => $key) {
                if (!empty($key)) {
                    $rowData[$key] = isset($row[$idx]) ? trim((string)$row[$idx]) : '';
                }
            }
            $rows[] = $rowData;
        }

        fclose($handle);

        return $this->processUnifiedRows($rows, $masters, $selectedCategoryId, 'CSV');
    }

    /**
     * Process Two-Sheet Excel Structure (Products sheet + Components sheet).
     */
    protected function processTwoSheetRows(array $rawProducts, array $rawComponents, array $masters, ?int $selectedCategoryId): array
    {
        $errors = [];
        $warnings = [];

        if (empty($rawProducts)) {
            $errors[] = ['sheet' => 'Products', 'row' => 1, 'field' => 'rows', 'reason' => 'No products found in Products sheet.'];
            return [
                'is_valid' => false,
                'errors' => $errors,
                'warnings' => $warnings,
                'products' => [],
                'stats' => $this->emptyStats(),
            ];
        }

        // Group components by normalized product_code
        $componentsByProduct = [];
        $seenComponentProductCodes = [];

        foreach ($rawComponents as $cRow) {
            $rNum = $cRow['_row_number'] ?? 0;
            $pCode = $this->extractKey($cRow, ['product_code', 'sku', 'code']);

            if (empty($pCode)) {
                $errors[] = [
                    'sheet' => 'Components',
                    'row' => $rNum,
                    'field' => 'product_code',
                    'reason' => 'Missing product_code link in components sheet row.'
                ];
                continue;
            }

            $normPCode = strtoupper($pCode);
            $componentsByProduct[$normPCode][] = $cRow;
            $seenComponentProductCodes[$normPCode] = true;
        }

        // Process Products
        $products = [];
        $seenProductCodes = [];

        foreach ($rawProducts as $pRow) {
            $rNum = $pRow['_row_number'] ?? 0;
            $pCode = $this->extractKey($pRow, ['product_code', 'sku', 'code']);
            $pName = $this->extractKey($pRow, ['product_name', 'name', 'item_name']);

            if (empty($pCode)) {
                $errors[] = [
                    'sheet' => 'Products',
                    'row' => $rNum,
                    'field' => 'product_code',
                    'reason' => 'Missing required Product Code / SKU.'
                ];
                continue;
            }

            $normPCode = strtoupper($pCode);
            if (isset($seenProductCodes[$normPCode])) {
                $errors[] = [
                    'sheet' => 'Products',
                    'row' => $rNum,
                    'field' => 'product_code',
                    'reason' => "Duplicate Product Code '{$pCode}' detected in Products sheet (Row {$seenProductCodes[$normPCode]} and Row {$rNum})."
                ];
                continue;
            }
            $seenProductCodes[$normPCode] = $rNum;

            if (empty($pName)) {
                $errors[] = [
                    'sheet' => 'Products',
                    'row' => $rNum,
                    'field' => 'product_name',
                    'reason' => "Missing required Product Name for '{$pCode}'."
                ];
            }

            // Check if product code already exists in database
            if (Product::where('product_code', $pCode)->exists()) {
                $warnings[] = [
                    'sheet' => 'Products',
                    'row' => $rNum,
                    'field' => 'product_code',
                    'reason' => "Product Code '{$pCode}' already exists in inventory. If imported, a unique suffix will be appended to prevent overwriting existing stock."
                ];
            }

            // Category & Subcategory Resolution
            $catRes = $this->resolveCategoryAndSubcategory($pRow, $masters, $selectedCategoryId, 'Products', $rNum, $pCode);
            if (!empty($catRes['errors'])) {
                foreach ($catRes['errors'] as $e) {
                    $errors[] = $e;
                }
            }

            // Gold and weight parameters
            $goldWt = (float)$this->extractKey($pRow, ['gold_weight', 'net_weight', 'net_wt', 'weight'], 0);
            $grossWtRaw = $this->extractKey($pRow, ['gross_weight', 'gross_wt']);
            $qty = max(1, (int)$this->extractKey($pRow, ['quantity', 'qty', 'stock_qty'], 1));
            $karat = $this->extractKey($pRow, ['karat', 'gold_type', 'purity'], '22K');
            $purityPercent = $this->resolvePurityPercent($karat, $this->extractKey($pRow, ['purity', 'touch']));
            $goldStamp = $this->extractKey($pRow, ['gold_stamp', 'stamp']);
            $designNo = $this->extractKey($pRow, ['design_no', 'design_number', 'design']);
            $description = $this->extractKey($pRow, ['description', 'notes', 'remarks']);
            $makingCharge = $this->extractKey($pRow, ['making_charge', 'mc'], '650');
            $wastage = $this->extractKey($pRow, ['wastage_percent', 'wastage'], '3.50');
            $imageUrl = $this->extractKey($pRow, ['image_url', 'image', 'images', 'photo', 'picture', 'thumb_image', 'thumbnail']);

            // Parse attached components
            $rawComps = $componentsByProduct[$normPCode] ?? [];
            unset($seenComponentProductCodes[$normPCode]);

            $parsedComponents = [];
            $totalDiaCts = 0.0;
            $totalDiaPcs = 0;
            $primaryDiaStamp = '';
            $totalStoneWt = 0.0;
            $totalStonePcs = 0;
            $totalStoneUnitsInGrams = 0.0;

            foreach ($rawComps as $cIndex => $cRow) {
                $cRowNumber = $cRow['_row_number'] ?? 0;
                $compParsed = $this->validateAndParseComponent($cRow, 'Components', $cRowNumber, $pCode, $cIndex + 1, $masters);

                if (!empty($compParsed['errors'])) {
                    foreach ($compParsed['errors'] as $ce) {
                        $errors[] = $ce;
                    }
                }

                if ($compParsed['component']) {
                    $c = $compParsed['component'];
                    $parsedComponents[] = $c;

                    if ($c['is_diamond']) {
                        $totalDiaCts += (float)$c['stone_weight'];
                        $totalDiaPcs += (int)$c['no_of_pieces'];
                        if (empty($primaryDiaStamp) && !empty($c['stamp'])) {
                            $primaryDiaStamp = $c['stamp'];
                        }
                    } elseif ($c['is_stone']) {
                        $totalStoneWt += (float)$c['stone_weight'];
                        $totalStonePcs += (int)$c['no_of_pieces'];
                    }

                    // Weight conversion for gross weight calculation
                    $unit = strtolower($c['unit'] ?? 'g');
                    if ($unit === 'ct' || $unit === 'carats' || $unit === 'carat') {
                        $totalStoneUnitsInGrams += ((float)$c['stone_weight'] * 0.20);
                    } else {
                        $totalStoneUnitsInGrams += (float)$c['stone_weight'];
                    }
                }
            }

            // Total gross weight calculation
            $calculatedGrossWt = round($goldWt + $totalStoneUnitsInGrams, 3);
            $finalGrossWt = !empty($grossWtRaw) && is_numeric($grossWtRaw) && (float)$grossWtRaw > 0
                ? round((float)$grossWtRaw, 3)
                : $calculatedGrossWt;

            if ($finalGrossWt <= 0 && $goldWt <= 0 && empty($parsedComponents)) {
                $errors[] = [
                    'sheet' => 'Products',
                    'row' => $rNum,
                    'field' => 'gold_weight',
                    'reason' => "Product '{$pCode}' must have either positive gold_weight or at least one weighted component."
                ];
            }

            $products[] = [
                'sheet' => 'Products',
                'row_number' => $rNum,
                'product_code' => $pCode,
                'product_name' => $pName,
                'category_id' => $catRes['category_id'] ?? null,
                'category_name' => $catRes['category_name'] ?? '',
                'subcategory_id' => $catRes['subcategory_id'] ?? null,
                'subcategory_name' => $catRes['subcategory_name'] ?? '',
                'gold_weight' => round($goldWt, 3),
                'gross_weight' => $finalGrossWt,
                'karat' => $karat,
                'purity' => $purityPercent . '%',
                'purity_percent' => $purityPercent,
                'gold_stamp' => $goldStamp,
                'quantity' => $qty,
                'design_no' => $designNo,
                'description' => $description,
                'making_charge' => $makingCharge,
                'wastage_percent' => $wastage,
                'image_url' => $imageUrl,
                'components' => $parsedComponents,
                'components_count' => count($parsedComponents),
                'total_diamond_carats' => round($totalDiaCts, 3),
                'total_diamond_pieces' => $totalDiaPcs,
                'primary_diamond_stamp' => $primaryDiaStamp,
                'total_stone_weight' => round($totalStoneWt, 3),
                'total_stone_pieces' => $totalStonePcs,
            ];
        }

        // Check for orphan components (components pointing to product_code not in Products sheet)
        foreach (array_keys($seenComponentProductCodes) as $orphanPCode) {
            $orphanRows = $componentsByProduct[$orphanPCode] ?? [];
            foreach ($orphanRows as $oRow) {
                $errors[] = [
                    'sheet' => 'Components',
                    'row' => $oRow['_row_number'] ?? 0,
                    'field' => 'product_code',
                    'reason' => "Orphan component row: Product Code '{$orphanPCode}' does not exist in the Products sheet."
                ];
            }
        }

        $stats = $this->calculateStats($products);

        return [
            'is_valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings,
            'products' => $products,
            'stats' => $stats,
        ];
    }

    /**
     * Process Unified Structure (CSV or single-sheet Excel) where rows sharing product_code belong to one product.
     */
    protected function processUnifiedRows(array $rawRows, array $masters, ?int $selectedCategoryId, string $sheetName = 'CSV'): array
    {
        $errors = [];
        $warnings = [];

        if (empty($rawRows)) {
            $errors[] = ['sheet' => $sheetName, 'row' => 1, 'field' => 'rows', 'reason' => 'No product rows detected in file.'];
            return [
                'is_valid' => false,
                'errors' => $errors,
                'warnings' => $warnings,
                'products' => [],
                'stats' => $this->emptyStats(),
            ];
        }

        // Group rows by product_code
        $groupedRows = [];
        $rowToGroup = [];

        foreach ($rawRows as $idx => $row) {
            $rNum = $row['_row_number'] ?? ($idx + 2);
            $pCode = $this->extractKey($row, ['product_code', 'sku', 'code', 'group_id']);

            if (empty($pCode)) {
                // If code is missing on first row, report error
                $errors[] = [
                    'sheet' => $sheetName,
                    'row' => $rNum,
                    'field' => 'product_code',
                    'reason' => 'Missing Product Code / SKU in row.'
                ];
                continue;
            }

            $normPCode = strtoupper($pCode);
            $groupedRows[$normPCode][] = $row;
        }

        $products = [];

        foreach ($groupedRows as $normPCode => $rows) {
            $headRow = $rows[0];
            $rNum = $headRow['_row_number'] ?? 2;
            $pCode = $this->extractKey($headRow, ['product_code', 'sku', 'code', 'group_id']);
            $pName = $this->extractKey($headRow, ['product_name', 'name', 'item_name']);

            if (empty($pName)) {
                $errors[] = [
                    'sheet' => $sheetName,
                    'row' => $rNum,
                    'field' => 'product_name',
                    'reason' => "Missing required Product Name for '{$pCode}'."
                ];
            }

            if (Product::where('product_code', $pCode)->exists()) {
                $warnings[] = [
                    'sheet' => $sheetName,
                    'row' => $rNum,
                    'field' => 'product_code',
                    'reason' => "Product Code '{$pCode}' already exists in inventory. If imported, a unique suffix will be appended."
                ];
            }

            // Category & Subcategory resolution
            $catRes = $this->resolveCategoryAndSubcategory($headRow, $masters, $selectedCategoryId, $sheetName, $rNum, $pCode);
            if (!empty($catRes['errors'])) {
                foreach ($catRes['errors'] as $e) {
                    $errors[] = $e;
                }
            }

            $goldWt = (float)$this->extractKey($headRow, ['gold_weight', 'net_weight', 'net_wt', 'weight'], 0);
            $grossWtRaw = $this->extractKey($headRow, ['gross_weight', 'gross_wt']);
            $qty = max(1, (int)$this->extractKey($headRow, ['quantity', 'qty', 'stock_qty'], 1));
            $karat = $this->extractKey($headRow, ['karat', 'gold_type', 'purity'], '22K');
            $purityPercent = $this->resolvePurityPercent($karat, $this->extractKey($headRow, ['purity', 'touch']));
            $goldStamp = $this->extractKey($headRow, ['gold_stamp', 'stamp']);
            $designNo = $this->extractKey($headRow, ['design_no', 'design_number', 'design']);
            $description = $this->extractKey($headRow, ['description', 'notes', 'remarks']);
            $makingCharge = $this->extractKey($headRow, ['making_charge', 'mc'], '650');
            $wastage = $this->extractKey($headRow, ['wastage_percent', 'wastage'], '3.50');
            $imageUrl = $this->extractKey($headRow, ['image_url', 'image', 'images', 'photo', 'picture', 'thumb_image', 'thumbnail']);

            // Parse components across all grouped rows
            $parsedComponents = [];
            $totalDiaCts = 0.0;
            $totalDiaPcs = 0;
            $primaryDiaStamp = '';
            $totalStoneWt = 0.0;
            $totalStonePcs = 0;
            $totalStoneUnitsInGrams = 0.0;

            foreach ($rows as $cIdx => $cRow) {
                $cRowNumber = $cRow['_row_number'] ?? ($rNum + $cIdx);

                // Check if this row has component data
                $compType = $this->extractKey($cRow, ['component_type', 'stone_type', 'type']);
                $cWeight = $this->extractKey($cRow, ['component_weight', 'stone_weight', 'weight', 'dia_wt_ct']);
                $cPcs = $this->extractKey($cRow, ['pieces_count', 'pieces', 'count', 'no_of_pieces']);

                // If first row has no component fields and is single row, check for legacy dia_wt_ct
                if ($cIdx === 0 && empty($compType) && empty($cWeight) && empty($cPcs)) {
                    $legacyDia = (float)$this->extractKey($cRow, ['dia_wt_ct', 'diamond_weight'], 0);
                    if ($legacyDia > 0) {
                        $cRow['component_type'] = 'Diamond';
                        $cRow['weight'] = $legacyDia;
                        $cRow['unit'] = 'ct';
                        $cRow['pieces_count'] = 1;
                        $cRow['stamp'] = $this->extractKey($cRow, ['diamond_stamp', 'stamp'], 'VVS');
                        $compType = 'Diamond';
                    } else {
                        continue; // No component on product header row
                    }
                }

                // If this row has component information
                if (!empty($compType) || (!empty($cWeight) && (float)$cWeight > 0) || (!empty($cPcs) && (int)$cPcs > 0)) {
                    $compParsed = $this->validateAndParseComponent($cRow, $sheetName, $cRowNumber, $pCode, count($parsedComponents) + 1, $masters);

                    if (!empty($compParsed['errors'])) {
                        foreach ($compParsed['errors'] as $ce) {
                            $errors[] = $ce;
                        }
                    }

                    if ($compParsed['component']) {
                        $c = $compParsed['component'];
                        $parsedComponents[] = $c;

                        if ($c['is_diamond']) {
                            $totalDiaCts += (float)$c['stone_weight'];
                            $totalDiaPcs += (int)$c['no_of_pieces'];
                            if (empty($primaryDiaStamp) && !empty($c['stamp'])) {
                                $primaryDiaStamp = $c['stamp'];
                            }
                        } elseif ($c['is_stone']) {
                            $totalStoneWt += (float)$c['stone_weight'];
                            $totalStonePcs += (int)$c['no_of_pieces'];
                        }

                        $unit = strtolower($c['unit'] ?? 'g');
                        if ($unit === 'ct' || $unit === 'carats' || $unit === 'carat') {
                            $totalStoneUnitsInGrams += ((float)$c['stone_weight'] * 0.20);
                        } else {
                            $totalStoneUnitsInGrams += (float)$c['stone_weight'];
                        }
                    }
                }
            }

            $calculatedGrossWt = round($goldWt + $totalStoneUnitsInGrams, 3);
            $finalGrossWt = !empty($grossWtRaw) && is_numeric($grossWtRaw) && (float)$grossWtRaw > 0
                ? round((float)$grossWtRaw, 3)
                : $calculatedGrossWt;

            if ($finalGrossWt <= 0 && $goldWt <= 0 && empty($parsedComponents)) {
                $errors[] = [
                    'sheet' => $sheetName,
                    'row' => $rNum,
                    'field' => 'gold_weight',
                    'reason' => "Product '{$pCode}' must have either positive gold_weight or at least one weighted component."
                ];
            }

            $products[] = [
                'sheet' => $sheetName,
                'row_number' => $rNum,
                'product_code' => $pCode,
                'product_name' => $pName,
                'category_id' => $catRes['category_id'] ?? null,
                'category_name' => $catRes['category_name'] ?? '',
                'subcategory_id' => $catRes['subcategory_id'] ?? null,
                'subcategory_name' => $catRes['subcategory_name'] ?? '',
                'gold_weight' => round($goldWt, 3),
                'gross_weight' => $finalGrossWt,
                'karat' => $karat,
                'purity' => $purityPercent . '%',
                'purity_percent' => $purityPercent,
                'gold_stamp' => $goldStamp,
                'quantity' => $qty,
                'design_no' => $designNo,
                'description' => $description,
                'making_charge' => $makingCharge,
                'wastage_percent' => $wastage,
                'image_url' => $imageUrl,
                'components' => $parsedComponents,
                'components_count' => count($parsedComponents),
                'total_diamond_carats' => round($totalDiaCts, 3),
                'total_diamond_pieces' => $totalDiaPcs,
                'primary_diamond_stamp' => $primaryDiaStamp,
                'total_stone_weight' => round($totalStoneWt, 3),
                'total_stone_pieces' => $totalStonePcs,
            ];
        }

        $stats = $this->calculateStats($products);

        return [
            'is_valid' => empty($errors),
            'errors' => $errors,
            'warnings' => $warnings,
            'products' => $products,
            'stats' => $stats,
        ];
    }

    /**
     * Validate and parse a component row.
     */
    protected function validateAndParseComponent(array $cRow, string $sheet, int $rNum, string $pCode, int $compSeq, array $masters): array
    {
        $errors = [];

        $rawType = $this->extractKey($cRow, ['component_type', 'type', 'category']);
        $rawStone = $this->extractKey($cRow, ['stone_type', 'item_name', 'name', 'stone']);
        $rawStamp = $this->extractKey($cRow, ['stamp', 'sieve', 'sieve_size', 'clarity', 'grade']);
        $rawSize = $this->extractKey($cRow, ['size_grade', 'size', 'grade', 'pointers']);
        $rawPcs = $this->extractKey($cRow, ['pieces_count', 'pieces', 'count', 'no_of_pieces', 'qty']);
        $rawWeight = $this->extractKey($cRow, ['weight', 'stone_weight', 'carats', 'gross_wt', 'dia_wt_ct']);
        $rawUnit = $this->extractKey($cRow, ['unit', 'uom']);

        if (empty($rawType) && !empty($rawStone)) {
            $rawType = $rawStone;
        }

        if (empty($rawType)) {
            $errors[] = [
                'sheet' => $sheet,
                'row' => $rNum,
                'field' => 'component_type',
                'reason' => "Missing component_type for Product '{$pCode}' component #{$compSeq}."
            ];
        }

        $typeLower = strtolower($rawType ?? '');
        $isDiamond = str_contains($typeLower, 'diamond') || str_contains($typeLower, 'solitaire') || str_contains($typeLower, 'dia');
        $isStone = str_contains($typeLower, 'stone') || str_contains($typeLower, 'ruby') || str_contains($typeLower, 'emerald') || str_contains($typeLower, 'sapphire') || str_contains($typeLower, 'gem');
        $isPearl = str_contains($typeLower, 'pearl');
        $isMetal = str_contains($typeLower, 'metal') || str_contains($typeLower, 'gold') || str_contains($typeLower, 'silver');

        // For stones & diamonds, if stamp is empty but size is provided (e.g. +7 or 7), use it as the stamp
        if (empty($rawStamp) && !empty($rawSize) && ($isDiamond || $isStone)) {
            $rawStamp = $rawSize;
        }

        // Format sieve stamp (e.g., 7 or +7 -> +7, -2 -> -2)
        $stampFormatted = trim((string)($rawStamp ?? ''));
        if ($stampFormatted !== '' && is_numeric($stampFormatted) && (float)$stampFormatted > 0 && !str_starts_with($stampFormatted, '+')) {
            $stampFormatted = '+' . $stampFormatted;
        }

        $pcs = (int)($rawPcs ?: 1);
        if ($pcs < 1) {
            $errors[] = [
                'sheet' => $sheet,
                'row' => $rNum,
                'field' => 'pieces_count',
                'reason' => "Component #{$compSeq} pieces count must be at least 1."
            ];
        }

        $weight = (float)($rawWeight ?: 0);
        if ($weight <= 0) {
            $errors[] = [
                'sheet' => $sheet,
                'row' => $rNum,
                'field' => 'weight',
                'reason' => "Component #{$compSeq} weight must be greater than 0."
            ];
        }

        // Determine unit
        $defaultUnit = ($isDiamond || $isStone) ? 'ct' : 'g';
        $unit = !empty($rawUnit) ? trim($rawUnit) : $defaultUnit;

        // Construct component display name with sieve stamp if present
        $componentName = !empty($rawStone) ? $rawStone : ($isDiamond ? 'Diamond' : ($rawType ?: 'Component'));
        if (!empty($stampFormatted) && !str_contains(strtolower($componentName), strtolower($stampFormatted))) {
            $componentName .= " ({$stampFormatted})";
        } elseif (!empty($rawSize) && !str_contains(strtolower($componentName), strtolower($rawSize))) {
            $componentName .= " ({$rawSize})";
        }

        $component = [
            'id_temp' => time() + $compSeq + rand(100, 999),
            'item_code' => "{$pCode}-C{$compSeq}",
            'item_name' => $componentName,
            'component_type' => $isDiamond ? 'Diamond' : ($isStone ? 'Colour Stone' : ($isPearl ? 'Pearl' : ($isMetal ? 'Metal Component' : $rawType))),
            'category_name' => $isDiamond ? 'Diamond' : ($isStone ? 'Colour Stone' : ($isPearl ? 'Pearl' : ($rawType ?: 'Component'))),
            'stone_type' => !empty($rawStone) ? $rawStone : ($isDiamond ? 'Diamond' : $rawType),
            'size' => !empty($rawSize) ? $rawSize : null,
            'stamp' => $stampFormatted,
            'no_of_pieces' => $pcs,
            'stone_weight' => round($weight, 3),
            'gross_wt' => round($weight, 3),
            'net_wt' => round($weight, 3),
            'unit' => $unit,
            'is_diamond' => $isDiamond,
            'is_stone' => $isStone,
            'is_pearl' => $isPearl,
            'is_metal' => $isMetal,
            'remarks' => $this->extractKey($cRow, ['remarks', 'notes', 'description']),
            'image_url' => $this->extractKey($cRow, ['image_url', 'image', 'photo']),
        ];

        return [
            'errors' => $errors,
            'component' => empty($errors) ? $component : null,
        ];
    }

    /**
     * Resolve Category and Subcategory against active database masters.
     */
    protected function resolveCategoryAndSubcategory(array $row, array $masters, ?int $selectedCategoryId, string $sheet, int $rNum, string $pCode): array
    {
        $errors = [];
        $catId = null;
        $catName = null;
        $subcatId = null;
        $subcatName = null;

        $rawCat = $this->extractKey($row, ['category', 'category_name', 'category_code', 'category_id']);
        $rawSub = $this->extractKey($row, ['subcategory', 'subcategory_name', 'subcategory_code', 'subcategory_id']);

        // Priority 1: User selected global category context
        if ($selectedCategoryId && isset($masters['categories_by_id'][$selectedCategoryId])) {
            $catObj = $masters['categories_by_id'][$selectedCategoryId];
            $catId = $catObj->id;
            $catName = $catObj->name;
        }

        // Priority 2: Resolve Category from file
        if (!$catId && !empty($rawCat)) {
            $cleanCat = strtolower(trim($rawCat));
            if (is_numeric($rawCat) && isset($masters['categories_by_id'][(int)$rawCat])) {
                $catObj = $masters['categories_by_id'][(int)$rawCat];
                $catId = $catObj->id;
                $catName = $catObj->name;
            } elseif (isset($masters['categories_by_name'][$cleanCat])) {
                $catObj = $masters['categories_by_name'][$cleanCat];
                $catId = $catObj->id;
                $catName = $catObj->name;
            } elseif (isset($masters['categories_by_code'][$cleanCat])) {
                $catObj = $masters['categories_by_code'][$cleanCat];
                $catId = $catObj->id;
                $catName = $catObj->name;
            } else {
                // Partial match search
                foreach ($masters['categories'] as $c) {
                    if (str_contains(strtolower($c->name), $cleanCat) || str_contains($cleanCat, strtolower($c->name))) {
                        $catId = $c->id;
                        $catName = $c->name;
                        break;
                    }
                }
            }
        }

        if (!$catId) {
            $errors[] = [
                'sheet' => $sheet,
                'row' => $rNum,
                'field' => 'category',
                'reason' => "Category '{$rawCat}' does not exist in Category Masters."
            ];
        }

        // Resolve Subcategory if specified
        if ($catId && !empty($rawSub)) {
            $cleanSub = strtolower(trim($rawSub));
            $matchedSub = null;

            if (is_numeric($rawSub) && isset($masters['subcategories_by_id'][(int)$rawSub])) {
                $matchedSub = $masters['subcategories_by_id'][(int)$rawSub];
            } elseif (isset($masters['subcategories_by_name'][$cleanSub])) {
                $matchedSub = $masters['subcategories_by_name'][$cleanSub];
            } elseif (isset($masters['subcategories_by_code'][$cleanSub])) {
                $matchedSub = $masters['subcategories_by_code'][$cleanSub];
            } else {
                foreach ($masters['subcategories'] as $s) {
                    if (str_contains(strtolower($s->name), $cleanSub) || str_contains($cleanSub, strtolower($s->name))) {
                        $matchedSub = $s;
                        break;
                    }
                }
            }

            if (!$matchedSub) {
                $errors[] = [
                    'sheet' => $sheet,
                    'row' => $rNum,
                    'field' => 'subcategory',
                    'reason' => "Subcategory '{$rawSub}' does not exist in Subcategory Masters."
                ];
            } elseif ($matchedSub->category_id !== $catId) {
                $correctCat = $masters['categories_by_id'][$matchedSub->category_id]?->name ?? 'another category';
                $errors[] = [
                    'sheet' => $sheet,
                    'row' => $rNum,
                    'field' => 'subcategory',
                    'reason' => "Subcategory '{$matchedSub->name}' belongs to '{$correctCat}', not '{$catName}'."
                ];
            } else {
                $subcatId = $matchedSub->id;
                $subcatName = $matchedSub->name;
            }
        }

        return [
            'errors' => $errors,
            'category_id' => $catId,
            'category_name' => $catName,
            'subcategory_id' => $subcatId,
            'subcategory_name' => $subcatName,
        ];
    }

    /**
     * Resolve purity percentage from karat code or purity string.
     */
    protected function resolvePurityPercent(string $karat, ?string $rawPurity): float
    {
        if (!empty($rawPurity)) {
            $clean = preg_replace('/[^0-9.]/', '', $rawPurity);
            if (is_numeric($clean) && (float)$clean > 0) {
                return (float)$clean;
            }
        }

        $kLower = strtolower(trim($karat));
        if (str_contains($kLower, '24')) return 99.9;
        if (str_contains($kLower, '22')) return 91.6;
        if (str_contains($kLower, '18')) return 75.0;
        if (str_contains($kLower, '14')) return 58.5;
        if (str_contains($kLower, '9')) return 37.5;

        return 91.6;
    }

    /**
     * Helper to extract value from row trying multiple potential header variants.
     */
    protected function extractKey(array $row, array $keys, $default = '')
    {
        foreach ($keys as $k) {
            if (isset($row[$k]) && $row[$k] !== '') {
                return $row[$k];
            }
            // Also test stripped format
            $stripped = preg_replace('/[^a-z0-9]/', '', strtolower($k));
            if (isset($row[$stripped]) && $row[$stripped] !== '') {
                return $row[$stripped];
            }
        }
        return $default;
    }

    /**
     * Compute summary statistics across all parsed products and components.
     */
    protected function calculateStats(array $products): array
    {
        $totalProducts = count($products);
        $totalComponents = 0;
        $totalGoldWeight = 0.0;
        $totalDiamondCarats = 0.0;
        $totalDiamondPieces = 0;
        $totalStoneWeight = 0.0;
        $totalStonePieces = 0;
        $totalQuantity = 0;

        foreach ($products as $p) {
            $totalComponents += count($p['components']);
            $totalGoldWeight += (float)$p['gold_weight'];
            $totalDiamondCarats += (float)$p['total_diamond_carats'];
            $totalDiamondPieces += (int)$p['total_diamond_pieces'];
            $totalStoneWeight += (float)$p['total_stone_weight'];
            $totalStonePieces += (int)$p['total_stone_pieces'];
            $totalQuantity += (int)$p['quantity'];
        }

        return [
            'total_products' => $totalProducts,
            'total_components' => $totalComponents,
            'total_gold_weight' => round($totalGoldWeight, 3),
            'total_diamond_carats' => round($totalDiamondCarats, 3),
            'total_diamond_pieces' => $totalDiamondPieces,
            'total_stone_weight' => round($totalStoneWeight, 3),
            'total_stone_pieces' => $totalStonePieces,
            'total_quantity' => $totalQuantity,
        ];
    }

    /**
     * Empty stats baseline.
     */
    protected function emptyStats(): array
    {
        return [
            'total_products' => 0,
            'total_components' => 0,
            'total_gold_weight' => 0.0,
            'total_diamond_carats' => 0.0,
            'total_diamond_pieces' => 0,
            'total_stone_weight' => 0.0,
            'total_stone_pieces' => 0,
            'total_quantity' => 0,
        ];
    }

    /**
     * Generate 2-Sheet Excel (.xlsx) template with sample multi-component items.
     */
    public function generateSampleExcel(): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();

        // ----------------- SHEET 1: PRODUCTS -----------------
        $sheetProducts = $spreadsheet->getActiveSheet();
        $sheetProducts->setTitle('Products');

        $prodHeaders = [
            'product_code' => 'Product Code / SKU (*Required)',
            'product_name' => 'Product Name (*Required)',
            'category' => 'Category (*Required)',
            'subcategory' => 'Subcategory (Optional)',
            'gold_weight' => 'Gold Weight in Grams (*Required)',
            'gross_weight' => 'Gross Weight (Optional, auto-computed)',
            'karat' => 'Karat (e.g. 22K, 18K)',
            'purity' => 'Purity % (e.g. 91.6)',
            'gold_stamp' => 'Gold Stamp (e.g. 916)',
            'quantity' => 'Stock Quantity (Default 1)',
            'making_charge' => 'Making Charge / g',
            'wastage_percent' => 'Wastage %',
            'design_no' => 'Design No.',
            'description' => 'Description / Crafting Notes',
            'image_url' => 'Image URL / Path (Optional)',
        ];

        $col = 'A';
        foreach ($prodHeaders as $key => $title) {
            $sheetProducts->setCellValue($col . '1', $key);
            $sheetProducts->getColumnDimension($col)->setAutoSize(true);
            $col++;
        }

        // Style Header
        $sheetProducts->getStyle('A1:' . chr(ord('A') + count($prodHeaders) - 1) . '1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '800000']],
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        $sampleProducts = [
            [
                'product_code' => 'RJ-GLD-CHN-001',
                'product_name' => 'Royal Handcrafted Diamond Gold Chain',
                'category' => 'Gold',
                'subcategory' => 'Chain',
                'gold_weight' => '50.000',
                'gross_weight' => '50.236',
                'karat' => '22K',
                'purity' => '91.6',
                'gold_stamp' => '916',
                'quantity' => '1',
                'making_charge' => '750',
                'wastage_percent' => '3.50',
                'design_no' => 'DES-CHN-101',
                'description' => 'Features 3 distinct diamond sizes on 22K gold chain',
                'image_url' => 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400',
            ],
            [
                'product_code' => 'RJ-DIA-RNG-002',
                'product_name' => 'Floral Cluster Diamond & Ruby Ring',
                'category' => 'Diamond',
                'subcategory' => 'Solitaire Rings',
                'gold_weight' => '8.500',
                'gross_weight' => '9.070',
                'karat' => '18K',
                'purity' => '75.0',
                'gold_stamp' => '750',
                'quantity' => '1',
                'making_charge' => '1200',
                'wastage_percent' => '4.00',
                'design_no' => 'DES-RNG-202',
                'description' => '18K Gold with Center Solitaire, Rubies and Emeralds',
                'image_url' => 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400',
            ],
            [
                'product_code' => 'RJ-GLD-BNG-003',
                'product_name' => 'Heritage Temple Plain Gold Bangle',
                'category' => 'Gold',
                'subcategory' => 'Bangles',
                'gold_weight' => '35.000',
                'gross_weight' => '35.000',
                'karat' => '22K',
                'purity' => '91.6',
                'gold_stamp' => '916',
                'quantity' => '2',
                'making_charge' => '650',
                'wastage_percent' => '3.80',
                'design_no' => 'DES-BNG-303',
                'description' => 'Plain 22K heritage temple gold bangle without stones',
                'image_url' => '',
            ],
        ];

        $rowIdx = 2;
        foreach ($sampleProducts as $p) {
            $c = 'A';
            foreach (array_keys($prodHeaders) as $k) {
                $sheetProducts->setCellValue($c . $rowIdx, $p[$k] ?? '');
                $c++;
            }
            $rowIdx++;
        }

        // ----------------- SHEET 2: COMPONENTS -----------------
        $sheetComponents = $spreadsheet->createSheet();
        $sheetComponents->setTitle('Components');

        $compHeaders = [
            'product_code' => 'Product Code (*Must match Products sheet)',
            'component_type' => 'Component Type (*Diamond / Colour Stone / Metal)',
            'stone_type' => 'Stone Type / Sub-name (e.g. Diamond, Ruby, Emerald)',
            'stamp' => 'Stamp / Size (*e.g. +7, +4, +2, +6, +11)',
            'pieces_count' => 'Pieces Count (*Required)',
            'weight' => 'Weight (*Required: Carats for stones, Grams for metal)',
            'unit' => 'Unit (ct or g)',
            'remarks' => 'Component Remarks',
            'image_url' => 'Component Image URL / Path (Optional)',
        ];

        $col = 'A';
        foreach ($compHeaders as $key => $title) {
            $sheetComponents->setCellValue($col . '1', $key);
            $sheetComponents->getColumnDimension($col)->setAutoSize(true);
            $col++;
        }

        // Style Header
        $sheetComponents->getStyle('A1:' . chr(ord('A') + count($compHeaders) - 1) . '1')->applyFromArray([
            'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
            'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1E3A8A']], // Dark Blue
            'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
        ]);

        $sampleComponents = [
            // Product 1: 3 diamond sieve size stamps on 1 chain
            [
                'product_code' => 'RJ-GLD-CHN-001',
                'component_type' => 'Diamond',
                'stone_type' => 'Diamond',
                'stamp' => '+7',
                'pieces_count' => '20',
                'weight' => '0.500',
                'unit' => 'ct',
                'remarks' => '20 round brilliant diamonds (+7 sieve stamp)',
            ],
            [
                'product_code' => 'RJ-GLD-CHN-001',
                'component_type' => 'Diamond',
                'stone_type' => 'Diamond',
                'stamp' => '+4',
                'pieces_count' => '12',
                'weight' => '0.360',
                'unit' => 'ct',
                'remarks' => '12 diamonds (+4 sieve stamp)',
            ],
            [
                'product_code' => 'RJ-GLD-CHN-001',
                'component_type' => 'Diamond',
                'stone_type' => 'Diamond',
                'stamp' => '+2',
                'pieces_count' => '8',
                'weight' => '0.320',
                'unit' => 'ct',
                'remarks' => '8 diamonds (+2 sieve stamp)',
            ],
            // Product 2: Ring with Solitaire Diamond (+11), Rubies (+6) and Emeralds (+4)
            [
                'product_code' => 'RJ-DIA-RNG-002',
                'component_type' => 'Diamond',
                'stone_type' => 'Diamond',
                'stamp' => '+11',
                'pieces_count' => '1',
                'weight' => '0.750',
                'unit' => 'ct',
                'remarks' => 'Center solitaire diamond (+11)',
            ],
            [
                'product_code' => 'RJ-DIA-RNG-002',
                'component_type' => 'Colour Stone',
                'stone_type' => 'Ruby',
                'stamp' => '+6',
                'pieces_count' => '4',
                'weight' => '1.200',
                'unit' => 'ct',
                'remarks' => '4 Burmese natural rubies (+6 size)',
            ],
            [
                'product_code' => 'RJ-DIA-RNG-002',
                'component_type' => 'Colour Stone',
                'stone_type' => 'Emerald',
                'stamp' => '+4',
                'pieces_count' => '4',
                'weight' => '0.900',
                'unit' => 'ct',
                'remarks' => '4 Colombian natural emeralds (+4 size)',
            ],
            // Product 3 (RJ-GLD-BNG-003) has NO component rows (Plain gold product)
        ];

        $rowIdx = 2;
        foreach ($sampleComponents as $cData) {
            $c = 'A';
            foreach (array_keys($compHeaders) as $k) {
                $sheetComponents->setCellValue($c . $rowIdx, $cData[$k] ?? '');
                $c++;
            }
            $rowIdx++;
        }

        $spreadsheet->setActiveSheetIndex(0);
        return $spreadsheet;
    }

    /**
     * Generate multi-component CSV template content.
     */
    public function generateSampleCsvContent(): string
    {
        $headers = [
            'product_code',
            'product_name',
            'category',
            'subcategory',
            'gold_weight',
            'gross_weight',
            'karat',
            'purity',
            'gold_stamp',
            'quantity',
            'image_url',
            'component_type',
            'stone_type',
            'stamp',
            'pieces_count',
            'weight',
            'unit',
            'making_charge',
            'wastage_percent',
            'design_no',
            'description',
        ];

        $rows = [
            // Product 1: 3 diamond component rows for 1 product
            [
                'RJ-GLD-CHN-001',
                'Royal Handcrafted Diamond Gold Chain',
                'Gold',
                'Chain',
                '50.000',
                '50.236',
                '22K',
                '91.6',
                '916',
                '1',
                'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400',
                'Diamond',
                'Diamond',
                '+7',
                '20',
                '0.500',
                'ct',
                '750',
                '3.50',
                'DES-CHN-101',
                '22K Chain with 20 diamonds of +7 stamp sieve size (0.50 ct)',
            ],
            [
                'RJ-GLD-CHN-001', // Repeat same product_code to attach component 2
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                'Diamond',
                'Diamond',
                '+4',
                '12',
                '0.360',
                'ct',
                '',
                '',
                '',
                '12 diamonds of +4 stamp sieve size (0.36 ct)',
            ],
            [
                'RJ-GLD-CHN-001', // Repeat same product_code to attach component 3
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                'Diamond',
                'Diamond',
                '+2',
                '8',
                '0.320',
                'ct',
                '',
                '',
                '',
                '8 diamonds of +2 stamp sieve size (0.32 ct)',
            ],
            // Product 2: Ring with Solitaire (+11), Rubies (+6) and Emeralds (+4)
            [
                'RJ-DIA-RNG-002',
                'Floral Cluster Diamond & Ruby Ring',
                'Diamond',
                'Solitaire Rings',
                '8.500',
                '9.070',
                '18K',
                '75.0',
                '750',
                '1',
                'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400',
                'Diamond',
                'Diamond',
                '+11',
                '1',
                '0.750',
                'ct',
                '1200',
                '4.00',
                'DES-RNG-202',
                'Center solitaire diamond (+11 size)',
            ],
            [
                'RJ-DIA-RNG-002',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                'Colour Stone',
                'Ruby',
                '+6',
                '4',
                '1.200',
                'ct',
                '',
                '',
                '',
                '4 Burmese natural rubies (+6 size)',
            ],
            [
                'RJ-DIA-RNG-002',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                'Colour Stone',
                'Emerald',
                '+4',
                '4',
                '0.900',
                'ct',
                '',
                '',
                '',
                '4 Colombian natural emeralds (+4 size)',
            ],
            // Product 3: Plain Gold Bangle (No stone components)
            [
                'RJ-GLD-BNG-003',
                'Heritage Temple Plain Gold Bangle',
                'Gold',
                'Bangles',
                '35.000',
                '35.000',
                '22K',
                '91.6',
                '916',
                '2',
                '',
                '',
                '',
                '',
                '',
                '',
                '',
                '650',
                '3.80',
                'DES-BNG-303',
                'Plain 22K heritage temple gold bangle without stones',
            ],
        ];

        $out = fopen('php://temp', 'r+');
        fputcsv($out, $headers);
        foreach ($rows as $r) {
            fputcsv($out, $r);
        }
        rewind($out);
        $csv = stream_get_contents($out);
        fclose($out);

        return $csv;
    }
}
