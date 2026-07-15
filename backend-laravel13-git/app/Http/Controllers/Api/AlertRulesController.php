<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AlertEvaluationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AlertRulesController extends Controller
{
    public function __construct(private readonly AlertEvaluationService $alertEvaluationService)
    {
    }

    public function evaluate(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        if (! $farmId) {
            return response()->json(['message' => 'Farm not found for current user.'], 422);
        }

        return response()->json([
            'data' => $this->alertEvaluationService->evaluateFarm($farmId),
        ]);
    }
}
