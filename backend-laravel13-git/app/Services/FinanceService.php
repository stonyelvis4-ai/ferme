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

    public function updateTransaction(FinancialTransaction $transaction, array $data): FinancialTransaction
    {
        $oldValue = $transaction->toArray();

        $transaction->fill($data);
        $transaction->save();

        $this->auditService->record([
            'farm_id' => $transaction->farm_id,
            'user_id' => request()->user()?->id,
            'module' => 'finances',
            'entity_type' => 'transaction',
            'entity_id' => (string) $transaction->id,
            'action' => 'transaction_updated',
            'old_value' => json_encode($oldValue),
            'new_value' => json_encode($transaction->toArray()),
            'source' => 'web',
        ]);

        return $transaction;
    }
}
