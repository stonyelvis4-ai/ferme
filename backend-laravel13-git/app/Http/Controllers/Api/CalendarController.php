<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CalendarEvent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
        if ($request->user()?->farm_id) {
            $request->merge(['farm_id' => (int) $request->user()->farm_id]);
        }

        $data = $request->validate([
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            'title' => ['required', 'string', 'max:255'],
            'start_at' => ['required', 'date'],
            'end_at' => ['nullable', 'date'],
            'linked_task_id' => [
                'nullable',
                'integer',
                Rule::exists('tasks', 'id')->where(fn ($query) => $query->where('farm_id', $request->user()?->farm_id)),
            ],
            'source_module' => ['nullable', 'string', 'max:255'],
            'source_entity_type' => ['nullable', 'string', 'max:255'],
            'source_entity_id' => ['nullable', 'string', 'max:255'],
        ]);

        $event = CalendarEvent::create($data);

        return response()->json(['data' => $event], 201);
    }
}
