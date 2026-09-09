<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'subcategory_id',
        'name',
        'product_code',
        'attributes',
        'description',
        'opening_stock_qty',
        'opening_stock_weight',
        'opening_touch',
        'opening_fine_weight',
        'opening_stock_rate',
        'opening_stock_date',
        'current_stock_qty',
        'image',
        'thumbnail',
        'status',
    ];

    protected $casts = [
        'attributes' => 'array',
        'opening_stock_qty' => 'integer',
        'opening_stock_weight' => 'float',
        'opening_touch' => 'float',
        'opening_fine_weight' => 'float',
        'opening_stock_rate' => 'float',
        'opening_stock_date' => 'date:Y-m-d',
        'current_stock_qty' => 'integer',
    ];

    protected $appends = [
        'image_url',
        'thumbnail_url',
    ];

    public function getImageUrlAttribute()
    {
        if ($this->image) {
            if (filter_var($this->image, FILTER_VALIDATE_URL)) {
                return $this->image;
            }
            return asset('storage/' . $this->image);
        }
        return null;
    }

    public function getThumbnailUrlAttribute()
    {
        if ($this->thumbnail) {
            if (filter_var($this->thumbnail, FILTER_VALIDATE_URL)) {
                return $this->thumbnail;
            }
            return asset('storage/' . $this->thumbnail);
        }
        return $this->image_url;
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function subcategory()
    {
        return $this->belongsTo(Subcategory::class);
    }
}
