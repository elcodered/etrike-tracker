<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(LoginRequest $r)
    {
        if (! Auth::attempt($r->validated() + ['is_active' => true])) {
            throw ValidationException::withMessages(['email' => 'The email or password is incorrect.']);
        } $r->session()->regenerate();

        return response()->json(['user' => $r->user()]);
    }

    public function me(Request $r)
    {
        return response()->json(['user' => $r->user()]);
    }

    public function logout(Request $r)
    {
        Auth::guard('web')->logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();

        return response()->noContent();
    }
}
