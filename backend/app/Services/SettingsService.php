<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Support\Facades\DB;

class SettingsService
{
    public function get(): array
    {
        $values = DB::table('settings')->pluck('value', 'key')->map(fn ($v) => json_decode($v, true))->all();

        return $values + ['organization_name' => 'E-Trike Operations', 'full_day_rental' => 300, 'half_day_rental' => 150, 'timezone' => 'Asia/Manila'];
    }

    public function save(array $data): array
    {
        return DB::transaction(function () use ($data) {
            $old = $this->get();
            foreach ($data as $k => $v) {
                DB::table('settings')->updateOrInsert(['key' => $k], ['value' => json_encode($v)]);
            } AuditLog::create(['user_id' => auth()->id(), 'action' => 'Updated system settings', 'entity_type' => 'Settings', 'entity_id' => 0, 'old_values' => $old, 'new_values' => $data]);

            return $this->get();
        });
    }
}
