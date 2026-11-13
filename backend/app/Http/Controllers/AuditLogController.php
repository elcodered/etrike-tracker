<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    public function index(Request $r)
    {
        $r->validate(['entity_type' => ['nullable', 'string', 'max:100'], 'entity_id' => ['nullable', 'integer']]);

        return AuditLog::with('user:id,name')->when($r->entity_type, fn ($q) => $q->where('entity_type', $r->entity_type))->when($r->entity_id, fn ($q) => $q->where('entity_id', $r->entity_id))->orderByDesc('id')->paginate(30);
    }
}
