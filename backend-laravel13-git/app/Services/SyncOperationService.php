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
        'POST /api/v1/infrastructures/buildings',
        'POST /api/v1/stocks',
    ];

    public function __construct(
        private readonly TaskService $taskService,
        private readonly InfrastructureService $infrastructureService,
        private readonly StockService $stockService,
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

        return DB::transaction(function () use ($user, $operation, $command, $scope, $fingerprint) {
            Farm::whereKey($user->farm_id)->lockForUpdate()->firstOrFail();
            $existing = DB::table('api_idempotency')->where('scope', $scope)->first();

            if ($existing) {
                if (! hash_equals($existing->fingerprint, $fingerprint)) {
                    return $this->failure($operation['operation_id'], 409, 'Identifiant d’opération déjà utilisé avec un contenu différent.');
                }

                return array_merge(json_decode($existing->body, true, 512, JSON_THROW_ON_ERROR), ['replayed' => true]);
            }

            try {
                $entity = match ($command) {
                    'POST /api/v1/tasks' => $this->createTask($user, $operation['payload']),
                    'POST /api/v1/infrastructures/buildings' => $this->infrastructureService->createBuilding(
                        $this->validatedBuildingPayload($user, $operation['payload'])
                    ),
                    'POST /api/v1/stocks' => $this->stockService->createItem(
                        $this->validatedStockPayload($user, $operation['payload'])
                    ),
                };
                $result = [
                    'operation_id' => $operation['operation_id'],
                    'status' => 201,
                    'success' => true,
                    'data' => $entity->toArray(),
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

    private function createTask(User $user, array $payload): Task
    {
        $task = $this->taskService->create($this->validatedTaskPayload($user, $payload));
        $this->auditService->record([
            'farm_id' => $task->farm_id,
            'user_id' => $user->id,
            'module' => 'tasks',
            'entity_type' => 'task',
            'entity_id' => (string) $task->id,
            'action' => 'task_created',
            'source' => 'sync',
        ]);

        return $task;
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

    private function validatedBuildingPayload(User $user, array $payload): array
    {
        // Do not trust a queued farm identifier, even when it is a valid farm.
        $payload['farm_id'] = $user->farm_id;

        return Validator::make($payload, [
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', 'string', 'max:255'],
            'capacity' => ['sometimes', 'numeric', 'min:0'],
            'assigned_use' => ['sometimes', 'string', 'max:255'],
            'status' => ['sometimes', 'string', 'max:50'],
            'state' => ['sometimes', 'string', 'max:50'],
            'notes' => ['nullable', 'string'],
        ])->validate();
    }

    private function validatedStockPayload(User $user, array $payload): array
    {
        // StockService also derives this from the request user. Set it here so
        // the queued payload is explicit and cannot be repurposed by callers.
        $payload['farm_id'] = $user->farm_id;
        $payload['minimum_threshold'] = $payload['minimum_threshold'] ?? ($payload['minimum_stock'] ?? null);
        $payload['storage_location'] = $payload['storage_location'] ?? ($payload['location'] ?? null);
        $payload['purchase_total_cost'] = $payload['purchase_total_cost'] ?? ((float) ($payload['current_quantity'] ?? 0) * (float) ($payload['unit_cost'] ?? 0));
        $payload['currency'] = $payload['currency'] ?? 'XOF';
        $payload['is_active'] = array_key_exists('is_active', $payload) ? $payload['is_active'] : true;
        $payload['business_module'] = $payload['business_module'] ?? 'general';

        return Validator::make($payload, [
            'farm_id' => ['required', 'integer', 'exists:farms,id'],
            'reference' => ['nullable', 'string', 'max:255', Rule::unique('stock_items', 'reference')->where(fn ($query) => $query->where('farm_id', $user->farm_id))],
            'name' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'brand' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:255'],
            'category_id' => ['nullable', 'integer', Rule::exists('stock_categories', 'id')->where(fn ($query) => $query->where(fn ($subQuery) => $subQuery->whereNull('farm_id')->orWhere('farm_id', $user->farm_id)))],
            'supplier_id' => ['nullable', 'integer', Rule::exists('suppliers', 'id')->where(fn ($query) => $query->where('farm_id', $user->farm_id))],
            'batch_number' => ['nullable', 'string', 'max:255'],
            'purchase_date' => ['nullable', 'date'],
            'manufacturing_date' => ['nullable', 'date'],
            'expiration_date' => ['nullable', 'date', 'after_or_equal:manufacturing_date'],
            'unit' => ['required', 'string', 'max:50'],
            'minimum_threshold' => ['nullable', 'numeric', 'min:0'],
            'maximum_stock' => ['nullable', 'numeric', 'gte:minimum_threshold'],
            'current_quantity' => ['sometimes', 'numeric', 'min:0'],
            'unit_cost' => ['sometimes', 'numeric', 'min:0'],
            'purchase_total_cost' => ['sometimes', 'numeric', 'min:0'],
            'storage_location' => ['nullable', 'string', 'max:255'],
            'currency' => ['nullable', 'string', 'max:10'],
            'notes' => ['nullable', 'string'],
            'is_active' => ['sometimes', 'boolean'],
            'business_module' => ['sometimes', Rule::in(['livestock', 'aquaculture', 'crops', 'infrastructure', 'general'])],
            'related_type' => ['nullable', Rule::in(['layer_batch', 'fish_pond', 'fish_stocking', 'plot', 'crop', 'building', 'general'])],
            'related_id' => ['nullable', 'integer', 'min:1'],
        ])->validate();
    }

    private function failure(string $operationId, int $status, string $message): array
    {
        return ['operation_id' => $operationId, 'status' => $status, 'success' => false, 'error' => $message, 'replayed' => false];
    }
}
