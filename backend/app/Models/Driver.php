<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Driver extends Model
{
    protected $fillable = ['first_name', 'middle_name', 'last_name', 'display_name', 'contact_number', 'is_active', 'notes'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    public function items()
    {
        return $this->hasMany(DailyReportItem::class);
    }
}
