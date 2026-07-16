<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\AssignUserFarmsRequest;
use App\Http\Requests\User\ResetUserPasswordRequest;
use App\Http\Requests\User\UpdateUserStatusRequest;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function __construct(private readonly AuditService $auditService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        return response()->json([
            'data' => User::query()
                ->when($farmId, fn ($q) => $q->where('farm_id', $farmId))
                ->with(['assignedFarms:id,name', 'loginHistories' => fn ($q) => $q->latest()])
                ->latest()
                ->get(),
        ]);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json([
            'data' => $user->load(['assignedFarms:id,name', 'loginHistories' => fn ($q) => $q->latest()]),
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email'],
            'is_active' => ['sometimes', 'boolean'],
            'account_status' => ['sometimes', 'in:active,disabled,pending'],
            'role' => ['sometimes', 'in:admin,owner'],
        ]);

        $user->fill($data)->save();

        $this->auditService->record([
            'farm_id' => $user->farm_id,
            'user_id' => $request->user()?->id,
            'module' => 'users',
            'entity_type' => 'user',
            'entity_id' => (string) $user->id,
            'action' => 'user_updated',
            'source' => 'web',
        ]);

        return response()->json(['data' => $user]);
    }

    public function assignFarms(AssignUserFarmsRequest $request, User $user): JsonResponse
    {
        $farmIds = $request->validated('farm_ids');
        $farmId = (int) $farmIds[0];
        $user->assignedFarms()->sync([$farmId]);
        $user->forceFill(['farm_id' => $farmId])->save();

        $this->auditService->record([
            'farm_id' => $farmId,
            'user_id' => $request->user()?->id,
            'module' => 'users',
            'entity_type' => 'user',
            'entity_id' => (string) $user->id,
            'action' => 'farm_assigned',
            'new_value' => json_encode(['farm_id' => $farmId]),
            'source' => 'web',
        ]);

        return response()->json([
            'data' => $user->load('assignedFarms:id,name'),
        ]);
    }

    public function resetPassword(ResetUserPasswordRequest $request, User $user): JsonResponse
    {
        $user->forceFill([
            'password' => Hash::make($request->validated('password')),
        ])->save();

        $this->auditService->record([
            'farm_id' => $user->farm_id,
            'user_id' => $request->user()?->id,
            'module' => 'users',
            'entity_type' => 'user',
            'entity_id' => (string) $user->id,
            'action' => 'password_reset',
            'source' => 'web',
        ]);

        return response()->json(['message' => 'Password reset successfully.']);
    }

    public function updateStatus(UpdateUserStatusRequest $request, User $user): JsonResponse
    {
        $data = $request->validated();
        $user->forceFill([
            'account_status' => $data['account_status'],
            'is_active' => $data['is_active'] ?? ($data['account_status'] === 'active'),
        ])->save();

        $this->auditService->record([
            'farm_id' => $user->farm_id,
            'user_id' => $request->user()?->id,
            'module' => 'users',
            'entity_type' => 'user',
            'entity_id' => (string) $user->id,
            'action' => 'status_updated',
            'new_value' => json_encode(['account_status' => $user->account_status, 'is_active' => $user->is_active]),
            'source' => 'web',
        ]);

        return response()->json(['data' => $user]);
    }

    public function destroy(Request $request, User $user): JsonResponse
    {
        $user->update(['is_active' => false, 'account_status' => 'disabled']);

        $this->auditService->record([
            'farm_id' => $user->farm_id,
            'user_id' => $request->user()?->id,
            'module' => 'users',
            'entity_type' => 'user',
            'entity_id' => (string) $user->id,
            'action' => 'user_deactivated',
            'source' => 'web',
        ]);

        return response()->json(['message' => 'User deactivated.']);
    }
}
