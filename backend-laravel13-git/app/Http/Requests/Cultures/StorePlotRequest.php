<?php

namespace App\Http\Requests\Cultures;

use Illuminate\Foundation\Http\FormRequest;

class StorePlotRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255'],
            'area' => ['required', 'numeric', 'min:0'],
            'soil_type' => ['required', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
