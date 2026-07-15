<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Stock\StoreStockItemRequest;
use App\Http\Requests\Stock\StoreStockMovementRequest;
use App\Http\Requests\Stock\UpdateStockItemRequest;
use App\Models\StockItem;
use App\Models\StockMovement;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StockController extends Controller
{
    public function __construct(private readonly StockService $stockService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'items' => StockItem::query()->when($farmId, fn ($q) => $q->where('farm_id', $farmId))->latest()->get(),
            'movements' => StockMovement::query()->when($farmId, fn ($q) => $q->where('farm_id', $farmId))->latest()->limit(100)->get(),
        ]);
    }

    public function store(StoreStockItemRequest $request): JsonResponse
    {
        $item = $this->stockService->createItem($request->validated());

        return response()->json(['data' => $item], 201);
    }

    public function show(StockItem $stockItem): JsonResponse
    {
        return response()->json(['data' => $stockItem->load('movements')]);
    }

    public function update(UpdateStockItemRequest $request, StockItem $stockItem): JsonResponse
    {
        $item = $this->stockService->updateItem($stockItem, $request->validated());

        return response()->json(['data' => $item]);
    }

    public function destroy(StockItem $stockItem): JsonResponse
    {
        $stockItem->delete();

        return response()->json(['message' => 'Stock item deleted.']);
    }

    public function movement(StoreStockMovementRequest $request): JsonResponse
    {
        $movement = $this->stockService->recordMovement($request->validated());

        return response()->json(['data' => $movement], 201);
    }
}

