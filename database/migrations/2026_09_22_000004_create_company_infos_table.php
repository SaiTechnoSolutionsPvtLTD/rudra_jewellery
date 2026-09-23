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
        Schema::create('company_infos', function (Blueprint $table) {
            $table->id();
            $table->string('company_name');
            $table->string('tagline')->nullable();
            $table->string('address_line1')->nullable();
            $table->string('address_line2')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('pincode')->nullable();
            $table->string('state_code')->nullable();
            $table->string('phone')->nullable();
            $table->string('alternate_phone')->nullable();
            $table->string('email')->nullable();
            $table->string('website')->nullable();
            $table->string('gstin')->nullable();
            $table->string('pan_no')->nullable();
            $table->string('reg_no')->nullable();
            $table->string('hallmark_license')->nullable();
            $table->text('terms_and_conditions')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('account_number')->nullable();
            $table->string('ifsc_code')->nullable();
            $table->string('branch')->nullable();
            $table->text('logo_url')->nullable();
            $table->boolean('is_default')->default(true);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Insert initial default company record
        DB::table('company_infos')->insert([
            'company_name' => 'RUDRA JEWELLERS',
            'tagline' => 'Exclusive Fine Gold, Diamond & Gemstone Jewellery',
            'address_line1' => '124, N.S.C. Bose Road',
            'address_line2' => 'Sowcarpet',
            'city' => 'Chennai',
            'state' => 'Tamil Nadu',
            'pincode' => '600079',
            'state_code' => '33',
            'phone' => '+91 98400 12345',
            'alternate_phone' => '044-25380000',
            'email' => 'info@rudrajewellers.com',
            'website' => 'www.rudrajewellers.com',
            'gstin' => '33AAACR1234F1Z0',
            'pan_no' => 'AAACR1234F',
            'reg_no' => 'CHN/2026/JEW/9912',
            'hallmark_license' => 'HM-339018274',
            'terms_and_conditions' => "1. Goods once sold will not be taken back or exchanged after 7 days.\n2. Weight and purity certified as per BIS Hallmark standards.\n3. Subject to Chennai jurisdiction only.",
            'bank_name' => 'HDFC Bank',
            'account_number' => '50200018899221',
            'ifsc_code' => 'HDFC0000124',
            'branch' => 'Sowcarpet, Chennai',
            'logo_url' => '/logo.png',
            'is_default' => true,
            'is_active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_infos');
    }
};
