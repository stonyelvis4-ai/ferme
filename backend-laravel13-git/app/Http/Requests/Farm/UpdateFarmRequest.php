<?php

namespace App\Http\Requests\Farm;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFarmRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $farmId = $this->route('farm')?->id ?? null;

        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'slug' => ['sometimes', 'string', 'max:255', Rule::unique('farms', 'slug')->ignore($farmId)],
            'status' => ['sometimes', 'string', Rule::in(['active', 'inactive', 'archived'])],
            'currency' => ['sometimes', 'string', 'max:20'],
            'area_unit' => ['sometimes', 'string', 'max:20'],
            'manager_name' => ['sometimes', 'string', 'max:255'],
            'contact_email' => ['sometimes', 'email'],
        ];
    }
}

