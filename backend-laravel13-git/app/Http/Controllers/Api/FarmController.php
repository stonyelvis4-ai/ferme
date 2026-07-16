<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Farm\StoreFarmRequest;
use App\Http\Requests\Farm\UpdateFarmRequest;
use App\Models\Farm;
use App\Services\AuditService;
use App\Services\FarmService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FarmController extends Controller
{
    public function __construct(
        private readonly FarmService $farmService,
        private readonly AuditService $auditService
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'data' => Farm::query()->when($farmId, fn ($q) => $q->whereKey($farmId))->latest()->get(),
        ]);
    }

    public function store(StoreFarmRequest $request): JsonResponse
    {
        if ($request->user()?->farm_id) {
            return response()->json([
                'message' => 'Ce compte est deja rattache a une ferme et ne peut pas en creer une deuxieme.',
            ], 422);
        }

        $farm = $this->farmService->createForAdministrator($request->user(), $request->validated());

        $this->auditService->record([
            'farm_id' => $farm->id,
            'user_id' => $request->user()?->id,
            'module' => 'farms',
            'entity_type' => 'farm',
            'entity_id' => (string) $farm->id,
            'action' => 'farm_created',
            'source' => 'web',
        ]);

        return response()->json(['data' => $farm], 201);
    }

    public function show(Farm $farm): JsonResponse
    {
        return response()->json(['data' => $farm]);
    }

    public function update(UpdateFarmRequest $request, Farm $farm): JsonResponse
    {
        $farm->fill($request->validated())->save();

        $this->auditService->record([
            'farm_id' => $farm->id,
            'user_id' => $request->user()?->id,
            'module' => 'farms',
            'entity_type' => 'farm',
            'entity_id' => (string) $farm->id,
            'action' => 'farm_updated',
            'source' => 'web',
        ]);

        return response()->json(['data' => $farm]);
    }
}
