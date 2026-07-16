<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Stock\StoreStockItemRequest;
use App\Http\Requests\Stock\StoreStockMovementRequest;
use App\Http\Requests\Stock\UpdateStockItemRequest;
use App\Models\Building;
use App\Models\Crop;
use App\Models\FishPond;
use App\Models\FishStocking;
use App\Models\LayerBatch;
use App\Models\Plot;
use App\Models\StockCategory;
use App\Models\StockItem;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class StockController extends Controller
{
    public function __construct(private readonly StockService $stockService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $farmId = (int) ($request->user()?->farm_id ?? 0);

        return response()->json([
            'items' => StockItem::query()
                ->with(['categoryRelation', 'supplier'])
                ->where('farm_id', $farmId)
                ->latest()
                ->get(),
            'movements' => StockMovement::query()
                ->where('farm_id', $farmId)
                ->latest()
                ->limit(100)
                ->get(),
            'meta' => [
                'categories' => StockCategory::query()
                    ->where(fn ($query) => $query->whereNull('farm_id')->orWhere('farm_id', $farmId))
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(),
                'suppliers' => Supplier::query()
                    ->where('farm_id', $farmId)
                    ->where('is_active', true)
                    ->orderBy('name')
                    ->get(),
                'units' => [
                    'kg', 'g', 'tonne', 'litre', 'millilitre', 'sac', 'boîte', 'bouteille', 'bidon',
                    'dose', 'comprimé', 'flacon', 'unité', 'pièce', 'paquet', 'rouleau', 'mètre', 'mètre carré', 'hectare',
                ],
                'storage_locations' => $this->buildStorageLocations($farmId),
                'relations' => $this->buildRelationOptions($farmId),
            ],
        ]);
    }

    public function store(StoreStockItemRequest $request): JsonResponse
    {
        $item = $this->stockService->createItem($request->validated());

        return response()->json(['data' => $item], 201);
    }

    public function show(StockItem $stockItem): JsonResponse
    {
        return response()->json(['data' => $stockItem->load(['movements', 'categoryRelation', 'supplier'])]);
    }

    public function update(UpdateStockItemRequest $request, StockItem $stockItem): JsonResponse
    {
        $item = $this->stockService->updateItem($stockItem, $request->validated());

        return response()->json(['data' => $item]);
    }

    public function destroy(StockItem $stockItem): JsonResponse
    {
        $this->stockService->deleteItem($stockItem);

        return response()->json(['message' => 'Stock item deleted.']);
    }

    public function movement(StoreStockMovementRequest $request): JsonResponse
    {
        $movement = $this->stockService->recordMovement($request->validated());

        return response()->json(['data' => $movement], 201);
    }

    public function storeSupplier(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('suppliers', 'name')->where(fn ($query) => $query->where('farm_id', $request->user()?->farm_id))],
            'contact_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $supplier = $this->stockService->createSupplier($validated);

        return response()->json(['data' => $supplier], 201);
    }

    private function buildStorageLocations(int $farmId): array
    {
        $presets = ['Magasin principal', 'Dépôt', 'Pharmacie', 'Chambre froide', 'Entrepôt aliments'];
        $buildings = Building::query()
            ->where('farm_id', $farmId)
            ->orderBy('name')
            ->pluck('name')
            ->all();

        return collect([...$presets, ...$buildings])
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    private function buildRelationOptions(int $farmId): array
    {
        return [
            'livestock' => LayerBatch::query()->where('farm_id', $farmId)->orderBy('name')->get(['id', 'name'])
                ->map(fn (LayerBatch $item) => ['id' => (string) $item->id, 'label' => $item->name, 'type' => 'layer_batch', 'business_module' => 'livestock'])
                ->values(),
            'aquaculture_ponds' => FishPond::query()->where('farm_id', $farmId)->orderBy('name')->get(['id', 'name'])
                ->map(fn (FishPond $item) => ['id' => (string) $item->id, 'label' => $item->name, 'type' => 'fish_pond', 'business_module' => 'aquaculture'])
                ->values(),
            'aquaculture_stockings' => FishStocking::query()->where('farm_id', $farmId)->latest()->get(['id', 'stocking_date'])
                ->map(fn (FishStocking $item) => ['id' => (string) $item->id, 'label' => 'Lot poissons du ' . optional($item->stocking_date)->format('Y-m-d'), 'type' => 'fish_stocking', 'business_module' => 'aquaculture'])
                ->values(),
            'crops' => Crop::query()->where('farm_id', $farmId)->orderBy('name')->get(['id', 'name'])
                ->map(fn (Crop $item) => ['id' => (string) $item->id, 'label' => $item->name, 'type' => 'crop', 'business_module' => 'crops'])
                ->values(),
            'plots' => Plot::query()->where('farm_id', $farmId)->orderBy('name')->get(['id', 'name'])
                ->map(fn (Plot $item) => ['id' => (string) $item->id, 'label' => $item->name, 'type' => 'plot', 'business_module' => 'crops'])
                ->values(),
            'infrastructure' => Building::query()->where('farm_id', $farmId)->orderBy('name')->get(['id', 'name'])
                ->map(fn (Building $item) => ['id' => (string) $item->id, 'label' => $item->name, 'type' => 'building', 'business_module' => 'infrastructure'])
                ->values(),
        ];
    }
}
