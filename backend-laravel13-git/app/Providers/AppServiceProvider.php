<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        RateLimiter::for('auth-register', function (Request $request) {
            return [
                Limit::perMinutes(15, 5)
                    ->by($request->ip())
                    ->response(fn (Request $request, array $headers) => $this->tooManyAttemptsResponse(
                        'Trop de tentatives de creation de compte. Reessayez dans quelques minutes.',
                        $headers
                    )),
                Limit::perDay(20)
                    ->by((string) $request->input('email', 'guest'))
                    ->response(fn (Request $request, array $headers) => $this->tooManyAttemptsResponse(
                        'Cette adresse email a atteint la limite quotidienne de creation de compte. Reessayez plus tard.',
                        $headers
                    )),
            ];
        });

        RateLimiter::for('auth-login', function (Request $request) {
            $email = (string) $request->input('email', '');

            return [
                Limit::perMinute(5)
                    ->by($request->ip().'|'.$email)
                    ->response(fn (Request $request, array $headers) => $this->tooManyAttemptsResponse(
                        'Trop de tentatives de connexion. Patientez un instant avant de recommencer.',
                        $headers
                    )),
                Limit::perMinute(20)
                    ->by($request->ip())
                    ->response(fn (Request $request, array $headers) => $this->tooManyAttemptsResponse(
                        'Trop de requetes de connexion depuis cette adresse. Patientez avant de recommencer.',
                        $headers
                    )),
            ];
        });

        RateLimiter::for('auth-password', function (Request $request) {
            $userId = (string) ($request->user()?->id ?? 'guest');

            return [
                Limit::perMinute(5)
                    ->by($userId)
                    ->response(fn (Request $request, array $headers) => $this->tooManyAttemptsResponse(
                        'Trop de changements de mot de passe en peu de temps. Reessayez dans quelques minutes.',
                        $headers
                    )),
                Limit::perHour(20)
                    ->by($userId)
                    ->response(fn (Request $request, array $headers) => $this->tooManyAttemptsResponse(
                        'Limite horaire atteinte pour cette action sensible. Reessayez plus tard.',
                        $headers
                    )),
            ];
        });
    }

    private function tooManyAttemptsResponse(string $message, array $headers): JsonResponse
    {
        $retryAfter = (int) ($headers['Retry-After'] ?? 60);

        return response()->json([
            'message' => $message,
            'retry_after' => $retryAfter,
        ], 429, $headers);
    }
}
