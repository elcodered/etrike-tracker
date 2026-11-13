<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class DriverRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return ['first_name' => ['required', 'string', 'max:100'], 'middle_name' => ['nullable', 'string', 'max:100'], 'last_name' => ['required', 'string', 'max:100'], 'display_name' => ['required', 'string', 'max:100'], 'contact_number' => ['nullable', 'string', 'max:40'], 'notes' => ['nullable', 'string', 'max:2000'], 'is_active' => ['required', 'boolean']];
    }
}
