<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class SettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return ['organization_name' => ['required', 'string', 'max:100'], 'full_day_rental' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:999999'], 'half_day_rental' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:999999']];
    }
}
