<?php

namespace App\Http\Requests\Cultures;

use Illuminate\Foundation\Http\FormRequest;

class StoreCropHarvestRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            'crop_id' => ['required', 'integer', 'exists:crops,id'],
            'plot_id' => ['required', 'integer', 'exists:plots,id'],
            'harvest_date' => ['required', 'date'],
            'harvested_kg' => ['required', 'numeric', 'min:0'],
            'losses_kg' => ['sometimes', 'numeric', 'min:0'],
            'destination' => ['required', 'string', 'max:255'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
