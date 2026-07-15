<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SanitaryTreatment extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'layer_batch_id',
        'type',
        'name',
        'planned_date',
        'dosage',
        'product_id',
        'quantity_used',
        'status',
        'cost',
        'notes',
    ];

    protected $casts = [
        'planned_date' => 'date',
        'quantity_used' => 'decimal:2',
        'cost' => 'decimal:2',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function layerBatch(): BelongsTo
    {
        return $this->belongsTo(LayerBatch::class, 'layer_batch_id');
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(StockItem::class, 'product_id');
    }
}
