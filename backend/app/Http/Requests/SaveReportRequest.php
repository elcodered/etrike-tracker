<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SaveReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'operator']);
    }

    public function rules(): array
    {
        return ['version' => ['required', 'integer', 'min:1'], 'notes' => ['nullable', 'string', 'max:4000'], 'items' => ['required', 'array', 'min:1'], 'items.*.id' => ['required', 'integer', 'distinct'], 'items.*.driver_id' => ['nullable', 'integer', 'exists:drivers,id'], 'items.*.status_id' => ['required', 'integer', Rule::exists('statuses', 'id')->where('is_active', true)], 'items.*.rental_amount' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'], 'items.*.remarks' => ['nullable', 'string', 'max:2000']];
    }
}
