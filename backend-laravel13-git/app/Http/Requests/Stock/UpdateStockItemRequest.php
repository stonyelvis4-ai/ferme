<?php

namespace App\Http\Requests\Stock;

use App\Enums\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateStockItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === Role::Admin;
    }

    protected function prepareForValidation(): void
    {
        $currentQuantity = $this->input('current_quantity', $this->route('stockItem')?->current_quantity ?? 0);
        $unitCost = $this->input('unit_cost', $this->route('stockItem')?->unit_cost ?? 0);

        $this->merge([
            'minimum_threshold' => $this->input('minimum_threshold', $this->input('minimum_stock')),
            'storage_location' => $this->input('storage_location', $this->input('location')),
            'purchase_total_cost' => $this->input('purchase_total_cost', (float) $currentQuantity * (float) $unitCost),
        ]);
    }

    public function rules(): array
    {
        $farmId = (int) ($this->user()?->farm_id ?? 0);
        $stockItemId = (int) ($this->route('stockItem')?->id ?? 0);

        return [
            'reference' => [
                'sometimes',
                'nullable',
                'string',
                'max:255',
                Rule::unique('stock_items', 'reference')
                    ->ignore($stockItemId)
                    ->where(fn ($query) => $query->where('farm_id', $farmId)),
            ],
            'name' => ['sometimes', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'brand' => ['sometimes', 'nullable', 'string', 'max:255'],
            'category' => ['sometimes', 'nullable', 'string', 'max:255'],
            'category_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('stock_categories', 'id')->where(fn ($query) => $query->where(function ($subQuery) use ($farmId) {
                    $subQuery->whereNull('farm_id')->orWhere('farm_id', $farmId);
                })),
            ],
            'supplier_id' => [
                'sometimes',
                'nullable',
                'integer',
                Rule::exists('suppliers', 'id')->where(fn ($query) => $query->where('farm_id', $farmId)),
            ],
            'batch_number' => ['sometimes', 'nullable', 'string', 'max:255'],
            'purchase_date' => ['sometimes', 'nullable', 'date'],
            'manufacturing_date' => ['sometimes', 'nullable', 'date'],
            'expiration_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:manufacturing_date'],
            'unit' => ['sometimes', 'string', 'max:50'],
            'unit_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'minimum_threshold' => ['sometimes', 'numeric', 'min:0'],
            'maximum_stock' => ['sometimes', 'nullable', 'numeric', 'gte:minimum_threshold'],
            'current_quantity' => ['sometimes', 'numeric', 'min:0'],
            'purchase_total_cost' => ['sometimes', 'numeric', 'min:0'],
            'storage_location' => ['sometimes', 'nullable', 'string', 'max:255'],
            'currency' => ['sometimes', 'nullable', 'string', 'max:10'],
            'image' => ['sometimes', 'nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'business_module' => ['sometimes', Rule::in(['livestock', 'aquaculture', 'crops', 'infrastructure', 'general'])],
            'related_type' => ['sometimes', 'nullable', Rule::in(['layer_batch', 'fish_pond', 'fish_stocking', 'plot', 'crop', 'building', 'general'])],
            'related_id' => ['sometimes', 'nullable', 'integer', 'min:1'],
        ];
    }
}
