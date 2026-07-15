<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\UpdateSettingsRequest;
use App\Models\FarmSetting;
use App\Services\AuditService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SettingsController extends Controller
{
    public function __construct(private readonly AuditService $auditService)
    {
    }

    public function show(Request $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;

        $settings = $farmId
            ? FarmSetting::firstOrCreate(
                ['farm_id' => $farmId],
                [
                    'currency' => 'FCFA',
                    'area_unit' => 'ha',
                    'weight_unit' => 'kg',
                    'egg_tray_default_price' => 0,
                    'fish_kg_default_price' => 0,
                    'crop_kg_default_price' => 0,
                    'low_stock_threshold' => 0,
                    'mortalite_threshold_layers' => 0,
                    'mortalite_threshold_fish' => 0,
                    'egg_breakage_threshold' => 0,
                    'laying_rate_low_threshold' => 0,
                    'fish_ph_min' => 0,
                    'fish_ph_max' => 0,
                    'fish_oxygen_min' => 0,
                    'fish_temperature_min' => 0,
                    'fish_temperature_max' => 0,
                    'crop_yield_low_threshold' => 0,
                    'default_reminder_24h' => true,
                    'default_reminder_6h' => true,
                    'default_reminder_1h' => true,
                    'task_categories' => ['alimentation', 'sanitaire', 'production', 'recolte', 'vente', 'stock', 'finance', 'maintenance', 'culture', 'reproduction', 'nettoyage', 'controle', 'administratif'],
                    'task_priorities' => ['faible', 'normale', 'elevee', 'critique'],
                    'alert_rules' => [],
                ]
            )
            : null;

        return response()->json([
            'data' => $settings,
        ]);
    }

    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        $farmId = $request->user()?->farm_id;
        $settings = FarmSetting::firstOrCreate(['farm_id' => $farmId]);
        $oldValue = $settings->toArray();
        $settings->fill($request->validated());
        $settings->save();

        $this->auditService->record([
            'farm_id' => $farmId,
            'user_id' => $request->user()?->id,
            'module' => 'settings',
            'entity_type' => 'farm_setting',
            'entity_id' => (string) $settings->id,
            'action' => 'settings_updated',
            'old_value' => json_encode($oldValue),
            'new_value' => json_encode($settings->toArray()),
            'source' => 'web',
        ]);

        return response()->json([
            'data' => $settings,
        ]);
    }
}
