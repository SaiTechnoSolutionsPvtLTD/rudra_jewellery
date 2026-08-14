<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login'])->name('login.post');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

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

