<?php

namespace App\Http\Requests\Pisciculture;

use Illuminate\Foundation\Http\FormRequest;

class StoreFishMonitoringRequest extends FormRequest
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
            'monitoring_date' => ['required', 'date'],
            'estimated_count' => ['required', 'integer', 'min:0'],
            'mortality' => ['sometimes', 'integer', 'min:0'],
            'average_weight_kg' => ['required', 'numeric', 'min:0'],
            'biomass_kg' => ['sometimes', 'numeric', 'min:0'],
            'feed_distributed_kg' => ['sometimes', 'numeric', 'min:0'],
            'fcr' => ['sometimes', 'numeric', 'min:0'],
            'growth_kg' => ['sometimes', 'numeric'],
            'water_temperature' => ['sometimes', 'numeric'],
            'ph' => ['sometimes', 'numeric'],
            'oxygen' => ['sometimes', 'numeric'],
            'turbidity' => ['sometimes', 'numeric'],
            'water_renewal_percent' => ['sometimes', 'numeric'],
            'observations' => ['nullable', 'string'],
        ];
    }
}
