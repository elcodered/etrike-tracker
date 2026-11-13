<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\DailyReport;
use App\Models\DailyReportItem;
use App\Models\Driver;
use App\Models\Etrike;
use App\Models\ShareLink;
use App\Models\Status;
use App\Models\User;
use Carbon\Carbon;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FleetWorkflowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->travelTo(Carbon::parse('2026-09-05 12:00:00', 'Asia/Manila'));
        $this->seed(DatabaseSeeder::class);
    }

    private function asRole(string $role = 'admin'): User
    {
        $user = User::where('role', $role)->firstOrFail();
        auth()->forgetGuards();
        $this->actingAs($user, 'web');

        return $user;
    }

    private function createToday(): array
    {
        $this->asRole();

        return $this->postJson('/api/daily-reports', ['report_date' => '2026-09-05'])->assertCreated()->json('data');
    }

    private function savePayload(array $r): array
    {
        return ['version' => $r['version'], 'notes' => $r['notes'], 'items' => array_map(fn ($i) => collect($i)->only(['id', 'driver_id', 'status_id', 'rental_amount', 'remarks'])->all(), $r['items'])];
    }

    public function test_guests_cannot_read_or_edit_private_endpoints(): void
    {
        $this->getJson('/api/dashboard')->assertUnauthorized();
        $this->postJson('/api/daily-reports', ['report_date' => '2026-09-05'])->assertUnauthorized();
    }

    public function test_login_and_logout_use_cookie_session(): void
    {
        $u = User::where('role', 'admin')->first();
        $u->update(['password' => 'TestLocalPassword123!']);
        $this->postJson('/api/login', ['email' => $u->email, 'password' => 'wrong'])->assertUnprocessable();
        $this->postJson('/api/login', ['email' => $u->email, 'password' => 'TestLocalPassword123!'])->assertOk()->assertJsonPath('user.role', 'admin')->assertJsonMissingPath('user.password');
        $this->getJson('/api/me')->assertOk();
        $this->postJson('/api/logout')->assertNoContent();
        $this->assertGuest('web');
    }

    public function test_login_is_rate_limited(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['email' => 'invalid@example.com', 'password' => 'bad'])->assertUnprocessable();
        }$this->postJson('/api/login', ['email' => 'invalid@example.com', 'password' => 'bad'])->assertTooManyRequests();
    }

    public function test_disabled_users_are_denied_even_with_an_existing_session(): void
    {
        $u = $this->asRole('operator');
        $u->update(['is_active' => false]);
        $this->getJson('/api/dashboard')->assertForbidden();
    }

    public function test_report_creation_populates_all_active_units_without_copying_repair_status(): void
    {
        $r = $this->createToday();
        $this->assertCount(17, $r['items']);
        $repair = collect($r['items'])->firstWhere('plate_number', 'Z140VA');
        $this->assertSame('RUNNING', $repair['operational_status']);
        $this->assertSame('CALO', $repair['driver_name']);
        $unassigned = collect($r['items'])->firstWhere('plate_number', '845ZOA');
        $this->assertSame('NO_DRIVER', $unassigned['operational_status']);
        $this->assertNull($unassigned['driver_id']);
        $this->postJson('/api/daily-reports', ['report_date' => '2026-09-05'])->assertUnprocessable();
    }

    public function test_archived_units_are_excluded_from_new_reports_but_history_is_retained(): void
    {
        $this->asRole();
        $u = Etrike::first();
        $historyCount = $u->items()->count();
        $this->deleteJson('/api/etrikes/'.$u->id)->assertNoContent();
        $r = $this->createToday();
        $this->assertCount(16, $r['items']);
        $this->assertSame($historyCount, $u->items()->count());
    }

    public function test_custom_rental_driver_changes_and_remarks_do_not_change_history(): void
    {
        $r = $this->createToday();
        $item = $r['items'][0];
        $historical = DailyReportItem::where('etrike_id', $item['etrike_id'])->where('daily_report_id', '!=', $r['id'])->first();
        $old = $historical->toArray();
        $p = $this->savePayload($r);
        $d = Driver::where('display_name', 'TENIO')->first();
        $p['items'][0]['driver_id'] = $d->id;
        $p['items'][0]['rental_amount'] = 200.25;
        $p['items'][0]['remarks'] = 'Adjusted rental';
        $saved = $this->putJson('/api/daily-reports/'.$r['id'], $p)->assertOk()->json('data');
        $this->assertEquals(200.25, $saved['items'][0]['rental_amount']);
        $this->assertSame('TENIO', $saved['items'][0]['driver_name']);
        $this->assertEquals($old, $historical->fresh()->toArray());
        $this->assertDatabaseHas('audit_logs', ['entity_type' => 'DailyReportItem', 'entity_id' => $item['id'], 'action' => 'Updated report item']);
    }

    public function test_driver_rename_preserves_snapshot_names(): void
    {
        $this->asRole();
        $item = DailyReportItem::whereNotNull('driver_id')->first();
        $name = $item->driver_name;
        $driver = $item->driver;
        $driver->update(['display_name' => 'RENAMED']);
        $this->getJson('/api/daily-reports/'.$item->daily_report_id)->assertOk()->assertJsonPath('data.items.0.driver_name', $name);
    }

    public function test_invalid_status_negative_rental_and_missing_driver_are_rejected(): void
    {
        $r = $this->createToday();
        $p = $this->savePayload($r);
        $p['items'][0]['rental_amount'] = -1;
        $this->putJson('/api/daily-reports/'.$r['id'], $p)->assertUnprocessable();
        $p = $this->savePayload($r);
        $p['items'][0]['status_id'] = 99999;
        $this->putJson('/api/daily-reports/'.$r['id'], $p)->assertUnprocessable();
        $p = $this->savePayload($r);
        $p['items'][0]['driver_id'] = null;
        $this->putJson('/api/daily-reports/'.$r['id'], $p)->assertUnprocessable();
        $p = $this->savePayload($r);
        $p['items'][0]['rental_amount'] = '150.001';
        $this->putJson('/api/daily-reports/'.$r['id'], $p)->assertUnprocessable();
    }

    public function test_duplicate_or_foreign_report_item_is_rejected_atomically(): void
    {
        $r = $this->createToday();
        $p = $this->savePayload($r);
        $p['items'][0]['rental_amount'] = 234;
        $foreign = DailyReportItem::where('daily_report_id', '!=', $r['id'])->first();
        $p['items'][1]['id'] = $foreign->id;
        $this->putJson('/api/daily-reports/'.$r['id'], $p)->assertUnprocessable();
        $this->assertDatabaseHas('daily_report_items', ['id' => $r['items'][0]['id'], 'rental_amount' => 300]);
        $p = $this->savePayload($r);
        $p['items'][1]['id'] = $p['items'][0]['id'];
        $this->putJson('/api/daily-reports/'.$r['id'], $p)->assertUnprocessable();
    }

    public function test_stale_saves_and_transitions_are_rejected(): void
    {
        $r = $this->createToday();
        $this->putJson('/api/daily-reports/'.$r['id'], $this->savePayload($r))->assertOk();
        $this->putJson('/api/daily-reports/'.$r['id'], $this->savePayload($r))->assertConflict();
        $this->postJson('/api/daily-reports/'.$r['id'].'/submit', ['version' => 1])->assertConflict();
    }

    public function test_operator_can_only_edit_todays_draft_and_cannot_manage_users(): void
    {
        $r = $this->createToday();
        $this->asRole('operator');
        $this->putJson('/api/daily-reports/'.$r['id'], $this->savePayload($r))->assertOk();
        $this->postJson('/api/daily-reports', ['report_date' => '2026-08-30'])->assertForbidden();
        $history = DailyReport::whereDate('report_date', '2026-09-04')->first();
        $history->update(['status' => 'draft']);
        $this->putJson('/api/daily-reports/'.$history->id, ['version' => 1, 'items' => [$this->savePayload($r)['items'][0]]])->assertForbidden();
        $this->getJson('/api/users')->assertForbidden();
        $this->postJson('/api/etrikes', [])->assertForbidden();
        $this->postJson('/api/share-links', ['name' => 'Unauthorized'])->assertForbidden();
    }

    public function test_viewers_cannot_see_drafts_or_mutate_any_module(): void
    {
        $r = $this->createToday();
        $this->asRole('viewer');
        $this->getJson('/api/daily-reports/'.$r['id'])->assertForbidden();
        $list = $this->getJson('/api/daily-reports')->assertOk()->json('data');
        $this->assertNotContains('draft', array_column($list, 'status'));
        $this->postJson('/api/daily-reports', ['report_date' => '2026-09-05'])->assertForbidden();
        $this->putJson('/api/daily-reports/'.$r['id'], $this->savePayload($r))->assertForbidden();
        $this->getJson('/api/share-links')->assertForbidden();
        $this->putJson('/api/settings', [])->assertForbidden();
        $this->getJson('/api/audit-logs')->assertForbidden();
    }

    public function test_submission_updates_owner_view_and_admin_can_reopen_and_lock(): void
    {
        $r = $this->createToday();
        $this->asRole('operator');
        $submitted = $this->postJson('/api/daily-reports/'.$r['id'].'/submit', ['version' => 1])->assertOk()->assertJsonPath('data.status', 'submitted')->json('data');
        $this->putJson('/api/daily-reports/'.$r['id'], $this->savePayload($submitted))->assertForbidden();
        $this->postJson('/api/daily-reports/'.$r['id'].'/reopen', ['version' => 2])->assertForbidden();
        $this->asRole('viewer');
        $this->getJson('/api/dashboard')->assertOk()->assertJsonPath('latest_report.id', $r['id']);
        $this->asRole();
        $this->postJson('/api/daily-reports/'.$r['id'].'/lock', ['version' => 2])->assertOk()->assertJsonPath('data.status', 'locked');
        $this->postJson('/api/daily-reports/'.$r['id'].'/reopen', ['version' => 3])->assertOk()->assertJsonPath('data.status', 'draft');
        $this->asRole('viewer');
        $this->getJson('/api/dashboard')->assertOk()->assertJsonPath('latest_report.report_date', '2026-09-04');
    }

    public function test_submission_requires_added_units_to_be_synced(): void
    {
        $r = $this->createToday();
        Etrike::create(['plate_number' => 'TEST-18', 'unit_code' => 'ET-018', 'is_active' => true]);
        $this->postJson('/api/daily-reports/'.$r['id'].'/submit', ['version' => 1])->assertUnprocessable();
        $synced = $this->postJson('/api/daily-reports/'.$r['id'].'/sync', ['version' => 1])->assertOk()->json('data');
        $this->assertCount(18, $synced['items']);
        $this->postJson('/api/daily-reports/'.$r['id'].'/submit', ['version' => 2])->assertOk();
    }

    public function test_bulk_replacement_requires_confirmation_and_preserves_unassigned_units(): void
    {
        $r = $this->createToday();
        $this->postJson('/api/daily-reports/'.$r['id'].'/bulk', ['version' => 1, 'action' => 'mark_running'])->assertUnprocessable();
        $res = $this->postJson('/api/daily-reports/'.$r['id'].'/bulk', ['version' => 1, 'action' => 'mark_running', 'confirmed' => true])->assertOk()->json('data');
        $this->assertSame('NO_DRIVER', collect($res['items'])->firstWhere('plate_number', '845ZOA')['operational_status']);
    }

    public function test_running_rental_bulk_does_not_change_repair_status_or_custom_nonrunning_rental(): void
    {
        $r = $this->createToday();
        $p = $this->savePayload($r);
        $p['items'][0]['status_id'] = Status::where('code', 'REPAIR')->value('id');
        $p['items'][0]['rental_amount'] = 25;
        $r = $this->putJson('/api/daily-reports/'.$r['id'], $p)->assertOk()->json('data');
        $res = $this->postJson('/api/daily-reports/'.$r['id'].'/bulk', ['version' => $r['version'], 'action' => 'running_rental'])->assertOk()->json('data');
        $this->assertSame('REPAIR', $res['items'][0]['operational_status']);
        $this->assertEquals(25, $res['items'][0]['rental_amount']);
    }

    public function test_secure_share_tokens_are_hashed_revocable_regenerable_and_expiring(): void
    {
        $this->asRole();
        $link = $this->postJson('/api/share-links', ['name' => 'Owner', 'expires_at' => now()->addDay()->toIso8601String()])->assertCreated()->json();
        $this->assertSame(64, strlen($link['token']));
        $stored = ShareLink::first();
        $this->assertNotEquals($link['token'], $stored->token_hash);
        $this->assertSame(hash('sha256', $link['token']), $stored->token_hash);
        auth()->forgetGuards();
        $this->getJson('/api/shared/'.$link['token'])->assertOk()->assertJsonPath('report.report_date', '2026-09-04')->assertJsonMissingPath('report.created_by')->assertJsonMissingPath('report.notes');
        $this->asRole();
        $new = $this->postJson('/api/share-links/'.$stored->id.'/regenerate')->assertOk()->json();
        $this->getJson('/api/shared/'.$link['token'])->assertNotFound();
        $this->getJson('/api/shared/'.$new['token'])->assertOk();
        $stored->update(['expires_at' => now()->subMinute()]);
        $this->getJson('/api/shared/'.$new['token'])->assertNotFound();
        $stored->update(['expires_at' => null]);
        $this->deleteJson('/api/share-links/'.$stored->id)->assertNoContent();
        $this->getJson('/api/shared/'.$new['token'])->assertNotFound();
        $this->getJson('/api/shared/1')->assertNotFound();
    }

    public function test_analytics_totals_use_only_submitted_reports_and_half_day_weighting(): void
    {
        $draft = $this->createToday();
        $this->asRole();
        $r = $this->getJson('/api/analytics?month=2026-09')->assertOk()->json();
        $expected = DB::table('daily_report_items as i')->join('daily_reports as r', 'r.id', '=', 'i.daily_report_id')->where('r.status', 'submitted')->whereBetween('r.report_date', ['2026-09-01', '2026-09-30'])->sum('i.rental_amount');
        $this->assertEquals($expected, $r['total_rental']);
        $this->assertSame(4, $r['report_days']);
        $this->assertSame(68, $r['expected_operational_days']);
        $this->assertEquals(56.5, $r['running_operational_days']);
        $empty = $this->getJson('/api/analytics?month=2025-01')->assertOk()->json();
        $this->assertEquals(0, $empty['availability']);
        $this->assertEquals(0, $empty['total_rental']);
    }

    public function test_history_and_search_are_paginated_and_preserve_records(): void
    {
        $this->asRole('viewer');
        $this->getJson('/api/etrikes?search=Z140')->assertOk()->assertJsonPath('total', 1);
        $e = Etrike::where('plate_number', 'Z140VA')->first();
        $this->getJson('/api/etrikes/'.$e->id.'/history')->assertOk()->assertJsonPath('pagination.total', 6)->assertJsonPath('items.0.operational_status', 'STANDBY_FOR_REPAIR');
        $d = Driver::where('display_name', 'CALO')->first();
        $this->getJson('/api/drivers/'.$d->id.'/history')->assertOk()->assertJsonPath('summary.half_days', 2);
    }

    public function test_admin_crud_validation_settings_and_password_redaction(): void
    {
        $this->asRole();
        $this->postJson('/api/etrikes', ['plate_number' => 'Z138VA', 'unit_code' => 'DUP', 'is_active' => true])->assertUnprocessable();
        $this->putJson('/api/settings', ['organization_name' => 'Test Fleet', 'full_day_rental' => 325, 'half_day_rental' => 175])->assertOk();
        $r = $this->createToday();
        $this->assertEquals(325, $r['items'][0]['rental_amount']);
        $payload = ['name' => 'New Viewer', 'email' => 'new@example.com', 'password' => 'StrongPassword123!', 'role' => 'viewer', 'is_active' => true];
        $this->postJson('/api/users', $payload)->assertCreated()->assertJsonMissingPath('data.password');
        $log = AuditLog::where('action', 'Created user')->latest('id')->first();
        $this->assertArrayNotHasKey('password', $log->new_values);
        $u = User::where('role', 'admin')->first();
        $this->putJson('/api/users/'.$u->id, ['name' => $u->name, 'email' => $u->email, 'role' => 'viewer', 'is_active' => true])->assertUnprocessable();
    }

    public function test_manila_date_is_used_at_utc_day_boundary(): void
    {
        $this->travelTo(Carbon::parse('2026-09-05 17:00:00','UTC')->setTimezone('Asia/Manila'));
        $this->asRole('operator');
        $this->getJson('/api/dashboard')->assertOk()->assertJsonPath('today','2026-09-06');
        $this->postJson('/api/daily-reports',['report_date' => '2026-09-05'])->assertForbidden();
        $this->postJson('/api/daily-reports',['report_date' => '2026-09-06'])->assertCreated();
    }
}
