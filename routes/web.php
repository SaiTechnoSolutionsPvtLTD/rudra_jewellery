<?php

use Illuminate\Support\Facades\Route;

// Direct PDF / CSV downloads if accessed via web route
Route::get('/work-orders/{id}/pdf', [\App\Http\Controllers\Api\WorkOrderController::class, 'exportPdf'])->name('work-orders.export-pdf');
Route::get('/product-upload/export-pdf', [\App\Http\Controllers\Api\ProductDesignController::class, 'exportPdf'])->name('product-upload.export-pdf');
Route::get('/product-upload/export-csv', [\App\Http\Controllers\Api\ProductDesignController::class, 'exportExcel'])->name('product-upload.export-csv');

// Render React SPA shell for all web routes
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '.*')->name('login');

