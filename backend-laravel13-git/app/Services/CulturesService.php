<?php

namespace App\Services;

use App\Models\Crop;
use App\Models\CropHarvest;
use App\Models\CropOperation;
use App\Models\CropSale;
use App\Models\FarmSetting;
use App\Models\Plot;
use App\Models\StockItem;
use Illuminate\Support\Facades\DB;

class CulturesService
{
    public function __construct(
        private readonly AuditService $auditService,
        private readonly StockService $stockService,
        private readonly FinanceService $financeService,
        private readonly AlertService $alertService
    ) {
    }

    public function createCrop(array $data): Crop
    {
        return Crop::create([
            'farm_id' => $data['farm_id'],
            'name' => $data['name'],
            'variety' => $data['variety'],
            'cycle_days' => $data['cycle_days'],
            'planting_date' => $data['planting_date'],
            'area' => $data['area'],
            'status' => $data['status'] ?? 'growing',
            'estimated_harvest_date' => $data['estimated_harvest_date'] ?? null,
            'expected_yield_kg' => $data['expected_yield_kg'] ?? 0,
            'total_operations_cost' => $data['total_operations_cost'] ?? 0,
            'total_harvest_kg' => $data['total_harvest_kg'] ?? 0,
            'notes' => $data['notes'] ?? null,
        ]);
    }

    public function updateCrop(Crop $crop, array $data): Crop
    {
        $crop->fill($data);
        $crop->save();

        return $crop;
    }

    public function deleteCrop(Crop $crop): array
    {
        if ($crop->operations()->exists() || $crop->harvests()->exists() || $crop->sales()->exists()) {
            $oldValue = $crop->toArray();
            $crop->forceFill(['status' => 'cancelled'])->save();

            $this->auditService->record([
                'farm_id' => $crop->farm_id,
                'user_id' => request()->user()?->id,
                'module' => 'cultures',
                'entity_type' => 'crop',
                'entity_id' => (string) $crop->id,
                'action' => 'crop_cancelled',
                'old_value' => json_encode($oldValue),
                'new_value' => json_encode(['status' => 'cancelled']),
                'source' => 'web',
            ]);

            return [
                'action' => 'cancelled',
                'crop' => $crop->fresh(),
            ];
        }

        $this->auditService->record([
            'farm_id' => $crop->farm_id,
            'user_id' => request()->user()?->id,
            'module' => 'cultures',
            'entity_type' => 'crop',
            'entity_id' => (string) $crop->id,
            'action' => 'crop_deleted',
            'old_value' => json_encode($crop->toArray()),
            'source' => 'web',
        ]);

        $snapshot = $crop->toArray();
        $crop->delete();

        return [
            'action' => 'deleted',
            'crop' => $snapshot,
        ];
    }

    public function createPlot(array $data): Plot
    {
        return Plot::create([
            'farm_id' => $data['farm_id'],
            'crop_id' => $data['crop_id'],
            'name' => $data['name'],
            'area' => $data['area'],
            'soil_type' => $data['soil_type'],
            'location' => $data['location'] ?? null,
            'status' => $data['status'] ?? 'active',
            'notes' => $data['notes'] ?? null,
        ]);
    }

    public function recordOperation(array $data): CropOperation
    {
        return DB::transaction(function () use ($data) {
            $crop = Crop::query()->findOrFail($data['crop_id']);
            $plot = Plot::query()->findOrFail($data['plot_id']);
            $totalCost = (float) ($data['total_cost'] ?? (($data['quantity'] ?? 0) * ($data['unit_cost'] ?? 0)));

            $operation = CropOperation::create([
                'farm_id' => $data['farm_id'],
                'crop_id' => $crop->id,
                'plot_id' => $plot->id,
                'operation_date' => $data['operation_date'],
                'type' => $data['type'],
                'description' => $data['description'] ?? null,
                'quantity' => $data['quantity'] ?? 0,
                'unit' => $data['unit'] ?? 'unite',
                'unit_cost' => $data['unit_cost'] ?? 0,
                'total_cost' => $totalCost,
                'notes' => $data['notes'] ?? null,
            ]);

            $crop->forceFill([
                'total_operations_cost' => (float) $crop->total_operations_cost + $totalCost,
            ])->save();

            if ($totalCost > 0) {
                $transaction = $this->financeService->createTransaction([
                    'farm_id' => $data['farm_id'],
                    'type' => 'expense',
                    'amount' => $totalCost,
                    'category' => 'operation culturale',
                    'description' => $data['description'] ?? $data['type'],
                    'source_module' => 'cultures',
                    'source_entity_type' => 'crop_operation',
                    'source_entity_id' => (string) $operation->id,
                    'operation_id' => (string) $operation->id,
                    'occurred_at' => $data['operation_date'],
                ]);

                $operation->forceFill(['financial_transaction_id' => $transaction->id])->save();
            }

            $this->auditService->record([
                'farm_id' => $data['farm_id'],
                'user_id' => request()->user()?->id,
                'module' => 'cultures',
                'entity_type' => 'crop_operation',
                'entity_id' => (string) $operation->id,
                'action' => 'operation_recorded',
                'new_value' => json_encode([
                    'type' => $operation->type,
                    'total_cost' => $totalCost,
                ]),
                'source' => 'web',
            ]);

            return $operation;
        });
    }

