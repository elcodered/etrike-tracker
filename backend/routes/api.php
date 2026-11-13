<?php

use App\Http\Controllers\AuditLogController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DailyReportController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DriverController;
use App\Http\Controllers\EtrikeController;
use App\Http\Controllers\HistoryController;
use App\Http\Controllers\SettingsController;
use App\Http\Controllers\ShareLinkController;
use App\Http\Controllers\UserController;
use App\Models\Status;
use Illuminate\Support\Facades\Route;

// Explicit web middleware provides cookie sessions and CSRF on every mutation.
Route::middleware('web')->group(function () {
    Route::post('login', [AuthController::class, 'login'])->middleware('throttle:login');
    Route::get('shared/{token}', [ShareLinkController::class, 'show'])->middleware('throttle:60,1');
    Route::middleware(['auth:sanctum', 'active', 'throttle:240,1'])->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('dashboard', [DashboardController::class, 'index']);
        Route::get('fleet/current', [DashboardController::class, 'index']);
        Route::get('analytics', [DashboardController::class, 'analytics']);
        Route::get('statuses', fn () => ['data' => Status::orderBy('sort_order')->get()]);
        Route::apiResource('etrikes', EtrikeController::class);
        Route::apiResource('drivers', DriverController::class);
        Route::get('etrikes/{etrike}/history', [HistoryController::class, 'etrike']);
        Route::get('drivers/{driver}/history', [HistoryController::class, 'driver']);
        Route::apiResource('daily-reports', DailyReportController::class)->except('destroy');
        Route::get('daily-reports/{daily_report}/pdf', [DailyReportController::class, 'pdf']);
        foreach (['submit', 'reopen', 'lock', 'bulk', 'sync'] as $action) {
            Route::post('daily-reports/{daily_report}/'.$action, [DailyReportController::class, $action]);
        }
        Route::get('settings', [SettingsController::class, 'show']);
        Route::middleware('can:admin')->group(function () {
            Route::apiResource('users', UserController::class)->only(['index', 'store', 'update']);
            Route::get('share-links', [ShareLinkController::class, 'index']);
            Route::post('share-links', [ShareLinkController::class, 'store']);
            Route::delete('share-links/{share_link}', [ShareLinkController::class, 'destroy']);
            Route::post('share-links/{share_link}/regenerate', [ShareLinkController::class, 'regenerate']);
            Route::put('settings', [SettingsController::class, 'update']);
            Route::get('audit-logs', [AuditLogController::class, 'index']);
        });
    });
});
