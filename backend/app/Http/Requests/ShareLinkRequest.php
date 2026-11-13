<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ShareLinkRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->role === 'admin';
    }

    public function rules(): array
    {
        return ['name' => ['required', 'string', 'max:100'], 'expires_at' => ['nullable', 'date', 'after:now']];
    }
}
