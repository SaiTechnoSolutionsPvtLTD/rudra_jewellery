<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkSpecification extends Model
{
    use HasFactory;

    protected $table = 'work_specifications';

    protected $fillable = [
        'name',
        'code',
        'description',
        'default_wastage_percent',
        'default_making_charge',
        'icon',
        'color',
        'status',
        'sort_order',
    ];

    protected $casts = [
        'default_wastage_percent' => 'float',
        'default_making_charge' => 'float',
        'sort_order' => 'integer',
    ];

    /**
     * Artisans with this specialization
     */
    public function karigars()
    {
        return $this->hasMany(Karigar::class, 'specialization', 'name');
    }
}
