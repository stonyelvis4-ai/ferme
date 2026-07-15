<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Owner\StoreOwnerRequest;
use App\Http\Requests\Owner\UpdateOwnerRequest;
use App\Models\Farm;
use App\Models\User;
use App\Services\AuditService;
use App\Services\FarmService;
use Illuminate\Http\JsonResponse;

class OwnerController extends Controller
{
    public function __construct(
        private readonly FarmService $farmService,
        private readonly AuditService $auditService
    ) {
    }

    public function store(StoreOwnerRequest $request, Farm $farm): JsonResponse
    {
        $owner = $this->farmService->createOwner($farm, $request->validated());

        $this->auditService->record([
            'farm_id' => $farm->id,
            'user_id' => $request->user()?->id,
            'module' => 'users',
            'entity_type' => 'owner',
            'entity_id' => (string) $owner->id,
            'action' => 'owner_created',
            'source' => 'web',
        ]);

        return response()->json(['data' => $owner], 201);
    }

    public function update(UpdateOwnerRequest $request, User $owner): JsonResponse
    {
        $data = $request->validated();

        $owner->fill([
            'name' => $data['name'] ?? $owner->name,
            'email' => $data['email'] ?? $owner->email,
            'is_active' => $data['is_active'] ?? $owner->is_active,
        ]);

        if (! empty($data['password'])) {
            $owner->password = bcrypt($data['password']);
        }

        $owner->save();

        $this->auditService->record([
            'farm_id' => $owner->farm_id,
            'user_id' => $request->user()?->id,
            'module' => 'users',
            'entity_type' => 'owner',
            'entity_id' => (string) $owner->id,
            'action' => 'owner_updated',
            'source' => 'web',
        ]);

        return response()->json(['data' => $owner]);
    }
}

