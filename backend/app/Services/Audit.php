<?php

namespace App\Services;

use App\Models\AuditLog;

class Audit
{
    public static function record(string $action, $model, ?array $old = null, ?array $new = null): void
    {
        AuditLog::create(['user_id' => auth()->id(), 'action' => $action, 'entity_type' => class_basename($model), 'entity_id' => $model->id, 'old_values' => $old, 'new_values' => $new ?? $model->toArray()]);
    }
}
