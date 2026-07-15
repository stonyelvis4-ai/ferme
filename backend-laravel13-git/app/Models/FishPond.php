<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class FishPond extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'name',
        'pond_type',
        'capacity_kg',
        'species',
        'initial_fish_count',
        'stocking_date',
        'status',
        'current_estimated_count',
        'mortality_total',
        'average_weight_kg',
        'biomass_kg',
        'feed_distributed_kg',
        'fcr',
        'notes',
    ];

    protected $casts = [
        'capacity_kg' => 'decimal:2',
        'stocking_date' => 'date',
        'initial_fish_count' => 'integer',
        'current_estimated_count' => 'integer',
        'mortality_total' => 'integer',
        'average_weight_kg' => 'decimal:2',
        'biomass_kg' => 'decimal:2',
        'feed_distributed_kg' => 'decimal:2',
        'fcr' => 'decimal:2',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function stockings(): HasMany
    {
        return $this->hasMany(FishStocking::class);
    }

    public function monitorings(): HasMany
    {
        return $this->hasMany(FishMonitoring::class);
    }

    public function harvests(): HasMany
    {
        return $this->hasMany(FishHarvest::class);
    }

    public function sales(): HasMany
    {
        return $this->hasMany(FishSale::class);
    }
}
