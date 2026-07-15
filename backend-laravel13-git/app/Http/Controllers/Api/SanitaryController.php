<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sanitary\UpdateSanitaryTreatmentRequest;
use App\Models\SanitaryTreatment;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SanitaryController extends Controller
{
    public function __construct(private readonly AuditService $auditService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'data' => SanitaryTreatment::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->with(['layerBatch', 'product'])
                ->latest('planned_date')
                ->get(),
        ]);
    }

    public function update(UpdateSanitaryTreatmentRequest $request, SanitaryTreatment $sanitaryTreatment): JsonResponse
    {
        $before = $sanitaryTreatment->only(['status', 'planned_date', 'dosage', 'quantity_used', 'cost']);

        $sanitaryTreatment->fill($request->validated());
        $sanitaryTreatment->save();

        $this->auditService->record([
            'farm_id' => $sanitaryTreatment->farm_id,
            'user_id' => $request->user()?->id,
            'module' => 'sanitary',
            'entity_type' => 'sanitary_treatment',
            'entity_id' => (string) $sanitaryTreatment->id,
            'action' => 'sanitary_treatment_updated',
            'old_value' => json_encode($before, JSON_UNESCAPED_UNICODE),
            'new_value' => json_encode($sanitaryTreatment->only(['status', 'planned_date', 'dosage', 'quantity_used', 'cost']), JSON_UNESCAPED_UNICODE),
            'source' => 'web',
        ]);

        return response()->json([
            'data' => $sanitaryTreatment->load(['layerBatch', 'product']),
        ]);
    }
}
