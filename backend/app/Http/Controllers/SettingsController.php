<?php

namespace App\Http\Controllers;

use App\Http\Requests\SettingsRequest;
use App\Services\SettingsService;

class SettingsController extends Controller
{
    public function show(SettingsService $s)
    {
        return $s->get();
    }

    public function update(SettingsRequest $r, SettingsService $s)
    {
        return $s->save($r->validated());
    }
}
