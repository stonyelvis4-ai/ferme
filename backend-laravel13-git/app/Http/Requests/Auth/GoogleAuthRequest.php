<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class GoogleAuthRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'credential' => ['required', 'string'],
            'intent' => ['nullable', 'string', 'in:login,register'],
        ];
    }

    public function messages(): array
    {
        return [
            'credential.required' => 'Le jeton Google est obligatoire.',
            'intent.in' => 'Le mode Google demande est invalide.',
        ];
    }
}
