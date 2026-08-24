<?php

namespace App\Http\Requests\Cultures;

use App\Http\Requests\Concerns\UsesAuthenticatedFarmContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePlotRequest extends FormRequest
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
            'crop_id' => ['nullable', 'integer', Rule::exists('crops', 'id')->where(fn ($query) => $query->where('farm_id', $this->user()?->farm_id))],
            'name' => ['required', 'string', 'max:255'],
            'area' => ['required', 'numeric', 'min:0'],
            'soil_type' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
