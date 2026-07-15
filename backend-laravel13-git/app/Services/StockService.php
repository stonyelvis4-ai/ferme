<?php

namespace App\Services;

use App\Models\StockItem;
use App\Models\StockMovement;

class StockService
{
    public function __construct(
        private readonly AuditService $auditService,
        private readonly AlertService $alertService
    ) {
    }

    public function createItem(array $data): StockItem
    {
        return StockItem::create($data);
    }

    public function updateItem(StockItem $item, array $data): StockItem
    {
        $item->fill($data);
        $item->save();

        return $item;
    }

    public function recordMovement(array $data): StockMovement
    {
        $item = StockItem::query()->findOrFail($data['stock_item_id']);

        $movement = StockMovement::create($data);

        $nextQuantity = match ($movement->type) {
            'in' => $item->current_quantity + $movement->quantity,
            'out' => max(0, $item->current_quantity - $movement->quantity),
            default => $movement->quantity,
        };

        $oldQuantity = $item->current_quantity;

        $item->update(['current_quantity' => $nextQuantity]);

        $this->auditService->record([
            'farm_id' => $item->farm_id,
            'user_id' => request()->user()?->id,
            'module' => 'stocks',
            'entity_type' => 'stock_item',
            'entity_id' => (string) $item->id,
            'action' => 'stock_movement_recorded',
            'old_value' => json_encode(['current_quantity' => $oldQuantity]),
            'new_value' => json_encode(['current_quantity' => $nextQuantity]),
            'source' => 'web',
        ]);

        if ($nextQuantity <= $item->minimum_threshold) {
            $this->alertService->createLowStockAlert($item);
        }

        return $movement;
    }
}

