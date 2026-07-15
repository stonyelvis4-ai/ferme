<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return response()->json([
        'app' => 'FERM+',
        'status' => 'Laravel 13 scaffold ready',
        'focus' => 'MVP P0 foundations'
    ]);
});

