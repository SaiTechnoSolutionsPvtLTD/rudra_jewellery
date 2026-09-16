<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            if (!Schema::hasColumn('invoices', 'paid_amount')) $table->decimal('paid_amount', 12, 2)->default(0)->after('total_amount');
            if (!Schema::hasColumn('invoices', 'due_amount')) $table->decimal('due_amount', 12, 2)->default(0)->after('paid_amount');
            if (!Schema::hasColumn('invoices', 'due_date')) $table->date('due_date')->nullable()->after('due_amount');
            if (!Schema::hasColumn('invoices', 'payment_method')) $table->string('payment_method')->nullable()->after('due_date');
            if (!Schema::hasColumn('invoices', 'cost_amount')) $table->decimal('cost_amount', 12, 2)->default(0)->after('payment_method');
            if (!Schema::hasColumn('invoices', 'profit_amount')) $table->decimal('profit_amount', 12, 2)->default(0)->after('cost_amount');
            if (!Schema::hasColumn('invoices', 'sale_status')) $table->string('sale_status')->default('completed')->after('profit_amount');
            if (!Schema::hasColumn('invoices', 'created_by')) $table->foreignId('created_by')->nullable()->after('sale_status')->constrained('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            foreach (['created_by', 'sale_status', 'profit_amount', 'cost_amount', 'payment_method', 'due_date', 'due_amount', 'paid_amount'] as $column) {
                if (Schema::hasColumn('invoices', $column)) $table->dropColumn($column);
            }
        });
    }
};
