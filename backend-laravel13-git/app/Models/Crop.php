<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Crop extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'name',
        'variety',
        'cycle_days',
        'planting_date',
        'area',
        'status',
        'estimated_harvest_date',
        'expected_yield_kg',
        'total_operations_cost',
        'total_harvest_kg',
        'notes',
    ];

    protected $casts = [
        'cycle_days' => 'integer',
        'planting_date' => 'date',
        'estimated_harvest_date' => 'date',
        'area' => 'decimal:2',
        'expected_yield_kg' => 'decimal:2',
        'total_operations_cost' => 'decimal:2',
        'total_harvest_kg' => 'decimal:2',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function plots(): HasMany
    {
        return $this->hasMany(Plot::class);
    }

    public function operations(): HasMany
    {
        return $this->hasMany(CropOperation::class);
    }

    public function harvests(): HasMany
    {
        return $this->hasMany(CropHarvest::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(CropSale::class);
    }
}
