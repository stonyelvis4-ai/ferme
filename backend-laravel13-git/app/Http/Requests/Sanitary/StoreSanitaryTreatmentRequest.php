<?php

namespace App\Http\Requests\Sanitary;

use App\Http\Requests\Concerns\UsesAuthenticatedFarmContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSanitaryTreatmentRequest extends FormRequest
{
    use UsesAuthenticatedFarmContext;

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $farmId = (int) ($this->user()?->farm_id ?? 0);

        return [
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            'layer_batch_id' => ['nullable', 'integer', Rule::exists('layer_batches', 'id')->where(fn ($query) => $query->where('farm_id', $farmId))],
            'type' => ['required', Rule::in(['vaccine', 'treatment'])],
            'name' => ['required', 'string', 'max:255'],
            'planned_date' => ['required', 'date'],
            'dosage' => ['nullable', 'string', 'max:255'],
            'product_id' => ['nullable', 'integer', Rule::exists('stock_items', 'id')->where(fn ($query) => $query->where('farm_id', $farmId))],
            'quantity_used' => ['sometimes', 'numeric', 'min:0'],
            'status' => ['sometimes', Rule::in(['planned', 'completed', 'cancelled'])],
            'cost' => ['sometimes', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
