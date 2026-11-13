<?php

namespace App\Services;

use App\Models\DailyReport;
use App\Models\DailyReportItem;
use App\Models\Driver;
use App\Models\Etrike;
use App\Models\Status;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;

class ReportService
{
    public function summary(DailyReport $report): array
    {
        $counts = DB::table('daily_report_items')->join('statuses', 'statuses.id', '=', 'daily_report_items.status_id')->where('daily_report_id', $report->id)->selectRaw('statuses.code, COUNT(*) as count')->groupBy('statuses.code')->pluck('count', 'code');

        return ['total_units' => $report->items()->count(), 'running' => (int) ($counts['RUNNING'] ?? 0), 'half_day' => (int) ($counts['HALF_DAY'] ?? 0), 'repair' => (int) ($counts['REPAIR'] ?? 0), 'standby' => (int) ($counts['STANDBY_FOR_REPAIR'] ?? 0), 'no_driver' => (int) ($counts['NO_DRIVER'] ?? 0), 'unavailable' => (int) ($counts['DRIVER_UNAVAILABLE'] ?? 0), 'no_operation' => (int) ($counts['NO_OPERATION'] ?? 0), 'other' => (int) ($counts['OTHER'] ?? 0), 'rental_total' => (float) $report->items()->sum('rental_amount')];
    }

    public function create(array $data, User $user): DailyReport
    {
        Gate::authorize('create', DailyReport::class);
        abort_if($user->role === 'operator' && $data['report_date'] !== today()->toDateString(), 403, 'Operators may create today’s report only.');

        return DB::transaction(function () use ($data, $user) {
            // Lock existing active units while snapshotting; the database enforces date uniqueness.
            $units = Etrike::where('is_active', true)->orderBy('id')->lockForUpdate()->get();
            if ($units->isEmpty()) {
                throw ValidationException::withMessages(['report_date' => 'Add at least one active e-trike first.']);
            }
            if (DailyReport::whereDate('report_date', $data['report_date'])->exists()) {
                abort(409, 'A report already exists for this date.');
            }
            $report = DailyReport::create($data + ['created_by' => $user->id]);
            $statuses = Status::pluck('id', 'code');
            foreach ($units as $unit) {
                $previous = DailyReportItem::where('etrike_id', $unit->id)->whereHas('report', fn ($q) => $q->where('report_date', '<', $data['report_date'])->published())->join('daily_reports', 'daily_reports.id', '=', 'daily_report_items.daily_report_id')->orderByDesc('report_date')->select('daily_report_items.*')->first();
                $driverId = $previous ? $previous->driver_id : $unit->default_driver_id;
                $driver = Driver::where('is_active', true)->find($driverId);
                $report->items()->create(['etrike_id' => $unit->id, 'plate_number' => $unit->plate_number, 'driver_id' => $driver?->id, 'driver_name' => $driver?->display_name, 'status_id' => $statuses[$driver ? 'RUNNING' : 'NO_DRIVER'], 'rental_amount' => $driver ? app(SettingsService::class)->get()['full_day_rental'] : 0, 'updated_by' => $user->id]);
            }
            Audit::record('Created daily report', $report);

            return $report->load('items.status', 'creator');
        });
    }

    public function save(DailyReport $report, array $data): DailyReport
    {
        return DB::transaction(function () use ($report, $data) {
            $report = $this->editable($report, $data['version']);
            $items = $report->items()->get()->keyBy('id');
            foreach ($data['items'] as $row) {
                if (! $items->has($row['id'])) {
                    throw ValidationException::withMessages(['items' => 'An item does not belong to this report.']);
                }
                $item = $items[$row['id']];
                $old = $item->toArray();
                $driverId = $row['driver_id'] ?? null;
                $driver = Driver::find($driverId);
                if ($driver && ! $driver->is_active && $item->driver_id !== $driver->id) {
                    throw ValidationException::withMessages(['items' => 'Cannot assign an inactive driver.']);
                }
                $code = Status::findOrFail($row['status_id'])->code;
                if (in_array($code, ['RUNNING', 'HALF_DAY']) && ! $driver) {
                    throw ValidationException::withMessages(['items' => "{$item->plate_number}: select a driver for an operating unit."]);
                }
                if ($code === 'NO_DRIVER' && $driver) {
                    throw ValidationException::withMessages(['items' => "{$item->plate_number}: remove the driver when choosing No Driver."]);
                }
                $item->fill(collect($row)->only(['driver_id', 'status_id', 'rental_amount', 'remarks'])->all());
                if ($item->isDirty('driver_id')) {
                    $item->driver_name = $driver?->display_name;
                }
                if ($item->isDirty()) {
                    $item->updated_by = auth()->id();
                    $item->save();
                    Audit::record('Updated report item', $item, $old);
                }
            }
            if (array_key_exists('notes', $data)) {
                $report->notes = $data['notes'];
            }
            $old = $report->getOriginal();
            $report->version++;
            $report->save();
            Audit::record('Saved daily report', $report, $old);

            return $report->load('items.status', 'creator');
        });
    }

