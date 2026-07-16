<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LayerBatch extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'name',
        'breed',
        'entry_date',
        'initial_count',
        'mortality_total',
        'reform_total',
        'current_count',
        'status',
        'unit_cost',
        'acquisition_cost',
        'financial_transaction_id',
    ];

    protected $casts = [
        'entry_date' => 'date',
        'initial_count' => 'integer',
        'mortality_total' => 'integer',
        'reform_total' => 'integer',
        'current_count' => 'integer',
        'unit_cost' => 'decimal:2',
        'acquisition_cost' => 'decimal:2',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function productions(): HasMany
    {
        return $this->hasMany(EggProduction::class, 'layer_batch_id');
    }

    public function sales(): HasMany
    {
        return $this->hasMany(EggSale::class, 'layer_batch_id');
    }
}
