<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Task\StoreTaskRequest;
use App\Http\Requests\Task\UpdateTaskRequest;
use App\Models\Task;
use App\Services\AuditService;
use App\Services\TaskService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TaskController extends Controller
{
    public function __construct(
        private readonly TaskService $taskService,
        private readonly AuditService $auditService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'data' => Task::query()
                ->when($farmId, fn ($query) => $query->where('farm_id', $farmId))
                ->latest()
                ->get(),
        ]);
    }

    public function store(StoreTaskRequest $request): JsonResponse
    {
        $task = $this->taskService->create($request->validated());

        $this->auditService->record([
            'farm_id' => $task->farm_id,
            'user_id' => $request->user()?->id,
            'module' => 'tasks',
            'entity_type' => 'task',
            'entity_id' => (string) $task->id,
            'action' => 'task_created',
            'source' => 'web',
        ]);

        return response()->json(['data' => $task], 201);
    }

    public function show(Task $task): JsonResponse
    {
        return response()->json(['data' => $task]);
    }

    public function update(UpdateTaskRequest $request, Task $task): JsonResponse
    {
        $updated = $this->taskService->update($task, $request->validated());

        $this->auditService->record([
            'farm_id' => $updated->farm_id,
            'user_id' => $request->user()?->id,
            'module' => 'tasks',
            'entity_type' => 'task',
            'entity_id' => (string) $updated->id,
            'action' => 'task_updated',
            'source' => 'web',
        ]);

        return response()->json(['data' => $updated]);
    }

    public function destroy(Task $task): JsonResponse
    {
        $this->auditService->record([
            'farm_id' => $task->farm_id,
            'user_id' => request()->user()?->id,
            'module' => 'tasks',
            'entity_type' => 'task',
            'entity_id' => (string) $task->id,
            'action' => 'task_deleted',
            'source' => 'web',
        ]);

        $task->delete();

        return response()->json(['message' => 'Task deleted.']);
    }
}
