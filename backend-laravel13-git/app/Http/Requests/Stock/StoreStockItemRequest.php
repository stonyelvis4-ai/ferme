<?php

namespace App\Http\Requests\Stock;

use App\Enums\Role;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStockItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === Role::Admin;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'minimum_threshold' => $this->input('minimum_threshold', $this->input('minimum_stock')),
            'storage_location' => $this->input('storage_location', $this->input('location')),
            'purchase_total_cost' => $this->input('purchase_total_cost', (float) $this->input('current_quantity', 0) * (float) $this->input('unit_cost', 0)),
            'currency' => $this->input('currency', 'XOF'),
            'is_active' => $this->boolean('is_active', true),
            'business_module' => $this->input('business_module', 'general'),
        ]);
    }

    public function rules(): array
    {
        $farmId = (int) ($this->user()?->farm_id ?? 0);

        return [
            'reference' => [
                'nullable',
                'string',
                'max:255',
                Rule::unique('stock_items', 'reference')->where(fn ($query) => $query->where('farm_id', $farmId)),
            ],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'brand' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'category_id' => [
                'nullable',
                'integer',
                Rule::exists('stock_categories', 'id')->where(fn ($query) => $query->where(function ($subQuery) use ($farmId) {
                    $subQuery->whereNull('farm_id')->orWhere('farm_id', $farmId);
                })),
            ],
            'supplier_id' => [
                'nullable',
                'integer',
                Rule::exists('suppliers', 'id')->where(fn ($query) => $query->where('farm_id', $farmId)),
            ],
            'batch_number' => ['nullable', 'string', 'max:255'],
            'purchase_date' => ['nullable', 'date'],
            'manufacturing_date' => ['nullable', 'date'],
            'expiration_date' => ['nullable', 'date', 'after_or_equal:manufacturing_date'],
            'unit' => ['required', 'string', 'max:50'],
            'minimum_threshold' => ['sometimes', 'numeric', 'min:0'],
            'maximum_stock' => ['nullable', 'numeric', 'gte:minimum_threshold'],
            'current_quantity' => ['sometimes', 'numeric', 'min:0'],
            'unit_cost' => ['sometimes', 'numeric', 'min:0'],
            'purchase_total_cost' => ['sometimes', 'numeric', 'min:0'],
            'storage_location' => ['nullable', 'string', 'max:255'],
            'currency' => ['nullable', 'string', 'max:10'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'business_module' => ['sometimes', Rule::in(['livestock', 'aquaculture', 'crops', 'infrastructure', 'general'])],
            'related_type' => ['nullable', Rule::in(['layer_batch', 'fish_pond', 'fish_stocking', 'plot', 'crop', 'building', 'general'])],
            'related_id' => ['nullable', 'integer', 'min:1'],
        ];
    }
}
