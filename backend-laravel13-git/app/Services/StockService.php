<?php

namespace App\Services;

use App\Models\Building;
use App\Models\Crop;
use App\Models\FishPond;
use App\Models\FishStocking;
use App\Models\FinancialTransaction;
use App\Models\LayerBatch;
use App\Models\Plot;
use App\Models\StockCategory;
use App\Models\StockItem;
use App\Models\StockMovement;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class StockService
{
    public function __construct(
        private readonly AuditService $auditService,
        private readonly AlertService $alertService,
        private readonly FinanceService $financeService
    ) {
    }

    public function createItem(array $data): StockItem
    {
        $user = request()->user();
        $farmId = (int) ($user?->farm_id ?? 0);
        $initialQuantity = (float) ($data['current_quantity'] ?? 0);

        return DB::transaction(function () use ($data, $farmId, $initialQuantity): StockItem {
            $payload = $this->normalizeItemPayload($data, $farmId);
            $payload['current_quantity'] = 0;

            /** @var StockItem $item */
            $item = StockItem::create($payload);

            if ($initialQuantity > 0) {
                $this->recordMovement([
                    'farm_id' => $farmId,
                    'stock_item_id' => $item->id,
                    'type' => 'in',
                    'quantity' => $initialQuantity,
                    'unit_cost' => $payload['unit_cost'] ?? 0,
                    'source_module' => 'Stocks',
                    'source_entity_type' => 'stock_item',
                    'source_entity_id' => (string) $item->id,
                    'operation_id' => 'stock-init-' . $item->id,
                ]);
            }

            if (($payload['purchase_total_cost'] ?? 0) > 0) {
                $this->financeService->createTransaction([
                    'farm_id' => $farmId,
                    'type' => 'expense',
                    'amount' => $payload['purchase_total_cost'],
                    'category' => $payload['category'] ?? 'stock',
                    'description' => sprintf('Achat initial du stock %s (%s)', $item->name, $item->reference),
                    'source_module' => 'Stocks',
                    'source_entity_type' => 'stock_item',
                    'source_entity_id' => (string) $item->id,
                    'operation_id' => 'stock-init-' . $item->id,
                    'occurred_at' => now(),
                ]);
            }

            $this->auditService->record([
                'farm_id' => $farmId,
                'user_id' => request()->user()?->id,
                'module' => 'stocks',
                'entity_type' => 'stock_item',
                'entity_id' => (string) $item->id,
                'action' => 'stock_item_created',
                'new_value' => json_encode($item->fresh()->toArray()),
                'source' => 'web',
            ]);

            return $item->fresh(['categoryRelation', 'supplier']);
        });
    }

    public function updateItem(StockItem $item, array $data): StockItem
    {
        $farmId = (int) ($item->farm_id ?? request()->user()?->farm_id ?? 0);
        $oldValue = $item->toArray();
        $payload = $this->normalizeItemPayload($data, $farmId, $item);

        if (array_key_exists('current_quantity', $data)) {
            $payload['purchase_total_cost'] = (float) ($payload['current_quantity'] ?? $item->current_quantity) * (float) ($payload['unit_cost'] ?? $item->unit_cost ?? 0);
        }

        $item->fill($payload);
        $item->save();

        $this->auditService->record([
            'farm_id' => $item->farm_id,
            'user_id' => request()->user()?->id,
            'module' => 'stocks',
            'entity_type' => 'stock_item',
            'entity_id' => (string) $item->id,
            'action' => 'stock_item_updated',
            'old_value' => json_encode($oldValue),
            'new_value' => json_encode($item->toArray()),
            'source' => 'web',
        ]);

        return $item->fresh(['categoryRelation', 'supplier']);
    }

    public function deleteItem(StockItem $item): void
    {
        if ($item->movements()->exists()) {
            throw ValidationException::withMessages([
                'stock_item' => 'Suppression impossible: cet article possède déjà des mouvements et doit rester traçable.',
            ]);
        }

        $item->delete();
    }

    public function recordMovement(array $data): StockMovement
    {
        $farmId = (int) ($data['farm_id'] ?? request()->user()?->farm_id ?? 0);
        $item = StockItem::query()
            ->where('farm_id', $farmId)
            ->findOrFail($data['stock_item_id']);

        $quantity = (float) $data['quantity'];

        if ($data['type'] === 'out' && (float) $item->current_quantity < $quantity) {
            throw ValidationException::withMessages([
                'quantity' => 'Stock insuffisant pour cette sortie.',
            ]);
        }

        $movement = StockMovement::create([
            ...$data,
            'farm_id' => $farmId,
            'quantity' => $quantity,
        ]);

        $nextQuantity = match ($movement->type) {
            'in' => (float) $item->current_quantity + $quantity,
            'out' => max(0, (float) $item->current_quantity - $quantity),
            default => $quantity,
        };

        $oldQuantity = (float) $item->current_quantity;

        $item->update([
            'current_quantity' => $nextQuantity,
            'purchase_total_cost' => round($nextQuantity * (float) ($item->unit_cost ?? 0), 2),
        ]);

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

        if ($nextQuantity <= (float) $item->minimum_threshold) {
            $this->alertService->createLowStockAlert($item->fresh());
        }

        return $movement;
    }

    public function createSupplier(array $data): Supplier
    {
        $farmId = (int) (request()->user()?->farm_id ?? 0);

        return Supplier::create([
            'farm_id' => $farmId,
            'name' => $data['name'],
            'contact_name' => $data['contact_name'] ?? null,
            'phone' => $data['phone'] ?? null,
            'email' => $data['email'] ?? null,
            'address' => $data['address'] ?? null,
            'notes' => $data['notes'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);
    }

    private function normalizeItemPayload(array $data, int $farmId, ?StockItem $item = null): array
    {
        $category = $this->resolveCategory($data, $farmId, $item);
        $supplierId = $this->resolveSupplierId($data, $farmId);
        $related = $this->resolveRelatedEntity($data, $farmId);
        $storageLocation = $data['storage_location'] ?? $data['location'] ?? $item?->storage_location ?? $item?->location ?? null;
        $unitCost = (float) ($data['unit_cost'] ?? $item?->unit_cost ?? 0);
        $currentQuantity = (float) ($data['current_quantity'] ?? $item?->current_quantity ?? 0);

        $payload = [
            'farm_id' => $farmId,
            'reference' => $this->generateReference($farmId, $data['reference'] ?? null, $category['slug'] ?? ($data['category'] ?? 'art'), $item),
            'name' => $data['name'] ?? $item?->name,
            'description' => $data['description'] ?? $item?->description,
            'brand' => $data['brand'] ?? $item?->brand,
            'category' => $category['slug'] ?? ($data['category'] ?? $item?->category ?? 'other'),
            'category_id' => $category['id'] ?? $item?->category_id,
            'supplier_id' => $supplierId,
            'batch_number' => $data['batch_number'] ?? $item?->batch_number,
            'purchase_date' => $data['purchase_date'] ?? $item?->purchase_date,
            'manufacturing_date' => $data['manufacturing_date'] ?? $item?->manufacturing_date,
            'expiration_date' => $data['expiration_date'] ?? $item?->expiration_date,
            'unit' => $data['unit'] ?? $item?->unit,
            'unit_cost' => $unitCost,
            'purchase_total_cost' => (float) ($data['purchase_total_cost'] ?? round($currentQuantity * $unitCost, 2)),
            'currency' => $data['currency'] ?? $item?->currency ?? 'XOF',
            'minimum_threshold' => (float) ($data['minimum_threshold'] ?? $item?->minimum_threshold ?? 0),
            'maximum_stock' => array_key_exists('maximum_stock', $data) ? $data['maximum_stock'] : $item?->maximum_stock,
            'current_quantity' => $currentQuantity,
            'location' => $storageLocation,
            'storage_location' => $storageLocation,
            'notes' => $data['notes'] ?? $item?->notes,
            'is_active' => $data['is_active'] ?? $item?->is_active ?? true,
            'business_module' => $data['business_module'] ?? $item?->business_module ?? 'general',
            'related_type' => $related['type'] ?? null,
            'related_id' => $related['id'] ?? null,
        ];

        if (request()->hasFile('image')) {
            if ($item?->image_path) {
                Storage::disk('public')->delete($item->image_path);
            }

            $file = request()->file('image');
            $safeName = sprintf(
                'stock/%d/%s.%s',
                $farmId,
                Str::uuid()->toString(),
                strtolower($file->getClientOriginalExtension())
            );
            $payload['image_path'] = $file->storeAs('', $safeName, 'public');
        }

        return $payload;
    }

    private function resolveCategory(array $data, int $farmId, ?StockItem $item = null): array
    {
        if (! empty($data['category_id'])) {
            $category = StockCategory::query()
                ->where('id', $data['category_id'])
                ->where(fn ($query) => $query->whereNull('farm_id')->orWhere('farm_id', $farmId))
                ->first();

            if (! $category) {
                throw ValidationException::withMessages(['category_id' => 'Catégorie invalide pour cette ferme.']);
            }

            return ['id' => $category->id, 'slug' => $category->slug];
        }

        if (! empty($data['category'])) {
            $category = StockCategory::query()
                ->where('slug', $data['category'])
                ->where(fn ($query) => $query->whereNull('farm_id')->orWhere('farm_id', $farmId))
                ->first();

            return ['id' => $category?->id ?? $item?->category_id, 'slug' => $category?->slug ?? $data['category']];
        }

        return ['id' => $item?->category_id, 'slug' => $item?->category ?? 'other'];
    }

    private function resolveSupplierId(array $data, int $farmId): ?int
    {
        if (! array_key_exists('supplier_id', $data) || empty($data['supplier_id'])) {
            return null;
        }

        $supplier = Supplier::query()
            ->where('farm_id', $farmId)
            ->find($data['supplier_id']);

        if (! $supplier) {
            throw ValidationException::withMessages(['supplier_id' => 'Fournisseur invalide pour cette ferme.']);
        }

        return (int) $supplier->id;
    }

    private function resolveRelatedEntity(array $data, int $farmId): array
    {
        $type = $data['related_type'] ?? null;
        $id = $data['related_id'] ?? null;

        if (! $type || ! $id || $type === 'general') {
            return ['type' => null, 'id' => null];
        }

        $modelClass = match ($type) {
            'layer_batch' => LayerBatch::class,
            'fish_pond' => FishPond::class,
            'fish_stocking' => FishStocking::class,
            'plot' => Plot::class,
            'crop' => Crop::class,
            'building' => Building::class,
            default => null,
        };

        if (! $modelClass) {
            throw ValidationException::withMessages(['related_type' => 'Type de liaison métier non supporté.']);
        }

        /** @var Model|null $related */
        $related = $modelClass::query()->where('farm_id', $farmId)->find($id);

        if (! $related) {
            throw ValidationException::withMessages(['related_id' => 'Élément métier invalide pour cette ferme.']);
        }

        return ['type' => $type, 'id' => (int) $related->getKey()];
    }

    private function generateReference(int $farmId, ?string $reference, string $categorySlug, ?StockItem $item = null): string
    {
        $normalized = Str::upper(trim((string) $reference));

        if ($normalized !== '') {
            return $normalized;
        }

        $prefix = Str::upper(Str::substr(preg_replace('/[^A-Za-z0-9]/', '', $categorySlug) ?: 'ART', 0, 3));
        $sequence = StockItem::query()
            ->where('farm_id', $farmId)
            ->where('reference', 'like', $prefix . '-%')
            ->count() + 1;

        $candidate = sprintf('%s-%03d', $prefix, $sequence);

        if ($item && $item->reference === $candidate) {
            return $candidate;
        }

        while (
            StockItem::query()
                ->where('farm_id', $farmId)
                ->where('reference', $candidate)
                ->when($item, fn ($query) => $query->whereKeyNot($item->id))
                ->exists()
        ) {
            $sequence++;
            $candidate = sprintf('%s-%03d', $prefix, $sequence);
        }

        return $candidate;
    }
}
