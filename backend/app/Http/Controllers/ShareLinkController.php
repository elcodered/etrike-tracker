<?php

namespace App\Http\Controllers;

use App\Http\Requests\ShareLinkRequest;
use App\Http\Resources\ReportResource;
use App\Models\DailyReport;
use App\Models\ShareLink;
use App\Services\Audit;
use Illuminate\Support\Facades\DB;

class ShareLinkController extends Controller
{
    public function index()
    {
        return ShareLink::orderByDesc('id')->paginate(25);
    }

    public function store(ShareLinkRequest $r)
    {
        return DB::transaction(function () use ($r) {
            $token = bin2hex(random_bytes(32));
            $link = ShareLink::create($r->validated() + ['token_hash' => hash('sha256', $token), 'created_by' => $r->user()->id]);
            Audit::record('Created share link', $link);

            return response()->json(['data' => $link, 'token' => $token, 'path' => '/report/share/'.$token], 201);
        });
    }

    public function destroy(ShareLink $shareLink)
    {
        return DB::transaction(function () use ($shareLink) {
            $old = $shareLink->toArray();
            $shareLink->update(['revoked_at' => now()]);
            Audit::record('Revoked share link', $shareLink, $old);

            return response()->noContent();
        });
    }

    public function regenerate(ShareLink $shareLink)
    {
        return DB::transaction(function () use ($shareLink) {
            $token = bin2hex(random_bytes(32));
            $old = $shareLink->toArray();
            $shareLink->update(['token_hash' => hash('sha256', $token), 'revoked_at' => null]);
            Audit::record('Regenerated share link', $shareLink, $old);

            return ['data' => $shareLink, 'token' => $token, 'path' => '/report/share/'.$token];
        });
    }

    public function show(string $token)
    {
        abort_unless(preg_match('/^[a-f0-9]{64}$/', $token), 404);
        ShareLink::where('token_hash', hash('sha256', $token))->whereNull('revoked_at')->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))->firstOrFail();
        $report = DailyReport::published()->whereDate('report_date', '<=', today())->orderByDesc('report_date')->with('items.status')->first();
        // No accounts, driver contact information, audit history or administrative data in public responses.
        $data = $report ? (new ReportResource($report))->resolve() : null;
        if ($data) {
            unset($data['created_by'],$data['notes']);
        }

        return response()->json(['today' => today()->toDateString(), 'report' => $data])->header('Cache-Control', 'no-store, private')->header('Referrer-Policy','no-referrer');
    }
}
