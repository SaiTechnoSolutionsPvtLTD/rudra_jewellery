<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\SubcategoryController;
use App\Http\Controllers\Api\ItemController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\MembershipController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\PurchaseEntryController;
use App\Http\Controllers\Api\ClientPriceListController;
use App\Http\Controllers\Api\KarigarController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\WorkOrderController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\SalesController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\BankAccountController;
use App\Http\Controllers\Api\CompanyInfoController;
use App\Http\Controllers\Api\DiamondColorController;
use App\Http\Controllers\Api\DiamondClarityController;
use App\Http\Controllers\Api\ApprovalMemoController;
use App\Http\Controllers\Api\RepairController;

// Public authentication routes
Route::post('/login', [AuthController::class, 'login']);

// Public direct export route for work order PDF
Route::get('/work-orders/{id}/pdf', [WorkOrderController::class, 'exportPdf']);

// Protected routes using Sanctum token authentication
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Notifications Top Bar Feed & Management
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::match(['post', 'patch'], '/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [NotificationController::class, 'destroy']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/metal-rates', [DashboardController::class, 'metalRates']);
    Route::post('/metal-rates', [DashboardController::class, 'updateMetalRates']);
    Route::post('/metal-rates/reset', [DashboardController::class, 'resetMetalRates']);
    Route::get('/reports/profit-per-metal', [\App\Http\Controllers\Api\ReportController::class, 'profitPerMetal']);

    // Work Orders & Live Job Workflow (Pages 14, 15, 16 & Job Order views)
    Route::get('/work-orders/dashboard-stats', [WorkOrderController::class, 'dashboardStats']);
    Route::get('/work-orders/generate-number', [WorkOrderController::class, 'generateOrderNumber']);
    Route::get('/job-orders/generate-number', [WorkOrderController::class, 'generateJobOrderNumber']);
    Route::get('/work-orders/delays', [WorkOrderController::class, 'delays']);
    Route::get('/work-orders/search-receiving', [WorkOrderController::class, 'searchReceiving']);
    Route::get('/work-orders/ready-pieces', [WorkOrderController::class, 'readyPieces']);
    Route::get('/work-orders/tags', [WorkOrderController::class, 'getTags']);
    Route::get('/inventory/products/{id}/tags', [WorkOrderController::class, 'getProductTags']);
    Route::get('/inventory/jewellery-tags/{tag}', [WorkOrderController::class, 'getTagDetails']);

    Route::get('/work-orders/{id}/receiving-data', [WorkOrderController::class, 'receivingData']);
    Route::get('/work-orders/{id}/pieces', [WorkOrderController::class, 'getPieces']);
    Route::get('/work-orders/{id}/operations', [WorkOrderController::class, 'getOperations']);
    Route::post('/work-orders/{id}/operations', [WorkOrderController::class, 'recordOperation']);
    Route::post('/work-orders/batch-submit-qc', [WorkOrderController::class, 'batchSubmitQc']);
    Route::post('/work-orders/{id}/wip-update', [WorkOrderController::class, 'wipUpdate']);
    Route::post('/work-orders/{id}/qc-action', [WorkOrderController::class, 'qcAction']);
    Route::post('/work-orders/{id}/certification-action', [WorkOrderController::class, 'certificationAction']);
    Route::post('/work-orders/{id}/hallmarking-action', [WorkOrderController::class, 'hallmarkingAction']);
    Route::post('/work-orders/{id}/receive-piece', [WorkOrderController::class, 'receivePiece']);
    Route::post('/work-orders/{id}/receive', [WorkOrderController::class, 'receive']);
    Route::post('/work-orders/{id}/final-receive', [WorkOrderController::class, 'finalReceive']);
    Route::post('/work-orders/{id}/finalize-inventory', [WorkOrderController::class, 'finalizeInventory']);

    Route::post('/work-orders/{id}/receiver-update', [WorkOrderController::class, 'updateReceiver']);
    Route::post('/work-orders/{id}/karigar-update', [WorkOrderController::class, 'karigarUpdate']);
    Route::post('/work-orders/{id}/manager-update', [WorkOrderController::class, 'managerUpdate']);
    Route::post('/work-orders/{id}/timeline-update', [WorkOrderController::class, 'addTimelineUpdate']);
    Route::post('/work-orders/{id}/delay-update', [WorkOrderController::class, 'delayUpdate']);
    Route::post('/work-orders/{id}/approve', [WorkOrderController::class, 'approve']);
    Route::post('/work-orders/{id}/return', [WorkOrderController::class, 'returnOrReject']);
    Route::post('/work-orders/{id}/mark-ready', [WorkOrderController::class, 'markReady']);
    Route::post('/work-orders/{id}/move-to-ready', [WorkOrderController::class, 'moveToReady']);
    Route::post('/work-orders/{id}/update-certification', [WorkOrderController::class, 'updateCertification']);
    Route::post('/work-orders/{id}/update-hallmarking', [WorkOrderController::class, 'updateHallmarking']);
    Route::post('/received-pieces/{id}/update-certification', [WorkOrderController::class, 'updatePieceCertification']);
    Route::post('/received-pieces/{id}/update-hallmarking', [WorkOrderController::class, 'updatePieceHallmarking']);
    Route::get('/work-orders/{id}/material-requirements', [WorkOrderController::class, 'materialRequirements']);
    Route::get('/work-orders/{id}/gold-reconciliation', [WorkOrderController::class, 'goldReconciliation']);
    Route::get('/work-orders/{id}/pdf', [WorkOrderController::class, 'exportPdf']);
    Route::apiResource('work-orders', WorkOrderController::class);

    Route::get('/jobs/new-id', [JobController::class, 'getNewId']);
    Route::get('/jobs/{id}', [JobController::class, 'show']);
    Route::post('/jobs', [JobController::class, 'store']);

    Route::get('/clients/generate-code', [ClientController::class, 'generateCode']);
    Route::get('/clients/removed', [ClientController::class, 'removedClients']);
    Route::post('/clients/{id}/metal-deposit', [ClientController::class, 'recordMetalDeposit']);
    Route::post('/clients/{id}/payments', [ClientController::class, 'recordPayment']);
    Route::post('/clients/{id}/remove', [ClientController::class, 'removeClient']);
    Route::post('/clients/{id}/restore', [ClientController::class, 'restoreClient']);
    Route::get('/clients/{client}/price-list', [ClientPriceListController::class, 'show']);
    Route::get('/clients/{client}/price-list/history', [ClientPriceListController::class, 'history']);
    Route::post('/clients/{client}/price-list/activate/{priceList}', [ClientPriceListController::class, 'activateVersion']);
    Route::post('/clients/{client}/price-list', [ClientPriceListController::class, 'storeOrUpdate']);
    Route::apiResource('clients', ClientController::class);

    Route::get('/billing', [ClientController::class, 'billing']);
    Route::post('/invoices', [ClientController::class, 'storeInvoice']);
    Route::put('/invoices/{id}', [ClientController::class, 'updateInvoice']);
    Route::delete('/invoices/{id}', [ClientController::class, 'destroyInvoice']);

    // Sales aggregate, settlement, customer report, and profit APIs
    Route::get('/reports', [ReportController::class, 'index']);
    Route::get('/sales/dashboard', [SalesController::class, 'dashboard']);
    Route::get('/sales/customer-report', [SalesController::class, 'customerReport']);
    Route::get('/sales/available-pieces', [SalesController::class, 'availablePieces']);
    Route::get('/sales/products', [SalesController::class, 'products']);
    Route::get('/sales/profit', [SalesController::class, 'profit']);
    Route::get('/sales/profit-per-invoice', [SalesController::class, 'profit']);
    Route::get('/sales/profit-per-metal', [ReportController::class, 'profitPerMetal']);
    Route::get('/sales/customers/{client}', [SalesController::class, 'customer']);
    Route::post('/sales/{sale}/finalize', [SalesController::class, 'finalize']);
    Route::post('/sales/{sale}/cancel', [SalesController::class, 'cancel']);
    Route::delete('/sales/{sale}', [SalesController::class, 'destroy']);
    Route::post('/sales/{sale}/payments', [SalesController::class, 'payment']);
    Route::put('/sales/{sale}/payments/{payment}', [SalesController::class, 'updatePayment']);
    Route::delete('/sales/{sale}/payments/{payment}', [SalesController::class, 'deletePayment']);
    Route::get('/sales/{sale}', [SalesController::class, 'show']);
    Route::get('/sales', [SalesController::class, 'index']);
    Route::post('/sales', [SalesController::class, 'store']);

    Route::apiResource('roles', RoleController::class);
    Route::apiResource('permissions', PermissionController::class);
    Route::post('/users/upload-avatar', [UserController::class, 'uploadAvatar']);
    Route::post('/users/{id}/avatar', [UserController::class, 'uploadAvatar']);
    Route::post('/users/{id}', [UserController::class, 'update']);
    Route::apiResource('users', UserController::class);
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('subcategories', SubcategoryController::class);
    Route::apiResource('items', ItemController::class);
    Route::get('/products/generate-sku', [ProductController::class, 'generateSku']);
    Route::get('/products/lookup-design', [ProductController::class, 'lookupDesign']);
    Route::post('/products/bulk-opening-stock', [ProductController::class, 'bulkUpdateOpeningStock']);
    Route::post('/products/{id}/opening-stock', [ProductController::class, 'updateOpeningStock']);
    Route::apiResource('products', ProductController::class);
    Route::apiResource('memberships', MembershipController::class);
    Route::get('/suppliers/{id}/ledger', [SupplierController::class, 'ledger']);
    Route::post('/suppliers/{id}/settle', [SupplierController::class, 'settle']);
    Route::post('/suppliers/{id}/settlements', [SupplierController::class, 'settle']);
    Route::post('/suppliers/{id}/adjust-balance', [SupplierController::class, 'adjustBalance']);
    Route::apiResource('suppliers', SupplierController::class);
    Route::get('/raw-materials/unified-stock', [\App\Http\Controllers\Api\MaterialOpeningStockController::class, 'unifiedStock']);
    Route::post('/raw-materials/unified-stock/update', [\App\Http\Controllers\Api\MaterialOpeningStockController::class, 'updateUnifiedStock']);
    Route::post('/raw-materials/quick-stock-add', [\App\Http\Controllers\Api\RawMaterialController::class, 'quickStockAdd']);
    Route::apiResource('raw-materials', \App\Http\Controllers\Api\RawMaterialController::class);
    Route::get('/purchase-entries/generate-no', [PurchaseEntryController::class, 'generateNo']);
    Route::get('/purchase-entries/due-reminders', [PurchaseEntryController::class, 'dueReminders']);
    Route::match(['post', 'patch'], '/purchase-entries/{id}/payment-status', [PurchaseEntryController::class, 'updatePaymentStatus']);
    Route::post('/purchase-entries/{id}/convert-payment-mode', [PurchaseEntryController::class, 'convertPaymentMode']);
    Route::apiResource('purchase-entries', PurchaseEntryController::class);
    Route::get('/gold-rates/today', [\App\Http\Controllers\Api\GoldRateController::class, 'today']);
    Route::apiResource('gold-rates', \App\Http\Controllers\Api\GoldRateController::class);
    Route::get('/material-opening-stocks/generate-no', [\App\Http\Controllers\Api\MaterialOpeningStockController::class, 'generateNo']);
    Route::apiResource('material-opening-stocks', \App\Http\Controllers\Api\MaterialOpeningStockController::class);

    // Product Designs & Upload
    Route::get('/product-designs/check-design-no', [\App\Http\Controllers\Api\ProductDesignController::class, 'checkDesignNo']);
    Route::get('/product-designs/generate-design-no', [\App\Http\Controllers\Api\ProductDesignController::class, 'generateDesignNo']);
    Route::get('/product-designs/meta', [\App\Http\Controllers\Api\ProductDesignController::class, 'meta']);
    Route::post('/product-designs/sync-inventory', [\App\Http\Controllers\Api\ProductDesignController::class, 'syncInventory']);
    Route::get('/product-designs/export-pdf', [\App\Http\Controllers\Api\ProductDesignController::class, 'exportPdf']);
    Route::get('/product-designs/export-excel', [\App\Http\Controllers\Api\ProductDesignController::class, 'exportExcel']);
    Route::post('/product-designs/{id}', [\App\Http\Controllers\Api\ProductDesignController::class, 'update']);
    Route::apiResource('product-designs', \App\Http\Controllers\Api\ProductDesignController::class);

    // Setting Styles, Gold Types, Diamond Ranges, Bank Accounts, Company Info
    Route::get('/company-info/default', [CompanyInfoController::class, 'getDefault']);
    Route::post('/company-info/{id}/set-default', [CompanyInfoController::class, 'setDefault']);
    Route::apiResource('company-info', CompanyInfoController::class);
    Route::post('/bank-accounts/{id}/set-default', [BankAccountController::class, 'setDefault']);
    Route::apiResource('bank-accounts', BankAccountController::class);
    Route::apiResource('styles', \App\Http\Controllers\Api\StyleController::class);
    Route::apiResource('gold-types', \App\Http\Controllers\Api\GoldTypeController::class);
    Route::apiResource('diamond-ranges', \App\Http\Controllers\Api\DiamondRangeController::class);
    Route::apiResource('diamond-colors', DiamondColorController::class);
    Route::apiResource('diamond-clarities', DiamondClarityController::class);
    Route::apiResource('karats', \App\Http\Controllers\Api\KaratController::class);
    Route::apiResource('stamps', \App\Http\Controllers\Api\StampController::class);
    Route::apiResource('units', \App\Http\Controllers\Api\UnitController::class);
    Route::apiResource('component-categories', \App\Http\Controllers\Api\ComponentCategoryController::class);
    Route::apiResource('operations', \App\Http\Controllers\Api\OperationController::class);

    // Karigar (Artisan) Management & Material Ledger
    Route::get('/karigar-materials', [\App\Http\Controllers\Api\KarigarMaterialController::class, 'index']);
    Route::get('/karigars/{id}/material-ledger', [\App\Http\Controllers\Api\KarigarMaterialController::class, 'ledger']);
    Route::post('/karigars/{id}/material-action', [\App\Http\Controllers\Api\KarigarMaterialController::class, 'storeAction']);
    Route::post('/karigars/{id}/allocate-materials', [\App\Http\Controllers\Api\KarigarMaterialController::class, 'allocateMaterials']);
    Route::get('/karigars/{id}/work-orders/{workOrderId}/material-requirements', [\App\Http\Controllers\Api\KarigarMaterialController::class, 'workOrderMaterialRequirements']);
    Route::post('/karigars/{id}/reverse-material-transaction/{txId}', [\App\Http\Controllers\Api\KarigarMaterialController::class, 'reverseMaterialTransaction']);
    Route::match(['put', 'post'], '/karigars/{id}/material-transactions/{txId}', [\App\Http\Controllers\Api\KarigarMaterialController::class, 'updateMaterialTransaction']);
    Route::post('/karigars/{id}/settle-cash', [\App\Http\Controllers\Api\KarigarMaterialController::class, 'settleCash']);
    Route::get('/karigars/{id}/financial-ledger', [\App\Http\Controllers\Api\KarigarMaterialController::class, 'financialLedger']);
    Route::get('/karigars/generate-code', [KarigarController::class, 'generateCode']);
    Route::get('/karigars/{id}/works', [KarigarController::class, 'works']);
    Route::get('/karigars/{id}/hisab-summary', [KarigarController::class, 'hisabSummary']);
    Route::apiResource('karigars', KarigarController::class);
    Route::apiResource('work-specifications', \App\Http\Controllers\Api\WorkSpecificationController::class);

    // Approval / Jangad Memos
    Route::get('/approvals', [ApprovalMemoController::class, 'index']);
    Route::post('/approvals', [ApprovalMemoController::class, 'store']);
    Route::get('/approvals/{id}', [ApprovalMemoController::class, 'show']);
    Route::post('/approvals/{id}/return-piece/{itemId}', [ApprovalMemoController::class, 'returnPiece']);
    Route::post('/approvals/{id}/convert-to-sale', [ApprovalMemoController::class, 'convertToSale']);

    // Customer Jewellery Repair Management
    Route::get('/repairs', [RepairController::class, 'index']);
    Route::post('/repairs', [RepairController::class, 'store']);
    Route::get('/repairs/{id}', [RepairController::class, 'show']);
    Route::put('/repairs/{id}', [RepairController::class, 'updateProgress']);
    Route::post('/repairs/{id}/deliver', [RepairController::class, 'deliver']);

    // Statutory GST Reports (ITC-04 Job Work & GSTR-1 Summary)
    Route::get('/reports/itc04', [ReportController::class, 'itc04Report']);
    Route::get('/reports/gstr1', [ReportController::class, 'gstr1Summary']);
    Route::get('/reports/karigar-monthly', [ReportController::class, 'karigarMonthlyReport']);
    Route::get('/reports/supplier-monthly', [ReportController::class, 'supplierMonthlyReport']);

    // Inventory Module
    Route::get('/inventory/categories', [InventoryController::class, 'getCategories']);
    Route::get('/inventory/sample-csv', [InventoryController::class, 'downloadSampleCsv']);
    Route::get('/inventory/sample-excel', [InventoryController::class, 'downloadSampleExcel']);
    Route::post('/inventory/bulk-upload/preview', [InventoryController::class, 'bulkUploadPreview']);
    Route::post('/inventory/bulk-upload', [InventoryController::class, 'bulkUpload']);
    Route::get('/inventory/products/{id}', [InventoryController::class, 'show']);
    Route::put('/inventory/products/{id}', [InventoryController::class, 'update']);
    Route::delete('/inventory/products/{id}', [InventoryController::class, 'destroy']);
    Route::post('/inventory/products/{id}/movements', [InventoryController::class, 'addMovement']);
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::post('/inventory', [InventoryController::class, 'store']);
});

// Public download routes for inventory sample templates
Route::get('/inventory/sample-csv', [InventoryController::class, 'downloadSampleCsv']);
Route::get('/inventory/sample-excel', [InventoryController::class, 'downloadSampleExcel']);

// Public / direct export routes for convenient downloading
Route::get('/product-designs/export-pdf', [\App\Http\Controllers\Api\ProductDesignController::class, 'exportPdf']);
Route::get('/product-designs/export-excel', [\App\Http\Controllers\Api\ProductDesignController::class, 'exportExcel']);
