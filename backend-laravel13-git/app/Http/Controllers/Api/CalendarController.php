<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalendarEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'data' => CalendarEvent::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->orderBy('start_at')
                ->get(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            'title' => ['required', 'string', 'max:255'],
            'start_at' => ['required', 'date'],
            'end_at' => ['nullable', 'date'],
            'linked_task_id' => ['nullable', 'integer', 'exists:tasks,id'],
            'source_module' => ['nullable', 'string', 'max:255'],
            'source_entity_type' => ['nullable', 'string', 'max:255'],
            'source_entity_id' => ['nullable', 'string', 'max:255'],
        ]);

        $event = CalendarEvent::create($data);

        return response()->json(['data' => $event], 201);
    }
}

