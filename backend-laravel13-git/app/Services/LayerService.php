<?php

namespace App\Services;

use App\Models\EggProduction;
use App\Models\EggSale;
use App\Models\FarmSetting;
use App\Models\LayerBatch;
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
        return LayerBatch::create([
            'farm_id' => $data['farm_id'],
            'name' => $data['name'],
            'breed' => $data['breed'],
            'entry_date' => $data['entry_date'],
            'initial_count' => $data['initial_count'],
            'mortality_total' => $data['mortality_total'] ?? 0,
            'reform_total' => $data['reform_total'] ?? 0,
            'current_count' => $data['current_count'] ?? $data['initial_count'],
            'status' => $data['status'] ?? 'active',
        ]);
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
            $batch = LayerBatch::query()->findOrFail($data['layer_batch_id']);
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
                    'name' => 'Œufs',
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
            $batch = LayerBatch::query()->findOrFail($data['layer_batch_id']);
            $stockItem = StockItem::query()
                ->where('farm_id', $data['farm_id'])
                ->where('name', 'Œufs')
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
                'category' => 'vente œufs',
                'description' => sprintf('Vente de %d plateaux à %s', $trays, $data['customer_name']),
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

    public function summaryForFarm(int $farmId): array
    {
        $productions = EggProduction::query()->where('farm_id', $farmId);
        $sales = EggSale::query()->where('farm_id', $farmId);

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
            'stock_oeufs' => (int) (StockItem::query()->where('farm_id', $farmId)->where('name', 'Œufs')->value('current_quantity') ?? 0),
        ];
    }
}