    public function recordHarvest(array $data): CropHarvest
    {
        return DB::transaction(function () use ($data) {
            $crop = Crop::query()->findOrFail($data['crop_id']);
            $plot = Plot::query()->findOrFail($data['plot_id']);
            $settings = FarmSetting::query()->where('farm_id', $data['farm_id'])->first();
            $losses = (float) ($data['losses_kg'] ?? 0);
            $sellable = max(0, (float) $data['harvested_kg'] - $losses);

            $harvest = CropHarvest::create([
                'farm_id' => $data['farm_id'],
                'crop_id' => $crop->id,
                'plot_id' => $plot->id,
                'harvest_date' => $data['harvest_date'],
                'harvested_kg' => $data['harvested_kg'],
                'losses_kg' => $losses,
                'sellable_kg' => $sellable,
                'destination' => $data['destination'],
                'notes' => $data['notes'] ?? null,
            ]);

            $crop->forceFill([
                'total_harvest_kg' => (float) $crop->total_harvest_kg + $sellable,
            ])->save();

            $stockItem = $this->getOrCreateCropStockItem($data['farm_id']);
            $movement = $this->stockService->recordMovement([
                'farm_id' => $data['farm_id'],
                'stock_item_id' => $stockItem->id,
                'type' => 'in',
                'quantity' => (int) round($sellable),
                'unit_cost' => null,
                'source_module' => 'cultures',
                'source_entity_type' => 'crop_harvest',
                'source_entity_id' => (string) $harvest->id,
                'operation_id' => (string) $harvest->id,
            ]);

            $harvest->forceFill(['stock_movement_id' => $movement->id])->save();

            $yieldThreshold = (float) ($settings?->crop_yield_low_threshold ?? 0);
            if (($yieldThreshold > 0 && $sellable < $yieldThreshold) || ($crop->expected_yield_kg > 0 && $sellable < ($crop->expected_yield_kg * 0.6))) {
                $this->alertService->createCropYieldAlert($crop, $harvest);
            }

            $this->auditService->record([
                'farm_id' => $data['farm_id'],
                'user_id' => request()->user()?->id,
                'module' => 'cultures',
                'entity_type' => 'crop_harvest',
                'entity_id' => (string) $harvest->id,
                'action' => 'harvest_recorded',
                'new_value' => json_encode([
                    'sellable_kg' => $sellable,
                    'destination' => $data['destination'],
                ]),
                'source' => 'web',
            ]);

            return $harvest;
        });
    }

    public function recordSale(array $data): CropSale
    {
        return DB::transaction(function () use ($data) {
            $crop = Crop::query()->findOrFail($data['crop_id']);
            $stockItem = $this->getOrCreateCropStockItem($data['farm_id']);
            $unitPrice = $data['unit_price'] ?? $this->defaultCropPrice($data['farm_id']);
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
                'source_module' => 'cultures',
                'source_entity_type' => 'crop_sale',
                'source_entity_id' => null,
                'operation_id' => null,
            ]);

            $transaction = $this->financeService->createTransaction([
                'farm_id' => $data['farm_id'],
                'type' => 'income',
                'amount' => $amountPaid,
                'category' => 'vente recolte',
                'description' => sprintf('Vente de recolte à %s', $data['customer_name']),
                'source_module' => 'cultures',
                'source_entity_type' => 'crop_sale',
                'source_entity_id' => null,
                'operation_id' => null,
                'occurred_at' => $data['sale_date'],
            ]);

            $sale = CropSale::create([
                'farm_id' => $data['farm_id'],
                'crop_id' => $crop->id,
                'crop_harvest_id' => $data['crop_harvest_id'] ?? null,
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
                'module' => 'cultures',
                'entity_type' => 'crop_sale',
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
        $crops = Crop::query()->where('farm_id', $farmId);
        $plots = Plot::query()->where('farm_id', $farmId);
        $operations = CropOperation::query()->where('farm_id', $farmId);
        $harvests = CropHarvest::query()->where('farm_id', $farmId);
        $sales = CropSale::query()->where('farm_id', $farmId);

        return [
            'crops' => $crops->count(),
            'active_crops' => Crop::query()->where('farm_id', $farmId)->where('status', 'growing')->count(),
            'plots' => $plots->count(),
            'total_area' => (float) (clone $plots)->sum('area'),
            'operations_total' => (int) $operations->count(),
            'operations_cost_total' => (float) (clone $operations)->sum('total_cost'),
            'harvest_total_kg' => (float) (clone $harvests)->sum('sellable_kg'),
            'sales_total' => (float) (clone $sales)->sum('amount_paid'),
            'remaining_due_total' => (float) (clone $sales)->sum('remaining_due'),
            'stock_recoltes' => (float) (StockItem::query()->where('farm_id', $farmId)->where('name', 'Récoltes')->value('current_quantity') ?? 0),
        ];
    }

    private function getOrCreateCropStockItem(int $farmId): StockItem
    {
        return StockItem::firstOrCreate(
            [
                'farm_id' => $farmId,
                'name' => 'Récoltes',
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

    private function defaultCropPrice(int $farmId): float
    {
        return (float) (FarmSetting::query()->where('farm_id', $farmId)->value('crop_kg_default_price') ?? 0);
    }
}
