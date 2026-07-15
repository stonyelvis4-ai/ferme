<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FarmSetting extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'currency',
        'area_unit',
        'weight_unit',
        'egg_tray_default_price',
        'fish_kg_default_price',
        'crop_kg_default_price',
        'low_stock_threshold',
        'mortalite_threshold_layers',
        'mortalite_threshold_fish',
        'egg_breakage_threshold',
        'laying_rate_low_threshold',
        'fish_ph_min',
        'fish_ph_max',
        'fish_oxygen_min',
        'fish_temperature_min',
        'fish_temperature_max',
        'crop_yield_low_threshold',
        'default_reminder_24h',
        'default_reminder_6h',
        'default_reminder_1h',
        'task_categories',
        'task_priorities',
        'alert_rules',
    ];

    protected $casts = [
        'egg_tray_default_price' => 'decimal:2',
        'fish_kg_default_price' => 'decimal:2',
        'crop_kg_default_price' => 'decimal:2',
        'low_stock_threshold' => 'integer',
        'mortalite_threshold_layers' => 'integer',
        'mortalite_threshold_fish' => 'integer',
        'egg_breakage_threshold' => 'integer',
        'laying_rate_low_threshold' => 'decimal:2',
        'fish_ph_min' => 'decimal:2',
        'fish_ph_max' => 'decimal:2',
        'fish_oxygen_min' => 'decimal:2',
        'fish_temperature_min' => 'decimal:2',
        'fish_temperature_max' => 'decimal:2',
        'crop_yield_low_threshold' => 'decimal:2',
        'default_reminder_24h' => 'boolean',
        'default_reminder_6h' => 'boolean',
        'default_reminder_1h' => 'boolean',
        'task_categories' => 'array',
        'task_priorities' => 'array',
        'alert_rules' => 'array',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }
}
