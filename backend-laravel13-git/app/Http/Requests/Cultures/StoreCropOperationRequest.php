<?php

namespace App\Http\Requests\Cultures;

use Illuminate\Foundation\Http\FormRequest;

class StoreCropOperationRequest extends FormRequest
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
