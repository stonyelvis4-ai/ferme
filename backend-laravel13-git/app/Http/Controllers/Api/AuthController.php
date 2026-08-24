<?php

namespace App\Http\Controllers\Api;

use App\Enums\Role;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\ChangePasswordRequest;
use App\Http\Requests\Auth\GoogleAuthRequest;
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
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
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
                'message' => 'Compte administrateur cree.',
                'user' => $user,
            ], 201)
            ->cookie($this->makeApiTokenCookie($token));
    }

    public function login(LoginRequest $request): JsonResponse
    {
        if (User::count() === 0) {
            return response()->json([
                'message' => 'Aucun administrateur n existe encore. Creez un compte depuis "Inscription admin".',
            ], 409);
        }

        $data = $request->validated();

        if (! Auth::attempt($data)) {
            return response()->json(['message' => 'Email ou mot de passe invalide.'], 422);
        }

        $user = Auth::user();

        if (! $user) {
            return response()->json(['message' => 'Compte introuvable.'], 404);
        }

        return $this->issueAuthenticatedResponse($user, $request, 'web', 'Connexion reussie.');
    }

    public function google(GoogleAuthRequest $request): JsonResponse
    {
        $clientId = (string) config('services.google.client_id', '');
        if ($clientId === '') {
            return response()->json([
                'message' => 'La connexion Google n est pas encore configuree sur le serveur.',
            ], 503);
        }

        $googleProfile = $this->fetchGoogleProfile($request->validated('credential'));
        $intent = (string) ($request->validated('intent') ?? 'login');
        $googleId = (string) ($googleProfile['sub'] ?? '');
        $email = strtolower((string) ($googleProfile['email'] ?? ''));
        $name = trim((string) ($googleProfile['name'] ?? ''));
        $avatarUrl = (string) ($googleProfile['picture'] ?? '');
        $emailVerified = filter_var($googleProfile['email_verified'] ?? false, FILTER_VALIDATE_BOOL);
        $issuer = trim((string) ($googleProfile['iss'] ?? ''));
        $expiresAt = (int) ($googleProfile['exp'] ?? 0);
        $authorizedParty = trim((string) ($googleProfile['azp'] ?? ''));

        if (
            $googleId === ''
            || $email === ''
            || ! $emailVerified
            || ! in_array($issuer, ['accounts.google.com', 'https://accounts.google.com'], true)
            || $expiresAt <= now()->timestamp
        ) {
            return response()->json([
                'message' => 'Le compte Google fourni ne peut pas etre valide.',
            ], 422);
        }

        if (($googleProfile['aud'] ?? null) !== $clientId || ($authorizedParty !== '' && $authorizedParty !== $clientId)) {
            return response()->json([
                'message' => 'Ce compte Google ne correspond pas a l application configuree.',
            ], 422);
        }

        $allowedHostedDomain = trim((string) config('services.google.allowed_hosted_domain', ''));
        $hostedDomain = trim((string) ($googleProfile['hd'] ?? ''));
        if ($allowedHostedDomain !== '' && strcasecmp($allowedHostedDomain, $hostedDomain) !== 0) {
            return response()->json([
                'message' => 'Ce domaine Google n est pas autorise pour FERM+.',
            ], 403);
        }

        $user = DB::transaction(function () use ($email, $name, $googleId, $avatarUrl, $emailVerified, $intent) {
            $user = User::query()
                ->where('google_id', $googleId)
                ->orWhere('email', $email)
                ->lockForUpdate()
                ->first();

            if ($user) {
                $user->forceFill([
                    'name' => $name !== '' ? $name : $user->name,
                    'google_id' => $googleId,
                    'avatar_url' => $avatarUrl !== '' ? $avatarUrl : $user->avatar_url,
                    'email_verified_at' => $emailVerified ? ($user->email_verified_at ?? now()) : $user->email_verified_at,
                ])->save();

                return $user->refresh();
            }

            $shouldCreateAdmin = $intent === 'register' || User::count() === 0;

            if (! $shouldCreateAdmin) {
                abort(response()->json([
                    'message' => "Aucun compte FERM+ n est encore rattache a cette adresse Google. Passez par l inscription administrateur Google ou demandez a un administrateur de vous creer un acces.",
                ], 403));
            }

            $admin = User::create([
                'name' => $name !== '' ? $name : 'Administrateur FERM+',
                'email' => $email,
                'google_id' => $googleId,
                'avatar_url' => $avatarUrl !== '' ? $avatarUrl : null,
                'email_verified_at' => now(),
                // Google ne partage jamais le mot de passe de l'utilisateur avec FERM+.
                // Un mot de passe local technique est donc genere, puis pourra etre remplace si besoin.
                'password' => Hash::make(Str::random(40)),
                'role' => Role::Admin,
                'account_status' => 'active',
                'is_active' => true,
            ]);

            $this->farmService->createForAdministrator($admin, [
                'name' => 'FERM+',
                'slug' => 'ferm-plus',
                'manager_name' => $admin->name,
                'contact_email' => $admin->email,
                'currency' => 'FCFA',
                'area_unit' => 'ha',
            ]);

            $admin->refresh();

            $this->auditService->record([
                'farm_id' => $admin->farm_id,
                'user_id' => $admin->id,
                'module' => 'auth',
                'entity_type' => 'user',
                'entity_id' => (string) $admin->id,
                'action' => 'admin_registered_google',
                'source' => 'google',
            ]);

            return $admin;
        });

        return $this->issueAuthenticatedResponse($user, $request, 'google', 'Connexion Google reussie.');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()
            ->json(['message' => 'Deconnexion reussie.'])
            ->withoutCookie(
                $this->apiTokenCookieName(),
                config('session.path', '/'),
                config('session.domain')
            );
    }

    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();
        $currentPassword = (string) $request->validated('current_password', '');

        if (! $user) {
            return response()->json(['message' => 'Compte introuvable.'], 404);
        }

        $requiresCurrentPassword = blank($user->google_id) || $currentPassword !== '';

        if ($requiresCurrentPassword && ! Hash::check($currentPassword, $user->password)) {
            return response()->json(['message' => 'Le mot de passe actuel est invalide.'], 422);
        }

        $user->forceFill([
            'password' => Hash::make($request->validated('password')),
        ])->save();

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
            ->json(['message' => 'Mot de passe mis a jour avec succes.'])
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

    private function issueAuthenticatedResponse(User $user, Request $request, string $source, string $message): JsonResponse
    {
        if ($user->account_status !== 'active' || ! $user->is_active) {
            Auth::logout();

            return response()->json(['message' => 'Compte desactive ou en attente.'], 403);
        }

        $token = $user->createToken(
            'ferm-plus',
            ['*'],
            now()->addMinutes((int) env('SANCTUM_EXPIRATION', config('session.lifetime', 120)))
        )->plainTextToken;

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
            'source' => $source,
        ]);

        $this->auditService->record([
            'farm_id' => $user->farm_id,
            'user_id' => $user->id,
            'module' => 'auth',
            'entity_type' => 'session',
            'entity_id' => (string) $user->id,
            'action' => $source === 'google' ? 'user_logged_in_google' : 'user_logged_in',
            'source' => $source,
        ]);

        return response()
            ->json([
                'message' => $message,
                'user' => $user,
            ])
            ->cookie($this->makeApiTokenCookie($token));
    }

    /**
     * @return array<string, mixed>
     */
    private function fetchGoogleProfile(string $credential): array
    {
        $response = Http::acceptJson()
            ->timeout(10)
            ->get('https://oauth2.googleapis.com/tokeninfo', [
                'id_token' => $credential,
            ]);

        if ($response->failed()) {
            abort(response()->json([
                'message' => 'Impossible de verifier le compte Google pour le moment.',
            ], 502));
        }

        return $response->json() ?? [];
    }
}
