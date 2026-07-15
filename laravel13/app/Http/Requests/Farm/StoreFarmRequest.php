<?php

namespace App\Http\Requests\Farm;

use Illuminate\Foundation\Http\FormRequest;

class StoreFarmRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'unique:farms,slug'],
            'currency' => ['nullable', 'string', 'max:20'],
            'area_unit' => ['nullable', 'string', 'max:20'],
            'manager_name' => ['nullable', 'string', 'max:255'],
            'contact_email' => ['nullable', 'email']
        ];
    }
}

