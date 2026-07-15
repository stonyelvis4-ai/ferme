<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Infrastructure\StoreBuildingRequest;
use App\Http\Requests\Infrastructure\StoreEnclosureRequest;
use App\Http\Requests\Infrastructure\UpdateBuildingRequest;
use App\Http\Requests\Infrastructure\UpdateEnclosureRequest;
use App\Models\Building;
use App\Models\Enclosure;
use App\Services\InfrastructureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InfrastructureController extends Controller
{
    public function __construct(private readonly InfrastructureService $infrastructureService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'summary' => $farmId ? $this->infrastructureService->summaryForFarm($farmId) : [],
            'buildings' => Building::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->withCount('enclosures')
                ->latest()
                ->get(),
            'enclosures' => Enclosure::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->with('building')
                ->latest()
                ->get(),
        ]);
    }

    public function showBuilding(Building $building): JsonResponse
    {
        return response()->json(['data' => $building->load('enclosures')]);
    }

    public function showEnclosure(Enclosure $enclosure): JsonResponse
    {
        return response()->json(['data' => $enclosure->load('building')]);
    }

    public function storeBuilding(StoreBuildingRequest $request): JsonResponse
    {
        $building = $this->infrastructureService->createBuilding($request->validated());

        return response()->json(['data' => $building], 201);
    }

    public function updateBuilding(UpdateBuildingRequest $request, Building $building): JsonResponse
    {
        $updated = $this->infrastructureService->updateBuilding($building, $request->validated());

        return response()->json(['data' => $updated]);
    }

    public function destroyBuilding(Building $building): JsonResponse
    {
        $building->delete();

        return response()->json(['message' => 'Building deleted.']);
    }

    public function storeEnclosure(StoreEnclosureRequest $request): JsonResponse
    {
        $enclosure = $this->infrastructureService->createEnclosure($request->validated());

        return response()->json(['data' => $enclosure], 201);
    }

    public function updateEnclosure(UpdateEnclosureRequest $request, Enclosure $enclosure): JsonResponse
    {
        $updated = $this->infrastructureService->updateEnclosure($enclosure, $request->validated());

        return response()->json(['data' => $updated]);
    }

    public function destroyEnclosure(Enclosure $enclosure): JsonResponse
    {
        $enclosure->delete();

        return response()->json(['message' => 'Enclosure deleted.']);
    }
}
