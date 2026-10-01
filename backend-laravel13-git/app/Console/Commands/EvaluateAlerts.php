<?php

namespace App\Console\Commands;

use App\Enums\TaskStatus;
use App\Models\Farm;
use App\Models\Task;
use App\Services\AlertEvaluationService;
use App\Services\AlertService;
use Illuminate\Console\Command;

class EvaluateAlerts extends Command
{
    protected $signature = 'ferm:alerts:evaluate';

    protected $description = 'Evaluate farm alert rules and create due task reminders';

    public function handle(AlertEvaluationService $evaluation, AlertService $alerts): int
    {
        $farmCount = 0;
        $reminders = 0;
        $overdue = 0;

        Farm::query()->select('id')->orderBy('id')->chunkById(100, function ($farms) use ($evaluation, $alerts, &$farmCount, &$reminders, &$overdue): void {
            foreach ($farms as $farm) {
                $evaluation->evaluateFarm($farm->id);
                $farmCount++;

                Task::query()
                    ->where('farm_id', $farm->id)
                    ->whereIn('status', [TaskStatus::Todo->value, TaskStatus::InProgress->value])
                    ->whereNotNull('reminder_at')
                    ->where('reminder_at', '<=', now())
                    ->orderBy('id')
                    ->each(function (Task $task) use ($alerts, &$reminders): void {
                        $alerts->createTaskReminderAlert($task);
                        $reminders++;
                    });

                Task::query()
                    ->where('farm_id', $farm->id)
                    ->whereIn('status', [TaskStatus::Todo->value, TaskStatus::InProgress->value, TaskStatus::Overdue->value])
                    ->whereNotNull('due_at')
                    ->where('due_at', '<', now())
                    ->orderBy('id')
                    ->each(function (Task $task) use ($alerts, &$overdue): void {
                        $alerts->createOverdueTaskAlert($task);
                        $overdue++;
                    });
            }
        });

        $this->info(sprintf('Alertes évaluées pour %d ferme(s) : %d rappel(s), %d tâche(s) en retard.', $farmCount, $reminders, $overdue));

        return self::SUCCESS;
    }
}
