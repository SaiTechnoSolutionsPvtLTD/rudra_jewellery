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
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('client_code')->unique();
            $table->string('full_name');
            $table->enum('gender', ['male', 'female', 'other'])->default('female');
            $table->date('dob')->nullable();
            $table->date('anniversary_date')->nullable();
            $table->string('primary_phone');
            $table->string('secondary_phone')->nullable();
            $table->string('email')->nullable();
            $table->string('aadhar_number')->nullable();
            $table->string('pan_number')->nullable();
            $table->string('street_address')->nullable();
            $table->string('city')->nullable();
            $table->string('state')->nullable();
            $table->string('zip_code')->nullable();
            $table->string('company_name')->nullable();
            $table->string('gst_number')->nullable();
            $table->string('designation')->nullable();
            $table->string('membership_tier')->default('silver');
            $table->decimal('total_purchases', 14, 2)->default(0.00);
            $table->timestamp('last_visit')->nullable();
            $table->text('quick_notes')->nullable();
            $table->string('avatar')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
