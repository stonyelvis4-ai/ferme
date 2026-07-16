<?php

namespace App\Http\Requests\Stock;

use Illuminate\Foundation\Http\FormRequest;

class UpdateStockItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'category' => ['sometimes', 'string', 'max:255'],
            'unit' => ['sometimes', 'string', 'max:50'],
            'unit_cost' => ['nullable', 'numeric', 'min:0'],
            'minimum_threshold' => ['sometimes', 'integer', 'min:0'],
            'current_quantity' => ['sometimes', 'integer', 'min:0'],
            'location' => ['nullable', 'string', 'max:255'],
        ];
    }
}
