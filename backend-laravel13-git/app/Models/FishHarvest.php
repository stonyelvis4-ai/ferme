<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FishHarvest extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'fish_pond_id',
        'harvest_date',
        'total_weight_kg',
        'losses_kg',
        'sellable_weight_kg',
        'destination',
        'notes',
        'stock_movement_id',
    ];

    protected $casts = [
        'harvest_date' => 'date',
        'total_weight_kg' => 'decimal:2',
        'losses_kg' => 'decimal:2',
        'sellable_weight_kg' => 'decimal:2',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function pond(): BelongsTo
    {
        return $this->belongsTo(FishPond::class, 'fish_pond_id');
    }

    public function stockMovement(): BelongsTo
    {
        return $this->belongsTo(StockMovement::class, 'stock_movement_id');
    }
}
