<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FishStocking extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'fish_pond_id',
        'stocking_date',
        'fish_count',
        'average_weight_kg',
        'total_weight_kg',
        'supplier_name',
        'notes',
    ];

    protected $casts = [
        'stocking_date' => 'date',
        'fish_count' => 'integer',
        'average_weight_kg' => 'decimal:2',
        'total_weight_kg' => 'decimal:2',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function pond(): BelongsTo
    {
        return $this->belongsTo(FishPond::class, 'fish_pond_id');
    }
}
