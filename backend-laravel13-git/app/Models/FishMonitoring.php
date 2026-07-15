<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FishMonitoring extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'fish_pond_id',
        'monitoring_date',
        'estimated_count',
        'mortality',
        'average_weight_kg',
        'biomass_kg',
        'feed_distributed_kg',
        'fcr',
        'growth_kg',
        'water_temperature',
        'ph',
        'oxygen',
        'turbidity',
        'water_renewal_percent',
        'observations',
    ];

    protected $casts = [
        'monitoring_date' => 'date',
        'estimated_count' => 'integer',
        'mortality' => 'integer',
        'average_weight_kg' => 'decimal:2',
        'biomass_kg' => 'decimal:2',
        'feed_distributed_kg' => 'decimal:2',
        'fcr' => 'decimal:2',
        'growth_kg' => 'decimal:2',
        'water_temperature' => 'decimal:2',
        'ph' => 'decimal:2',
        'oxygen' => 'decimal:2',
        'turbidity' => 'decimal:2',
        'water_renewal_percent' => 'decimal:2',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function pond(): BelongsTo
    {
        return $this->belongsTo(FishPond::class, 'fish_pond_id');
    }
}
