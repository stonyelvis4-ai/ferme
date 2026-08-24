<?php

namespace App\Http\Requests\Cultures;

use App\Http\Requests\Concerns\UsesAuthenticatedFarmContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCropHarvestRequest extends FormRequest
{
    use UsesAuthenticatedFarmContext;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            'crop_id' => ['required', 'integer', Rule::exists('crops', 'id')->where(fn ($query) => $query->where('farm_id', $this->user()?->farm_id))],
            'plot_id' => ['required', 'integer', Rule::exists('plots', 'id')->where(fn ($query) => $query->where('farm_id', $this->user()?->farm_id))],
            'harvest_date' => ['required', 'date'],
            'harvested_kg' => ['required', 'numeric', 'min:0'],
            'losses_kg' => ['sometimes', 'numeric', 'min:0'],
            'destination' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
