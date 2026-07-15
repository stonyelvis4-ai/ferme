<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Alert;
use App\Models\Task;
use App\Services\AlertService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertController extends Controller
{
    public function __construct(private readonly AlertService $alertService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'data' => Alert::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->latest()
                ->get(),
        ]);
    }

    public function resolve(Request $request, Alert $alert): JsonResponse
    {
        $alert->update([
            'status' => 'resolved',
            'resolved_at' => now(),
        ]);

        return response()->json(['data' => $alert]);
    }

    public function syncOverdueTasks(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        $tasks = Task::query()
            ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
            ->where('status', 'overdue')
            ->get();

        $alerts = $tasks->map(fn (Task $task) => $this->alertService->createOverdueTaskAlert($task));

        return response()->json(['data' => $alerts]);
    }
}

