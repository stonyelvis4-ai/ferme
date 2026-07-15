<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

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
        'default_reminder_24h',
        'default_reminder_6h',
        'default_reminder_1h'
    ];
}

