<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Enclosure extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'building_id',
        'name',
        'type',
        'capacity',
        'assigned_use',
        'status',
        'state',
        'notes',
    ];

    protected $casts = [
        'capacity' => 'decimal:2',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }
}
