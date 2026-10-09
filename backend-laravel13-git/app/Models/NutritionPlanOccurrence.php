<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NutritionPlanOccurrence extends Model
{
    use HasFactory;

    protected $fillable = ['farm_id', 'plan_type', 'plan_id', 'task_id', 'stock_item_id', 'scheduled_for', 'planned_quantity_kg', 'status', 'actual_quantity_kg', 'actual_stock_item_id', 'actual_notes', 'completed_at'];

    protected $casts = ['scheduled_for' => 'date', 'planned_quantity_kg' => 'decimal:3', 'actual_quantity_kg' => 'decimal:3', 'completed_at' => 'datetime'];

    public function task(): BelongsTo { return $this->belongsTo(Task::class); }
    public function stockItem(): BelongsTo { return $this->belongsTo(StockItem::class); }
}
