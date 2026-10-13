<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasTable('stamps')) {
            Schema::table('stamps', function (Blueprint $table) {
                if (!Schema::hasColumn('stamps', 'applicable_for')) {
                    $table->string('applicable_for')->default('Gold,Diamond,Stone')->after('code');
                }
            });

            // Update existing stamp links
            $updates = [
                '916' => 'Gold',
                '999' => 'Gold',
                '750' => 'Gold',
                '585' => 'Gold',
                '925' => 'Gold',
                'BIS Hallmarked' => 'Gold,Diamond,Stone',
                'HM' => 'Gold,Diamond,Stone',
            ];

            foreach ($updates as $codeOrName => $applicable) {
                $str = (string) $codeOrName;
                DB::table('stamps')
                    ->where(function($q) use ($str) {
                        $q->where('name', $str)->orWhere('code', $str);
                    })
                    ->update(['applicable_for' => $applicable]);
            }

            // Insert default Diamond & Stone stamps if not existing
            $extraStamps = [
                ['name' => 'IGI Certified', 'code' => 'IGI', 'applicable_for' => 'Diamond', 'sort_order' => 7],
                ['name' => 'GIA Certified', 'code' => 'GIA', 'applicable_for' => 'Diamond', 'sort_order' => 8],
                ['name' => 'Solitaire Hallmark', 'code' => 'SOL', 'applicable_for' => 'Diamond', 'sort_order' => 9],
                ['name' => 'Certified Stone', 'code' => 'CST', 'applicable_for' => 'Stone', 'sort_order' => 10],
                ['name' => 'Gem Hallmark', 'code' => 'GEM', 'applicable_for' => 'Stone', 'sort_order' => 11],
            ];

            foreach ($extraStamps as $s) {
                if (!DB::table('stamps')->where('name', $s['name'])->exists()) {
                    DB::table('stamps')->insert(array_merge($s, [
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]));
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (Schema::hasTable('stamps') && Schema::hasColumn('stamps', 'applicable_for')) {
            Schema::table('stamps', function (Blueprint $table) {
                $table->dropColumn('applicable_for');
            });
        }
    }
};
