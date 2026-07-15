<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureFarmTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $farmId = $request->route('farm')?->id ?? $request->integer('farm_id') ?? null;

        if ($user && $farmId && $user->farm_id && (int) $user->farm_id !== (int) $farmId) {
            abort(403, 'Farm tenant mismatch.');
        }

        return $next($request);
    }
}

