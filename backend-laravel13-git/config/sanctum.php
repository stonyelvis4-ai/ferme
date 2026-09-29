<?php

return [
    'guard' => ['web'],
    // Also bounds legacy tokens that were issued without expires_at.
    'expiration' => max(1, (int) env('SESSION_LIFETIME', 120)),
    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),
];
