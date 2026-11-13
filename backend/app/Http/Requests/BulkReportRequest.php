<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BulkReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'operator']);
    }

    public function rules(): array
    {
        return ['version' => ['required', 'integer', 'min:1'], 'action' => ['required', Rule::in(['mark_running', 'running_rental', 'copy_drivers', 'clear_remarks'])], 'confirmed' => ['sometimes', 'boolean']];
    }
}
