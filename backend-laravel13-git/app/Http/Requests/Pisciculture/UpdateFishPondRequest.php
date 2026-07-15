<?php

namespace App\Http\Requests\Pisciculture;

use Illuminate\Foundation\Http\FormRequest;

class UpdateFishPondRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'farm_id' => ['sometimes', 'integer', 'exists:farms,id'],
            'name' => ['sometimes', 'string', 'max:255'],
            'pond_type' => ['sometimes', 'string', 'max:255'],
            'capacity_kg' => ['sometimes', 'numeric', 'min:0'],
            'species' => ['sometimes', 'string', 'max:255'],
            'initial_fish_count' => ['sometimes', 'integer', 'min:0'],
            'stocking_date' => ['sometimes', 'date'],
            'status' => ['sometimes', 'string', 'max:50'],
            'current_estimated_count' => ['sometimes', 'integer', 'min:0'],
            'mortality_total' => ['sometimes', 'integer', 'min:0'],
            'average_weight_kg' => ['sometimes', 'numeric', 'min:0'],
            'biomass_kg' => ['sometimes', 'numeric', 'min:0'],
            'feed_distributed_kg' => ['sometimes', 'numeric', 'min:0'],
            'fcr' => ['sometimes', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
