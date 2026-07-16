<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssignUserFarmsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role?->value === 'admin';
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
        $farmId = (int) ($this->user()?->farm_id ?? 0);

        return [
            'farm_id' => ['sometimes', 'integer', Rule::in([$farmId])],
            'farm_ids' => ['required', 'array', 'size:1'],
            'farm_ids.*' => ['integer', Rule::in([$farmId])],
        ];
    }

    public function messages(): array
    {
        return [
            'farm_ids.size' => 'Un compte ne peut etre rattache qu a une seule ferme.',
            'farm_id.in' => 'Vous ne pouvez rattacher un compte qu a votre propre ferme.',
            'farm_ids.*.in' => 'Vous ne pouvez rattacher un compte qu a votre propre ferme.',
        ];
    }
}
