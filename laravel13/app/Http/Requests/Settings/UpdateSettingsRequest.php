<?php

namespace App\Http\Requests\Settings;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'currency' => ['sometimes', 'string', 'max:20'],
            'area_unit' => ['sometimes', 'string', 'max:20'],
            'weight_unit' => ['sometimes', 'string', 'max:20'],
            'egg_tray_default_price' => ['sometimes', 'numeric', 'min:0'],
            'fish_kg_default_price' => ['sometimes', 'numeric', 'min:0'],
            'crop_kg_default_price' => ['sometimes', 'numeric', 'min:0'],
            'low_stock_threshold' => ['sometimes', 'integer', 'min:0']
        ];
    }
}

