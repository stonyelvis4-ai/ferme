<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pisciculture\StoreFishHarvestRequest;
use App\Http\Requests\Pisciculture\StoreFishMonitoringRequest;
use App\Http\Requests\Pisciculture\StoreFishPondRequest;
use App\Http\Requests\Pisciculture\StoreFishSaleRequest;
use App\Http\Requests\Pisciculture\StoreFishStockingRequest;
use App\Http\Requests\Pisciculture\UpdateFishPondRequest;
use App\Models\FishHarvest;
use App\Models\FishMonitoring;
use App\Models\FishPond;
use App\Models\FishSale;
use App\Models\FishStocking;
use App\Services\PiscicultureService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PiscicultureController extends Controller
{
    public function __construct(private readonly PiscicultureService $piscicultureService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'summary' => $farmId ? $this->piscicultureService->summaryForFarm($farmId) : [],
            'ponds' => FishPond::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->withCount(['stockings', 'monitorings', 'harvests', 'sales'])
                ->latest()
                ->get(),
            'stockings' => FishStocking::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->latest()
                ->limit(100)
                ->get(),
            'monitorings' => FishMonitoring::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->latest()
                ->limit(100)
                ->get(),
            'harvests' => FishHarvest::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->latest()
                ->limit(100)
                ->get(),
            'sales' => FishSale::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->latest()
                ->limit(100)
                ->get(),
        ]);
    }

    public function show(FishPond $pisciculture): JsonResponse
    {
        return response()->json([
            'data' => $pisciculture->load(['stockings', 'monitorings', 'harvests', 'sales']),
        ]);
    }

    public function store(StoreFishPondRequest $request): JsonResponse
    {
        $pond = $this->piscicultureService->createPond($request->validated());

        return response()->json(['data' => $pond], 201);
    }

    public function update(UpdateFishPondRequest $request, FishPond $pisciculture): JsonResponse
    {
        $pond = $this->piscicultureService->updatePond($pisciculture, $request->validated());

        return response()->json(['data' => $pond]);
    }

    public function destroy(FishPond $pisciculture): JsonResponse
    {
        $result = $this->piscicultureService->deletePond($pisciculture);

        return response()->json([
            'message' => ($result['action'] ?? 'deleted') === 'archived' ? 'Pond archived.' : 'Pond deleted.',
            'data' => $result,
        ]);
    }

    public function stocking(StoreFishStockingRequest $request): JsonResponse
    {
        $stocking = $this->piscicultureService->recordStocking($request->validated());

        return response()->json(['data' => $stocking], 201);
    }

    public function monitoring(StoreFishMonitoringRequest $request): JsonResponse
    {
        $monitoring = $this->piscicultureService->recordMonitoring($request->validated());

        return response()->json(['data' => $monitoring], 201);
    }

    public function harvest(StoreFishHarvestRequest $request): JsonResponse
    {
        $harvest = $this->piscicultureService->recordHarvest($request->validated());

        return response()->json(['data' => $harvest], 201);
    }

    public function sale(StoreFishSaleRequest $request): JsonResponse
    {
        $sale = $this->piscicultureService->recordSale($request->validated());

        return response()->json(['data' => $sale], 201);
    }
}
