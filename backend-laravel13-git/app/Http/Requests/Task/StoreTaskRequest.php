<?php

namespace App\Http\Requests\Task;

use App\Http\Requests\Concerns\UsesAuthenticatedFarmContext;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreTaskRequest extends FormRequest
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
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'source_module' => ['nullable', 'string', 'max:255'],
            'source_entity_type' => ['nullable', 'string', 'max:255'],
            'source_entity_id' => ['nullable', 'string', 'max:255'],
            'start_at' => ['nullable', 'date', 'before_or_equal:due_at'],
            'priority' => ['required', Rule::in(['low', 'normal', 'high', 'critical'])],
            'status' => ['required', Rule::in(['todo', 'in_progress', 'completed', 'overdue', 'cancelled'])],
            'due_at' => ['nullable', 'date'],
            'reminder_at' => ['nullable', 'date'],
            'assigned_to' => ['nullable', 'integer', Rule::exists('users', 'id')->where(fn ($query) => $query->where('farm_id', $farmId))],
        ];
    }
}
