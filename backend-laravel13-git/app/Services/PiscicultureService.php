<?php

namespace App\Services;

use App\Models\FishHarvest;
use App\Models\FishMonitoring;
use App\Models\FishPond;
use App\Models\FishSale;
use App\Models\FishStocking;
use App\Models\FarmSetting;
use App\Models\StockItem;
use Illuminate\Support\Facades\DB;

class PiscicultureService
{
    public function __construct(
        private readonly AuditService $auditService,
        private readonly StockService $stockService,
        private readonly FinanceService $financeService,
        private readonly AlertService $alertService
    ) {
    }

    public function createPond(array $data): FishPond
    {
        return FishPond::create([
            'farm_id' => $data['farm_id'],
            'name' => $data['name'],
            'pond_type' => $data['pond_type'],
            'capacity_kg' => $data['capacity_kg'] ?? 0,
            'species' => $data['species'],
            'initial_fish_count' => $data['initial_fish_count'],
            'stocking_date' => $data['stocking_date'],
            'status' => $data['status'] ?? 'active',
            'current_estimated_count' => $data['current_estimated_count'] ?? $data['initial_fish_count'],
            'mortality_total' => $data['mortality_total'] ?? 0,
            'average_weight_kg' => $data['average_weight_kg'] ?? 0,
            'biomass_kg' => $data['biomass_kg'] ?? 0,
            'feed_distributed_kg' => $data['feed_distributed_kg'] ?? 0,
            'fcr' => $data['fcr'] ?? null,
            'notes' => $data['notes'] ?? null,
            'unit_cost' => $data['unit_cost'] ?? 0,
            'acquisition_cost' => $data['acquisition_cost'] ?? 0,
        ]);
    }

    public function updatePond(FishPond $pond, array $data): FishPond
    {
        $pond->fill($data);
        $pond->save();

        return $pond;
    }

    public function deletePond(FishPond $pond): array
    {
        return DB::transaction(function () use ($pond) {
            $financialTransaction = null;
            $oldValue = $pond->toArray();
            $remainingFish = max(0, (int) $pond->current_estimated_count);
            $unitCost = (float) ($pond->unit_cost ?? 0);
            $residualValue = round($remainingFish * $unitCost, 2);
            $hasHistory = $pond->stockings()->exists()
                || $pond->monitorings()->exists()
                || $pond->harvests()->exists()
                || $pond->sales()->exists();

            if ($remainingFish > 0 && $residualValue > 0) {
                $financialTransaction = $this->financeService->createTransaction([
                    'farm_id' => $pond->farm_id,
                    'type' => 'expense',
                    'amount' => $residualValue,
                    'category' => 'Sortie Poissons',
                    'description' => sprintf(
                        'Suppression du bassin %s : sortie de %d poissons valorisee a %.2f',
                        $pond->name,
                        $remainingFish,
                        $residualValue
                    ),
                    'source_module' => 'pisciculture',
                    'source_entity_type' => 'fish_pond_deletion',
                    'source_entity_id' => (string) $pond->id,
                    'occurred_at' => now(),
                ]);
            }

            if ($hasHistory || $remainingFish > 0) {
                $pond->forceFill([
                    'status' => 'inactive',
                    'current_estimated_count' => 0,
                    'biomass_kg' => 0,
                ])->save();

                $this->auditService->record([
                    'farm_id' => $pond->farm_id,
                    'user_id' => request()->user()?->id,
                    'module' => 'pisciculture',
                    'entity_type' => 'fish_pond',
                    'entity_id' => (string) $pond->id,
                    'action' => 'pond_archived',
                    'old_value' => json_encode($oldValue),
                    'new_value' => json_encode([
                        'status' => 'inactive',
                        'remaining_fish' => $remainingFish,
                        'financial_transaction_id' => $financialTransaction?->id,
                        'residual_value' => $residualValue,
                    ]),
                    'source' => 'web',
                ]);

                return [
                    'action' => 'archived',
                    'pond' => $pond->fresh(),
                    'financial_transaction' => $financialTransaction,
                ];
            }

            $this->auditService->record([
                'farm_id' => $pond->farm_id,
                'user_id' => request()->user()?->id,
                'module' => 'pisciculture',
                'entity_type' => 'fish_pond',
                'entity_id' => (string) $pond->id,
                'action' => 'pond_deleted',
                'old_value' => json_encode($oldValue),
                'new_value' => json_encode([
                    'remaining_fish' => $remainingFish,
                    'financial_transaction_id' => $financialTransaction?->id,
                    'residual_value' => $residualValue,
                ]),
                'source' => 'web',
            ]);

            $snapshot = $pond->toArray();
            $pond->delete();

            return [
                'action' => 'deleted',
                'pond' => $snapshot,
                'financial_transaction' => $financialTransaction,
            ];
        });
    }

