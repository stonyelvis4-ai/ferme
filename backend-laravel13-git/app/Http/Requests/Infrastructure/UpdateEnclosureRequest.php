<?php

namespace App\Http\Requests\Infrastructure;

use App\Http\Requests\Concerns\UsesAuthenticatedFarmContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateEnclosureRequest extends FormRequest
{
    use UsesAuthenticatedFarmContext;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'farm_id' => ['sometimes', 'integer', 'exists:farms,id'],
            'building_id' => ['sometimes', 'integer', Rule::exists('buildings', 'id')->where(fn ($query) => $query->where('farm_id', $this->user()?->farm_id))],
            'name' => ['sometimes', 'string', 'max:255'],
            'type' => ['sometimes', 'string', 'max:255'],
            'capacity' => ['sometimes', 'numeric', 'min:0'],
            'assigned_use' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'max:50'],
            'state' => ['sometimes', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
