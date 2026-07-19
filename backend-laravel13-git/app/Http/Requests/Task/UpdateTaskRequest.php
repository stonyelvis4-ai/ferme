<?php

namespace App\Http\Requests\Task;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateTaskRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'start_at' => ['sometimes', 'nullable', 'date', 'before_or_equal:due_at'],
            'priority' => ['sometimes', Rule::in(['low', 'normal', 'high', 'critical'])],
            'status' => ['sometimes', Rule::in(['todo', 'in_progress', 'completed', 'overdue', 'cancelled'])],
            'due_at' => ['nullable', 'date'],
            'reminder_at' => ['nullable', 'date'],
            'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }
}
