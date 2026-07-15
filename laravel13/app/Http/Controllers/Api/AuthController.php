<?php

namespace App\Http\Controllers\Api;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterAdminRequest;
use App\Models\User;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Http\Request;

class AuthController extends Controller
{
    public function __construct(private readonly AuditService $auditService)
    {
    }

    public function registerAdmin(RegisterAdminRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => Role::Admin,
            'is_active' => true,
        ]);

        $this->auditService->record([
            'farm_id' => null,
            'user_id' => $user->id,
            'module' => 'auth',
            'entity_type' => 'user',
            'entity_id' => (string) $user->id,
            'action' => 'admin_registered',
            'source' => 'web',
        ]);

        return response()->json([
            'message' => 'Administrator account created.',
            'user' => $user,
        ], 201);
    }

    public function login(LoginRequest $request): JsonResponse
    {
        $data = $request->validated();

        if (! Auth::attempt($data)) {
            return response()->json(['message' => 'Invalid credentials.'], 422);
        }

        /** @var User $user */
        $user = Auth::user();
        $token = $user->createToken('ferm-plus')->plainTextToken;

        $user->forceFill([
            'last_login_at' => now(),
            'last_activity_at' => now(),
        ])->save();

        $this->auditService->record([
            'farm_id' => $user->farm_id,
            'user_id' => $user->id,
            'module' => 'auth',
            'entity_type' => 'session',
            'entity_id' => (string) $user->id,
            'action' => 'user_logged_in',
            'source' => 'web',
        ]);

        return response()->json([
            'message' => 'Logged in successfully.',
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out successfully.']);
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || ! Hash::check($request->validated('current_password'), $user->password)) {
            return response()->json(['message' => 'Current password is invalid.'], 422);
        }

        $user->forceFill([
            'password' => Hash::make($request->validated('password')),
        ])->save();

        $this->auditService->record([
            'farm_id' => $user->farm_id,
            'user_id' => $user->id,
            'module' => 'auth',
            'entity_type' => 'user',
            'entity_id' => (string) $user->id,
            'action' => 'password_changed',
            'source' => 'web',
        ]);

        return response()->json(['message' => 'Password updated successfully.']);
    }
}
