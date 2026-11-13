<?php

namespace App\Http\Resources;

use App\Services\ReportService;
use Illuminate\Http\Resources\Json\JsonResource;

class ReportResource extends JsonResource
{
    public function toArray($request): array
    {
        return ['id' => $this->id, 'report_date' => $this->report_date->toDateString(), 'status' => $this->status, 'version' => $this->version, 'notes' => $this->notes, 'created_by' => $this->creator?->name, 'submitted_at' => $this->submitted_at?->toIso8601String(), 'updated_at' => $this->updated_at?->toIso8601String(), 'summary' => app(ReportService::class)->summary($this->resource), 'items' => ReportItemResource::collection($this->whenLoaded('items'))];
    }
}
