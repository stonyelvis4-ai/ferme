<?php

namespace App\Http\Requests\Layers;

use Illuminate\Foundation\Http\FormRequest;

class StoreLayerWeighingRequest extends FormRequest
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
            'weighing_date' => ['required', 'date'],
            'sample_size' => ['nullable', 'integer', 'min:1'],
            'average_weight_kg' => ['required', 'numeric', 'min:0.001'],
            'total_weight_kg' => ['nullable', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
