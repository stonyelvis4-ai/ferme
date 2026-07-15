<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EggProduction extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'layer_batch_id',
        'production_date',
        'eggs_produced',
        'broken_eggs',
        'dirty_eggs',
        'lost_eggs',
        'mortality',
        'observations',
        'vendable_eggs',
        'plateaux',
    ];

    protected $casts = [
        'production_date' => 'date',
        'eggs_produced' => 'integer',
        'broken_eggs' => 'integer',
        'dirty_eggs' => 'integer',
        'lost_eggs' => 'integer',
        'mortality' => 'integer',
        'vendable_eggs' => 'integer',
        'plateaux' => 'integer',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function batch(): BelongsTo
    {
        return $this->belongsTo(LayerBatch::class, 'layer_batch_id');
    }
}

