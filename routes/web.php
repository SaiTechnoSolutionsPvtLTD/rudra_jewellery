<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login'])->name('login.post');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

Route::get('/sales', function () {
    return view('sales.index');
})->name('sales.index');

Route::get('/purchase/create', function () {
    return view('purchase.create');
})->name('purchase.create');

Route::get('/inventory', function () {
    return view('inventory.index');
})->name('inventory.index');

Route::get('/inventory/bulk', function () {
    return view('inventory.bulk');
})->name('inventory.bulk');

Route::get('/inventory/create', function () {
    return view('inventory.create');
})->name('inventory.create');

Route::get('/sales/create', function () {
    return view('sales.create');
})->name('sales.create');

Route::get('/price-listing', function () {
    return view('price-listing.index');
})->name('price-listing.index');

Route::get('/client', function () {
    return view('client.index');
})->name('client.index');

Route::get('/client/create', function () {
    return view('client.create');
})->name('client.create');

Route::get('/client/billing', function () {
    return view('client.billing');
})->name('client.billing');

Route::get('/client/pricelist', function () {
    return view('client.pricelist');
})->name('client.pricelist');

Route::get('/client/pricelist/details', function () {
    return view('client.pricelist-details');
})->name('client.pricelist.details');

Route::get('/client/remove', function () {
    return view('client.remove');
})->name('client.remove');

Route::get('/dashboard', function () {
    return view('dashboard');
})->name('dashboard');

Route::get('/job-creation', function () {
    return view('job-creation.index');
})->name('job.index');

Route::get('/job-creation/new', function () {
    return view('job-creation.new');
})->name('job.new');

Route::get('/job-creation/receive', function () {
    return view('job-creation.receive');
})->name('job.receive');

Route::get('/job-creation/order', function () {
    return view('job-creation.order');
})->name('job.order');

