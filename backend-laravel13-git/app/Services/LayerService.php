<?php

namespace App\Services;

use App\Models\EggProduction;
use App\Models\EggSale;
use App\Models\FarmSetting;
use App\Models\LayerBatch;
use App\Models\LayerFeedPlan;
use App\Models\LayerFeeding;
use App\Models\LayerWeighing;
use App\Models\SanitaryTreatment;
use App\Models\StockItem;
use Illuminate\Support\Facades\DB;

class LayerService
{
    public function __construct(
        private readonly AuditService $auditService,
        private readonly StockService $stockService,
        private readonly FinanceService $financeService,
        private readonly AlertService $alertService
    ) {
    }

    public function createBatch(array $data): LayerBatch
    {
        return DB::transaction(function () use ($data) {
            $unitCost = (float) $data['unit_cost'];
            $acquisitionCost = (float) ($data['acquisition_cost'] ?? ($data['initial_count'] * $unitCost));

            $batch = LayerBatch::create([
                'farm_id' => $data['farm_id'],
                'name' => $data['name'],
                'breed' => $data['breed'],
                'entry_date' => $data['entry_date'],
                'initial_count' => $data['initial_count'],
                'mortality_total' => $data['mortality_total'] ?? 0,
                'reform_total' => $data['reform_total'] ?? 0,
                'current_count' => $data['current_count'] ?? $data['initial_count'],
                'status' => $data['status'] ?? 'active',
                'unit_cost' => $unitCost,
                'acquisition_cost' => $acquisitionCost,
            ]);

            $transaction = $this->financeService->createTransaction([
                'farm_id' => $data['farm_id'],
                'type' => 'expense',
                'amount' => $acquisitionCost,
                'category' => 'Achat Animaux',
                'description' => sprintf('Achat initial de %d animaux pour le lot %s', $data['initial_count'], $data['name']),
                'source_module' => 'elevage',
                'source_entity_type' => 'layer_batch',
                'source_entity_id' => (string) $batch->id,
                'occurred_at' => $data['entry_date'],
            ]);

            $batch->forceFill(['financial_transaction_id' => $transaction->id])->save();

            return $batch->refresh();
        });
    }

    public function updateBatch(LayerBatch $batch, array $data): LayerBatch
    {
        $batch->fill($data);
        if (! array_key_exists('current_count', $data)) {
            $batch->current_count = max(0, $batch->initial_count - $batch->mortality_total - $batch->reform_total);
        }
        $batch->save();

        return $batch;
    }

    public function deleteBatch(LayerBatch $batch): array
    {
        return DB::transaction(function () use ($batch) {
            $financialTransaction = null;
            $oldValue = $batch->toArray();
            $remainingAnimals = max(0, (int) $batch->current_count);
            $unitCost = (float) ($batch->unit_cost ?? 0);
            $residualValue = round($remainingAnimals * $unitCost, 2);
            $hasHistory = $batch->productions()->exists()
                || $batch->sales()->exists()
                || $batch->feedings()->exists()
                || $batch->weighings()->exists()
                || $batch->feedPlans()->exists()
                || SanitaryTreatment::query()->where('layer_batch_id', $batch->id)->exists();

            if ($remainingAnimals > 0 && $residualValue > 0) {
                $financialTransaction = $this->financeService->createTransaction([
                    'farm_id' => $batch->farm_id,
                    'type' => 'expense',
                    'amount' => $residualValue,
                    'category' => 'Sortie Animaux',
                    'description' => sprintf(
                        'Suppression du lot %s : sortie de %d animaux valorisee a %.2f',
                        $batch->name,
                        $remainingAnimals,
                        $residualValue
                    ),
                    'source_module' => 'elevage',
                    'source_entity_type' => 'layer_batch_deletion',
                    'source_entity_id' => (string) $batch->id,
                    'occurred_at' => now(),
                ]);
            }

            if ($hasHistory || $remainingAnimals > 0) {
                $batch->forceFill([
                    'status' => 'archived',
                    'reform_total' => (int) $batch->reform_total + $remainingAnimals,
                    'current_count' => 0,
                ])->save();

                $this->auditService->record([
                    'farm_id' => $batch->farm_id,
                    'user_id' => request()->user()?->id,
                    'module' => 'elevage',
                    'entity_type' => 'layer_batch',
                    'entity_id' => (string) $batch->id,
                    'action' => 'batch_archived',
                    'old_value' => json_encode($oldValue),
                    'new_value' => json_encode([
                        'status' => 'archived',
                        'remaining_animals' => $remainingAnimals,
                        'financial_transaction_id' => $financialTransaction?->id,
                        'residual_value' => $residualValue,
                    ]),
                    'source' => 'web',
                ]);

                return [
                    'action' => 'archived',
                    'batch' => $batch->fresh(),
                    'financial_transaction' => $financialTransaction,
                ];
            }

            $this->auditService->record([
                'farm_id' => $batch->farm_id,
                'user_id' => request()->user()?->id,
                'module' => 'elevage',
                'entity_type' => 'layer_batch',
                'entity_id' => (string) $batch->id,
                'action' => 'batch_deleted',
                'old_value' => json_encode($oldValue),
                'new_value' => json_encode([
                    'remaining_animals' => $remainingAnimals,
                    'financial_transaction_id' => $financialTransaction?->id,
                    'residual_value' => $residualValue,
                ]),
                'source' => 'web',
            ]);

            $snapshot = $batch->toArray();
            $batch->delete();

            return [
                'action' => 'deleted',
                'batch' => $snapshot,
                'financial_transaction' => $financialTransaction,
            ];
        });
    }

