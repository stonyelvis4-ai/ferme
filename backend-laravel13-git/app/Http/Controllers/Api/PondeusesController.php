<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Layers\StoreEggProductionRequest;
use App\Http\Requests\Layers\StoreEggSaleRequest;
use App\Http\Requests\Layers\StoreLayerBatchRequest;
use App\Http\Requests\Layers\StoreLayerFeedingRequest;
use App\Http\Requests\Layers\UpdateLayerBatchRequest;
use App\Models\EggProduction;
use App\Models\EggSale;
use App\Models\LayerBatch;
use App\Models\LayerFeeding;
use App\Services\LayerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PondeusesController extends Controller
{
    public function __construct(private readonly LayerService $layerService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'summary' => $farmId ? $this->layerService->summaryForFarm($farmId) : [],
            'batches' => LayerBatch::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->withCount(['productions', 'sales', 'feedings'])
                ->latest()
                ->get(),
            'productions' => EggProduction::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->latest()
                ->limit(100)
                ->get(),
            'sales' => EggSale::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->latest()
                ->limit(100)
                ->get(),
            'feedings' => LayerFeeding::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->with(['batch:id,name', 'stockItem:id,name,unit'])
                ->latest('feeding_date')
                ->latest()
                ->limit(100)
                ->get(),
        ]);
    }

    public function show(LayerBatch $pondeuse): JsonResponse
    {
        return response()->json([
            'data' => $pondeuse->load(['productions', 'sales', 'feedings']),
        ]);
    }

    public function store(StoreLayerBatchRequest $request): JsonResponse
    {
        $batch = $this->layerService->createBatch($request->validated());

        return response()->json(['data' => $batch], 201);
    }

    public function update(UpdateLayerBatchRequest $request, LayerBatch $pondeuse): JsonResponse
    {
        $batch = $this->layerService->updateBatch($pondeuse, $request->validated());

        return response()->json(['data' => $batch]);
    }

    public function destroy(LayerBatch $pondeuse): JsonResponse
    {
        $pondeuse->delete();

        return response()->json(['message' => 'Batch deleted.']);
    }

    public function production(StoreEggProductionRequest $request): JsonResponse
    {
        $production = $this->layerService->recordProduction($request->validated());

        return response()->json(['data' => $production], 201);
    }

    public function sale(StoreEggSaleRequest $request): JsonResponse
    {
        $sale = $this->layerService->recordSale($request->validated());

        return response()->json(['data' => $sale], 201);
    }

    public function feeding(StoreLayerFeedingRequest $request): JsonResponse
    {
        $feeding = $this->layerService->recordFeeding($request->validated());

        return response()->json(['data' => $feeding], 201);
    }
}
