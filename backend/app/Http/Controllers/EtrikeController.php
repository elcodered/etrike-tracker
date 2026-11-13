<?php

namespace App\Http\Controllers;

use App\Http\Requests\EtrikeRequest;
use App\Models\Etrike;
use App\Services\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class EtrikeController extends Controller
{
    public function index(Request $r)
    {
        $r->validate(['search' => ['nullable', 'string', 'max:100'], 'active' => ['nullable', 'boolean'], 'per_page' => ['nullable', 'integer', 'between:1,100']]);
        $q = Etrike::with('defaultDriver')->orderBy('id');
        if ($r->filled('search')) {
            $q->where(fn ($q) => $q->where('plate_number', 'ilike', '%'.$r->search.'%')->orWhere('unit_code', 'ilike', '%'.$r->search.'%'));
        } if ($r->has('active')) {
            $q->where('is_active', $r->boolean('active'));
        }

return $q->paginate($r->integer('per_page', 25));
    }

    public function store(EtrikeRequest $r)
    {
        return DB::transaction(function () use ($r) {
            $e = Etrike::create($r->validated());
            Audit::record('Created e-trike', $e);

            return response()->json(['data' => $e->load('defaultDriver')], 201);
        });
    }

    public function show(Etrike $etrike)
    {
        return ['data' => $etrike->load('defaultDriver')];
    }

    public function update(EtrikeRequest $r, Etrike $etrike)
    {
        return DB::transaction(function () use ($r, $etrike) {
            $e = Etrike::lockForUpdate()->findOrFail($etrike->id);
            $old = $e->toArray();
            $e->update($r->validated());
            Audit::record('Updated e-trike', $e, $old);

            return ['data' => $e->load('defaultDriver')];
        });
    }

    public function destroy(Etrike $etrike)
    {
        Gate::authorize('admin');

        return DB::transaction(function () use ($etrike) {
            $e = Etrike::lockForUpdate()->findOrFail($etrike->id);
            $old = $e->toArray();
            $e->update(['is_active' => false]);
            Audit::record('Archived e-trike', $e, $old);

            return response()->noContent();
        });
    }
}
