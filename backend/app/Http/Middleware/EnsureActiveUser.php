<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class EnsureActiveUser
{
    public function handle(Request $r, Closure $next)
    {
        abort_unless($r->user()?->is_active, 403, 'This account is disabled.');

        return $next($r);
    }
}