    public function recordProduction(array $data): EggProduction
    {
        return DB::transaction(function () use ($data) {
            $batch = LayerBatch::query()
                ->where('farm_id', $data['farm_id'])
                ->findOrFail($data['layer_batch_id']);
            $settings = FarmSetting::query()->where('farm_id', $data['farm_id'])->first();

            $broken = $data['broken_eggs'] ?? 0;
            $dirty = $data['dirty_eggs'] ?? 0;
            $lost = $data['lost_eggs'] ?? 0;
            $mortality = $data['mortality'] ?? 0;
            $eggsProduced = $data['eggs_produced'];
            $vendable = max(0, $eggsProduced - $broken - $dirty - $lost);
            $plateaux = intdiv($vendable, 30);
            $layingRateThreshold = (float) ($settings?->laying_rate_low_threshold ?? 0);
            $mortalityThreshold = (int) ($settings?->mortalite_threshold_layers ?? 0);
            $breakageThreshold = (int) ($settings?->egg_breakage_threshold ?? 0);

            $production = EggProduction::create([
                'farm_id' => $data['farm_id'],
                'layer_batch_id' => $batch->id,
                'production_date' => $data['production_date'],
                'eggs_produced' => $eggsProduced,
                'broken_eggs' => $broken,
                'dirty_eggs' => $dirty,
                'lost_eggs' => $lost,
                'mortality' => $mortality,
                'observations' => $data['observations'] ?? null,
                'vendable_eggs' => $vendable,
                'plateaux' => $plateaux,
            ]);

            $batch->forceFill([
                'mortality_total' => $batch->mortality_total + $mortality,
                'current_count' => max(0, $batch->current_count - $mortality),
            ])->save();

            if ($mortalityThreshold > 0 && $mortality >= $mortalityThreshold) {
                $this->alertService->createLayerMortalityAlert($batch, $mortality, $mortalityThreshold);
            }

            if ($breakageThreshold > 0 && $broken >= $breakageThreshold) {
                $this->alertService->createEggBreakageAlert($production, $broken, $breakageThreshold);
            }

            if ($layingRateThreshold > 0 && $batch->current_count > 0) {
                $layingRate = round(($eggsProduced / max(1, $batch->current_count)) * 100, 2);
                if ($layingRate < $layingRateThreshold) {
                    $this->alertService->createLayingRateAlert($production, $layingRate, $layingRateThreshold);
                }
            }

            $stockItem = StockItem::firstOrCreate(
                [
                    'farm_id' => $data['farm_id'],
                    'name' => 'Oeufs',
                ],
                [
                    'category' => 'production',
                    'unit' => 'egg',
                    'minimum_threshold' => 30,
                    'current_quantity' => 0,
                    'location' => 'Magasin principal',
                ]
            );

            $this->stockService->recordMovement([
                'farm_id' => $data['farm_id'],
                'stock_item_id' => $stockItem->id,
                'type' => 'in',
                'quantity' => $vendable,
                'unit_cost' => null,
                'source_module' => 'pondeuses',
                'source_entity_type' => 'egg_production',
                'source_entity_id' => (string) $production->id,
                'operation_id' => (string) $production->id,
            ]);

            $this->auditService->record([
                'farm_id' => $data['farm_id'],
                'user_id' => request()->user()?->id,
                'module' => 'pondeuses',
                'entity_type' => 'egg_production',
                'entity_id' => (string) $production->id,
                'action' => 'production_recorded',
                'new_value' => json_encode([
                    'vendable_eggs' => $vendable,
                    'plateaux' => $plateaux,
                ]),
                'source' => 'web',
            ]);

            return $production;
        });
    }

