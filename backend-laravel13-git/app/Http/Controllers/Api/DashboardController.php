<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\Farm;
use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'data' => [
                'farms' => $farmId ? Farm::whereKey($farmId)->count() : Farm::count(),
                'tasks' => Task::query()->when($farmId, fn ($q) => $q->where('farm_id', $farmId))->count(),
                'audit_logs' => AuditLog::query()->when($farmId, fn ($q) => $q->where('farm_id', $farmId))->count(),
                'open_tasks' => Task::query()->when($farmId, fn ($q) => $q->where('farm_id', $farmId))->where('status', 'todo')->count(),
                'overdue_tasks' => Task::query()->when($farmId, fn ($q) => $q->where('farm_id', $farmId))->where('status', 'overdue')->count(),
            ],
        ]);
    }
}

