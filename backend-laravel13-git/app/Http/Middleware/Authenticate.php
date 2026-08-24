<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Middleware\Authenticate as Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Symfony\Component\HttpFoundation\Response;

class Authenticate extends Middleware
{
    public function handle($request, Closure $next, ...$guards): Response
    {
        $this->authenticate($request, $guards);

        $user = $request->user();

        if ($user && ($user->account_status !== 'active' || ! $user->is_active)) {
            $user->currentAccessToken()?->delete();
            abort(403, 'Compte desactive ou en attente.');
        }

        return $next($request);
    }

    protected function redirectTo(Request $request): ?string
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            return null;
        }

        return Route::has('login') ? route('login') : null;
    }
}