    public function recordStocking(array $data): FishStocking
    {
        return DB::transaction(function () use ($data) {
            $pond = FishPond::query()
                ->where('farm_id', $data['farm_id'])
                ->findOrFail($data['fish_pond_id']);
            $unitCost = (float) $data['unit_cost'];
            $acquisitionCost = (float) ($data['acquisition_cost'] ?? ($data['fish_count'] * $unitCost));
            $previousCount = (int) $pond->current_estimated_count;
            $nextCount = $previousCount + (int) $data['fish_count'];
            $nextAcquisitionCost = (float) $pond->acquisition_cost + $acquisitionCost;
            $weightedUnitCost = $nextCount > 0
                ? round(((((float) $pond->unit_cost) * $previousCount) + $acquisitionCost) / $nextCount, 2)
                : $unitCost;

            $stocking = FishStocking::create([
                'farm_id' => $data['farm_id'],
                'fish_pond_id' => $pond->id,
                'stocking_date' => $data['stocking_date'],
                'fish_count' => $data['fish_count'],
                'average_weight_kg' => $data['average_weight_kg'] ?? 0,
                'total_weight_kg' => $data['total_weight_kg'] ?? 0,
                'supplier_name' => $data['supplier_name'] ?? null,
                'notes' => $data['notes'] ?? null,
                'unit_cost' => $unitCost,
                'acquisition_cost' => $acquisitionCost,
            ]);

            $pond->forceFill([
                'initial_fish_count' => (int) $pond->initial_fish_count + (int) $data['fish_count'],
                'current_estimated_count' => $nextCount,
                'status' => 'active',
                'unit_cost' => $weightedUnitCost,
                'acquisition_cost' => $nextAcquisitionCost,
            ])->save();

            $transaction = $this->financeService->createTransaction([
                'farm_id' => $data['farm_id'],
                'type' => 'expense',
                'amount' => $acquisitionCost,
                'category' => 'Achat Alevins',
                'description' => sprintf('Empoissonnement de %d alevins dans le bassin %s', $data['fish_count'], $pond->name),
                'source_module' => 'pisciculture',
                'source_entity_type' => 'fish_stocking',
                'source_entity_id' => (string) $stocking->id,
                'occurred_at' => $data['stocking_date'],
            ]);
            $stocking->forceFill(['financial_transaction_id' => $transaction->id])->save();

            $this->auditService->record([
                'farm_id' => $data['farm_id'],
                'user_id' => request()->user()?->id,
                'module' => 'pisciculture',
                'entity_type' => 'fish_stocking',
                'entity_id' => (string) $stocking->id,
                'action' => 'stocking_recorded',
                'new_value' => json_encode([
                    'fish_count' => $stocking->fish_count,
                    'pond_id' => $pond->id,
                ]),
                'source' => 'web',
            ]);

            return $stocking->refresh();
        });
    }

