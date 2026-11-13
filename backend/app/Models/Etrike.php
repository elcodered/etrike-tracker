<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Etrike extends Model
{
    protected $fillable = ['plate_number', 'unit_code', 'description', 'default_driver_id', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function defaultDriver()
    {
        return $this->belongsTo(Driver::class, 'default_driver_id');
    }

    public function items()
    {
        return $this->hasMany(DailyReportItem::class);
    }
}
