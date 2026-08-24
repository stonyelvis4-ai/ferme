<?php

namespace App\Http\Requests\Sanitary;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateSanitaryTreatmentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $farmId = (int) ($this->user()?->farm_id ?? 0);

        return [
            'type' => ['sometimes', Rule::in(['vaccine', 'treatment'])],
            'name' => ['sometimes', 'string', 'max:255'],
            'planned_date' => ['sometimes', 'date'],
            'dosage' => ['nullable', 'string', 'max:255'],
            'product_id' => ['nullable', 'integer', Rule::exists('stock_items', 'id')->where(fn ($query) => $query->where('farm_id', $farmId))],
            'quantity_used' => ['sometimes', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::in(['planned', 'completed', 'cancelled'])],
            'cost' => ['sometimes', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
