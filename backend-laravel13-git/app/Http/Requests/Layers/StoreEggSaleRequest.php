<?php

namespace App\Http\Requests\Layers;

use Illuminate\Foundation\Http\FormRequest;

class StoreEggSaleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            'layer_batch_id' => ['required', 'integer', 'exists:layer_batches,id'],
            'sale_date' => ['required', 'date'],
            'customer_name' => ['required', 'string', 'max:255'],
            'trays_sold' => ['required', 'integer', 'min:1'],
            'eggs_sold' => ['sometimes', 'integer', 'min:1'],
            'unit_price' => ['required', 'numeric', 'min:0'],
            'amount_paid' => ['sometimes', 'numeric', 'min:0'],
            'remaining_due' => ['sometimes', 'numeric', 'min:0'],
            'payment_method' => ['required', 'string', 'max:100'],
            'notes' => ['nullable', 'string'],
        ];
    }
}

