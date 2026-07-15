<?php

namespace App\Http\Requests\Cultures;

use Illuminate\Foundation\Http\FormRequest;

class StoreCropRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            'name' => ['required', 'string', 'max:255'],
            'variety' => ['required', 'string', 'max:255'],
            'cycle_days' => ['required', 'integer', 'min:1'],
            'planting_date' => ['required', 'date'],
            'area' => ['required', 'numeric', 'min:0'],
            'status' => ['sometimes', 'string', 'max:50'],
            'estimated_harvest_date' => ['sometimes', 'date'],
            'expected_yield_kg' => ['sometimes', 'numeric', 'min:0'],
            'total_operations_cost' => ['sometimes', 'numeric', 'min:0'],
            'total_harvest_kg' => ['sometimes', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
