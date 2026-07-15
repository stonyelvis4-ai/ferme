<?php

namespace App\Services;

use App\Models\FinancialTransaction;

class FinanceService
{
    public function __construct(private readonly AuditService $auditService)
    {
    }

    public function createTransaction(array $data): FinancialTransaction
    {
        $transaction = FinancialTransaction::create($data);

        $this->auditService->record([
            'farm_id' => $transaction->farm_id,
            'user_id' => request()->user()?->id,
            'module' => 'finances',
            'entity_type' => 'transaction',
            'entity_id' => (string) $transaction->id,
            'action' => 'transaction_created',
            'source' => 'web',
        ]);

        return $transaction;
    }
}

