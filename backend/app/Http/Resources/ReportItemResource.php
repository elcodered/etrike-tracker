<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;

class ReportItemResource extends JsonResource
{
    public function toArray($request): array
    {
        return ['id' => $this->id, 'etrike_id' => $this->etrike_id, 'plate_number' => $this->plate_number, 'driver_id' => $this->driver_id, 'driver_name' => $this->driver_name, 'status_id' => $this->status_id, 'operational_status' => $this->status->code, 'status_name' => $this->status->name, 'rental_amount' => (float) $this->rental_amount, 'remarks' => $this->remarks, 'updated_at' => $this->updated_at?->toIso8601String(), 'report_date' => $this->whenLoaded('report', fn () => $this->report->report_date->toDateString())];
    }
}
