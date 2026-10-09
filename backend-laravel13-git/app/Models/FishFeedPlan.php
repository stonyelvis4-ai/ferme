<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FishFeedPlan extends Model
{
    use HasFactory;

    protected $fillable = ['farm_id', 'fish_pond_id', 'stock_item_id', 'plan_name', 'ration_mode', 'ration_value', 'feedings_per_day', 'target_daily_quantity_kg', 'start_date', 'end_date', 'notes', 'is_active'];

    protected $casts = ['ration_value' => 'decimal:3', 'target_daily_quantity_kg' => 'decimal:3', 'feedings_per_day' => 'integer', 'start_date' => 'date', 'end_date' => 'date', 'is_active' => 'boolean'];

    public function pond(): BelongsTo { return $this->belongsTo(FishPond::class, 'fish_pond_id'); }
    public function stockItem(): BelongsTo { return $this->belongsTo(StockItem::class); }
}
