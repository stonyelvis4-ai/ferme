<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Plot extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'crop_id',
        'name',
        'area',
        'soil_type',
        'location',
        'status',
        'notes',
    ];

    protected $casts = [
        'area' => 'decimal:2',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function crop(): BelongsTo
    {
        return $this->belongsTo(Crop::class);
    }

    public function operations(): HasMany
    {
        return $this->hasMany(CropOperation::class);
    }

    public function harvests(): HasMany
    {
        return $this->hasMany(CropHarvest::class);
    }
}
