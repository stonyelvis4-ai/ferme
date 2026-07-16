<?php

namespace App\Http\Requests\Layers;

use Illuminate\Foundation\Http\FormRequest;

class StoreLayerFeedingRequest extends FormRequest
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
            'stock_item_id' => ['required', 'integer', 'exists:stock_items,id'],
            'feeding_date' => ['required', 'date'],
            'feeding_time' => ['nullable', 'date_format:H:i'],
            'quantity' => ['required', 'numeric', 'min:0.01'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
