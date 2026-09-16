<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (!Schema::hasColumn('clients', 'is_removed')) {
                $table->boolean('is_removed')->default(false)->index();
            }
            if (!Schema::hasColumn('clients', 'removed_at')) {
                $table->timestamp('removed_at')->nullable();
            }
            if (!Schema::hasColumn('clients', 'remove_reason')) {
                $table->string('remove_reason', 150)->nullable();
            }
            if (!Schema::hasColumn('clients', 'can_be_restored')) {
                $table->boolean('can_be_restored')->default(true);
            }
            if (!Schema::hasColumn('clients', 'removed_by')) {
                $table->string('removed_by', 100)->nullable()->default('Arvind (Admin)');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            $table->dropColumn(['is_removed', 'removed_at', 'remove_reason', 'can_be_restored', 'removed_by']);
        });
    }
};
