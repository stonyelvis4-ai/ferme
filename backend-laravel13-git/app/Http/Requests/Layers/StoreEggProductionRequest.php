<?php

namespace App\Http\Requests\Layers;

use Illuminate\Foundation\Http\FormRequest;

class StoreEggProductionRequest extends FormRequest
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
            'production_date' => ['required', 'date'],
            'eggs_produced' => ['required', 'integer', 'min:0'],
            'broken_eggs' => ['sometimes', 'integer', 'min:0'],
            'dirty_eggs' => ['sometimes', 'integer', 'min:0'],
            'lost_eggs' => ['sometimes', 'integer', 'min:0'],
            'mortality' => ['sometimes', 'integer', 'min:0'],
            'observations' => ['nullable', 'string'],
        ];
    }
}

