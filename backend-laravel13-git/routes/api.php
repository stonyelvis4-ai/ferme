<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AuditController;
use App\Http\Controllers\Api\AlertController;
use App\Http\Controllers\Api\CalendarController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\CulturesController;
use App\Http\Controllers\Api\InfrastructureController;
use App\Http\Controllers\Api\FinanceController;
use App\Http\Controllers\Api\FarmController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\PiscicultureController;
use App\Http\Controllers\Api\PondeusesController;
use App\Http\Controllers\Api\OwnerController;
use App\Http\Controllers\Api\AlertRulesController;
use App\Http\Controllers\Api\SyncController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\SanitaryController;
use App\Http\Controllers\Api\StockController;
use App\Http\Controllers\Api\TaskController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', function () {
        return response()->json([
            'data' => [
                'status' => 'ok',
                'service' => 'ferm-plus-api',
                'timestamp' => now()->toIso8601String(),
                'environment' => app()->environment(),
            ],
        ]);
    });

    Route::get('/auth/bootstrap-status', [AuthController::class, 'bootstrapStatus']);
    Route::post('/auth/register-admin', [AuthController::class, 'registerAdmin']);
    Route::post('/auth/login', [AuthController::class, 'login']);

    Route::middleware(['auth:sanctum'])->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::post('/auth/password', [AuthController::class, 'changePassword']);

        Route::middleware(['tenant'])->group(function () {
            Route::get('/dashboard', [DashboardController::class, 'index']);
            Route::get('/audit', [AuditController::class, 'index']);
            Route::get('/alerts', [AlertController::class, 'index']);
            Route::post('/alerts/evaluate', [AlertRulesController::class, 'evaluate']);
            Route::get('/calendar', [CalendarController::class, 'index']);
            Route::get('/stocks', [StockController::class, 'index']);
            Route::get('/finances', [FinanceController::class, 'index']);
            Route::get('/sanitary', [SanitaryController::class, 'index']);
            Route::get('/reports', [ReportController::class, 'index']);
            Route::get('/reports/{section}', [ReportController::class, 'show']);
            Route::get('/reports/{section}/export/{format}', [ReportController::class, 'export']);
            Route::get('/sync', [SyncController::class, 'index']);
            Route::get('/pondeuses', [PondeusesController::class, 'index']);
            Route::get('/pondeuses/{pondeuse}', [PondeusesController::class, 'show']);
            Route::get('/cultures', [CulturesController::class, 'index']);
            Route::get('/cultures/{culture}', [CulturesController::class, 'show']);
            Route::get('/infrastructures', [InfrastructureController::class, 'index']);
            Route::get('/infrastructures/buildings/{building}', [InfrastructureController::class, 'showBuilding']);
            Route::get('/infrastructures/enclosures/{enclosure}', [InfrastructureController::class, 'showEnclosure']);
            Route::get('/pisciculture', [PiscicultureController::class, 'index']);
            Route::get('/pisciculture/{pisciculture}', [PiscicultureController::class, 'show']);
            Route::get('/farms', [FarmController::class, 'index']);
            Route::get('/farms/{farm}', [FarmController::class, 'show']);
            Route::get('/tasks', [TaskController::class, 'index']);
            Route::get('/users', [UserController::class, 'index']);
            Route::get('/users/{user}', [UserController::class, 'show']);
            Route::get('/settings', [SettingsController::class, 'show']);

            Route::middleware(['admin'])->group(function () {
                Route::post('/farms', [FarmController::class, 'store']);
                Route::patch('/farms/{farm}', [FarmController::class, 'update']);
                Route::post('/farms/{farm}/owner', [OwnerController::class, 'store']);
                Route::patch('/owners/{owner}', [OwnerController::class, 'update']);
                Route::put('/settings', [SettingsController::class, 'update']);
                Route::post('/tasks', [TaskController::class, 'store']);
                Route::patch('/tasks/{task}', [TaskController::class, 'update']);
                Route::delete('/tasks/{task}', [TaskController::class, 'destroy']);
                Route::patch('/users/{user}', [UserController::class, 'update']);
                Route::post('/users/{user}/farms', [UserController::class, 'assignFarms']);
                Route::patch('/users/{user}/status', [UserController::class, 'updateStatus']);
                Route::post('/users/{user}/password', [UserController::class, 'resetPassword']);
                Route::delete('/users/{user}', [UserController::class, 'destroy']);
                Route::post('/calendar', [CalendarController::class, 'store']);
                Route::patch('/alerts/{alert}/resolve', [AlertController::class, 'resolve']);
                Route::post('/alerts/sync-overdue-tasks', [AlertController::class, 'syncOverdueTasks']);
                Route::post('/stocks', [StockController::class, 'store']);
                Route::patch('/stocks/{stockItem}', [StockController::class, 'update']);
                Route::delete('/stocks/{stockItem}', [StockController::class, 'destroy']);
                Route::post('/stocks/movements', [StockController::class, 'movement']);
                Route::post('/finances', [FinanceController::class, 'store']);
                Route::patch('/finances/{financialTransaction}', [FinanceController::class, 'update']);
                Route::delete('/finances/{financialTransaction}', [FinanceController::class, 'destroy']);
                Route::patch('/sanitary/{sanitaryTreatment}', [SanitaryController::class, 'update']);
                Route::post('/pondeuses', [PondeusesController::class, 'store']);
                Route::patch('/pondeuses/{pondeuse}', [PondeusesController::class, 'update']);
                Route::delete('/pondeuses/{pondeuse}', [PondeusesController::class, 'destroy']);
                Route::post('/pondeuses/productions', [PondeusesController::class, 'production']);
                Route::post('/pondeuses/sales', [PondeusesController::class, 'sale']);
                Route::post('/cultures', [CulturesController::class, 'store']);
                Route::patch('/cultures/{culture}', [CulturesController::class, 'update']);
                Route::delete('/cultures/{culture}', [CulturesController::class, 'destroy']);
                Route::post('/cultures/plots', [CulturesController::class, 'plot']);
                Route::post('/cultures/operations', [CulturesController::class, 'operation']);
                Route::post('/cultures/harvests', [CulturesController::class, 'harvest']);
                Route::post('/cultures/sales', [CulturesController::class, 'sale']);
                Route::post('/infrastructures/buildings', [InfrastructureController::class, 'storeBuilding']);
                Route::patch('/infrastructures/buildings/{building}', [InfrastructureController::class, 'updateBuilding']);
                Route::delete('/infrastructures/buildings/{building}', [InfrastructureController::class, 'destroyBuilding']);
                Route::post('/infrastructures/enclosures', [InfrastructureController::class, 'storeEnclosure']);
                Route::patch('/infrastructures/enclosures/{enclosure}', [InfrastructureController::class, 'updateEnclosure']);
                Route::delete('/infrastructures/enclosures/{enclosure}', [InfrastructureController::class, 'destroyEnclosure']);
                Route::post('/sync', [SyncController::class, 'store']);
                Route::patch('/sync/{entry}/process', [SyncController::class, 'process']);
                Route::patch('/sync/{entry}/fail', [SyncController::class, 'fail']);
                Route::post('/pisciculture', [PiscicultureController::class, 'store']);
                Route::patch('/pisciculture/{pisciculture}', [PiscicultureController::class, 'update']);
                Route::delete('/pisciculture/{pisciculture}', [PiscicultureController::class, 'destroy']);
                Route::post('/pisciculture/stockings', [PiscicultureController::class, 'stocking']);
                Route::post('/pisciculture/monitorings', [PiscicultureController::class, 'monitoring']);
                Route::post('/pisciculture/harvests', [PiscicultureController::class, 'harvest']);
                Route::post('/pisciculture/sales', [PiscicultureController::class, 'sale']);
            });
        });
    });
});
