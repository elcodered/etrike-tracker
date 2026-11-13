<?php

use Illuminate\Support\Facades\Route;

Route::get('/', fn () => response()->json(['application' => 'E-Trike Rent & Status Tracking System', 'frontend' => config('app.frontend_url'), 'health' => '/up']));
