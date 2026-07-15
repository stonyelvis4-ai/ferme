<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\User;

class AuditService
{
    public function record(array $payload): AuditLog
    {
        return AuditLog::create([
            'farm_id' => $payload['farm_id'] ?? null,
            'user_id' => $payload['user_id'] ?? null,
            'module' => $payload['module'],
            'entity_type' => $payload['entity_type'] ?? null,
            'entity_id' => $payload['entity_id'] ?? null,
            'action' => $payload['action'],
            'old_value' => $payload['old_value'] ?? null,
            'new_value' => $payload['new_value'] ?? null,
            'source' => $payload['source'] ?? 'web',
        ]);
    }
}

