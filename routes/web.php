<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::get('/', function () {
    return redirect()->route('login');
});

Route::get('/login', [AuthController::class, 'showLogin'])->name('login');
Route::post('/login', [AuthController::class, 'login'])->name('login.post');
Route::post('/logout', [AuthController::class, 'logout'])->name('logout');

Route::get('/dashboard', function () {
    return view('dashboard');
})->name('dashboard');

Route::get('/job-creation/new', function () {
    return view('job-creation.new');
})->name('job.new');

Route::get('/job-creation/receive', function () {
    return view('job-creation.receive');
})->name('job.receive');

Route::get('/job-creation/order', function () {
    return view('job-creation.order');
})->name('job.order');

