<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\FarmController;
use App\Http\Controllers\Api\OwnerController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\TaskController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::post('/auth/register-admin', [AuthController::class, 'registerAdmin']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware(['auth:sanctum'])->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/password', [AuthController::class, 'changePassword']);

        Route::middleware(['tenant'])->group(function () {
            Route::get('/dashboard', [DashboardController::class, 'index']);
            Route::get('/audit', [AuditController::class, 'index']);

            Route::apiResource('farms', FarmController::class)->only(['index', 'store', 'show', 'update']);
            Route::post('/farms/{farm}/owner', [OwnerController::class, 'store']);
            Route::patch('/owners/{owner}', [OwnerController::class, 'update']);
            Route::apiResource('users', UserController::class)->only(['index', 'update', 'destroy']);

            Route::get('/settings', [SettingsController::class, 'show']);
            Route::put('/settings', [SettingsController::class, 'update']);

            Route::apiResource('tasks', TaskController::class);
        });
    });
});
