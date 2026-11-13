<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CreateReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return in_array($this->user()?->role, ['admin', 'operator']);
    }

    public function rules(): array
    {
        return ['report_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:today', Rule::unique('daily_reports')], 'notes' => ['nullable', 'string', 'max:4000']];
    }
}
