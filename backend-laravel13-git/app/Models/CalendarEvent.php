<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CalendarEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'title',
        'start_at',
        'end_at',
        'linked_task_id',
        'source_module',
        'source_entity_type',
        'source_entity_id',
    ];

    protected $casts = [
        'start_at' => 'datetime',
        'end_at' => 'datetime',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class, 'linked_task_id');
    }
}

