<?php

namespace App\Http\Controllers;

use App\Http\Resources\ReportResource;
use App\Models\DailyReport;
use App\Models\Etrike;
use App\Services\AnalyticsService;
use App\Services\SettingsService;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function index(Request $r, AnalyticsService $analytics, SettingsService $settings)
    {
        $latest = DailyReport::published()->whereDate('report_date', '<=', today())->orderByDesc('report_date')->with('creator', 'items.status')->first();
        $today = DailyReport::whereDate('report_date', today())->when($r->user()->role === 'viewer', fn ($q) => $q->published())->first();

        return ['today' => today()->toDateString(), 'total_active_units' => Etrike::where('is_active', true)->count(), 'latest_report' => $latest ? new ReportResource($latest) : null, 'today_report' => $today ? ['id' => $today->id, 'status' => $today->status] : null, 'analytics' => $analytics->forMonth(today()->format('Y-m')), 'settings' => $settings->get()];
    }

    public function analytics(Request $r, AnalyticsService $s)
    {
        $r->validate(['month' => ['nullable', 'date_format:Y-m']]);

        return $s->forMonth($r->input('month', today()->format('Y-m')));
    }
}
