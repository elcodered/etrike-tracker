<?php

namespace App\Http\Controllers;

use App\Http\Requests\DriverRequest;
use App\Models\Driver;
use App\Services\Audit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class DriverController extends Controller
{
    public function index(Request $r)
    {
        $r->validate(['search' => ['nullable', 'string', 'max:100'], 'active' => ['nullable', 'boolean'], 'per_page' => ['nullable', 'integer', 'between:1,100']]);
        $q = Driver::orderBy('display_name');
        if ($r->filled('search')) {
            $q->where('display_name', 'ilike', '%'.$r->search.'%');
        } if ($r->has('active')) {
            $q->where('is_active', $r->boolean('active'));
        }

return $q->paginate($r->integer('per_page', 25));
    }

    public function store(DriverRequest $r)
    {
        return DB::transaction(function () use ($r) {
            $d = Driver::create($r->validated());
            Audit::record('Created driver', $d);

            return response()->json(['data' => $d], 201);
        });
    }

    public function show(Driver $driver)
    {
        return ['data' => $driver];
    }

    public function update(DriverRequest $r, Driver $driver)
    {
        return DB::transaction(function () use ($r, $driver) {
            $old = $driver->toArray();
            $driver->update($r->validated());
            Audit::record('Updated driver', $driver, $old);

            return ['data' => $driver];
        });
    }

    public function destroy(Driver $driver)
    {
        Gate::authorize('admin');

        return DB::transaction(function () use ($driver) {
            $old = $driver->toArray();
            $driver->update(['is_active' => false]);
            Audit::record('Archived driver', $driver, $old);

            return response()->noContent();
        });
    }
}
