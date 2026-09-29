<?php

namespace App\Http\Middleware;

use App\Models\Farm;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IdempotentCreation
{
    public function handle(Request $request, Closure $next)
    {
        $key = $request->header('Idempotency-Key');
        if ($request->method() !== 'POST' || $key === null) {
            return $next($request);
        }
        abort_unless(is_string($key) && preg_match('/^[A-Za-z0-9:_.-]{1,160}$/D', $key), 422);
        $user = $request->user();
        $scope = hash('sha256', json_encode([$user->farm_id, $user->id, $request->path(), $key]));
        $fingerprint = hash('sha256', $request->getContent());

        return DB::transaction(function () use ($request, $next, $scope, $fingerprint, $user) {
            Farm::whereKey($user->farm_id)->lockForUpdate()->firstOrFail();
            $existing = DB::table('api_idempotency')->where('scope', $scope)->first();
            if ($existing) {
                abort_unless(hash_equals($existing->fingerprint, $fingerprint), 409, 'Operation deja utilisee avec un contenu different.');
                return response($existing->body, $existing->status)->header('Content-Type', 'application/json');
            }
            $response = $next($request);
            if ($response->isSuccessful()) {
                DB::table('api_idempotency')->insert([
                    'scope' => $scope, 'farm_id' => $user->farm_id, 'fingerprint' => $fingerprint,
                    'status' => $response->getStatusCode(), 'body' => $response->getContent(),
                    'created_at' => now(),
                ]);
            }
            return $response;
        }, 3);
    }
}
