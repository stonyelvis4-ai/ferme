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
            'low_stock_threshold' => ['sometimes', 'integer', 'min:0'],
            'mortalite_threshold_layers' => ['sometimes', 'integer', 'min:0'],
            'mortalite_threshold_fish' => ['sometimes', 'integer', 'min:0'],
            'egg_breakage_threshold' => ['sometimes', 'integer', 'min:0'],
            'laying_rate_low_threshold' => ['sometimes', 'numeric', 'min:0'],
            'fish_ph_min' => ['sometimes', 'numeric'],
            'fish_ph_max' => ['sometimes', 'numeric'],
            'fish_oxygen_min' => ['sometimes', 'numeric', 'min:0'],
            'fish_temperature_min' => ['sometimes', 'numeric'],
            'fish_temperature_max' => ['sometimes', 'numeric'],
            'crop_yield_low_threshold' => ['sometimes', 'numeric', 'min:0'],
            'default_reminder_24h' => ['sometimes', 'boolean'],
            'default_reminder_6h' => ['sometimes', 'boolean'],
            'default_reminder_1h' => ['sometimes', 'boolean'],
            'task_categories' => ['sometimes', 'array'],
            'task_categories.*' => ['string', 'max:255'],
            'task_priorities' => ['sometimes', 'array'],
            'task_priorities.*' => ['string', 'max:255'],
            'alert_rules' => ['sometimes', 'array'],
        ];
    }
}