    public function recordSale(array $data): EggSale
    {
        return DB::transaction(function () use ($data) {
            $batch = LayerBatch::query()
                ->where('farm_id', $data['farm_id'])
                ->findOrFail($data['layer_batch_id']);
            $stockItem = StockItem::query()
                ->where('farm_id', $data['farm_id'])
                ->where('name', 'Oeufs')
                ->firstOrFail();

            $trays = $data['trays_sold'];
            $eggsSold = $data['eggs_sold'] ?? ($trays * 30);
            $unitPrice = $data['unit_price'];
            $grossAmount = $trays * $unitPrice;
            $amountPaid = $data['amount_paid'] ?? $grossAmount;
            $remainingDue = $data['remaining_due'] ?? max(0, $grossAmount - $amountPaid);

            $movement = $this->stockService->recordMovement([
                'farm_id' => $data['farm_id'],
                'stock_item_id' => $stockItem->id,
                'type' => 'out',
                'quantity' => $eggsSold,
                'unit_cost' => $unitPrice,
                'source_module' => 'pondeuses',
                'source_entity_type' => 'egg_sale',
                'source_entity_id' => null,
                'operation_id' => null,
            ]);

            $transaction = $this->financeService->createTransaction([
                'farm_id' => $data['farm_id'],
                'type' => 'income',
                'amount' => $amountPaid,
                'category' => 'vente oeufs',
                'description' => sprintf('Vente de %d plateaux a %s', $trays, $data['customer_name']),
                'source_module' => 'pondeuses',
                'source_entity_type' => 'egg_sale',
                'source_entity_id' => null,
                'operation_id' => null,
                'occurred_at' => $data['sale_date'],
            ]);

            $sale = EggSale::create([
                'farm_id' => $data['farm_id'],
                'layer_batch_id' => $batch->id,
                'sale_date' => $data['sale_date'],
                'customer_name' => $data['customer_name'],
                'trays_sold' => $trays,
                'eggs_sold' => $eggsSold,
                'unit_price' => $unitPrice,
                'amount_paid' => $amountPaid,
                'remaining_due' => $remainingDue,
                'payment_method' => $data['payment_method'],
                'notes' => $data['notes'] ?? null,
                'stock_movement_id' => $movement->id,
                'financial_transaction_id' => $transaction->id,
            ]);

            $movement->forceFill([
                'source_entity_id' => (string) $sale->id,
            ])->save();

            $transaction->forceFill([
                'source_entity_id' => (string) $sale->id,
            ])->save();

            $this->auditService->record([
                'farm_id' => $data['farm_id'],
                'user_id' => request()->user()?->id,
                'module' => 'pondeuses',
                'entity_type' => 'egg_sale',
                'entity_id' => (string) $sale->id,
                'action' => 'sale_recorded',
                'new_value' => json_encode([
                    'trays_sold' => $trays,
                    'amount_paid' => $amountPaid,
                    'remaining_due' => $remainingDue,
                ]),
                'source' => 'web',
            ]);

            return $sale;
        });
    }

