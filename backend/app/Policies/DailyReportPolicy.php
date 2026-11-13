<?php

namespace App\Policies;

use App\Models\DailyReport;
use App\Models\User;

class DailyReportPolicy
{
    public function view(User $u, DailyReport $r): bool
    {
        return $u->role !== 'viewer' || $r->status !== 'draft';
    }

    public function create(User $u): bool
    {
        return in_array($u->role, ['admin', 'operator']);
    }

    public function update(User $u, DailyReport $r): bool
    {
        return $r->status === 'draft' && ($u->role === 'admin' || ($u->role === 'operator' && $r->report_date->toDateString() === today()->toDateString()));
    }

    public function reopen(User $u, DailyReport $r): bool
    {
        return $u->role === 'admin' && $r->status !== 'draft';
    }

    public function lock(User $u, DailyReport $r): bool
    {
        return $u->role === 'admin' && $r->status === 'submitted';
    }
}
