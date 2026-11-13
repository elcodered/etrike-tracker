<?php

namespace App\Http\Controllers;

use App\Http\Requests\BulkReportRequest;
use App\Http\Requests\CreateReportRequest;
use App\Http\Requests\SaveReportRequest;
use App\Http\Requests\TransitionReportRequest;
use App\Http\Resources\ReportResource;
use App\Models\DailyReport;
use App\Services\ReportPdfService;
use App\Services\ReportService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class DailyReportController extends Controller
{
    public function __construct(private ReportService $service) {}

    public function index(Request $r)
    {
        $r->validate(['date' => ['nullable', 'date_format:Y-m-d'], 'from' => ['nullable', 'date_format:Y-m-d'], 'to' => ['nullable', 'date_format:Y-m-d'], 'status' => ['nullable', 'in:draft,submitted,locked'], 'per_page' => ['nullable', 'integer', 'between:1,100']]);
        $q = DailyReport::with('creator')->orderByDesc('report_date');
        if ($r->user()->role === 'viewer') {
            $q->published();
        }
        if ($r->date) {
            $q->whereDate('report_date', $r->date);
        }
        if ($r->from) {
            $q->whereDate('report_date', '>=', $r->from);
        }
        if ($r->to) {
            $q->whereDate('report_date', '<=', $r->to);
        }
        if ($r->status) {
            $q->where('status', $r->status);
        }

        return ReportResource::collection($q->paginate($r->integer('per_page', 15)));
    }

    public function store(CreateReportRequest $r)
    {
        return (new ReportResource($this->service->create($r->validated(), $r->user())))->response()->setStatusCode(201);
    }

    public function show(DailyReport $dailyReport)
    {
        Gate::authorize('view', $dailyReport);

        return new ReportResource($dailyReport->load('items.status', 'creator'));
    }

    public function pdf(Request $request, DailyReport $dailyReport, ReportPdfService $pdf)
    {
        $request->validate(['version' => ['sometimes', 'integer', 'min:1']]);

        return $pdf->download($dailyReport, $request->has('version') ? $request->integer('version') : null);
    }

    public function update(SaveReportRequest $r, DailyReport $dailyReport)
    {
        return new ReportResource($this->service->save($dailyReport, $r->validated()));
    }

    public function submit(TransitionReportRequest $r, DailyReport $dailyReport)
    {
        return new ReportResource($this->service->transition($dailyReport, 'submit', $r->integer('version')));
    }

    public function reopen(TransitionReportRequest $r, DailyReport $dailyReport)
    {
        return new ReportResource($this->service->transition($dailyReport, 'reopen', $r->integer('version')));
    }

    public function lock(TransitionReportRequest $r, DailyReport $dailyReport)
    {
        return new ReportResource($this->service->transition($dailyReport, 'lock', $r->integer('version')));
    }

    public function bulk(BulkReportRequest $r, DailyReport $dailyReport)
    {
        return new ReportResource($this->service->bulk($dailyReport, $r->validated() + ['confirmed' => false]));
    }

    public function sync(TransitionReportRequest $r, DailyReport $dailyReport)
    {
        return new ReportResource($this->service->sync($dailyReport, $r->integer('version')));
    }
}
