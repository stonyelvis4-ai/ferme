<?php

namespace App\Http\Requests\Layers;

use Illuminate\Foundation\Http\FormRequest;

class UpdateLayerBatchRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'breed' => ['sometimes', 'string', 'max:255'],
            'entry_date' => ['sometimes', 'date'],
            'initial_count' => ['sometimes', 'integer', 'min:1'],
            'mortality_total' => ['sometimes', 'integer', 'min:0'],
            'reform_total' => ['sometimes', 'integer', 'min:0'],
            'current_count' => ['sometimes', 'integer', 'min:0'],
            'status' => ['sometimes', 'string', 'max:50'],
        ];
    }
}

