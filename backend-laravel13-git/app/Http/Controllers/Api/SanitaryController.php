<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Sanitary\StoreSanitaryTreatmentRequest;
use App\Http\Requests\Sanitary\UpdateSanitaryTreatmentRequest;
use App\Models\SanitaryTreatment;
use App\Services\AuditService;
use App\Services\FinanceService;
use App\Services\StockService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SanitaryController extends Controller
{
    public function __construct(private readonly AuditService $auditService)
    {
    }

    public function store(StoreSanitaryTreatmentRequest $request, StockService $stockService, FinanceService $financeService): JsonResponse
    {
        $treatment = DB::transaction(function () use ($request, $stockService, $financeService): SanitaryTreatment {
            $treatment = SanitaryTreatment::create($request->validated());

            if ($treatment->status === 'completed') {
                $this->recordCompletion($treatment, $stockService, $financeService);
            }

            return $treatment->fresh(['layerBatch', 'product', 'stockMovement', 'financialTransaction']);
        });

        return response()->json(['data' => $treatment], 201);
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

        $sanitaryTreatment = DB::transaction(function () use ($request, $sanitaryTreatment): SanitaryTreatment {
            $sanitaryTreatment->fill($request->validated());
            $sanitaryTreatment->save();

            if ($sanitaryTreatment->status === 'completed' && ! $sanitaryTreatment->financial_transaction_id && ! $sanitaryTreatment->stock_movement_id) {
                $this->recordCompletion($sanitaryTreatment, app(StockService::class), app(FinanceService::class));
            }

            return $sanitaryTreatment->fresh();
        });

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
            'data' => $sanitaryTreatment->load(['layerBatch', 'product', 'stockMovement', 'financialTransaction']),
        ]);
    }

    private function recordCompletion(SanitaryTreatment $treatment, StockService $stockService, FinanceService $financeService): void
    {
        $product = $treatment->product;
        $quantity = (float) $treatment->quantity_used;

        if ($product && $quantity > 0) {
            $movement = $stockService->recordMovement([
                'farm_id' => $treatment->farm_id,
                'stock_item_id' => $product->id,
                'type' => 'out',
                'quantity' => $quantity,
                'unit_cost' => $product->unit_cost,
                'source_module' => 'sanitaire',
                'source_entity_type' => 'sanitary_treatment',
                'source_entity_id' => (string) $treatment->id,
                'operation_id' => 'sanitary-' . $treatment->id,
            ]);
            $treatment->stock_movement_id = $movement->id;
        }

        $cost = (float) $treatment->cost;
        if ($cost <= 0 && $product) {
            $cost = round($quantity * (float) $product->unit_cost, 2);
        }

        if ($cost > 0) {
            $transaction = $financeService->createTransaction([
                'farm_id' => $treatment->farm_id,
                'type' => 'expense',
                'amount' => $cost,
                'category' => 'Sanitaire',
                'description' => 'Traitement sanitaire : ' . $treatment->name,
                'source_module' => 'sanitaire',
                'source_entity_type' => 'sanitary_treatment',
                'source_entity_id' => (string) $treatment->id,
                'operation_id' => 'sanitary-' . $treatment->id,
                'occurred_at' => $treatment->planned_date,
            ]);
            $treatment->financial_transaction_id = $transaction->id;
        }

        $treatment->save();
    }
}