    public function recordMonitoring(array $data): FishMonitoring
    {
        return DB::transaction(function () use ($data) {
            $pond = FishPond::query()
                ->where('farm_id', $data['farm_id'])
                ->findOrFail($data['fish_pond_id']);
            $previousBiomass = (float) $pond->biomass_kg;
            $biomass = (float) ($data['biomass_kg'] ?? ($data['estimated_count'] * $data['average_weight_kg']));
            $feed = (float) ($data['feed_distributed_kg'] ?? 0);
            $fcr = $data['fcr'] ?? ($biomass > 0 ? round($feed / max($biomass, 0.01), 2) : null);
            $growth = round(max(0, $biomass - $previousBiomass), 2);

            $monitoring = FishMonitoring::create([
                'farm_id' => $data['farm_id'],
                'fish_pond_id' => $pond->id,
                'monitoring_date' => $data['monitoring_date'],
                'estimated_count' => $data['estimated_count'],
                'mortality' => $data['mortality'] ?? 0,
                'average_weight_kg' => $data['average_weight_kg'],
                'biomass_kg' => $biomass,
                'feed_distributed_kg' => $feed,
                'fcr' => $fcr,
                'growth_kg' => $growth,
                'water_temperature' => $data['water_temperature'] ?? null,
                'ph' => $data['ph'] ?? null,
                'oxygen' => $data['oxygen'] ?? null,
                'turbidity' => $data['turbidity'] ?? null,
                'water_renewal_percent' => $data['water_renewal_percent'] ?? null,
                'observations' => $data['observations'] ?? null,
            ]);

            $pond->forceFill([
                'current_estimated_count' => $data['estimated_count'],
                'mortality_total' => $pond->mortality_total + ($data['mortality'] ?? 0),
                'average_weight_kg' => $data['average_weight_kg'],
                'biomass_kg' => $biomass,
                'feed_distributed_kg' => $pond->feed_distributed_kg + $feed,
                'fcr' => $fcr,
            ])->save();

            $this->raiseWaterAlerts($data['farm_id'], $pond, $monitoring);

            if ($growth < 0.1) {
                $this->alertService->createFishGrowthAlert($pond, $monitoring);
            }

            if (($data['mortality'] ?? 0) > max(10, (int) round($pond->current_estimated_count * 0.05))) {
                $this->alertService->createFishMortalityAlert($pond, $monitoring);
            }

            if ($feed <= 0) {
                $this->alertService->createFishFeedAlert($pond, $monitoring);
            }

            $this->auditService->record([
                'farm_id' => $data['farm_id'],
                'user_id' => request()->user()?->id,
                'module' => 'pisciculture',
                'entity_type' => 'fish_monitoring',
                'entity_id' => (string) $monitoring->id,
                'action' => 'monitoring_recorded',
                'new_value' => json_encode([
                    'biomass_kg' => $biomass,
                    'growth_kg' => $growth,
                    'fcr' => $fcr,
                ]),
                'source' => 'web',
            ]);

            return $monitoring;
        });
    }

