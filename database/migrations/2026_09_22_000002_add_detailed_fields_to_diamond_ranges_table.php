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
        Schema::table('diamond_ranges', function (Blueprint $table) {
            if (!Schema::hasColumn('diamond_ranges', 'item_name')) {
                $table->string('item_name')->default('DIAMOND')->after('code');
            }
            if (!Schema::hasColumn('diamond_ranges', 'stamp')) {
                $table->string('stamp')->default('1')->nullable()->after('item_name');
            }
            if (!Schema::hasColumn('diamond_ranges', 'part')) {
                $table->string('part')->nullable()->after('stamp');
            }
            if (!Schema::hasColumn('diamond_ranges', 'colour')) {
                $table->string('colour')->default('D')->nullable()->after('part');
            }
            if (!Schema::hasColumn('diamond_ranges', 'clarity')) {
                $table->string('clarity')->default('VS')->nullable()->after('colour');
            }
            if (!Schema::hasColumn('diamond_ranges', 'remarks')) {
                $table->string('remarks')->nullable()->after('clarity');
            }
            if (!Schema::hasColumn('diamond_ranges', 'unit')) {
                $table->string('unit')->default('Carat')->after('remarks');
            }
            if (!Schema::hasColumn('diamond_ranges', 'tunch')) {
                $table->string('tunch')->nullable()->after('unit');
            }
            if (!Schema::hasColumn('diamond_ranges', 'sale_lb')) {
                $table->string('sale_lb')->nullable()->after('tunch');
            }
            if (!Schema::hasColumn('diamond_ranges', 'pc')) {
                $table->integer('pc')->default(1)->after('sale_lb');
            }
            if (!Schema::hasColumn('diamond_ranges', 'wt_ct')) {
                $table->decimal('wt_ct', 8, 3)->default(1.000)->after('pc');
            }
            if (!Schema::hasColumn('diamond_ranges', 'dollar')) {
                $table->decimal('dollar', 10, 2)->default(0.00)->after('wt_ct');
            }
            if (!Schema::hasColumn('diamond_ranges', 'disc_percent')) {
                $table->decimal('disc_percent', 5, 2)->default(0.00)->after('dollar');
            }
            if (!Schema::hasColumn('diamond_ranges', 'dolx_rate')) {
                $table->decimal('dolx_rate', 10, 2)->default(0.00)->after('disc_percent');
            }
            if (!Schema::hasColumn('diamond_ranges', 'rate')) {
                $table->decimal('rate', 12, 2)->default(13500.00)->after('dolx_rate');
            }
            if (!Schema::hasColumn('diamond_ranges', 'value')) {
                $table->decimal('value', 14, 2)->default(13500.00)->after('rate');
            }
        });

        // Seed initial detailed diamond items matching Image 2
        $seedData = [
            [
                'name' => 'DIAMOND 3.020 ct',
                'code' => 'DIA-D-VS-302',
                'item_name' => 'DIAMOND',
                'stamp' => '1',
                'part' => '-',
                'colour' => 'D',
                'clarity' => 'VS',
                'remarks' => '-',
                'unit' => 'Carat',
                'tunch' => '-',
                'sale_lb' => '-',
                'pc' => 2,
                'wt_ct' => 3.020,
                'dollar' => 0.00,
                'disc_percent' => 0.00,
                'dolx_rate' => 0.00,
                'rate' => 13500.00,
                'value' => 40770.00,
            ],
            [
                'name' => 'DIAMOND 2.450 ct',
                'code' => 'DIA-D-VS-245',
                'item_name' => 'DIAMOND',
                'stamp' => '1',
                'part' => '-',
                'colour' => 'D',
                'clarity' => 'VS',
                'remarks' => '-',
                'unit' => 'Carat',
                'tunch' => '-',
                'sale_lb' => '-',
                'pc' => 2,
                'wt_ct' => 2.450,
                'dollar' => 0.00,
                'disc_percent' => 0.00,
                'dolx_rate' => 0.00,
                'rate' => 13500.00,
                'value' => 33075.00,
            ],
            [
                'name' => 'DIAMOND 1.120 ct',
                'code' => 'DIA-D-VS-112',
                'item_name' => 'DIAMOND',
                'stamp' => '1',
                'part' => '-',
                'colour' => 'D',
                'clarity' => 'VS',
                'remarks' => '-',
                'unit' => 'Carat',
                'tunch' => '-',
                'sale_lb' => '-',
                'pc' => 2,
                'wt_ct' => 1.120,
                'dollar' => 0.00,
                'disc_percent' => 0.00,
                'dolx_rate' => 0.00,
                'rate' => 13500.00,
                'value' => 15120.00,
            ],
        ];

        foreach ($seedData as $data) {
            DB::table('diamond_ranges')->insertOrIgnore(array_merge($data, [
                'min_ct' => $data['wt_ct'],
                'max_ct' => $data['wt_ct'],
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('diamond_ranges', function (Blueprint $table) {
            $table->dropColumn([
                'item_name', 'stamp', 'part', 'colour', 'clarity', 'remarks',
                'unit', 'tunch', 'sale_lb', 'pc', 'wt_ct', 'dollar',
                'disc_percent', 'dolx_rate', 'rate', 'value'
            ]);
        });
    }
};
