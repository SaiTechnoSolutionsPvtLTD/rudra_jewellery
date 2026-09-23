<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CompanyInfo extends Model
{
    use HasFactory;

    protected $table = 'company_infos';

    protected $fillable = [
        'company_name',
        'tagline',
        'address_line1',
        'address_line2',
        'city',
        'state',
        'pincode',
        'state_code',
        'phone',
        'alternate_phone',
        'email',
        'website',
        'gstin',
        'pan_no',
        'reg_no',
        'hallmark_license',
        'terms_and_conditions',
        'bank_name',
        'account_number',
        'ifsc_code',
        'branch',
        'logo_url',
        'is_default',
        'is_active',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'is_active' => 'boolean',
    ];
}
