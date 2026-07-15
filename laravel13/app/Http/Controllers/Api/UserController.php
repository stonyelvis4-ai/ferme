<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(private readonly AuditService $auditService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => User::query()->latest()->get(),
        ]);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email'],
            'is_active' => ['sometimes', 'boolean'],
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

    public function destroy(Request $request, User $user): JsonResponse
    {
        $user->update(['is_active' => false]);

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

