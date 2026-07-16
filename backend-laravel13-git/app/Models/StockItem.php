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
        'name',
        'category',
        'unit',
        'unit_cost',
        'minimum_threshold',
        'current_quantity',
        'location',
    ];

    protected $casts = [
        'unit_cost' => 'decimal:2',
        'minimum_threshold' => 'integer',
        'current_quantity' => 'integer',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }
}
