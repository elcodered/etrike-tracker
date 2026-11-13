<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyReportItem extends Model
{
    protected $fillable = ['daily_report_id', 'etrike_id', 'driver_id', 'status_id', 'plate_number', 'driver_name', 'rental_amount', 'remarks', 'updated_by'];

    protected function casts(): array
    {
        return ['rental_amount' => 'decimal:2'];
    }

    public function report()
    {
        return $this->belongsTo(DailyReport::class, 'daily_report_id');
    }

    public function etrike()
    {
        return $this->belongsTo(Etrike::class);
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class);
    }

    public function status()
    {
        return $this->belongsTo(Status::class);
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }
}
