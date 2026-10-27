<?php

namespace App\Console\Commands;

use App\Services\MetalRateService;
use Illuminate\Console\Command;

class SyncMetalRatesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'metal-rates:sync {--force : Force sync even if manual rates exist}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync daily Gold and Silver metal rates from external market data / MCX';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting metal rate synchronization...');

        $rates = MetalRateService::getCurrentRates();

        $this->info("Date: {$rates['date']}");
        $this->info("Source: {$rates['source']}");
        $this->info("Gold 24K: ₹{$rates['gold24k']} / gram");
        $this->info("Gold 22K: ₹{$rates['gold22k']} / gram");
        $this->info("Gold 18K: ₹{$rates['gold18k']} / gram");
        $this->info("Silver: ₹{$rates['silverGram']} / gram");

        $this->info('Metal rates synced successfully.');
        return self::SUCCESS;
    }
}
