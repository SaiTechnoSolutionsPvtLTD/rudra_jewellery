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

// Public authentication routes
Route::post('/login', [AuthController::class, 'login']);

// Public direct export route for work order PDF
Route::get('/work-orders/{id}/pdf', [WorkOrderController::class, 'exportPdf']);

// Protected routes using Sanctum token authentication
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Notifications Top Bar Feed
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::post('/notifications/{id}/read', [NotificationController::class, 'markAsRead']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllAsRead']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/metal-rates', [DashboardController::class, 'metalRates']);

    // Work Orders & Live Job Workflow (Pages 14, 15, 16 & Job Order views)
    Route::get('/work-orders/dashboard-stats', [WorkOrderController::class, 'dashboardStats']);
    Route::get('/work-orders/generate-number', [WorkOrderController::class, 'generateOrderNumber']);
    Route::post('/work-orders/{id}/receiver-update', [WorkOrderController::class, 'updateReceiver']);
    Route::post('/work-orders/{id}/karigar-update', [WorkOrderController::class, 'karigarUpdate']);
    Route::post('/work-orders/{id}/timeline-update', [WorkOrderController::class, 'addTimelineUpdate']);
    Route::post('/work-orders/{id}/delay-update', [WorkOrderController::class, 'delayUpdate']);
    Route::post('/work-orders/{id}/approve', [WorkOrderController::class, 'approve']);
    Route::post('/work-orders/{id}/return', [WorkOrderController::class, 'returnOrReject']);
    Route::post('/work-orders/{id}/mark-ready', [WorkOrderController::class, 'markReady']);
    Route::post('/work-orders/{id}/final-receive', [WorkOrderController::class, 'finalReceive']);
    Route::get('/work-orders/{id}/pdf', [WorkOrderController::class, 'exportPdf']);
    Route::apiResource('work-orders', WorkOrderController::class);

    Route::get('/jobs/new-id', [JobController::class, 'getNewId']);
    Route::get('/jobs/{id}', [JobController::class, 'show']);
    Route::post('/jobs', [JobController::class, 'store']);

    Route::get('/clients/generate-code', [ClientController::class, 'generateCode']);
    Route::get('/clients/removed', [ClientController::class, 'removedClients']);
    Route::post('/clients/{id}/remove', [ClientController::class, 'removeClient']);
    Route::post('/clients/{id}/restore', [ClientController::class, 'restoreClient']);
    Route::get('/clients/{client}/price-list', [ClientPriceListController::class, 'show']);
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
    Route::get('/sales/products', [SalesController::class, 'products']);
    Route::get('/sales/profit', [SalesController::class, 'profit']);
    Route::get('/sales/customers/{client}', [SalesController::class, 'customer']);
    Route::post('/sales/{sale}/payments', [SalesController::class, 'payment']);
    Route::get('/sales/{sale}', [SalesController::class, 'show']);
    Route::get('/sales', [SalesController::class, 'index']);
    Route::post('/sales', [SalesController::class, 'store']);

    Route::apiResource('roles', RoleController::class);
    Route::apiResource('permissions', PermissionController::class);
    Route::apiResource('users', UserController::class);
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('subcategories', SubcategoryController::class);
    Route::get('/products/generate-sku', [ProductController::class, 'generateSku']);
    Route::post('/products/bulk-opening-stock', [ProductController::class, 'bulkUpdateOpeningStock']);
    Route::post('/products/{id}/opening-stock', [ProductController::class, 'updateOpeningStock']);
    Route::apiResource('products', ProductController::class);
    Route::apiResource('memberships', MembershipController::class);
    Route::apiResource('suppliers', SupplierController::class);
    Route::get('/purchase-entries/generate-no', [PurchaseEntryController::class, 'generateNo']);
    Route::apiResource('purchase-entries', PurchaseEntryController::class);

    // Product Designs & Upload
    Route::get('/product-designs/meta', [\App\Http\Controllers\Api\ProductDesignController::class, 'meta']);
    Route::get('/product-designs/export-pdf', [\App\Http\Controllers\Api\ProductDesignController::class, 'exportPdf']);
    Route::get('/product-designs/export-excel', [\App\Http\Controllers\Api\ProductDesignController::class, 'exportExcel']);
    Route::post('/product-designs/{id}', [\App\Http\Controllers\Api\ProductDesignController::class, 'update']);
    Route::apiResource('product-designs', \App\Http\Controllers\Api\ProductDesignController::class);

    // Setting Styles, Gold Types, Diamond Ranges
    Route::apiResource('styles', \App\Http\Controllers\Api\StyleController::class);
    Route::apiResource('gold-types', \App\Http\Controllers\Api\GoldTypeController::class);
    Route::apiResource('diamond-ranges', \App\Http\Controllers\Api\DiamondRangeController::class);

    // Karigar (Artisan) Management
    Route::get('/karigars/generate-code', [KarigarController::class, 'generateCode']);
    Route::get('/karigars/{id}/works', [KarigarController::class, 'works']);
    Route::apiResource('karigars', KarigarController::class);
    Route::apiResource('work-specifications', \App\Http\Controllers\Api\WorkSpecificationController::class);

    // Inventory Module
    Route::get('/inventory/categories', [InventoryController::class, 'getCategories']);
    Route::get('/inventory/sample-csv', [InventoryController::class, 'downloadSampleCsv']);
    Route::post('/inventory/bulk-upload', [InventoryController::class, 'bulkUpload']);
    Route::get('/inventory/products/{id}', [InventoryController::class, 'show']);
    Route::put('/inventory/products/{id}', [InventoryController::class, 'update']);
    Route::delete('/inventory/products/{id}', [InventoryController::class, 'destroy']);
    Route::post('/inventory/products/{id}/movements', [InventoryController::class, 'addMovement']);
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::post('/inventory', [InventoryController::class, 'store']);
});

// Public download route for inventory sample CSV
Route::get('/inventory/sample-csv', [InventoryController::class, 'downloadSampleCsv']);

// Public / direct export routes for convenient downloading
Route::get('/product-designs/export-pdf', [\App\Http\Controllers\Api\ProductDesignController::class, 'exportPdf']);
Route::get('/product-designs/export-excel', [\App\Http\Controllers\Api\ProductDesignController::class, 'exportExcel']);
