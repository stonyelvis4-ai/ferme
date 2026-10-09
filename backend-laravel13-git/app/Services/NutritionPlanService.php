<?php

namespace App\Services;

use App\Models\Crop;
use App\Models\CropNutritionPlan;
use App\Models\FishFeedPlan;
use App\Models\FishPond;
use App\Models\LayerFeedPlan;
use App\Models\NutritionPlanOccurrence;
use App\Models\Plot;
use App\Models\StockItem;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Database\QueryException;
use Illuminate\Validation\ValidationException;

class NutritionPlanService
{
    public function __construct(
        private readonly TaskService $taskService,
        private readonly LayerService $layerService,
        private readonly StockService $stockService,
        private readonly CulturesService $culturesService,
        private readonly FinanceService $financeService,
        private readonly AuditService $auditService,
    ) {
    }

    public function syncLayerPlan(LayerFeedPlan $plan): void
    {
        if (! $plan->is_active || ! $plan->tasks_enabled) return;
        $this->syncDailyPlan('layer', $plan, (float) $plan->target_daily_quantity_kg, $plan->stock_item_id ? (int) $plan->stock_item_id : null, $plan->start_date, $plan->end_date, $plan->batch?->name ?? 'lot');
    }

    public function createFishPlan(array $data): FishFeedPlan
    {
        return DB::transaction(function () use ($data) {
            $pond = FishPond::query()->where('farm_id', $data['farm_id'])->findOrFail($data['fish_pond_id']);
            $stock = StockItem::query()->where('farm_id', $data['farm_id'])->findOrFail($data['stock_item_id']);
            $daily = $data['ration_mode'] === 'biomass_percent'
                ? round((float) $pond->biomass_kg * ((float) $data['ration_value'] / 100), 3)
                : round((float) $data['ration_value'], 3);
            if ($daily <= 0) throw ValidationException::withMessages(['ration_value' => 'La ration journalière doit être supérieure à zéro.']);

            FishFeedPlan::query()
                ->where('farm_id', $data['farm_id'])
                ->where('fish_pond_id', $pond->id)
                ->where('is_active', true)
                ->get()
                ->each(fn (FishFeedPlan $existing) => $this->deactivate('fish', $existing->id, (int) $data['farm_id']));
            $plan = FishFeedPlan::create([
                'farm_id' => $data['farm_id'], 'fish_pond_id' => $pond->id, 'stock_item_id' => $stock->id,
                'plan_name' => $data['plan_name'], 'ration_mode' => $data['ration_mode'], 'ration_value' => $data['ration_value'],
                'feedings_per_day' => $data['feedings_per_day'], 'target_daily_quantity_kg' => $daily,
                'start_date' => $data['start_date'], 'end_date' => $data['end_date'] ?? null, 'notes' => $data['notes'] ?? null, 'is_active' => true,
            ]);
            $this->syncFishPlan($plan->load('pond'));
            return $plan->load(['pond:id,name,biomass_kg', 'stockItem:id,name,unit,current_quantity,unit_cost']);
        });
    }

    public function createCropPlan(array $data): CropNutritionPlan
    {
        return DB::transaction(function () use ($data) {
            $crop = Crop::query()->where('farm_id', $data['farm_id'])->findOrFail($data['crop_id']);
            $plot = Plot::query()->where('farm_id', $data['farm_id'])->where('crop_id', $crop->id)->findOrFail($data['plot_id']);
            $stock = StockItem::query()->where('farm_id', $data['farm_id'])->findOrFail($data['stock_item_id']);
            $dates = collect($data['application_dates'])->map(fn ($date) => Carbon::parse($date)->toDateString())->unique()->sort()->values()->all();
            if ($dates === []) throw ValidationException::withMessages(['application_dates' => 'Ajoutez au moins une date d’application.']);

            CropNutritionPlan::query()
                ->where('farm_id', $data['farm_id'])
                ->where('crop_id', $crop->id)
                ->where('is_active', true)
                ->get()
                ->each(fn (CropNutritionPlan $existing) => $this->deactivate('crop', $existing->id, (int) $data['farm_id']));
            $plan = CropNutritionPlan::create([
                'farm_id' => $data['farm_id'], 'crop_id' => $crop->id, 'plot_id' => $plot->id, 'stock_item_id' => $stock->id,
                'plan_name' => $data['plan_name'], 'dose_kg_per_hectare' => $data['dose_kg_per_hectare'], 'application_dates' => $dates,
                'notes' => $data['notes'] ?? null, 'is_active' => true,
            ]);
            $this->syncCropPlan($plan->load(['crop', 'plot']));
            return $plan->load(['crop:id,name', 'plot:id,name,area', 'stockItem:id,name,unit,current_quantity,unit_cost']);
        });
    }

