<?php

namespace App\Http\Middleware;

use App\Models\Farm;
use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureFarmTenant
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        $farmId = $request->route('farm')?->id ?? $request->integer('farm_id') ?? null;

        if ($user && $user->farm_id) {
            foreach ($request->route()?->parameters() ?? [] as $parameter) {
                if (! $parameter instanceof Model) {
                    continue;
                }

                if ($parameter instanceof Farm) {
                    $farmId = $farmId ?? (int) $parameter->getKey();
                    continue;
                }

                if (isset($parameter->farm_id)) {
                    $farmId = $farmId ?? (int) $parameter->farm_id;
                }
            }
        }

        if ($user && $farmId && $user->farm_id && (int) $user->farm_id !== (int) $farmId) {
            abort(403, 'Farm tenant mismatch.');
        }

        return $next($request);
    }
}
