<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class StockItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'reference',
        'name',
        'description',
        'brand',
        'category',
        'category_id',
        'supplier_id',
        'batch_number',
        'purchase_date',
        'manufacturing_date',
        'expiration_date',
        'unit',
        'unit_cost',
        'purchase_total_cost',
        'currency',
        'minimum_threshold',
        'maximum_stock',
        'current_quantity',
        'location',
        'storage_location',
        'image_path',
        'notes',
        'is_active',
        'business_module',
        'related_type',
        'related_id',
    ];

    protected $casts = [
        'unit_cost' => 'decimal:2',
        'purchase_total_cost' => 'decimal:2',
        'minimum_threshold' => 'decimal:3',
        'maximum_stock' => 'decimal:3',
        'current_quantity' => 'decimal:3',
        'purchase_date' => 'date',
        'manufacturing_date' => 'date',
        'expiration_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function categoryRelation(): BelongsTo
    {
        return $this->belongsTo(StockCategory::class, 'category_id');
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }
}
