<?php

namespace App\Http\Requests\Pisciculture;

use Illuminate\Foundation\Http\FormRequest;

class StoreFishStockingRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            'fish_pond_id' => ['required', 'integer', 'exists:fish_ponds,id'],
            'stocking_date' => ['required', 'date'],
            'fish_count' => ['required', 'integer', 'min:0'],
            'average_weight_kg' => ['sometimes', 'numeric', 'min:0'],
            'total_weight_kg' => ['sometimes', 'numeric', 'min:0'],
            'supplier_name' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
