<?php

namespace App\Services;

use App\Models\SyncQueueEntry;
use Illuminate\Support\Carbon;

class SyncService
{
    public function queue(array $payload): SyncQueueEntry
    {
        return SyncQueueEntry::create([
            'farm_id' => $payload['farm_id'] ?? null,
            'user_id' => $payload['user_id'] ?? null,
            'module' => $payload['module'],
            'entity_type' => $payload['entity_type'] ?? null,
            'entity_id' => $payload['entity_id'] ?? null,
            'action' => $payload['action'],
            'payload' => $payload['payload'] ?? [],
            'status' => 'pending',
            'queued_at' => $payload['queued_at'] ?? Carbon::now(),
        ]);
    }

    public function markProcessed(SyncQueueEntry $entry): SyncQueueEntry
    {
        $entry->forceFill([
            'status' => 'processed',
            'processed_at' => now(),
            'error_message' => null,
        ])->save();

        return $entry;
    }

    public function markFailed(SyncQueueEntry $entry, string $message): SyncQueueEntry
    {
        $entry->forceFill([
            'status' => 'failed',
            'error_message' => $message,
        ])->save();

        return $entry;
    }
}
