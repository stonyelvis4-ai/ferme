<?php

namespace App\Http\Requests\Pisciculture;

use Illuminate\Foundation\Http\FormRequest;

class StoreFishHarvestRequest extends FormRequest
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
            'harvest_date' => ['required', 'date'],
            'total_weight_kg' => ['required', 'numeric', 'min:0'],
            'losses_kg' => ['sometimes', 'numeric', 'min:0'],
            'destination' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
