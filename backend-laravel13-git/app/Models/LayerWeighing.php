<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LayerWeighing extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'layer_batch_id',
        'weighing_date',
        'sample_size',
        'average_weight_kg',
        'total_weight_kg',
        'weight_gain_kg',
        'notes',
    ];

    protected $casts = [
        'weighing_date' => 'date',
        'sample_size' => 'integer',
        'average_weight_kg' => 'decimal:3',
        'total_weight_kg' => 'decimal:3',
        'weight_gain_kg' => 'decimal:3',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(LayerBatch::class, 'layer_batch_id');
    }
}
