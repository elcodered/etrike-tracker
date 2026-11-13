<?php

use App\Models\User;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Validation\Rules\Password;

Artisan::command('app:create-admin {email} {name}', function () {
    $password = $this->secret('Password (12+ characters, mixed case, numbers)');
    $validator = validator(['email' => $this->argument('email'), 'password' => $password], ['email' => 'required|email|unique:users,email', 'password' => ['required', Password::min(12)->mixedCase()->numbers()]]);
    if ($validator->fails()) {
        $this->error($validator->errors()->first());

        return 1;
    }
    User::create(['name' => $this->argument('name'), 'email' => $this->argument('email'), 'password' => $password, 'role' => 'admin', 'is_active' => true]);
    $this->info('Administrator created.');
})->purpose('Create a production administrator with a securely prompted password');
