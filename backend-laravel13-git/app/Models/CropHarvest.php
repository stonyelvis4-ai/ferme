<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CropHarvest extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'crop_id',
        'plot_id',
        'harvest_date',
        'harvested_kg',
        'losses_kg',
        'sellable_kg',
        'destination',
        'notes',
        'stock_movement_id',
    ];

    protected $casts = [
        'harvest_date' => 'date',
        'harvested_kg' => 'decimal:2',
        'losses_kg' => 'decimal:2',
        'sellable_kg' => 'decimal:2',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function crop(): BelongsTo
    {
        return $this->belongsTo(Crop::class);
    }

    public function plot(): BelongsTo
    {
        return $this->belongsTo(Plot::class);
    }

    public function stockMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class, 'stock_movement_id');
    }
}
