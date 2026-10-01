<?php

namespace App\Services;

use App\Models\FarmSetting;
use App\Models\Task;
use Carbon\Carbon;
use Illuminate\Validation\ValidationException;

class TaskService
{
    public function __construct(
        private readonly CalendarService $calendarService,
        private readonly AlertService $alertService
    ) {
    }

    public function create(array $data): Task
    {
        $this->ensureValidSchedule($data);
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
        $this->ensureValidSchedule($data);
        $task->fill($data);
        $task->save();
        $this->calendarService->syncFromTask($task);

        if (($task->status?->value ?? $task->status) === 'overdue') {
            $this->alertService->createOverdueTaskAlert($task);
        }

        return $task;
    }

    public function delete(Task $task): void
    {
        $this->calendarService->forgetTask($task);
        $task->delete();
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

    private function ensureValidSchedule(array $data): void
    {
        if (empty($data['start_at']) || empty($data['due_at'])) {
            return;
        }

        if (Carbon::parse($data['due_at'])->lt(Carbon::parse($data['start_at']))) {
            throw ValidationException::withMessages([
                'due_at' => ['La date d\'échéance doit être postérieure ou égale à la date de début.'],
            ]);
        }
    }
}
