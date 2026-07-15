<?php

namespace App\Http\Requests\Layers;

use Illuminate\Foundation\Http\FormRequest;

class StoreLayerBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            'name' => ['required', 'string', 'max:255'],
            'breed' => ['required', 'string', 'max:255'],
            'entry_date' => ['required', 'date'],
            'initial_count' => ['required', 'integer', 'min:1'],
            'mortality_total' => ['sometimes', 'integer', 'min:0'],
            'reform_total' => ['sometimes', 'integer', 'min:0'],
            'current_count' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'string', 'max:50'],
        ];
    }
}

