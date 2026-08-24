<?php

namespace App\Http\Requests\Cultures;

use App\Http\Requests\Concerns\UsesAuthenticatedFarmContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCropOperationRequest extends FormRequest
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
            'operation_date' => ['required', 'date'],
            'type' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'quantity' => ['sometimes', 'numeric', 'min:0'],
            'unit' => ['sometimes', 'string', 'max:50'],
            'unit_cost' => ['sometimes', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
