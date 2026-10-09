<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CropNutritionPlan;
use App\Models\FishFeedPlan;
use App\Models\LayerFeedPlan;
use App\Models\NutritionPlanOccurrence;
use App\Http\Requests\Layers\StoreLayerFeedPlanRequest;
use App\Services\NutritionPlanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NutritionPlanController extends Controller
{
    public function __construct(private readonly NutritionPlanService $nutritionPlans)
    {
    }

    public function storeFish(Request $request): JsonResponse
    {
        $data = $request->validate([
            'farm_id' => ['required', 'integer', 'exists:farms,id'], 'fish_pond_id' => ['required', 'integer', 'exists:fish_ponds,id'],
            'stock_item_id' => ['required', 'integer', 'exists:stock_items,id'], 'plan_name' => ['required', 'string', 'max:255'],
            'ration_mode' => ['required', Rule::in(['fixed_kg', 'biomass_percent'])], 'ration_value' => ['required', 'numeric', 'min:0.001'],
            'feedings_per_day' => ['required', 'integer', 'min:1', 'max:12'], 'start_date' => ['required', 'date'], 'end_date' => ['nullable', 'date', 'after_or_equal:start_date'], 'notes' => ['nullable', 'string'],
        ]);
        $this->assertFarm($request, (int) $data['farm_id']);
        return response()->json(['data' => $this->nutritionPlans->createFishPlan($data)], 201);
    }

    public function storeCrop(Request $request): JsonResponse
    {
        $data = $request->validate([
            'farm_id' => ['required', 'integer', 'exists:farms,id'], 'crop_id' => ['required', 'integer', 'exists:crops,id'], 'plot_id' => ['required', 'integer', 'exists:plots,id'],
            'stock_item_id' => ['required', 'integer', 'exists:stock_items,id'], 'plan_name' => ['required', 'string', 'max:255'],
            'dose_kg_per_hectare' => ['required', 'numeric', 'min:0.001'], 'application_dates' => ['required', 'array', 'min:1', 'max:30'], 'application_dates.*' => ['date'], 'notes' => ['nullable', 'string'],
        ]);
        $this->assertFarm($request, (int) $data['farm_id']);
        return response()->json(['data' => $this->nutritionPlans->createCropPlan($data)], 201);
    }

    public function updateFish(Request $request, FishFeedPlan $plan): JsonResponse
    {
        $this->assertFarm($request, (int) $plan->farm_id);
        $data = $request->validate($this->fishRules());

        return response()->json(['data' => $this->nutritionPlans->replaceFishPlan($plan, $data)]);
    }

    public function updateCrop(Request $request, CropNutritionPlan $plan): JsonResponse
    {
        $this->assertFarm($request, (int) $plan->farm_id);
        $data = $request->validate($this->cropRules());

        return response()->json(['data' => $this->nutritionPlans->replaceCropPlan($plan, $data)]);
    }

    public function updateLayer(StoreLayerFeedPlanRequest $request, LayerFeedPlan $plan): JsonResponse
    {
        $this->assertFarm($request, (int) $plan->farm_id);

        return response()->json(['data' => $this->nutritionPlans->replaceLayerPlan($plan, $request->validated())]);
    }

    public function deactivate(Request $request, string $type, int $plan): JsonResponse
    {
        $farmId = (int) ($request->user()?->farm_id ?? 0);
        abort_unless(in_array($type, ['layer', 'fish', 'crop'], true), 404);
        $this->nutritionPlans->deactivate($type, $plan, $farmId);
        return response()->json(['message' => 'Plan désactivé.']);
    }

    public function complete(Request $request, NutritionPlanOccurrence $occurrence): JsonResponse
    {
        $this->assertFarm($request, (int) $occurrence->farm_id);
        $data = $request->validate([
            'actual_quantity_kg' => ['required', 'numeric', 'min:0.001'], 'stock_item_id' => ['nullable', 'integer', 'exists:stock_items,id'], 'notes' => ['nullable', 'string'],
        ]);
        return response()->json(['data' => $this->nutritionPlans->complete($occurrence, $data)]);
    }

    public function resyncLayer(Request $request, LayerFeedPlan $plan): JsonResponse
    {
        $this->assertFarm($request, (int) $plan->farm_id);
        $this->nutritionPlans->syncLayerPlan($plan->load('batch'));
        return response()->json(['data' => $plan->fresh(['batch:id,name,current_count', 'stockItem:id,name,unit,current_quantity,unit_cost'])]);
    }

    private function assertFarm(Request $request, int $farmId): void
    {
        abort_unless($farmId > 0 && $farmId === (int) ($request->user()?->farm_id ?? 0), 403, 'Farm tenant mismatch.');
    }

    private function fishRules(): array
    {
        return [
            'fish_pond_id' => ['required', 'integer', 'exists:fish_ponds,id'], 'stock_item_id' => ['required', 'integer', 'exists:stock_items,id'], 'plan_name' => ['required', 'string', 'max:255'],
            'ration_mode' => ['required', Rule::in(['fixed_kg', 'biomass_percent'])], 'ration_value' => ['required', 'numeric', 'min:0.001'],
            'feedings_per_day' => ['required', 'integer', 'min:1', 'max:12'], 'start_date' => ['required', 'date'], 'end_date' => ['nullable', 'date', 'after_or_equal:start_date'], 'notes' => ['nullable', 'string'],
        ];
    }

    private function cropRules(): array
    {
        return [
            'crop_id' => ['required', 'integer', 'exists:crops,id'], 'plot_id' => ['required', 'integer', 'exists:plots,id'], 'stock_item_id' => ['required', 'integer', 'exists:stock_items,id'],
            'plan_name' => ['required', 'string', 'max:255'], 'dose_kg_per_hectare' => ['required', 'numeric', 'min:0.001'],
            'application_dates' => ['required', 'array', 'min:1', 'max:30'], 'application_dates.*' => ['date'], 'notes' => ['nullable', 'string'],
        ];
    }
}
