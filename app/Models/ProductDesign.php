<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductDesign extends Model
{
    protected $fillable = [
        'design_no',
        'image_path',
        'dia_wt_ct',
        'net_wt',
        'status',
        'category',
        'purity',
        'stone_type',
        'size',
        'gold_type',
        'setting_style',
        'stamp',
        'stone_size',
        'stone_color',
        'variants',
    ];

    protected $casts = [
        'variants' => 'array',
    ];

    public function getImagePathAttribute($value)
    {
        if (empty($value)) return [];
        
        $decoded = json_decode($value, true);
        
        if (json_last_error() === JSON_ERROR_NONE) {
            return is_array($decoded) ? $decoded : [$decoded];
        }
        
        return [$value]; // Legacy string path
    }

    public function setImagePathAttribute($value)
    {
        $this->attributes['image_path'] = is_array($value) ? json_encode($value) : $value;
    }
}
