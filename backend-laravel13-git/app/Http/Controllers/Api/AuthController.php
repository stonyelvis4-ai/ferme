<?php

namespace App\Http\Controllers\Api;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Requests\Auth\RegisterAdminRequest;
use App\Models\User;
use App\Models\UserLoginHistory;
use App\Services\AuditService;
use App\Services\FarmService;
use Illuminate\Contracts\Cookie\QueueingFactory as CookieFactory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Symfony\Component\HttpFoundation\Cookie;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuditService $auditService,
        private readonly FarmService $farmService,
        private readonly CookieFactory $cookies
    ) {
    }

    public function registerAdmin(RegisterAdminRequest $request): JsonResponse
    {
        $data = $request->validated();

        $user = DB::transaction(function () use ($data) {
            $existingAdmin = User::query()
                ->where('role', Role::Admin)
                ->lockForUpdate()
                ->exists();

            if ($existingAdmin) {
                abort(response()->json([
                    'message' => 'L’inscription administrateur est verrouillée. Connectez-vous avec un compte existant.',
                ], 403));
            }

            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role' => Role::Admin,
                'account_status' => 'active',
                'is_active' => true,
            ]);

            $this->farmService->createForAdministrator($user, [
                'name' => 'FERM+',
                'slug' => 'ferm-plus',
                'manager_name' => $user->name,
                'contact_email' => $user->email,
                'currency' => 'FCFA',
                'area_unit' => 'ha',
            ]);

            $user->refresh();

            $this->auditService->record([
                'farm_id' => $user->farm_id,
                'user_id' => $user->id,
                'module' => 'auth',
                'entity_type' => 'user',
                'entity_id' => (string) $user->id,
                'action' => 'admin_registered',
                'source' => 'web',
            ]);

            return $user;
        });

        $token = $user->createToken('ferm-plus')->plainTextToken;

        return response()
            ->json([
                'message' => 'Compte administrateur créé.',
                'token' => 'cookie-session',
                'user' => $user,
            ], 201)
            ->cookie($this->makeApiTokenCookie($token));
    }

    public function login(LoginRequest $request): JsonResponse
    {
        if (User::count() === 0) {
            return response()->json([
                'message' => 'Aucun administrateur n’existe encore. Créez d’abord le premier compte depuis "Inscription admin".',
            ], 409);
        }

        $data = $request->validated();

        if (! Auth::attempt($data)) {
            return response()->json(['message' => 'Email ou mot de passe invalide.'], 422);
        }

        $user = Auth::user();

        if (! $user || $user->account_status !== 'active' || ! $user->is_active) {
            Auth::logout();

            return response()->json(['message' => 'Compte désactivé ou en attente.'], 403);
        }

        $token = $user->createToken('ferm-plus')->plainTextToken;

        $user->forceFill([
            'last_login_at' => now(),
            'last_activity_at' => now(),
        ])->save();

        UserLoginHistory::create([
            'user_id' => $user->id,
            'farm_id' => $user->farm_id,
            'logged_in_at' => now(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
            'source' => 'web',
        ]);

        $this->auditService->record([
            'farm_id' => $user->farm_id,
            'user_id' => $user->id,
            'module' => 'auth',
            'entity_type' => 'session',
            'entity_id' => (string) $user->id,
            'action' => 'user_logged_in',
            'source' => 'web',
        ]);

        return response()
            ->json([
                'message' => 'Connexion réussie.',
                'token' => 'cookie-session',
                'user' => $user,
            ])
            ->cookie($this->makeApiTokenCookie($token));
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()
            ->json(['message' => 'Déconnexion réussie.'])
            ->withoutCookie(
                $this->apiTokenCookieName(),
                config('session.path', '/'),
                config('session.domain')
            );
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! $user || ! Hash::check($request->validated('current_password'), $user->password)) {
            return response()->json(['message' => 'Le mot de passe actuel est invalide.'], 422);
        }

        $user->forceFill([
            'password' => Hash::make($request->validated('password')),
        ])->save();

        // Invalidate every existing token so no old session survives the rotation.
        $user->tokens()->delete();

        $this->auditService->record([
            'farm_id' => $user->farm_id,
            'user_id' => $user->id,
            'module' => 'auth',
            'entity_type' => 'user',
            'entity_id' => (string) $user->id,
            'action' => 'password_changed',
            'source' => 'web',
        ]);

        return response()
            ->json(['message' => 'Mot de passe mis à jour avec succès.'])
            ->withoutCookie(
                $this->apiTokenCookieName(),
                config('session.path', '/'),
                config('session.domain')
            );
    }

    private function makeApiTokenCookie(string $token): Cookie
    {
        return $this->cookies->make(
            $this->apiTokenCookieName(),
            $token,
            (int) config('session.lifetime', 120),
            config('session.path', '/'),
            config('session.domain'),
            (bool) config('session.secure', false),
            true,
            false,
            (string) config('session.api_token_cookie_same_site', config('session.same_site', 'lax'))
        );
    }

    private function apiTokenCookieName(): string
    {
        return (string) config('session.api_token_cookie', 'fermplus_api_token');
    }
}