    public function syncFishPlan(FishFeedPlan $plan): void
    {
        if (! $plan->is_active) return;
        $this->syncDailyPlan('fish', $plan, (float) $plan->target_daily_quantity_kg, $plan->stock_item_id ? (int) $plan->stock_item_id : null, $plan->start_date, $plan->end_date, $plan->pond?->name ?? 'bassin');
    }

    public function syncCropPlan(CropNutritionPlan $plan): void
    {
        if (! $plan->is_active) return;
        $limit = now()->startOfDay()->addDays(29);
        $quantity = round((float) $plan->dose_kg_per_hectare * (float) ($plan->plot?->area ?? 0), 3);
        foreach ($plan->application_dates ?? [] as $date) {
            $scheduled = Carbon::parse($date)->startOfDay();
            if ($scheduled->lt(now()->startOfDay()) || $scheduled->gt($limit)) continue;
            $this->createOccurrence('crop', $plan->id, $plan->farm_id, $plan->stock_item_id, $scheduled, $quantity, sprintf('Appliquer %s sur %s', $plan->plan_name, $plan->plot?->name ?? 'la parcelle'), 'Cultures');
        }
    }

    public function deactivate(string $type, int $planId, int $farmId): void
    {
        $plan = $this->planFor($type, $planId, $farmId);
        $plan->forceFill(['is_active' => false])->save();
        NutritionPlanOccurrence::query()
            ->where('farm_id', $farmId)->where('plan_type', $type)->where('plan_id', $planId)
            ->where('status', 'todo')->whereDate('scheduled_for', '>=', now()->toDateString())
            ->with('task')->get()->each(function (NutritionPlanOccurrence $occurrence): void {
                $occurrence->forceFill(['status' => 'cancelled'])->save();
                if ($occurrence->task) $this->taskService->update($occurrence->task, ['status' => 'cancelled']);
            });
    }

    /**
     * An update is recorded as a new plan. The old plan and its completed
     * occurrences stay intact, while only its future work is cancelled.
     */
    public function replaceFishPlan(FishFeedPlan $plan, array $data): FishFeedPlan
    {
        $this->deactivate('fish', $plan->id, (int) $plan->farm_id);
        $data['farm_id'] = $plan->farm_id;

        return $this->createFishPlan($data);
    }

    public function replaceCropPlan(CropNutritionPlan $plan, array $data): CropNutritionPlan
    {
        $this->deactivate('crop', $plan->id, (int) $plan->farm_id);
        $data['farm_id'] = $plan->farm_id;

        return $this->createCropPlan($data);
    }

    public function replaceLayerPlan(LayerFeedPlan $plan, array $data): LayerFeedPlan
    {
        $this->deactivate('layer', $plan->id, (int) $plan->farm_id);
        $data['farm_id'] = $plan->farm_id;
        $replacement = $this->layerService->createFeedPlan($data);
        $this->syncLayerPlan($replacement->load('batch'));

        return $replacement;
    }

