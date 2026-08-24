<?php

namespace App\Http\Requests\Cultures;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePlotRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'area' => ['sometimes', 'numeric', 'min:0'],
            'soil_type' => ['sometimes', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
