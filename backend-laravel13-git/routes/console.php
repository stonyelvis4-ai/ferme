<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Schedule::command('ferm:alerts:evaluate')
    ->everyFiveMinutes()
    ->withoutOverlapping();

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('ferm:verify-production', function (): int {
    $problems = [];

    if (config('app.env') !== 'production') {
        $problems[] = 'APP_ENV doit etre production.';
    }
    if ((bool) config('app.debug')) {
        $problems[] = 'APP_DEBUG doit etre false.';
    }
    if (blank(config('app.key'))) {
        $problems[] = 'APP_KEY doit etre definie et conservee entre les mises a jour.';
    }
    if (! str_starts_with((string) config('app.url'), 'https://')) {
        $problems[] = 'APP_URL doit utiliser HTTPS.';
    }
    if (! (bool) config('session.secure')) {
        $problems[] = 'SESSION_SECURE_COOKIE doit etre true.';
    }
    if (! in_array(config('session.same_site'), ['lax', 'strict'], true)) {
        $problems[] = 'SESSION_SAME_SITE doit etre lax ou strict.';
    }
    if (config('ferm.deployment.database_driver', config('database.default')) === 'sqlite') {
        $problems[] = 'La base SQLite locale ne doit pas etre utilisee en production.';
    }
    $origins = array_filter(config('cors.allowed_origins', []));
    if ($origins === [] || collect($origins)->contains(fn ($origin) => ! str_starts_with((string) $origin, 'https://'))) {
        $problems[] = 'CORS_ALLOWED_ORIGINS doit contenir uniquement les origines HTTPS finales.';
    }

    if ($problems !== []) {
        $this->error('Verification de production echouee :');
        foreach ($problems as $problem) {
            $this->line('- '.$problem);
        }

        return \Illuminate\Console\Command::FAILURE;
    }

    $this->info('Configuration de production FERM+ validee.');

    return \Illuminate\Console\Command::SUCCESS;
})->purpose('Verify the minimum security configuration before a FERM+ production deployment');
