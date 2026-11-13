<?php

namespace App\Http\Controllers;

use App\Http\Requests\UserRequest;
use App\Models\User;
use App\Services\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function index(Request $r)
    {
        $r->validate(['search' => ['nullable', 'string', 'max:100']]);

        return User::when($r->search, fn ($q) => $q->where('name', 'ilike', '%'.$r->search.'%'))->orderBy('id')->paginate(25);
    }

    public function store(UserRequest $r)
    {
        return DB::transaction(function () use ($r) {
            $u = User::create($r->validated());
            Audit::record('Created user', $u);

            return response()->json(['data' => $u], 201);
        });
    }

    public function update(UserRequest $r, User $user)
    {
        return DB::transaction(function () use ($r, $user) {
            // Lock the full admin set so concurrent changes cannot remove the final administrator.
            $admins = User::where('role', 'admin')->where('is_active', true)->lockForUpdate()->get();
            $data = $r->validated();
            if (empty($data['password'])) {
                unset($data['password']);
            }
            if ($user->id === $r->user()->id && (! $data['is_active'] || $data['role'] !== 'admin')) {
                throw ValidationException::withMessages(['role' => 'You cannot disable or demote your own account.']);
            }
            if ($user->role === 'admin' && $user->is_active && $admins->count() <= 1 && (! $data['is_active'] || $data['role'] !== 'admin')) {
                throw ValidationException::withMessages(['role' => 'Keep at least one active administrator.']);
            }
            $old = $user->toArray();
            $user->update($data);
            Audit::record('Updated user', $user, $old);

            return ['data' => $user];
        });
    }
}
