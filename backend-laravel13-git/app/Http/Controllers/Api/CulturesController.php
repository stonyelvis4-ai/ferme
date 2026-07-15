<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Cultures\StoreCropHarvestRequest;
use App\Http\Requests\Cultures\StoreCropOperationRequest;
use App\Http\Requests\Cultures\StoreCropRequest;
use App\Http\Requests\Cultures\StoreCropSaleRequest;
use App\Http\Requests\Cultures\StorePlotRequest;
use App\Http\Requests\Cultures\UpdateCropRequest;
use App\Models\Crop;
use App\Models\CropHarvest;
use App\Models\CropOperation;
use App\Models\CropSale;
use App\Models\Plot;
use App\Services\CulturesService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CulturesController extends Controller
{
    public function __construct(private readonly CulturesService $culturesService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'summary' => $farmId ? $this->culturesService->summaryForFarm($farmId) : [],
            'crops' => Crop::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->withCount(['plots', 'operations', 'harvests', 'sales'])
                ->latest()
                ->get(),
            'plots' => Plot::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->latest()
                ->limit(100)
                ->get(),
            'operations' => CropOperation::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->latest()
                ->limit(100)
                ->get(),
            'harvests' => CropHarvest::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->latest()
                ->limit(100)
                ->get(),
            'sales' => CropSale::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->latest()
                ->limit(100)
                ->get(),
        ]);
    }

    public function show(Crop $culture): JsonResponse
    {
        return response()->json(['data' => $culture->load(['plots', 'operations', 'harvests', 'sales'])]);
    }

    public function store(StoreCropRequest $request): JsonResponse
    {
        $crop = $this->culturesService->createCrop($request->validated());
        return response()->json(['data' => $crop], 201);
    }

    public function update(UpdateCropRequest $request, Crop $culture): JsonResponse
    {
        $crop = $this->culturesService->updateCrop($culture, $request->validated());
        return response()->json(['data' => $crop]);
    }

    public function destroy(Crop $culture): JsonResponse
    {
        $culture->delete();
        return response()->json(['message' => 'Crop deleted.']);
    }

    public function plot(StorePlotRequest $request): JsonResponse
    {
        $plot = $this->culturesService->createPlot($request->validated());
        return response()->json(['data' => $plot], 201);
    }

    public function operation(StoreCropOperationRequest $request): JsonResponse
    {
        $operation = $this->culturesService->recordOperation($request->validated());
        return response()->json(['data' => $operation], 201);
    }

    public function harvest(StoreCropHarvestRequest $request): JsonResponse
    {
        $harvest = $this->culturesService->recordHarvest($request->validated());
        return response()->json(['data' => $harvest], 201);
    }

    public function sale(StoreCropSaleRequest $request): JsonResponse
    {
        $sale = $this->culturesService->recordSale($request->validated());
        return response()->json(['data' => $sale], 201);
    }
}
