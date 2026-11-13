<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class EtrikeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return ['plate_number' => ['required', 'string', 'max:30', Rule::unique('etrikes')->ignore($this->route('etrike'))], 'unit_code' => ['required', 'string', 'max:30'], 'description' => ['nullable', 'string', 'max:2000'], 'default_driver_id' => ['nullable', 'integer', 'exists:drivers,id'], 'is_active' => ['required', 'boolean']];
    }
}
