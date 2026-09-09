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

// Public authentication routes
Route::post('/login', [AuthController::class, 'login']);

// Protected routes using Sanctum token authentication
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::get('/dashboard', [DashboardController::class, 'index']);
    Route::get('/metal-rates', [DashboardController::class, 'metalRates']);

    Route::get('/jobs/new-id', [JobController::class, 'getNewId']);
    Route::get('/jobs/{id}', [JobController::class, 'show']);
    Route::post('/jobs', [JobController::class, 'store']);

    Route::get('/clients/generate-code', [ClientController::class, 'generateCode']);
    Route::get('/clients/{client}/price-list', [ClientPriceListController::class, 'show']);
    Route::post('/clients/{client}/price-list', [ClientPriceListController::class, 'storeOrUpdate']);
    Route::apiResource('clients', ClientController::class);

    Route::get('/billing', [ClientController::class, 'billing']);
    Route::post('/invoices', [ClientController::class, 'storeInvoice']);

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
});
