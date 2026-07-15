<?php

namespace App\Http\Requests\User;

use Illuminate\Foundation\Http\FormRequest;

class AssignUserFarmsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'farm_ids' => ['required', 'array', 'min:1'],
            'farm_ids.*' => ['integer', 'exists:farms,id'],
        ];
    }
}
