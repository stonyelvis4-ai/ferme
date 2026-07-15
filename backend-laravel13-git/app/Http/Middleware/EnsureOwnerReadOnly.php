<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureOwnerReadOnly
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user(), 401);

        return $next($request);
    }
}

