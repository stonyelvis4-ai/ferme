<?php

namespace App\Services;

use App\Models\Farm;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Executes the deliberately small, safe subset of offline commands.
 *
 * New commands must be added here explicitly.  This class must never dispatch
 * arbitrary user-provided paths back into Laravel's router.
 */
class SyncOperationService
{
    private const ALLOWED_COMMANDS = [
        'POST /api/v1/tasks',
    ];

    public function __construct(
        private readonly TaskService $taskService,
        private readonly AuditService $auditService,
    ) {
    }

    public function execute(User $user, array $operation): array
    {
        $method = strtoupper($operation['method']);
        $path = $operation['path'];
        $command = "$method $path";

        if (! in_array($command, self::ALLOWED_COMMANDS, true)) {
            return $this->failure($operation['operation_id'], 422, 'Commande de synchronisation non prise en charge.');
        }

        if (($operation['dependencies'] ?? []) !== []) {
            return $this->failure($operation['operation_id'], 422, 'Les dépendances ne sont pas encore prises en charge.');
        }

        $fingerprint = hash('sha256', json_encode([$method, $path, $operation['payload'], $operation['dependencies'] ?? []]));
        $scope = hash('sha256', json_encode([$user->farm_id, $user->id, 'sync-operation', $operation['operation_id']]));

        return DB::transaction(function () use ($user, $operation, $scope, $fingerprint) {
            Farm::whereKey($user->farm_id)->lockForUpdate()->firstOrFail();
            $existing = DB::table('api_idempotency')->where('scope', $scope)->first();

            if ($existing) {
                if (! hash_equals($existing->fingerprint, $fingerprint)) {
                    return $this->failure($operation['operation_id'], 409, 'Identifiant d’opération déjà utilisé avec un contenu différent.');
                }

                return array_merge(json_decode($existing->body, true, 512, JSON_THROW_ON_ERROR), ['replayed' => true]);
            }

            try {
                $payload = $this->validatedTaskPayload($user, $operation['payload']);
                $task = $this->taskService->create($payload);
                $this->auditService->record([
                    'farm_id' => $task->farm_id,
                    'user_id' => $user->id,
                    'module' => 'tasks',
                    'entity_type' => 'task',
                    'entity_id' => (string) $task->id,
                    'action' => 'task_created',
                    'source' => 'sync',
                ]);
                $result = [
                    'operation_id' => $operation['operation_id'],
                    'status' => 201,
                    'success' => true,
                    'data' => $task->toArray(),
                    'replayed' => false,
                ];
            } catch (ValidationException $exception) {
                $result = [
                    'operation_id' => $operation['operation_id'],
                    'status' => 422,
                    'success' => false,
                    'errors' => $exception->errors(),
                    'replayed' => false,
                ];
            }

            // Persist both successes and validation failures: retries must be deterministic.
            DB::table('api_idempotency')->insert([
                'scope' => $scope,
                'farm_id' => $user->farm_id,
                'fingerprint' => $fingerprint,
                'status' => $result['status'],
                'body' => json_encode($result, JSON_THROW_ON_ERROR),
                'created_at' => now(),
            ]);

            return $result;
        }, 3);
    }

    private function validatedTaskPayload(User $user, array $payload): array
    {
        // The authenticated farm is authoritative; clients can never choose it.
        $payload['farm_id'] = $user->farm_id;

        return Validator::make($payload, [
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'source_module' => ['nullable', 'string', 'max:255'],
            'source_entity_type' => ['nullable', 'string', 'max:255'],
            'source_entity_id' => ['nullable', 'string', 'max:255'],
            'start_at' => ['nullable', 'date', 'before_or_equal:due_at'],
            'priority' => ['required', Rule::in(['low', 'normal', 'high', 'critical'])],
            'status' => ['required', Rule::in(['todo', 'in_progress', 'completed', 'overdue', 'cancelled'])],
            'due_at' => ['nullable', 'date'],
            'reminder_at' => ['nullable', 'date'],
            'assigned_to' => ['nullable', 'integer', Rule::exists('users', 'id')->where(fn ($query) => $query->where('farm_id', $user->farm_id))],
        ])->validate();
    }

    private function failure(string $operationId, int $status, string $message): array
    {
        return ['operation_id' => $operationId, 'status' => $status, 'success' => false, 'error' => $message, 'replayed' => false];
    }
}
