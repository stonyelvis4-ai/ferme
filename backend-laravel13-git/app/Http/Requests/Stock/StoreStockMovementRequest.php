<?php

namespace App\Http\Requests\Stock;

use App\Enums\Role;
use App\Http\Requests\Concerns\UsesAuthenticatedFarmContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreStockMovementRequest extends FormRequest
{
    use UsesAuthenticatedFarmContext;

    public function authorize(): bool
    {
        return $this->user()?->role === Role::Admin;
    }

    public function rules(): array
    {
        $farmId = (int) ($this->user()?->farm_id ?? 0);

        return [
            'farm_id' => ['sometimes', 'integer', 'exists:farms,id'],
            'stock_item_id' => ['required', 'integer', Rule::exists('stock_items', 'id')->where(fn ($query) => $query->where('farm_id', $farmId))],
            'type' => ['required', Rule::in(['in', 'out', 'adjustment'])],
            'quantity' => ['required', 'numeric', 'gt:0'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'source_module' => ['nullable', 'string', 'max:255'],
            'source_entity_type' => ['nullable', 'string', 'max:255'],
            'source_entity_id' => ['nullable', 'string', 'max:255'],
            'operation_id' => ['nullable', 'string', 'max:255'],
        ];
    }
}
