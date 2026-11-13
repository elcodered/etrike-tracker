<?php

namespace App\Services;

use App\Models\DailyReport;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AnalyticsService
{
    public function forMonth(string $month): array
    {
        $start = Carbon::createFromFormat('!Y-m', $month)->startOfMonth();
        $end = $start->copy()->endOfMonth();
        $daily = DailyReport::published()->whereBetween('report_date', [$start, $end])->withSum('items', 'rental_amount')->withCount('items')->orderBy('report_date')->get();
        $base = DB::table('daily_report_items as i')->join('daily_reports as r', 'r.id', '=', 'i.daily_report_id')->join('statuses as s', 's.id', '=', 'i.status_id')->whereIn('r.status', ['submitted', 'locked'])->whereBetween('r.report_date', [$start->toDateString(), $end->toDateString()]);
        $operating = (clone $base)->where('s.code', 'RUNNING')->count() + (clone $base)->where('s.code', 'HALF_DAY')->count() * 0.5;
        $expected = (clone $base)->count();
        $units = (clone $base)->join('etrikes as e', 'e.id', '=', 'i.etrike_id')->selectRaw("i.etrike_id, e.plate_number, SUM(CASE WHEN s.code = 'REPAIR' THEN 1 ELSE 0 END) as repair_days, SUM(CASE WHEN s.code = 'STANDBY_FOR_REPAIR' THEN 1 ELSE 0 END) as standby_days, SUM(CASE WHEN s.code = 'NO_DRIVER' THEN 1 ELSE 0 END) as no_driver_days, SUM(i.rental_amount) as total_rental")->groupBy('i.etrike_id', 'e.plate_number')->orderByDesc('repair_days')->get();
        $totals = $daily->pluck('items_sum_rental_amount');

        return ['month' => $month, 'total_rental' => (float) $totals->sum(), 'average_daily_rental' => round((float) ($totals->avg() ?? 0), 2), 'highest_day' => $daily->sortByDesc('items_sum_rental_amount')->first()?->report_date->toDateString(), 'highest_rental' => (float) ($totals->max() ?? 0), 'lowest_day' => $daily->sortBy('items_sum_rental_amount')->first()?->report_date->toDateString(), 'lowest_rental' => (float) ($totals->min() ?? 0), 'report_days' => $daily->count(), 'expected_operational_days' => $expected, 'running_operational_days' => $operating, 'availability' => $expected ? round($operating / $expected * 100, 1) : 0, 'daily' => $daily->map(fn ($r) => ['date' => $r->report_date->toDateString(), 'rental' => (float) $r->items_sum_rental_amount])->values(), 'units' => $units];
    }
}
