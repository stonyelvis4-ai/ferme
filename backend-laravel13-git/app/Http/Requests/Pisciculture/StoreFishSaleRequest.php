<?php

namespace App\Http\Requests\Pisciculture;

use Illuminate\Foundation\Http\FormRequest;

class StoreFishSaleRequest extends FormRequest
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
            'fish_harvest_id' => ['nullable', 'integer', 'exists:fish_harvests,id'],
            'sale_date' => ['required', 'date'],
            'customer_name' => ['required', 'string', 'max:255'],
            'kilograms_sold' => ['required', 'numeric', 'min:0'],
            'unit_price' => ['sometimes', 'numeric', 'min:0'],
            'amount_paid' => ['sometimes', 'numeric', 'min:0'],
            'remaining_due' => ['sometimes', 'numeric', 'min:0'],
            'payment_method' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
