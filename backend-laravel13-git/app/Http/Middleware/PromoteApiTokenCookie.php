<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class PromoteApiTokenCookie
{
    public function handle(Request $request, Closure $next): Response
    {
        $cookieName = (string) config('session.api_token_cookie', 'fermplus_api_token');
        $cookieToken = $request->cookie($cookieName);

        if ($cookieToken && ! $request->bearerToken()) {
            $request->headers->set('Authorization', 'Bearer '.$cookieToken);
        }

        return $next($request);
    }
}
