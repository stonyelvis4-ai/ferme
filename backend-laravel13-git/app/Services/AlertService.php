<?php

namespace App\Services;

use App\Models\FishMonitoring;
use App\Models\FishPond;
use App\Models\Crop;
use App\Models\CropHarvest;
use App\Models\EggProduction;
use App\Models\LayerBatch;
use App\Models\Alert;
use App\Models\StockItem;
use App\Models\Task;

class AlertService
{
    public function createOverdueTaskAlert(Task $task): Alert
    {
        return Alert::firstOrCreate(
            [
                'farm_id' => $task->farm_id,
                'type' => 'task_overdue',
                'source_entity_type' => 'task',
                'source_entity_id' => (string) $task->id,
            ],
            [
                'severity' => 'medium',
                'title' => sprintf('Tâche en retard: %s', $task->title),
                'description' => $task->description ?? 'La tâche a dépassé son échéance.',
                'source_module' => 'tasks',
                'status' => 'open',
            ]
        );
    }

    public function createLowStockAlert(StockItem $item): Alert
    {
        return Alert::firstOrCreate(
            [
                'farm_id' => $item->farm_id,
                'type' => 'low_stock',
                'source_entity_type' => 'stock_item',
                'source_entity_id' => (string) $item->id,
            ],
            [
                'severity' => 'high',
                'title' => sprintf('Stock faible: %s', $item->name),
                'description' => sprintf(
                    'Quantité actuelle: %d %s, seuil minimum: %d %s.',
                    $item->current_quantity,
                    $item->unit,
                    $item->minimum_threshold,
                    $item->unit
                ),
                'source_module' => 'stocks',
                'status' => 'open',
            ]
        );
    }

    public function createFishWaterAlert(int $farmId, FishPond $pond, string $type, string $title, string $description): Alert
    {
        return Alert::firstOrCreate(
            [
                'farm_id' => $farmId,
                'type' => $type,
                'source_entity_type' => 'fish_pond',
                'source_entity_id' => (string) $pond->id,
            ],
            [
                'severity' => 'high',
                'title' => $title,
                'description' => $description,
                'source_module' => 'pisciculture',
                'status' => 'open',
            ]
        );
    }

    public function createFishMortalityAlert(FishPond $pond, FishMonitoring $monitoring): Alert
    {
        return Alert::firstOrCreate(
            [
                'farm_id' => $pond->farm_id,
                'type' => 'fish_mortality_high',
                'source_entity_type' => 'fish_monitoring',
                'source_entity_id' => (string) $monitoring->id,
            ],
            [
                'severity' => 'high',
                'title' => 'Mortalite elevee en pisciculture',
                'description' => 'Le suivi piscicole signale une mortalite superieure au seuil recommande.',
                'source_module' => 'pisciculture',
                'status' => 'open',
            ]
        );
    }

    public function createFishGrowthAlert(FishPond $pond, FishMonitoring $monitoring): Alert
    {
        return Alert::firstOrCreate(
            [
                'farm_id' => $pond->farm_id,
                'type' => 'fish_growth_low',
                'source_entity_type' => 'fish_monitoring',
                'source_entity_id' => (string) $monitoring->id,
            ],
            [
                'severity' => 'medium',
                'title' => 'Croissance insuffisante',
                'description' => 'La croissance observee reste inferieure aux attentes pour ce bassin.',
                'source_module' => 'pisciculture',
                'status' => 'open',
            ]
        );
    }

    public function createFishFeedAlert(FishPond $pond, FishMonitoring $monitoring): Alert
    {
        return Alert::firstOrCreate(
            [
                'farm_id' => $pond->farm_id,
                'type' => 'fish_feed_low',
                'source_entity_type' => 'fish_monitoring',
                'source_entity_id' => (string) $monitoring->id,
            ],
            [
                'severity' => 'medium',
                'title' => 'Aliment insuffisant',
                'description' => 'Le suivi piscicole ne detecte pas de distribution d aliment suffisante.',
                'source_module' => 'pisciculture',
                'status' => 'open',
            ]
        );
    }

    public function createCropYieldAlert(Crop $crop, CropHarvest $harvest): Alert
    {
        return Alert::firstOrCreate(
            [
                'farm_id' => $crop->farm_id,
                'type' => 'crop_yield_low',
                'source_entity_type' => 'crop_harvest',
                'source_entity_id' => (string) $harvest->id,
            ],
            [
                'severity' => 'medium',
                'title' => 'Rendement cultural faible',
                'description' => 'La recolte enregistre un rendement inferieur au niveau attendu.',
                'source_module' => 'cultures',
                'status' => 'open',
            ]
        );
    }

    public function createLayerMortalityAlert(LayerBatch $batch, int $mortality, int $threshold): Alert
    {
        return Alert::firstOrCreate(
            [
                'farm_id' => $batch->farm_id,
                'type' => 'layer_mortality_high',
                'source_entity_type' => 'layer_batch',
                'source_entity_id' => (string) $batch->id,
            ],
            [
                'severity' => 'high',
                'title' => 'Mortalite elevee en pondeuses',
                'description' => sprintf('Le lot %s a enregistre %d morts pour un seuil de %d.', $batch->name, $mortality, $threshold),
                'source_module' => 'pondeuses',
                'status' => 'open',
            ]
        );
    }

    public function createEggBreakageAlert(EggProduction $production, int $broken, int $threshold): Alert
    {
        return Alert::firstOrCreate(
            [
                'farm_id' => $production->farm_id,
                'type' => 'egg_breakage_high',
                'source_entity_type' => 'egg_production',
                'source_entity_id' => (string) $production->id,
            ],
            [
                'severity' => 'medium',
                'title' => 'Casse d oeufs elevee',
                'description' => sprintf('La production du %s signale %d oeufs casses pour un seuil de %d.', $production->production_date?->format('Y-m-d'), $broken, $threshold),
                'source_module' => 'pondeuses',
                'status' => 'open',
            ]
        );
    }

    public function createLayingRateAlert(EggProduction $production, float $rate, float $threshold): Alert
    {
        return Alert::firstOrCreate(
            [
                'farm_id' => $production->farm_id,
                'type' => 'laying_rate_low',
                'source_entity_type' => 'egg_production',
                'source_entity_id' => (string) $production->id,
            ],
            [
                'severity' => 'medium',
                'title' => 'Taux de ponte faible',
                'description' => sprintf('Le taux de ponte du lot est %.2f%% pour un seuil de %.2f%%.', $rate, $threshold),
                'source_module' => 'pondeuses',
                'status' => 'open',
            ]
        );
    }
}
