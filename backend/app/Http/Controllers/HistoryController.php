<?php

namespace App\Http\Controllers;

use App\Http\Resources\ReportItemResource;
use App\Models\DailyReport;
use App\Models\DailyReportItem;
use App\Models\Driver;
use App\Models\Etrike;

class HistoryController extends Controller
{
    private function history(string $key, int $id)
    {
        $q = DailyReportItem::where($key, $id)->whereHas('report', fn ($q) => $q->published());
        $items = (clone $q)->with('report', 'status')->orderByDesc(DailyReport::select('report_date')->whereColumn('daily_reports.id', 'daily_report_items.daily_report_id'))->paginate(30);
        $counts = (clone $q)->get()->load('status')->countBy(fn ($i) => $i->status->code);
        $latest = DailyReport::published()->whereDate('report_date', '<=', today())->orderByDesc('report_date')->first();
        $current = $latest ? $latest->items()->where($key, $id)->with('status', 'report')->get() : collect();

        return ['items' => ReportItemResource::collection($items), 'pagination' => ['current_page' => $items->currentPage(), 'last_page' => $items->lastPage(), 'total' => $items->total()], 'summary' => ['days_worked' => (int) ($counts['RUNNING'] ?? 0), 'half_days' => (int) ($counts['HALF_DAY'] ?? 0), 'unavailable_days' => (int) ($counts['DRIVER_UNAVAILABLE'] ?? 0), 'repair_days' => (int) ($counts['REPAIR'] ?? 0), 'standby_days' => (int) ($counts['STANDBY_FOR_REPAIR'] ?? 0), 'no_driver_days' => (int) ($counts['NO_DRIVER'] ?? 0), 'total_rental' => (float) (clone $q)->sum('rental_amount')], 'current' => ReportItemResource::collection($current), 'previous_units' => (clone $q)->select('plate_number')->distinct()->pluck('plate_number')];
    }

    public function etrike(Etrike $etrike)
    {
        return ['profile' => $etrike->load('defaultDriver')] + $this->history('etrike_id', $etrike->id);
    }

    public function driver(Driver $driver)
    {
        return ['profile' => $driver] + $this->history('driver_id', $driver->id);
    }
}
