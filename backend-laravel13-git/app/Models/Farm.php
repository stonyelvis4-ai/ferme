<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Farm extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'administrator_id',
        'status',
        'currency',
        'area_unit',
        'manager_name',
        'contact_email',
    ];

    public function administrator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'administrator_id');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function settings(): HasMany
    {
        return $this->hasMany(FarmSetting::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function layerBatches(): HasMany
    {
        return $this->hasMany(LayerBatch::class);
    }

    public function eggProductions(): HasMany
    {
        return $this->hasMany(EggProduction::class);
    }

    public function eggSales(): HasMany
    {
        return $this->hasMany(EggSale::class);
    }

    public function fishPonds(): HasMany
    {
        return $this->hasMany(FishPond::class);
    }

    public function fishStockings(): HasMany
    {
        return $this->hasMany(FishStocking::class);
    }

    public function fishMonitorings(): HasMany
    {
        return $this->hasMany(FishMonitoring::class);
    }

    public function fishHarvests(): HasMany
    {
        return $this->hasMany(FishHarvest::class);
    }

    public function fishSales(): HasMany
    {
        return $this->hasMany(FishSale::class);
    }

    public function crops(): HasMany
    {
        return $this->hasMany(Crop::class);
    }

    public function plots(): HasMany
    {
        return $this->hasMany(Plot::class);
    }

    public function cropOperations(): HasMany
    {
        return $this->hasMany(CropOperation::class);
    }

    public function cropHarvests(): HasMany
    {
        return $this->hasMany(CropHarvest::class);
    }

    public function cropSales(): HasMany
    {
        return $this->hasMany(CropSale::class);
    }

    public function buildings(): HasMany
    {
        return $this->hasMany(Building::class);
    }

    public function enclosures(): HasMany
    {
        return $this->hasMany(Enclosure::class);
    }

    public function owners(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'farm_user_assignments')->withTimestamps();
    }
}
