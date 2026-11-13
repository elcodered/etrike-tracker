<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyReport extends Model
{
    protected $attributes = ['status' => 'draft', 'version' => 1];

    protected $fillable = ['report_date', 'created_by', 'submitted_at', 'status', 'notes', 'version'];

    protected function casts(): array
    {
        return ['report_date' => 'date:Y-m-d', 'submitted_at' => 'datetime'];
    }

    public function items()
    {
        return $this->hasMany(DailyReportItem::class)->orderBy('id');
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function scopePublished($q)
    {
        return $q->whereIn('status', ['submitted', 'locked']);
    }
}
