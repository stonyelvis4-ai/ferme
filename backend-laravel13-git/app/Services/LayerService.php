<?php

namespace App\Services;

use App\Models\EggProduction;
use App\Models\EggSale;
use App\Models\FarmSetting;
use App\Models\LayerBatch;
use App\Models\LayerFeeding;
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

    public function summaryForFarm(int $farmId): array
    {
        $productions = EggProduction::query()->where('farm_id', $farmId);
        $sales = EggSale::query()->where('farm_id', $farmId);
        $feedings = LayerFeeding::query()->where('farm_id', $farmId);

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
            'stock_oeufs' => (int) (StockItem::query()->where('farm_id', $farmId)->where('name', 'Oeufs')->value('current_quantity') ?? 0),
        ];
    }
}
