<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Crop;
use App\Models\CropHarvest;
use App\Models\EggProduction;
use App\Models\FarmSetting;
use App\Models\FishMonitoring;
use App\Models\FishPond;
use App\Models\LayerBatch;
use App\Models\StockItem;
use Illuminate\Support\Collection;

class AlertEvaluationService
{
    public function __construct(
        private readonly AlertService $alertService
    ) {
    }

    public function evaluateFarm(int $farmId): array
    {
        $settings = FarmSetting::query()->where('farm_id', $farmId)->first();
        $results = [
            'stocks' => $this->evaluateStocks($farmId, $settings),
            'layers' => $this->evaluateLayers($farmId, $settings),
            'pisciculture' => $this->evaluatePisciculture($farmId, $settings),
            'cultures' => $this->evaluateCultures($farmId, $settings),
        ];

        return $results;
    }

    private function evaluateStocks(int $farmId, ?FarmSetting $settings): int
    {
        $threshold = (int) ($settings?->low_stock_threshold ?? 0);
        if ($threshold <= 0) {
            return 0;
        }

        return StockItem::query()
            ->where('farm_id', $farmId)
            ->where('current_quantity', '<=', $threshold)
            ->count();
    }

    private function evaluateLayers(int $farmId, ?FarmSetting $settings): array
    {
        $mortalityThreshold = (int) ($settings?->mortalite_threshold_layers ?? 0);
        $breakageThreshold = (int) ($settings?->egg_breakage_threshold ?? 0);
        $layingThreshold = (float) ($settings?->laying_rate_low_threshold ?? 0);
        $alerts = [];

        LayerBatch::query()
            ->where('farm_id', $farmId)
            ->with('productions')
            ->get()
            ->each(function (LayerBatch $batch) use (&$alerts, $mortalityThreshold, $breakageThreshold, $layingThreshold): void {
                if ($mortalityThreshold > 0 && $batch->mortality_total >= $mortalityThreshold) {
                    $alerts[] = $this->alertService->createLayerMortalityAlert($batch, $batch->mortality_total, $mortalityThreshold);
                }

                $batch->productions->each(function (EggProduction $production) use (&$alerts, $breakageThreshold, $layingThreshold, $batch): void {
                    if ($breakageThreshold > 0 && $production->broken_eggs >= $breakageThreshold) {
                        $alerts[] = $this->alertService->createEggBreakageAlert($production, $production->broken_eggs, $breakageThreshold);
                    }

                    if ($layingThreshold > 0 && $batch->current_count > 0) {
                        $rate = round(($production->eggs_produced / max(1, $batch->current_count)) * 100, 2);
                        if ($rate < $layingThreshold) {
                            $alerts[] = $this->alertService->createLayingRateAlert($production, $rate, $layingThreshold);
                        }
                    }
                });
            });

        return $alerts;
    }

    private function evaluatePisciculture(int $farmId, ?FarmSetting $settings): array
    {
        $alerts = [];
        $phMin = (float) ($settings?->fish_ph_min ?? 6.5);
        $phMax = (float) ($settings?->fish_ph_max ?? 8.5);
        $oxygenMin = (float) ($settings?->fish_oxygen_min ?? 5);
        $temperatureMin = (float) ($settings?->fish_temperature_min ?? 22);
        $temperatureMax = (float) ($settings?->fish_temperature_max ?? 32);

        FishPond::query()
            ->where('farm_id', $farmId)
            ->with('monitorings')
            ->get()
            ->each(function (FishPond $pond) use (&$alerts, $phMin, $phMax, $oxygenMin, $temperatureMin, $temperatureMax): void {
                $pond->monitorings->each(function (FishMonitoring $monitoring) use (&$alerts, $pond, $phMin, $phMax, $oxygenMin, $temperatureMin, $temperatureMax): void {
                    if ($monitoring->oxygen !== null && (float) $monitoring->oxygen < $oxygenMin) {
                        $alerts[] = $this->alertService->createFishWaterAlert($pond->farm_id, $pond, 'oxygen_faible', 'Oxygene faible', 'Le niveau d oxygene est sous le seuil recommande.');
                    }

                    if ($monitoring->ph !== null && ((float) $monitoring->ph < $phMin || (float) $monitoring->ph > $phMax)) {
                        $alerts[] = $this->alertService->createFishWaterAlert($pond->farm_id, $pond, 'ph_anormal', 'pH anormal', 'Le pH du bassin est en dehors de la plage recommandee.');
                    }

                    if ($monitoring->water_temperature !== null && ((float) $monitoring->water_temperature < $temperatureMin || (float) $monitoring->water_temperature > $temperatureMax)) {
                        $alerts[] = $this->alertService->createFishWaterAlert($pond->farm_id, $pond, 'temperature_anormale', 'Temperature anormale', 'La temperature de l eau est hors plage.');
                    }
                });
            });

        return $alerts;
    }

    private function evaluateCultures(int $farmId, ?FarmSetting $settings): array
    {
        $threshold = (float) ($settings?->crop_yield_low_threshold ?? 0);
        if ($threshold <= 0) {
            return [];
        }

        $alerts = [];
        Crop::query()
            ->where('farm_id', $farmId)
            ->with('harvests')
            ->get()
            ->each(function (Crop $crop) use (&$alerts, $threshold): void {
                $crop->harvests->each(function (CropHarvest $harvest) use (&$alerts, $crop, $threshold): void {
                    if ((float) $harvest->sellable_kg < $threshold) {
                        $alerts[] = $this->alertService->createCropYieldAlert($crop, $harvest);
                    }
                });
            });

        return $alerts;
    }
}