    public function complete(NutritionPlanOccurrence $occurrence, array $data): NutritionPlanOccurrence
    {
        return DB::transaction(function () use ($occurrence, $data) {
            $occurrence = NutritionPlanOccurrence::query()->whereKey($occurrence->id)->lockForUpdate()->firstOrFail();
            if ($occurrence->status !== 'todo') throw ValidationException::withMessages(['occurrence' => 'Cette tâche nutritionnelle a déjà été traitée.']);
            $quantity = round((float) $data['actual_quantity_kg'], 3);
            if ($quantity <= 0) throw ValidationException::withMessages(['actual_quantity_kg' => 'La quantité réelle doit être positive.']);
            $stockId = (int) ($data['stock_item_id'] ?? $occurrence->stock_item_id);
            if ($stockId <= 0) throw ValidationException::withMessages(['stock_item_id' => 'Sélectionnez l’intrant réellement utilisé.']);
            $stock = StockItem::query()->where('farm_id', $occurrence->farm_id)->lockForUpdate()->findOrFail($stockId);
            if ((float) $stock->current_quantity < $quantity) throw ValidationException::withMessages(['actual_quantity_kg' => 'Stock insuffisant pour valider cette tâche.']);

            $notes = trim((string) ($data['notes'] ?? ''));
            if ($occurrence->plan_type === 'layer') {
                $plan = LayerFeedPlan::query()->where('farm_id', $occurrence->farm_id)->findOrFail($occurrence->plan_id);
                $this->layerService->recordFeeding([
                    'farm_id' => $occurrence->farm_id, 'layer_batch_id' => $plan->layer_batch_id, 'stock_item_id' => $stock->id,
                    'feeding_date' => $occurrence->scheduled_for->toDateString(), 'quantity' => $quantity,
                    'notes' => trim('[Plan nutritionnel] ' . $notes),
                ]);
            } elseif ($occurrence->plan_type === 'fish') {
                $plan = FishFeedPlan::query()->where('farm_id', $occurrence->farm_id)->findOrFail($occurrence->plan_id);
                $movement = $this->stockService->recordMovement([
                    'farm_id' => $occurrence->farm_id, 'stock_item_id' => $stock->id, 'type' => 'out', 'quantity' => $quantity,
                    'unit_cost' => $stock->unit_cost ?? 0, 'source_module' => 'pisciculture', 'source_entity_type' => 'nutrition_plan_occurrence',
                    'source_entity_id' => (string) $occurrence->id, 'operation_id' => 'nutrition-occurrence-' . $occurrence->id,
                ]);
                FishPond::query()->where('farm_id', $occurrence->farm_id)->whereKey($plan->fish_pond_id)->increment('feed_distributed_kg', $quantity);
                $this->financeService->createTransaction([
                    'farm_id' => $occurrence->farm_id, 'type' => 'expense', 'amount' => round($quantity * (float) ($stock->unit_cost ?? 0), 2),
                    'category' => 'Alimentation piscicole', 'description' => 'Distribution planifiée : ' . $plan->plan_name,
                    'source_module' => 'pisciculture', 'source_entity_type' => 'nutrition_plan_occurrence', 'source_entity_id' => (string) $occurrence->id,
                    'operation_id' => 'nutrition-occurrence-' . $occurrence->id, 'occurred_at' => $occurrence->scheduled_for,
                ]);
            } else {
                $plan = CropNutritionPlan::query()->where('farm_id', $occurrence->farm_id)->findOrFail($occurrence->plan_id);
                $movement = $this->stockService->recordMovement([
                    'farm_id' => $occurrence->farm_id, 'stock_item_id' => $stock->id, 'type' => 'out', 'quantity' => $quantity,
                    'unit_cost' => $stock->unit_cost ?? 0, 'source_module' => 'cultures', 'source_entity_type' => 'nutrition_plan_occurrence',
                    'source_entity_id' => (string) $occurrence->id, 'operation_id' => 'nutrition-occurrence-' . $occurrence->id,
                ]);
                $this->culturesService->recordOperation([
                    'farm_id' => $occurrence->farm_id, 'crop_id' => $plan->crop_id, 'plot_id' => $plan->plot_id,
                    'operation_date' => $occurrence->scheduled_for->toDateString(), 'type' => 'fertilization',
                    'description' => 'Apport planifié : ' . $plan->plan_name, 'quantity' => $quantity, 'unit' => $stock->unit,
                    'unit_cost' => $stock->unit_cost ?? 0, 'total_cost' => round($quantity * (float) ($stock->unit_cost ?? 0), 2), 'notes' => $notes,
                ]);
            }

            $occurrence->forceFill(['status' => 'completed', 'actual_quantity_kg' => $quantity, 'actual_stock_item_id' => $stock->id, 'actual_notes' => $notes ?: null, 'completed_at' => now()])->save();
            if ($occurrence->task) $this->taskService->update($occurrence->task, ['status' => 'completed']);
            $this->auditService->record(['farm_id' => $occurrence->farm_id, 'user_id' => request()->user()?->id, 'module' => 'nutrition', 'entity_type' => 'nutrition_plan_occurrence', 'entity_id' => (string) $occurrence->id, 'action' => 'occurrence_completed', 'source' => 'web']);
            return $occurrence->fresh(['task', 'stockItem']);
        });
    }

