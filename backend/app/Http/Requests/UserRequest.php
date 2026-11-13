<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return ['name' => ['required', 'string', 'max:100'], 'email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($this->route('user'))], 'password' => [$this->isMethod('POST') ? 'required' : 'nullable', 'string', Password::min(12)->mixedCase()->numbers()], 'role' => ['required', Rule::in(['admin', 'operator', 'viewer'])], 'is_active' => ['required', 'boolean']];
    }
}
