<?php

namespace App\Services;

use App\Models\Task;

class TaskService
{
    public function create(array $data): Task
    {
        return Task::create($data);
    }

    public function update(Task $task, array $data): Task
    {
        $task->fill($data);
        $task->save();

        return $task;
    }
}