    public function recordHarvest(array $data): FishHarvest
    {
        return DB::transaction(function () use ($data) {
            $pond = FishPond::query()
                ->where('farm_id', $data['farm_id'])
                ->findOrFail($data['fish_pond_id']);
            $sellable = max(0, (float) $data['total_weight_kg'] - (float) ($data['losses_kg'] ?? 0));

            $harvest = FishHarvest::create([
                'farm_id' => $data['farm_id'],
                'fish_pond_id' => $pond->id,
                'harvest_date' => $data['harvest_date'],
                'total_weight_kg' => $data['total_weight_kg'],
                'losses_kg' => $data['losses_kg'] ?? 0,
                'sellable_weight_kg' => $sellable,
                'destination' => $data['destination'],
                'notes' => $data['notes'] ?? null,
            ]);

            $pond->forceFill([
                'biomass_kg' => max(0, (float) $pond->biomass_kg - (float) $data['total_weight_kg']),
                'current_estimated_count' => max(0, $pond->current_estimated_count - (int) round($sellable / max((float) $pond->average_weight_kg, 0.1))),
            ])->save();

            $stockItem = $this->getOrCreateFishStockItem($data['farm_id']);
            $movement = $this->stockService->recordMovement([
                'farm_id' => $data['farm_id'],
                'stock_item_id' => $stockItem->id,
                'type' => 'in',
                'quantity' => (int) round($sellable),
                'unit_cost' => null,
                'source_module' => 'pisciculture',
                'source_entity_type' => 'fish_harvest',
                'source_entity_id' => (string) $harvest->id,
                'operation_id' => (string) $harvest->id,
            ]);

            $harvest->forceFill(['stock_movement_id' => $movement->id])->save();

            $this->auditService->record([
                'farm_id' => $data['farm_id'],
                'user_id' => request()->user()?->id,
                'module' => 'pisciculture',
                'entity_type' => 'fish_harvest',
                'entity_id' => (string) $harvest->id,
                'action' => 'harvest_recorded',
                'new_value' => json_encode([
                    'sellable_weight_kg' => $sellable,
                    'destination' => $data['destination'],
                ]),
                'source' => 'web',
            ]);

            return $harvest;
        });
    }

