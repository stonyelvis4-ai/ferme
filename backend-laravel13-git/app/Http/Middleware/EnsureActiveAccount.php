<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveAccount
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        abort_unless($user, 401);

        if ($user->account_status !== 'active' || ! $user->is_active) {
            $user->currentAccessToken()?->delete();

            abort(403, 'Compte desactive ou en attente.');
        }

        return $next($request);
    }
}
