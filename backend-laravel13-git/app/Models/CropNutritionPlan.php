<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CropNutritionPlan extends Model
{
    use HasFactory;

    protected $fillable = ['farm_id', 'crop_id', 'plot_id', 'stock_item_id', 'plan_name', 'dose_kg_per_hectare', 'application_dates', 'notes', 'is_active'];

    protected $casts = ['dose_kg_per_hectare' => 'decimal:3', 'application_dates' => 'array', 'is_active' => 'boolean'];

    public function crop(): BelongsTo { return $this->belongsTo(Crop::class); }
    public function plot(): BelongsTo { return $this->belongsTo(Plot::class); }
    public function stockItem(): BelongsTo { return $this->belongsTo(StockItem::class); }
}
