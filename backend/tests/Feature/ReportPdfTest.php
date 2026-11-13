<?php

namespace Tests\Feature;

use App\Models\DailyReport;
use App\Models\User;
use App\Services\ReportService;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReportPdfTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-09-05 12:00:00', 'Asia/Manila'));
        $this->seed(DatabaseSeeder::class);
    }

    public function test_authorized_roles_can_download_a_real_pdf_of_a_submitted_report(): void
    {
        $report = DailyReport::whereDate('report_date', '2026-09-04')->firstOrFail();
        foreach (['admin', 'operator', 'viewer'] as $role) {
            auth()->forgetGuards();
            $this->actingAs(User::where('role', $role)->firstOrFail(), 'web');
            $response = $this->get('/api/daily-reports/'.$report->id.'/pdf?version='.$report->version);
            $response->assertOk()->assertHeader('Content-Type', 'application/pdf');
            $this->assertStringContainsString('attachment;', $response->headers->get('Content-Disposition'));
            $this->assertStringContainsString('e-trike-daily-report-2026-09-04.pdf', $response->headers->get('Content-Disposition'));
            $this->assertStringContainsString('no-store', $response->headers->get('Cache-Control'));
            $this->assertStringStartsWith('%PDF-', $response->getContent());
            $this->assertStringContainsString('%%EOF', $response->getContent());
        }
    }

    public function test_pdf_exports_enforce_authentication_draft_visibility_and_active_accounts(): void
    {
        $report = DailyReport::firstOrFail();
        $this->getJson('/api/daily-reports/'.$report->id.'/pdf')->assertUnauthorized();
        $report->update(['status' => 'draft']);
        $viewer = User::where('role', 'viewer')->firstOrFail();
        $this->actingAs($viewer, 'web');
        $this->getJson('/api/daily-reports/'.$report->id.'/pdf')->assertForbidden();
        $report->update(['status' => 'submitted']);
        $viewer->update(['is_active' => false]);
        $this->getJson('/api/daily-reports/'.$report->id.'/pdf')->assertForbidden();
    }

    public function test_pdf_rejects_a_stale_version_and_invalid_report(): void
    {
        $this->actingAs(User::where('role', 'admin')->firstOrFail(), 'web');
        $report = DailyReport::firstOrFail();
        $report->increment('version');
        $this->getJson('/api/daily-reports/'.$report->id.'/pdf?version=1')->assertConflict();
        $this->getJson('/api/daily-reports/'.$report->id.'/pdf?version=bad')->assertUnprocessable();
        $this->getJson('/api/daily-reports/999999/pdf')->assertNotFound();
    }

    public function test_template_uses_saved_snapshots_custom_rentals_and_escaped_notes(): void
    {
        $report = DailyReport::whereDate('report_date', '2026-09-03')->firstOrFail();
        $report->update(['status' => 'draft', 'notes' => '<script>alert("test")</script>']);
        $item = $report->items()->where('plate_number', '804ZOA')->firstOrFail();
        $item->driver->update(['display_name' => 'RENAMED DRIVER']);
        $report->load('items.status', 'creator');
        $summary = app(ReportService::class)->summary($report);
        $view = $this->view('reports.daily-pdf', [
            'report' => $report,
            'summary' => $summary,
            'organization' => 'Test Fleet',
            'generatedAt' => now('Asia/Manila'),
        ]);
        $view->assertSee('YBAÑEZ')->assertDontSee('RENAMED DRIVER')
            ->assertSee('₱200.00')->assertSee('DRAFT — Saved working report.')
            ->assertSee('Total Rental: ₱'.number_format($summary['rental_total'], 2))
            ->assertSee('<script>alert("test")</script>')
            ->assertDontSee('<script>', false);
        foreach ($report->items as $row) {
            $view->assertSee($row->plate_number)->assertSee($row->status->name);
        }
    }
}
