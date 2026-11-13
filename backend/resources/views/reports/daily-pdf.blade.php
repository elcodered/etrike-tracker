<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>E-Trike Daily Report — {{ $report->report_date->format('F j, Y') }}</title>
    <style>
        @page { margin: 28px 30px 45px; }
        body { font-family: 'DejaVu Sans', sans-serif; font-size: 9px; color: #293c30; line-height: 1.4; }
        .organization { color: #216548; font-size: 10px; font-weight: bold; }
        h1 { font-size: 21px; margin: 5px 0; }
        .date { font-size: 12px; margin: 0 0 8px; }
        .metadata { color: #58695b; font-size: 8px; margin: 0 0 13px; }
        .state { text-transform: uppercase; font-weight: bold; }
        .draft { color: #966615; border: 1px solid #d4b16b; padding: 7px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; table-layout: fixed; }
        .summary { margin-bottom: 14px; background: #eff5ed; }
        .summary td { padding: 8px 10px; border: 1px solid #d9e4d5; font-size: 8px; }
        .summary strong { font-size: 13px; display: block; }
        .items thead { display: table-header-group; }
        .items th { background: #235d43; color: #fff; font-size: 8px; text-align: left; padding: 7px; }
        .items td { border-bottom: 1px solid #dfe7db; padding: 6px 7px; vertical-align: top; word-wrap: break-word; }
        .items tr { page-break-inside: avoid; }
        .items tr:nth-child(even) td { background: #f7f9f5; }
        .money { text-align: right !important; white-space: nowrap; }
        .remarks { white-space: pre-wrap; }
        .total { text-align: right; margin-top: 12px; font-size: 13px; font-weight: bold; page-break-inside: avoid; }
        h2 { font-size: 11px; margin: 17px 0 5px; page-break-after: avoid; }
        .notes { white-space: pre-wrap; word-wrap: break-word; }
        .footer { position: fixed; bottom: -24px; left: 0; font-size: 7px; color: #64745f; }
    </style>
</head>
<body>
    <div class="footer">E-Trike Rent &amp; Status Tracking System · Generated {{ $generatedAt->format('M j, Y g:i A') }} · Asia/Manila</div>
    <div class="organization">{{ $organization }}</div>
    <h1>E-Trike Daily Report</h1>
    <div class="date">{{ $report->report_date->format('l, F j, Y') }}</div>
    <div class="metadata">
        Status: <span class="state">{{ $report->status }}</span>
        · Prepared by: {{ $report->creator?->name ?? '—' }}
        · Version: {{ $report->version }}
        @if ($report->submitted_at && $report->status !== 'draft')
            · Submitted: {{ $report->submitted_at->timezone('Asia/Manila')->format('M j, Y g:i A') }}
        @endif
    </div>
    @if ($report->status === 'draft')
        <div class="draft">DRAFT — Saved working report. This report has not been submitted.</div>
    @endif
    <table class="summary">
        <tr>
            <td>Total units<strong>{{ $summary['total_units'] }}</strong></td>
            <td>Running<strong>{{ $summary['running'] }}</strong></td>
            <td>Half day<strong>{{ $summary['half_day'] }}</strong></td>
            <td>Under repair<strong>{{ $summary['repair'] }}</strong></td>
            <td>Standby<strong>{{ $summary['standby'] }}</strong></td>
            <td>No driver<strong>{{ $summary['no_driver'] }}</strong></td>
            <td style="width: 16%">Rental collected<strong>₱{{ number_format($summary['rental_total'], 2) }}</strong></td>
        </tr>
    </table>
    <table class="items">
        <thead>
            <tr>
                <th style="width: 3%">#</th>
                <th style="width: 10%">Plate number</th>
                <th style="width: 15%">Driver</th>
                <th style="width: 18%">Operational status</th>
                <th class="money" style="width: 11%">Rental</th>
                <th style="width: 29%">Remarks</th>
                <th style="width: 14%">Last updated</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($report->items as $item)
                <tr>
                    <td>{{ $loop->iteration }}</td>
                    <td><strong>{{ $item->plate_number }}</strong></td>
                    <td>{{ $item->driver_name ?? 'No driver assigned' }}</td>
                    <td>{{ $item->status->name }}</td>
                    <td class="money">₱{{ number_format((float) $item->rental_amount, 2) }}</td>
                    <td class="remarks">{{ $item->remarks ?: '—' }}</td>
                    <td>{{ $item->updated_at?->timezone('Asia/Manila')->format('M j, Y g:i A') }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>
    <div class="total">Total Rental: ₱{{ number_format($summary['rental_total'], 2) }}</div>
    @if ($report->notes)
        <h2>Report notes</h2>
        <div class="notes">{{ $report->notes }}</div>
    @endif
</body>
</html>