    public function recordFeeding(array $data): LayerFeeding
    {
        return DB::transaction(function () use ($data) {
            $batch = LayerBatch::query()
                ->where('farm_id', $data['farm_id'])
                ->findOrFail($data['layer_batch_id']);

            $stockItem = StockItem::query()
                ->where('farm_id', $data['farm_id'])
                ->findOrFail($data['stock_item_id']);

            $quantity = (float) $data['quantity'];
            $unitCost = (float) ($stockItem->unit_cost ?? 0);
            $totalCost = round($quantity * $unitCost, 2);

            $movement = $this->stockService->recordMovement([
                'farm_id' => $data['farm_id'],
                'stock_item_id' => $stockItem->id,
                'type' => 'out',
                'quantity' => $quantity,
                'unit_cost' => $unitCost,
                'source_module' => 'elevage',
                'source_entity_type' => 'layer_feeding',
                'source_entity_id' => null,
                'operation_id' => null,
            ]);

            $transaction = $totalCost > 0
                ? $this->financeService->createTransaction([
                    'farm_id' => $data['farm_id'],
                    'type' => 'expense',
                    'amount' => $totalCost,
                    'category' => 'Alimentation animale',
                    'description' => sprintf('Distribution de %s %s de %s au lot %s', $quantity, $stockItem->unit, $stockItem->name, $batch->name),
                    'source_module' => 'elevage',
                    'source_entity_type' => 'layer_feeding',
                    'source_entity_id' => null,
                    'operation_id' => null,
                    'occurred_at' => $data['feeding_date'],
                ])
                : null;

            $feeding = LayerFeeding::create([
                'farm_id' => $data['farm_id'],
                'layer_batch_id' => $batch->id,
                'stock_item_id' => $stockItem->id,
                'feeding_date' => $data['feeding_date'],
                'feeding_time' => $data['feeding_time'] ?? null,
                'quantity' => $quantity,
                'unit' => $stockItem->unit,
                'unit_cost' => $unitCost,
                'total_cost' => $totalCost,
                'notes' => $data['notes'] ?? null,
                'stock_movement_id' => $movement->id,
                'financial_transaction_id' => $transaction?->id,
            ]);

            $movement->forceFill([
                'source_entity_id' => (string) $feeding->id,
                'operation_id' => 'feeding-' . $feeding->id,
            ])->save();

            if ($transaction) {
                $transaction->forceFill([
                    'source_entity_id' => (string) $feeding->id,
                    'operation_id' => 'feeding-' . $feeding->id,
                ])->save();
            }

            $this->auditService->record([
                'farm_id' => $data['farm_id'],
                'user_id' => request()->user()?->id,
                'module' => 'elevage',
                'entity_type' => 'layer_feeding',
                'entity_id' => (string) $feeding->id,
                'action' => 'feeding_recorded',
                'new_value' => json_encode([
                    'layer_batch_id' => $batch->id,
                    'stock_item_id' => $stockItem->id,
                    'quantity' => $quantity,
                    'total_cost' => $totalCost,
                ]),
                'source' => 'web',
            ]);

            return $feeding->load(['batch:id,name', 'stockItem:id,name,unit']);
        });
    }

    public function recordWeighing(array $data): LayerWeighing
    {
        return DB::transaction(function () use ($data) {
            $batch = LayerBatch::query()
                ->where('farm_id', $data['farm_id'])
                ->findOrFail($data['layer_batch_id']);

            $averageWeight = round((float) $data['average_weight_kg'], 3);
            $sampleSize = (int) ($data['sample_size'] ?? 0);
            $totalWeight = isset($data['total_weight_kg'])
                ? round((float) $data['total_weight_kg'], 3)
                : round($averageWeight * max($sampleSize, $batch->current_count), 3);

            $previousWeighing = LayerWeighing::query()
                ->where('farm_id', $data['farm_id'])
                ->where('layer_batch_id', $batch->id)
                ->whereDate('weighing_date', '<=', $data['weighing_date'])
                ->latest('weighing_date')
                ->latest('id')
                ->first();

            $weightGain = $previousWeighing
                ? round($averageWeight - (float) $previousWeighing->average_weight_kg, 3)
                : 0.0;

            $weighing = LayerWeighing::create([
                'farm_id' => $data['farm_id'],
                'layer_batch_id' => $batch->id,
                'weighing_date' => $data['weighing_date'],
                'sample_size' => $sampleSize > 0 ? $sampleSize : null,
                'average_weight_kg' => $averageWeight,
                'total_weight_kg' => $totalWeight,
                'weight_gain_kg' => $weightGain,
                'notes' => $data['notes'] ?? null,
            ]);

            if ($previousWeighing && $weightGain <= 0) {
                $this->alertService->createLayerGrowthAlert($batch, $weighing, $weightGain);
            }

            $this->auditService->record([
                'farm_id' => $data['farm_id'],
                'user_id' => request()->user()?->id,
                'module' => 'elevage',
                'entity_type' => 'layer_weighing',
                'entity_id' => (string) $weighing->id,
                'action' => 'weighing_recorded',
                'new_value' => json_encode([
                    'layer_batch_id' => $batch->id,
                    'average_weight_kg' => $averageWeight,
                    'weight_gain_kg' => $weightGain,
                    'sample_size' => $sampleSize,
                ]),
                'source' => 'web',
            ]);

            return $weighing->load(['batch:id,name,current_count']);
        });
    }