    public function maintainHorizon(): void
    {
        LayerFeedPlan::query()->where('is_active', true)->with('batch')->get()->each(fn (LayerFeedPlan $plan) => $this->syncLayerPlan($plan));
        FishFeedPlan::query()->where('is_active', true)->with('pond')->get()->each(fn (FishFeedPlan $plan) => $this->syncFishPlan($plan));
        CropNutritionPlan::query()->where('is_active', true)->with(['crop', 'plot'])->get()->each(fn (CropNutritionPlan $plan) => $this->syncCropPlan($plan));
    }

    private function syncDailyPlan(string $type, object $plan, float $quantity, ?int $stockId, mixed $startDate, mixed $endDate, string $target): void
    {
        $start = Carbon::parse($startDate)->startOfDay();
        $today = now()->startOfDay();
        if ($start->lt($today)) $start = $today;
        $limit = now()->startOfDay()->addDays(29);
        $end = $endDate ? Carbon::parse($endDate)->startOfDay() : $limit;
        if ($end->gt($limit)) $end = $limit;
        for ($day = $start->copy(); $day->lte($end); $day->addDay()) {
            $label = $type === 'layer' ? 'Distribuer' : 'Nourrir';
            $this->createOccurrence($type, $plan->id, $plan->farm_id, $stockId, $day, $quantity, sprintf('%s %s — %s', $label, $target, $plan->plan_name), $type === 'layer' ? 'Élevage' : 'Pisciculture');
        }
    }

    private function createOccurrence(string $type, int $planId, int $farmId, ?int $stockId, Carbon $day, float $quantity, string $title, string $module): void
    {
        $occurrence = NutritionPlanOccurrence::query()
            ->where('plan_type', $type)
            ->where('plan_id', $planId)
            ->whereDate('scheduled_for', $day->toDateString())
            ->first();
        if (! $occurrence) {
            try {
                $occurrence = NutritionPlanOccurrence::create([
                    'farm_id' => $farmId,
                    'plan_type' => $type,
                    'plan_id' => $planId,
                    'stock_item_id' => $stockId,
                    'scheduled_for' => $day->toDateString(),
                    'planned_quantity_kg' => $quantity,
                    'status' => 'todo',
                ]);
            } catch (QueryException) {
                // A concurrent scheduler may have inserted the same date first.
                $occurrence = NutritionPlanOccurrence::query()
                    ->where('plan_type', $type)
                    ->where('plan_id', $planId)
                    ->whereDate('scheduled_for', $day->toDateString())
                    ->firstOrFail();
            }
        }
        if ($occurrence->task_id) return;
        $task = $this->taskService->create([
            'farm_id' => $farmId, 'title' => $title, 'description' => sprintf('Prévu : %s kg. Validez la quantité réellement utilisée avant la sortie de stock.', number_format($quantity, 3, ',', ' ')),
            'source_module' => $module, 'source_entity_type' => 'nutrition_plan_occurrence', 'source_entity_id' => (string) $occurrence->id,
            'start_at' => $day->copy()->setTime(8, 0), 'priority' => 'normal', 'status' => 'todo', 'due_at' => $day->copy()->setTime(17, 0), 'reminder_at' => $day->copy()->setTime(6, 0),
        ]);
        $occurrence->forceFill(['task_id' => $task->id])->save();
    }

    private function planFor(string $type, int $planId, int $farmId): object
    {
        return match ($type) {
            'layer' => LayerFeedPlan::query()->where('farm_id', $farmId)->findOrFail($planId),
            'fish' => FishFeedPlan::query()->where('farm_id', $farmId)->findOrFail($planId),
            'crop' => CropNutritionPlan::query()->where('farm_id', $farmId)->findOrFail($planId),
            default => throw ValidationException::withMessages(['plan_type' => 'Type de plan inconnu.']),
        };
    }
}
