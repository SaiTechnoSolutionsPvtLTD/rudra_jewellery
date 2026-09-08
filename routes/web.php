<?php

use Illuminate\Support\Facades\Route;

// Render SPA shell for all non-API web routes
Route::get('/{any?}', function () {
    return view('app');
})->where('any', '.*');
