<?php

namespace App\Http\Requests\Layers;

use Illuminate\Foundation\Http\FormRequest;

class StoreLayerFeedPlanRequest extends FormRequest
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
            'stock_item_id' => ['nullable', 'integer', 'exists:stock_items,id'],
            'plan_name' => ['required', 'string', 'max:255'],
            'ration_per_head_kg' => ['required', 'numeric', 'min:0.001'],
            'feedings_per_day' => ['required', 'integer', 'min:1', 'max:12'],
            'target_daily_quantity_kg' => ['nullable', 'numeric', 'min:0'],
            'start_date' => ['required', 'date'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
