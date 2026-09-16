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
        Schema::create('karigars', function (Blueprint $table) {
            $table->id();
            $table->string('karigar_code')->unique();
            $table->string('name');
            $table->string('primary_phone');
            $table->string('secondary_phone')->nullable();
            $table->string('email')->nullable();
            $table->string('specialization')->default('Plain Gold & Casting');
            $table->integer('experience_years')->default(0);
            $table->string('workshop_name')->nullable();
            $table->text('workshop_address')->nullable();
            $table->string('city')->nullable()->default('Chennai');
            $table->string('state')->nullable()->default('Tamil Nadu');
            $table->string('zip_code')->nullable();
            
            // Financial & KYC
            $table->string('pan_number')->nullable();
            $table->string('aadhar_number')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('account_number')->nullable();
            $table->string('ifsc_code')->nullable();
            $table->string('upi_id')->nullable();
            
            // Craft Rates & Metal Balance
            $table->decimal('standard_wastage_percent', 5, 2)->default(4.50);
            $table->decimal('making_charge_per_gram', 10, 2)->default(550.00);
            $table->decimal('current_gold_balance_grams', 10, 3)->default(0.000);
            
            // Operational
            $table->string('status')->default('active'); // active, on_leave, inactive
            $table->string('avatar_url')->nullable();
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('karigars');
    }
};
