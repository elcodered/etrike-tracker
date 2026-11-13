<?php

namespace Database\Seeders;

use App\Models\DailyReport;
use App\Models\Etrike;
use App\Models\Status;
use App\Models\User;
use Illuminate\Database\Seeder;

class DemoReportSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            return;
        }
        $user = User::where('role', 'admin')->firstOrFail();
        $statuses = Status::pluck('id', 'code');
        $units = Etrike::with('defaultDriver')->get();
        $dates = ['2026-08-29', '2026-08-31', '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04'];
        foreach ($dates as $n => $date) {
            if (DailyReport::whereDate('report_date', $date)->exists()) {
                continue;
            }
            $r = DailyReport::create(['report_date' => $date, 'created_by' => $user->id, 'submitted_at' => $date.' 18:00:00', 'status' => 'submitted', 'notes' => 'Sample historical report for local development.']);
            foreach ($units as $i => $u) {
                $code = 'RUNNING';
                $amount = 300;
                $remarks = null;
                $driver = $u->defaultDriver;
                if ($i === 8) {
                    $code = ['HALF_DAY', 'HALF_DAY', 'RUNNING', 'RUNNING', 'RUNNING', 'STANDBY_FOR_REPAIR'][$n];
                    $amount = [150, 150, 300, 300, 200, 0][$n];
                    $remarks = ['Repair half day', 'Driver attended meeting', null, null, 'Adjusted rental', 'Awaiting brake parts'][$n];
                } elseif ($i === 9) {
                    $code = 'REPAIR';
                    $amount = 0;
                    $remarks = 'Motor inspection';
                } elseif ($i === 16) {
                    $code = 'NO_DRIVER';
                    $amount = 0;
                    $driver = null;
                } elseif ($i === 0 && $n === 5) {
                    $code = 'NO_OPERATION';
                    $amount = 0;
                    $remarks = 'Scheduled rest day';
                } elseif ($i === 6 && $n === 3) {
                    $code = 'DRIVER_UNAVAILABLE';
                    $amount = 0;
                    $remarks = 'Driver sick';
                } elseif ($i === 4 && $n === 2) {
                    $code = 'HALF_DAY';
                    $amount = 150;
                    $remarks = 'Driver attended meeting';
                }
                $r->items()->create(['etrike_id' => $u->id, 'plate_number' => $u->plate_number, 'driver_id' => $driver?->id, 'driver_name' => $driver?->display_name, 'status_id' => $statuses[$code], 'rental_amount' => $amount, 'remarks' => $remarks, 'updated_by' => $user->id]);
            }
        }
    }
}
