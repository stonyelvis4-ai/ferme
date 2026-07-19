<?php

namespace App\Models;

use App\Enums\Priority;
use App\Enums\TaskStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Task extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'title',
        'description',
        'source_module',
        'source_entity_type',
        'source_entity_id',
        'start_at',
        'priority',
        'status',
        'due_at',
        'reminder_at',
        'assigned_to',
    ];

    protected $casts = [
        'priority' => Priority::class,
        'status' => TaskStatus::class,
        'start_at' => 'datetime',
        'due_at' => 'datetime',
        'reminder_at' => 'datetime',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function assignee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function calendarEvent(): HasOne
    {
        return $this->hasOne(CalendarEvent::class, 'linked_task_id');
    }
}
