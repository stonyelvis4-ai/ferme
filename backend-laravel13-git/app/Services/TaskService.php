<?php

namespace App\Services;

use App\Models\FarmSetting;
use App\Models\CalendarEvent;
use App\Models\Task;
use Carbon\Carbon;

class TaskService
{
    public function __construct(
        private readonly CalendarService $calendarService,
        private readonly AlertService $alertService
    ) {
    }

    public function create(array $data): Task
    {
        $data = $this->applyDefaultReminder($data);
        $task = Task::create($data);
        $this->calendarService->syncFromTask($task);

        if (($task->status?->value ?? $task->status) === 'overdue') {
            $this->alertService->createOverdueTaskAlert($task);
        }

        return $task;
    }

    public function update(Task $task, array $data): Task
    {
        $data = $this->applyDefaultReminder(array_merge($task->toArray(), $data), $task);
        $task->fill($data);
        $task->save();
        $this->calendarService->syncFromTask($task);

        if (($task->status?->value ?? $task->status) === 'overdue') {
            $this->alertService->createOverdueTaskAlert($task);
        }

        return $task;
    }

    private function applyDefaultReminder(array $data, ?Task $task = null): array
    {
        if (! empty($data['reminder_at']) || empty($data['due_at']) || empty($data['farm_id'])) {
            return $data;
        }

        $settings = FarmSetting::query()->where('farm_id', $data['farm_id'])->first();
        $dueAt = Carbon::parse($data['due_at']);

        if ($settings?->default_reminder_24h) {
            $data['reminder_at'] = $dueAt->copy()->subDay();
        } elseif ($settings?->default_reminder_6h) {
            $data['reminder_at'] = $dueAt->copy()->subHours(6);
        } elseif ($settings?->default_reminder_1h) {
            $data['reminder_at'] = $dueAt->copy()->subHour();
        }

        return $data;
    }
}
