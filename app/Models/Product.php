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
        'design_no',
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
        'master_tag_number',
    ];

    public function getMasterTagNumberAttribute(): ?string
    {
        return $this->product_code;
    }

    public function getImageUrlAttribute()
    {
        if ($this->image) {
            if (filter_var($this->image, FILTER_VALIDATE_URL)) {
                return $this->image;
            }
            if (str_starts_with($this->image, 'data:image')) {
                return $this->image;
            }
            if ($this->image === '/placeholder-jewelry.png' || $this->image === 'placeholder-jewelry.png') {
                return '/placeholder-jewelry.png';
            }
            if (str_starts_with($this->image, '/storage/') || str_starts_with($this->image, 'storage/')) {
                return '/' . ltrim($this->image, '/');
            }
            if (str_starts_with($this->image, '/images/') || str_starts_with($this->image, 'images/')) {
                return '/' . ltrim($this->image, '/');
            }
            if (str_starts_with($this->image, 'products/')) {
                return '/storage/' . $this->image;
            }
            if (str_starts_with($this->image, '/')) {
                return $this->image;
            }
            return '/storage/' . $this->image;
        }
        return null;
    }

    public function getThumbnailUrlAttribute()
    {
        if ($this->thumbnail) {
            if (filter_var($this->thumbnail, FILTER_VALIDATE_URL)) {
                return $this->thumbnail;
            }
            if (str_starts_with($this->thumbnail, 'data:image')) {
                return $this->thumbnail;
            }
            if ($this->thumbnail === '/placeholder-jewelry.png' || $this->thumbnail === 'placeholder-jewelry.png') {
                return '/placeholder-jewelry.png';
            }
            if (str_starts_with($this->thumbnail, '/storage/') || str_starts_with($this->thumbnail, 'storage/')) {
                return '/' . ltrim($this->thumbnail, '/');
            }
            if (str_starts_with($this->thumbnail, '/images/') || str_starts_with($this->thumbnail, 'images/')) {
                return '/' . ltrim($this->thumbnail, '/');
            }
            if (str_starts_with($this->thumbnail, 'products/')) {
                return '/storage/' . $this->thumbnail;
            }
            if (str_starts_with($this->thumbnail, '/')) {
                return $this->thumbnail;
            }
            return '/storage/' . $this->thumbnail;
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

    public function saleItems()
    {
        return $this->hasMany(SaleItem::class);
    }

    public function inventoryMovements()
    {
        return $this->hasMany(InventoryMovement::class);
    }

    public function receivedPieces()
    {
        return $this->hasMany(WorkOrderReceivedPiece::class, 'product_id')->latest('received_at');
    }
}
