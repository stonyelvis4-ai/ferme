<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LayerFeedPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'layer_batch_id',
        'stock_item_id',
        'plan_name',
        'ration_per_head_kg',
        'feedings_per_day',
        'target_daily_quantity_kg',
        'start_date',
        'notes',
        'is_active',
    ];

    protected $casts = [
        'ration_per_head_kg' => 'decimal:3',
        'feedings_per_day' => 'integer',
        'target_daily_quantity_kg' => 'decimal:3',
        'start_date' => 'date',
        'is_active' => 'boolean',
    ];

    public function batch(): BelongsTo
    {
        return $this->belongsTo(LayerBatch::class, 'layer_batch_id');
    }

    public function stockItem(): BelongsTo
    {
        return $this->belongsTo(StockItem::class, 'stock_item_id');
    }
}
