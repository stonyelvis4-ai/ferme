<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class AssignUserFarmsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if ($this->filled('farm_id') && ! $this->has('farm_ids')) {
            $this->merge([
                'farm_ids' => [$this->input('farm_id')],
            ]);
        }
    }

    public function rules(): array
    {
        return [
            'farm_id' => ['sometimes', 'integer', 'exists:farms,id'],
            'farm_ids' => ['required', 'array', 'size:1'],
            'farm_ids.*' => ['integer', 'exists:farms,id'],
        ];
    }

    public function messages(): array
    {
        return [
            'farm_ids.size' => 'Un compte ne peut etre rattache qu a une seule ferme.',
        ];
    }
}