    public function createFeedPlan(array $data): LayerFeedPlan
    {
        return DB::transaction(function () use ($data) {
            $batch = LayerBatch::query()
                ->where('farm_id', $data['farm_id'])
                ->findOrFail($data['layer_batch_id']);

            $stockItem = null;
            if (! empty($data['stock_item_id'])) {
                $stockItem = StockItem::query()
                    ->where('farm_id', $data['farm_id'])
                    ->findOrFail($data['stock_item_id']);
            }

            $rationPerHead = round((float) $data['ration_per_head_kg'], 3);
            $targetDailyQuantity = isset($data['target_daily_quantity_kg'])
                ? round((float) $data['target_daily_quantity_kg'], 3)
                : round($rationPerHead * max($batch->current_count, 1), 3);

            LayerFeedPlan::query()
                ->where('farm_id', $data['farm_id'])
                ->where('layer_batch_id', $batch->id)
                ->where('is_active', true)
                ->update(['is_active' => false]);

            $plan = LayerFeedPlan::create([
                'farm_id' => $data['farm_id'],
                'layer_batch_id' => $batch->id,
                'stock_item_id' => $stockItem?->id,
                'plan_name' => $data['plan_name'],
                'ration_per_head_kg' => $rationPerHead,
                'feedings_per_day' => (int) $data['feedings_per_day'],
                'target_daily_quantity_kg' => $targetDailyQuantity,
                'start_date' => $data['start_date'],
                'notes' => $data['notes'] ?? null,
                'is_active' => (bool) ($data['is_active'] ?? true),
            ]);

            $this->auditService->record([
                'farm_id' => $data['farm_id'],
                'user_id' => request()->user()?->id,
                'module' => 'elevage',
                'entity_type' => 'layer_feed_plan',
                'entity_id' => (string) $plan->id,
                'action' => 'feed_plan_created',
                'new_value' => json_encode([
                    'layer_batch_id' => $batch->id,
                    'stock_item_id' => $stockItem?->id,
                    'ration_per_head_kg' => $rationPerHead,
                    'target_daily_quantity_kg' => $targetDailyQuantity,
                    'feedings_per_day' => (int) $data['feedings_per_day'],
                ]),
                'source' => 'web',
            ]);

            return $plan->load(['batch:id,name,current_count', 'stockItem:id,name,unit']);
        });
    }

    public function summaryForFarm(int $farmId): array
    {
        $productions = EggProduction::query()->where('farm_id', $farmId);
        $sales = EggSale::query()->where('farm_id', $farmId);
        $feedings = LayerFeeding::query()->where('farm_id', $farmId);
        $feedPlans = LayerFeedPlan::query()->where('farm_id', $farmId)->where('is_active', true);
        $weighings = LayerWeighing::query()->where('farm_id', $farmId);
        $latestWeighing = (clone $weighings)->latest('weighing_date')->latest('id')->first();

        return [
            'batches' => LayerBatch::query()->where('farm_id', $farmId)->count(),
            'active_batches' => LayerBatch::query()->where('farm_id', $farmId)->where('status', 'active')->count(),
            'production_total' => (int) (clone $productions)->sum('eggs_produced'),
            'vendable_total' => (int) (clone $productions)->sum('vendable_eggs'),
            'plateaux_total' => (int) (clone $productions)->sum('plateaux'),
            'sales_total' => (float) (clone $sales)->sum('amount_paid'),
            'remaining_due_total' => (float) (clone $sales)->sum('remaining_due'),
            'mortalite_total' => (int) (clone $productions)->sum('mortality'),
            'broken_total' => (int) (clone $productions)->sum('broken_eggs'),
            'feeding_quantity_total' => (float) (clone $feedings)->sum('quantity'),
            'feeding_cost_total' => (float) (clone $feedings)->sum('total_cost'),
            'feeding_cost_last_7_days' => (float) (clone $feedings)->whereDate('feeding_date', '>=', now()->subDays(6)->toDateString())->sum('total_cost'),
            'feeding_quantity_today' => (float) (clone $feedings)->whereDate('feeding_date', now()->toDateString())->sum('quantity'),
            'active_feed_plans' => (int) (clone $feedPlans)->count(),
            'planned_feed_quantity_daily' => (float) (clone $feedPlans)->sum('target_daily_quantity_kg'),
            'weighings_total' => (int) (clone $weighings)->count(),
            'latest_average_weight_kg' => (float) ($latestWeighing?->average_weight_kg ?? 0),
            'latest_weight_gain_kg' => (float) ($latestWeighing?->weight_gain_kg ?? 0),
            'stock_oeufs' => (int) (StockItem::query()->where('farm_id', $farmId)->where('name', 'Oeufs')->value('current_quantity') ?? 0),
        ];
    }
}