    public function recordSale(array $data): FishSale
    {
        return DB::transaction(function () use ($data) {
            $pond = FishPond::query()
                ->where('farm_id', $data['farm_id'])
                ->findOrFail($data['fish_pond_id']);
            $stockItem = $this->getOrCreateFishStockItem($data['farm_id']);
            $unitPrice = $data['unit_price'] ?? $this->defaultFishPrice($data['farm_id']);
            $kilograms = (float) $data['kilograms_sold'];
            $grossAmount = round($kilograms * (float) $unitPrice, 2);
            $amountPaid = $data['amount_paid'] ?? $grossAmount;
            $remainingDue = $data['remaining_due'] ?? max(0, $grossAmount - (float) $amountPaid);

            $movement = $this->stockService->recordMovement([
                'farm_id' => $data['farm_id'],
                'stock_item_id' => $stockItem->id,
                'type' => 'out',
                'quantity' => (int) round($kilograms),
                'unit_cost' => $unitPrice,
                'source_module' => 'pisciculture',
                'source_entity_type' => 'fish_sale',
                'source_entity_id' => null,
                'operation_id' => null,
            ]);

            $transaction = $this->financeService->createTransaction([
                'farm_id' => $data['farm_id'],
                'type' => 'income',
                'amount' => $amountPaid,
                'category' => 'vente poisson',
                'description' => sprintf('Vente de poisson à %s', $data['customer_name']),
                'source_module' => 'pisciculture',
                'source_entity_type' => 'fish_sale',
                'source_entity_id' => null,
                'operation_id' => null,
                'occurred_at' => $data['sale_date'],
            ]);

            $sale = FishSale::create([
                'farm_id' => $data['farm_id'],
                'fish_pond_id' => $pond->id,
                'fish_harvest_id' => $data['fish_harvest_id'] ?? null,
                'sale_date' => $data['sale_date'],
                'customer_name' => $data['customer_name'],
                'kilograms_sold' => $kilograms,
                'unit_price' => $unitPrice,
                'amount_paid' => $amountPaid,
                'remaining_due' => $remainingDue,
                'payment_method' => $data['payment_method'],
                'notes' => $data['notes'] ?? null,
                'stock_movement_id' => $movement->id,
                'financial_transaction_id' => $transaction->id,
            ]);

            $movement->forceFill(['source_entity_id' => (string) $sale->id])->save();
            $transaction->forceFill(['source_entity_id' => (string) $sale->id])->save();

            $this->auditService->record([
                'farm_id' => $data['farm_id'],
                'user_id' => request()->user()?->id,
                'module' => 'pisciculture',
                'entity_type' => 'fish_sale',
                'entity_id' => (string) $sale->id,
                'action' => 'sale_recorded',
                'new_value' => json_encode([
                    'kilograms_sold' => $kilograms,
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
        $ponds = FishPond::query()->where('farm_id', $farmId);
        $monitorings = FishMonitoring::query()->where('farm_id', $farmId);
        $harvests = FishHarvest::query()->where('farm_id', $farmId);
        $sales = FishSale::query()->where('farm_id', $farmId);

        return [
            'ponds' => $ponds->count(),
            'active_ponds' => FishPond::query()->where('farm_id', $farmId)->where('status', 'active')->count(),
            'total_estimated_count' => (int) (clone $ponds)->sum('current_estimated_count'),
            'total_biomass_kg' => (float) (clone $ponds)->sum('biomass_kg'),
            'total_mortality' => (int) (clone $ponds)->sum('mortality_total'),
            'total_feed_kg' => (float) (clone $ponds)->sum('feed_distributed_kg'),
            'monitorings_total' => (int) $monitorings->count(),
            'harvest_weight_total' => (float) (clone $harvests)->sum('sellable_weight_kg'),
            'sales_total' => (float) (clone $sales)->sum('amount_paid'),
            'remaining_due_total' => (float) (clone $sales)->sum('remaining_due'),
            'stock_poisson' => (float) (StockItem::query()->where('farm_id', $farmId)->where('name', 'Poissons')->value('current_quantity') ?? 0),
        ];
    }

    private function getOrCreateFishStockItem(int $farmId): StockItem
    {
        return StockItem::firstOrCreate(
            [
                'farm_id' => $farmId,
                'name' => 'Poissons',
            ],
            [
                'category' => 'production',
                'unit' => 'kg',
                'minimum_threshold' => 0,
                'current_quantity' => 0,
                'location' => 'Magasin principal',
            ]
        );
    }

    private function defaultFishPrice(int $farmId): float
    {
        return (float) (FarmSetting::query()->where('farm_id', $farmId)->value('fish_kg_default_price') ?? 0);
    }

    private function raiseWaterAlerts(int $farmId, FishPond $pond, FishMonitoring $monitoring): void
    {
        $settings = FarmSetting::query()->where('farm_id', $farmId)->first();
        $oxygen = $monitoring->oxygen;
        $ph = $monitoring->ph;
        $temperature = $monitoring->water_temperature;
        $turbidity = $monitoring->turbidity;
        $oxygenMin = (float) ($settings?->fish_oxygen_min ?? 5);
        $phMin = (float) ($settings?->fish_ph_min ?? 6.5);
        $phMax = (float) ($settings?->fish_ph_max ?? 8.5);
        $temperatureMin = (float) ($settings?->fish_temperature_min ?? 22);
        $temperatureMax = (float) ($settings?->fish_temperature_max ?? 32);

        if ($oxygen !== null && (float) $oxygen < $oxygenMin) {
            $this->alertService->createFishWaterAlert($farmId, $pond, 'oxygen_faible', 'Oxygene faible', 'Le niveau d oxygene est sous le seuil recommande.');
        }

        if ($ph !== null && ((float) $ph < $phMin || (float) $ph > $phMax)) {
            $this->alertService->createFishWaterAlert($farmId, $pond, 'ph_anormal', 'pH anormal', 'Le pH du bassin est en dehors de la plage recommandee.');
        }

        if ($temperature !== null && ((float) $temperature < $temperatureMin || (float) $temperature > $temperatureMax)) {
            $this->alertService->createFishWaterAlert($farmId, $pond, 'temperature_anormale', 'Temperature anormale', 'La temperature de l eau est hors plage.');
        }

        if ($turbidity !== null && (float) $turbidity > 50) {
            $this->alertService->createFishWaterAlert($farmId, $pond, 'qualite_eau_faible', 'Qualite de l eau faible', 'La turbidite indique une qualite d eau degradee.');
        }
    }
}
