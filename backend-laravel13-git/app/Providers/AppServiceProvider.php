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

        RateLimiter::for('ai-chat', function (Request $request) {
            $userId = (string) ($request->user()?->id ?? 'guest');
            $farmId = (string) ($request->user()?->farm_id ?? 'none');

            return [
                Limit::perMinute(12)
                    ->by($userId.'|'.$farmId)
                    ->response(fn (Request $request, array $headers) => $this->tooManyAttemptsResponse(
                        'L’assistant agricole reçoit beaucoup de demandes. Patientez un instant avant de recommencer.',
                        $headers
                    )),
                Limit::perDay(120)
                    ->by($userId.'|'.$farmId)
                    ->response(fn (Request $request, array $headers) => $this->tooManyAttemptsResponse(
                        'La limite quotidienne de l’assistant agricole est atteinte. Réessayez demain.',
                        $headers
                    )),
            ];
        });

        RateLimiter::for('api-authenticated', function (Request $request) {
            $key = (string) ($request->user()?->id ?? 'guest').'|'.$request->ip();

            return Limit::perMinute(180)->by($key)->response(
                fn (Request $request, array $headers) => $this->tooManyAttemptsResponse('Trop de requêtes API. Réessayez dans un instant.', $headers)
            );
        });

        RateLimiter::for('api-write', function (Request $request) {
            $key = (string) ($request->user()?->id ?? 'guest').'|'.$request->ip();

            return Limit::perMinute(60)->by($key)->response(
                fn (Request $request, array $headers) => $this->tooManyAttemptsResponse('Trop de modifications en peu de temps. Réessayez dans un instant.', $headers)
            );
        });

        RateLimiter::for('exports', function (Request $request) {
            return Limit::perMinute(10)->by((string) ($request->user()?->id ?? 'guest'))->response(
                fn (Request $request, array $headers) => $this->tooManyAttemptsResponse('Trop d’exports demandés. Réessayez dans un instant.', $headers)
            );
        });

        RateLimiter::for('sync', function (Request $request) {
            return Limit::perMinute(30)->by((string) ($request->user()?->id ?? 'guest'))->response(
                fn (Request $request, array $headers) => $this->tooManyAttemptsResponse('Trop de synchronisations demandées. Réessayez dans un instant.', $headers)
            );
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
