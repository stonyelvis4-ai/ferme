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
        $userFarmId = (int) ($user?->farm_id ?? 0);
        $farmIds = collect();

        if ($userFarmId > 0) {
            $request->merge(['farm_id' => $userFarmId]);

            if ($request->has('farm_ids') || $request->has('farm_id')) {
                $request->merge(['farm_ids' => [$userFarmId]]);
            }
        }

        if ($request->route('farm')?->id) {
            $farmIds->push((int) $request->route('farm')->id);
        }

        if ($request->filled('farm_id')) {
            $farmIds->push((int) $request->integer('farm_id'));
        }

        if (is_array($request->input('farm_ids'))) {
            $farmIds = $farmIds->merge(
                collect($request->input('farm_ids'))
                    ->filter(fn ($value) => is_numeric($value))
                    ->map(fn ($value) => (int) $value)
            );
        }

        if ($userFarmId > 0) {
            foreach ($request->route()?->parameters() ?? [] as $parameter) {
                if (! $parameter instanceof Model) {
                    continue;
                }

                if ($parameter instanceof Farm) {
                    $farmIds->push((int) $parameter->getKey());
                    continue;
                }

                if (isset($parameter->farm_id)) {
                    $farmIds->push((int) $parameter->farm_id);
                }
            }
        }

        $farmIds = $farmIds->filter()->unique()->values();

        if ($userFarmId > 0 && $farmIds->contains(fn (int $farmId) => $userFarmId !== $farmId)) {
            abort(403, 'Farm tenant mismatch.');
        }

        return $next($request);
    }
}
