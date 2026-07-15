<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Finance\StoreFinancialTransactionRequest;
use App\Models\FinancialTransaction;
use App\Services\FinanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FinanceController extends Controller
{
    public function __construct(private readonly FinanceService $financeService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'data' => FinancialTransaction::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->latest('occurred_at')
                ->latest()
                ->get(),
        ]);
    }

    public function store(StoreFinancialTransactionRequest $request): JsonResponse
    {
        $transaction = $this->financeService->createTransaction($request->validated());

        return response()->json(['data' => $transaction], 201);
    }

    public function show(FinancialTransaction $financialTransaction): JsonResponse
    {
        return response()->json(['data' => $financialTransaction]);
    }

    public function destroy(FinancialTransaction $financialTransaction): JsonResponse
    {
        $financialTransaction->delete();

        return response()->json(['message' => 'Transaction deleted.']);
    }
}