    public function editable(DailyReport $report, int $version): DailyReport
    {
        $report = DailyReport::lockForUpdate()->findOrFail($report->id);
        Gate::authorize('update', $report);
        $this->checkVersion($report, $version);

        return $report;
    }

    private function checkVersion(DailyReport $report, int $version): void
    {
        abort_if($report->version !== $version, 409, 'This report was changed by another user. Reload before saving.');
    }

    public function transition(DailyReport $report, string $action, int $version): DailyReport
    {
        return DB::transaction(function () use ($report, $action, $version) {
            $report = DailyReport::lockForUpdate()->findOrFail($report->id);
            $this->checkVersion($report, $version);
            Gate::authorize($action === 'submit' ? 'update' : $action, $report);
            if ($action === 'submit') {
                if (! $report->items()->exists()) {
                    throw ValidationException::withMessages(['items' => 'A report must contain units.']);
                }
                $missing = Etrike::where('is_active', true)->whereNotIn('id', $report->items()->pluck('etrike_id'))->exists();
                if ($missing) {
                    throw ValidationException::withMessages(['items' => 'Active units were added after this draft was created. Use Sync active units before submission.']);
                }
                $invalid = $report->items()->whereHas('status', fn ($q) => $q->whereIn('code', ['RUNNING', 'HALF_DAY']))->whereNull('driver_id')->exists();
                if ($invalid) {
                    throw ValidationException::withMessages(['items' => 'Operating units must have a driver.']);
                }
            }
            $old = $report->toArray();
            $report->status = match ($action) {
                'submit' => 'submitted','reopen' => 'draft','lock' => 'locked'
            };
            if ($action === 'submit') {
                $report->submitted_at = now();
            }
            $report->version++;
            $report->save();
            Audit::record(ucfirst($action).' daily report', $report, $old);

            return $report->load('items.status', 'creator');
        });
    }

    public function bulk(DailyReport $report, array $data): DailyReport
    {
        return DB::transaction(function () use ($report, $data) {
            $report = $this->editable($report, $data['version']);
            $items = $report->items()->with('status')->get();
            if ($data['action'] === 'mark_running' && ! $data['confirmed']) {
                throw ValidationException::withMessages(['confirmed' => 'Confirm before replacing existing operational statuses.']);
            }
            $running = Status::where('code', 'RUNNING')->value('id');
            $amount = app(SettingsService::class)->get()['full_day_rental'];
            $rows = $items->map(function ($item) use ($data, $report, $running, $amount) {
                $row = $item->only(['id', 'driver_id', 'status_id', 'rental_amount', 'remarks']);
                switch ($data['action']) {
                    case 'mark_running': if ($item->driver_id) {
                        $row['status_id'] = $running;
                        $row['rental_amount'] = $amount;
                    } break;
                    case 'running_rental': if ($item->status->code === 'RUNNING') {
                        $row['rental_amount'] = $amount;
                    } break;
                    case 'clear_remarks': $row['remarks'] = null;
                        break;
                    case 'copy_drivers':
                        $previous = DailyReportItem::where('etrike_id', $item->etrike_id)->whereHas('report', fn ($q) => $q->published()->where('report_date', '<', $report->report_date))->join('daily_reports', 'daily_reports.id', '=', 'daily_report_items.daily_report_id')->orderByDesc('report_date')->select('daily_report_items.*')->first();
                        if ($previous && $previous->driver_id && Driver::where('is_active', true)->find($previous->driver_id) && $item->status->code !== 'NO_DRIVER') {
                            $row['driver_id'] = $previous->driver_id;
                        }
                        break;
                }

                return $row;
            })->all();

            return $this->save($report, ['version' => $report->version, 'items' => $rows]);
        });
    }

    public function sync(DailyReport $report, int $version): DailyReport
    {
        return DB::transaction(function () use ($report, $version) {
            $report = $this->editable($report, $version);
            $units = Etrike::where('is_active', true)->whereNotIn('id', $report->items()->pluck('etrike_id'))->get();
            foreach ($units as $unit) {
                $report->items()->create(['etrike_id' => $unit->id, 'plate_number' => $unit->plate_number, 'driver_id' => null, 'driver_name' => null, 'status_id' => Status::where('code', 'NO_DRIVER')->value('id'), 'rental_amount' => 0, 'updated_by' => auth()->id()]);
            }
            $report->version++;
            $report->save();
            Audit::record('Synced active units', $report);

            return $report->load('items.status', 'creator');
        });
    }
}
