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
        return \Illuminate\Support\Facades\DB::transaction(function () use ($data) {
            // Serialize financial operations within a farm, including duplicate checks.
            \App\Models\Farm::whereKey($data['farm_id'])->lockForUpdate()->firstOrFail();
            return $this->createTransactionLocked($data);
        }, 3);
    }

    private function createTransactionLocked(array $data): FinancialTransaction
    {
        $operationId = trim((string) ($data['operation_id'] ?? ''));
        $data['operation_id'] = $operationId === '' ? null : $operationId;
        if ($operationId !== '') {
            $existing = FinancialTransaction::query()
                ->where('farm_id', $data['farm_id'] ?? null)
                ->where('operation_id', $operationId)
                ->where('source_module', $data['source_module'] ?? null)
                ->where('source_entity_type', $data['source_entity_type'] ?? null)
                ->first();

            if ($existing) {
                if ($existing->type !== $data['type'] || (float) $existing->amount !== (float) $data['amount']
                    || (string) $existing->category !== (string) ($data['category'] ?? '')
                    || (string) $existing->source_entity_id !== (string) ($data['source_entity_id'] ?? '')) {
                    throw \Illuminate\Validation\ValidationException::withMessages(['operation_id' => 'Operation deja utilisee avec un contenu different.']);
                }
                return $existing;
            }
        }

        $transaction = FinancialTransaction::create([
            ...$data,
            'idempotency_key' => $operationId === '' ? null : hash('sha256', json_encode([(int) $data['farm_id'], $data['source_module'] ?? null, $data['source_entity_type'] ?? null, $operationId])),
        ]);

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
