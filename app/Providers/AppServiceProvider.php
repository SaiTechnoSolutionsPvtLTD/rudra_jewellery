<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if (!app()->environment('local') && file_exists(public_path('hot'))) {
            @unlink(public_path('hot'));
        }

        if (request()->secure() || str_contains(request()->header('x-forwarded-proto', ''), 'https')) {
            \Illuminate\Support\Facades\URL::forceScheme('https');
        }
    }
}
