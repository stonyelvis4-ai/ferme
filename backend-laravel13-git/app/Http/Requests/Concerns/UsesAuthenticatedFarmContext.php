<?php

namespace App\Http\Requests\Concerns;

trait UsesAuthenticatedFarmContext
{
    protected function prepareForValidation(): void
    {
        $farmId = (int) ($this->user()?->farm_id ?? 0);

        if ($farmId > 0) {
            $this->merge(['farm_id' => $farmId]);
        }
    }
}
