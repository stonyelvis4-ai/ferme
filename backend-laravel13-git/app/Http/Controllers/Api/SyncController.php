<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SyncQueueEntry;
use App\Services\SyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SyncController extends Controller
{
    public function __construct(private readonly SyncService $syncService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'summary' => [
                'pending' => SyncQueueEntry::query()->when($farmId, fn ($q) => $q->where('farm_id', $farmId))->where('status', 'pending')->count(),
                'processed' => SyncQueueEntry::query()->when($farmId, fn ($q) => $q->where('farm_id', $farmId))->where('status', 'processed')->count(),
                'failed' => SyncQueueEntry::query()->when($farmId, fn ($q) => $q->where('farm_id', $farmId))->where('status', 'failed')->count(),
            ],
            'entries' => SyncQueueEntry::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->latest('queued_at')
                ->latest()
                ->limit(200)
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'farm_id' => ['nullable', 'integer', 'exists:farms,id'],
            'module' => ['required', 'string', 'max:255'],
            'entity_type' => ['nullable', 'string', 'max:255'],
            'entity_id' => ['nullable', 'string', 'max:255'],
            'action' => ['required', 'string', 'max:255'],
            'payload' => ['nullable', 'array'],
            'queued_at' => ['nullable', 'date'],
        ]);

        $entry = $this->syncService->queue([
            'farm_id' => $data['farm_id'] ?? $request->user()?->farm_id,
            'user_id' => $request->user()?->id,
            'module' => $data['module'],
            'entity_type' => $data['entity_type'] ?? null,
            'entity_id' => $data['entity_id'] ?? null,
            'action' => $data['action'],
            'payload' => $data['payload'] ?? [],
            'queued_at' => $data['queued_at'] ?? null,
        ]);

        return response()->json(['data' => $entry], 201);
    }

    public function process(SyncQueueEntry $entry): JsonResponse
    {
        $processed = $this->syncService->markProcessed($entry);

        return response()->json(['data' => $processed]);
    }

    public function fail(Request $request, SyncQueueEntry $entry): JsonResponse
    {
        $data = $request->validate([
            'error_message' => ['required', 'string'],
        ]);

        $failed = $this->syncService->markFailed($entry, $data['error_message']);

        return response()->json(['data' => $failed]);
    }
}
