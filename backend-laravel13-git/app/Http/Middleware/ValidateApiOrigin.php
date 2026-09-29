<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class ValidateApiOrigin
{
    public function handle(Request $request, Closure $next)
    {
        if (! in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true)) {
            $origin = $request->header('Origin');
            if ($origin !== null) {
                abort_unless(in_array($origin, config('cors.allowed_origins', []), true), 403);
            }
            // Public authentication must not accept cross-site HTML form submissions.
            if ($request->is('api/v1/auth/login', 'api/v1/auth/register-admin', 'api/v1/auth/google')) {
                abort_unless($request->isJson(), 415);
            }
        }
        return $next($request);
    }
}
