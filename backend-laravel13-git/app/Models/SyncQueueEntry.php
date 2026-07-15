<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SyncQueueEntry extends Model
{
    use HasFactory;

    protected $fillable = [
        'farm_id',
        'user_id',
        'module',
        'entity_type',
        'entity_id',
        'action',
        'payload',
        'status',
        'error_message',
        'queued_at',
        'processed_at',
    ];

    protected $casts = [
        'payload' => 'array',
        'queued_at' => 'datetime',
        'processed_at' => 'datetime',
    ];

    public function farm(): BelongsTo
    {
        return $this->belongsTo(Farm::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
