<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(
            prepend: [\App\Http\Middleware\ValidateApiOrigin::class],
            append: [\App\Http\Middleware\SecureApiResponse::class],
        );
        $middleware->prependToPriorityList(
            \Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests::class,
            \App\Http\Middleware\PromoteApiTokenCookie::class,
        );
        // Run idempotency after authentication, but before route model binding so a
        // replayed DELETE can return its saved response after the model is gone.
        $middleware->appendToPriorityList(
            \Illuminate\Contracts\Auth\Middleware\AuthenticatesRequests::class,
            \App\Http\Middleware\IdempotentCreation::class,
        );
        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureAdmin::class,
            'idempotent' => \App\Http\Middleware\IdempotentCreation::class,
            'active.account' => \App\Http\Middleware\EnsureActiveAccount::class,
            'auth' => \App\Http\Middleware\Authenticate::class,
            'api.cookie.token' => \App\Http\Middleware\PromoteApiTokenCookie::class,
            'tenant' => \App\Http\Middleware\EnsureFarmTenant::class,
            'owner.readonly' => \App\Http\Middleware\EnsureOwnerReadOnly::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
