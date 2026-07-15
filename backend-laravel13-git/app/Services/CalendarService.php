<?php

namespace App\Services;

use App\Models\CalendarEvent;
use App\Models\Task;

class CalendarService
{
    public function syncFromTask(Task $task): ?CalendarEvent
    {
        if (! $task->due_at) {
            return null;
        }

        return CalendarEvent::updateOrCreate(
            [
                'farm_id' => $task->farm_id,
                'linked_task_id' => $task->id,
            ],
            [
                'title' => $task->title,
                'start_at' => $task->due_at,
                'end_at' => $task->due_at,
                'source_module' => $task->source_module ?? 'tasks',
                'source_entity_type' => $task->source_entity_type ?? 'task',
                'source_entity_id' => $task->source_entity_id ?? (string) $task->id,
            ]
        );
    }
}

