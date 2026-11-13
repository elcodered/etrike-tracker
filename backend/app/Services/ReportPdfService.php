<?php

namespace App\Services;

use App\Models\DailyReport;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;

class ReportPdfService
{
    public function download(DailyReport $report, ?int $version = null): Response
    {
        // Snapshot the header, items, and totals together before rendering the document.
        $data = DB::transaction(function () use ($report, $version) {
            $report = DailyReport::sharedLock()->findOrFail($report->id);
            Gate::authorize('view', $report);
            abort_if($version !== null && $report->version !== $version, 409, 'This report has changed. Reload it before downloading the PDF.');
            $report->load('items.status', 'creator');

            return [
                'report' => $report,
                'summary' => app(ReportService::class)->summary($report),
                'organization' => app(SettingsService::class)->get()['organization_name'],
                'generatedAt' => now('Asia/Manila'),
            ];
        });

        $pdf = Pdf::loadView('reports.daily-pdf', $data)
            ->setPaper('a4', 'landscape')
            ->setOption('defaultFont', 'DejaVu Sans')
            ->setOption('isRemoteEnabled', false)
            ->setOption('isPhpEnabled', false)
            ->setOption('isJavascriptEnabled', false);
        $pdf->render();
        $canvas = $pdf->getDomPDF()->getCanvas();
        $font = $pdf->getDomPDF()->getFontMetrics()->getFont('DejaVu Sans');
        $canvas->page_text(745, 565, 'Page {PAGE_NUM} of {PAGE_COUNT}', $font, 8, [0.4, 0.45, 0.4]);

        return $pdf->download('e-trike-daily-report-'.$data['report']->report_date->toDateString().'.pdf')
            ->header('Cache-Control', 'private, no-store')
            ->header('X-Content-Type-Options', 'nosniff');
    }
}
