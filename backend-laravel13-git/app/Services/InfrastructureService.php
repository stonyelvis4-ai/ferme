<?php

namespace App\Services;

use App\Models\Building;
use App\Models\Enclosure;
use Illuminate\Support\Facades\DB;

class InfrastructureService
{
    public function __construct(private readonly AuditService $auditService)
    {
    }

    public function createBuilding(array $data): Building
    {
        $building = Building::create([
            'farm_id' => $data['farm_id'],
            'name' => $data['name'],
            'type' => $data['type'],
            'capacity' => $data['capacity'] ?? 0,
            'assigned_use' => $data['assigned_use'] ?? null,
            'status' => $data['status'] ?? 'active',
            'state' => $data['state'] ?? 'good',
            'notes' => $data['notes'] ?? null,
        ]);

        $this->auditService->record([
            'farm_id' => $building->farm_id,
            'user_id' => request()->user()?->id,
            'module' => 'infrastructures',
            'entity_type' => 'building',
            'entity_id' => (string) $building->id,
            'action' => 'building_created',
            'new_value' => json_encode($building->toArray()),
            'source' => 'web',
        ]);

        return $building;
    }

    public function updateBuilding(Building $building, array $data): Building
    {
        $building->fill($data);
        $building->save();

        $this->auditService->record([
            'farm_id' => $building->farm_id,
            'user_id' => request()->user()?->id,
            'module' => 'infrastructures',
            'entity_type' => 'building',
            'entity_id' => (string) $building->id,
            'action' => 'building_updated',
            'new_value' => json_encode($building->toArray()),
            'source' => 'web',
        ]);

        return $building;
    }

    public function createEnclosure(array $data): Enclosure
    {
        $this->buildingForFarm((int) $data['farm_id'], (int) $data['building_id']);

        $enclosure = Enclosure::create([
            'farm_id' => $data['farm_id'],
            'building_id' => $data['building_id'],
            'name' => $data['name'],
            'type' => $data['type'],
            'capacity' => $data['capacity'] ?? 0,
            'assigned_use' => $data['assigned_use'] ?? null,
            'status' => $data['status'] ?? 'active',
            'state' => $data['state'] ?? 'good',
            'notes' => $data['notes'] ?? null,
        ]);

        $this->auditService->record([
            'farm_id' => $enclosure->farm_id,
            'user_id' => request()->user()?->id,
            'module' => 'infrastructures',
            'entity_type' => 'enclosure',
            'entity_id' => (string) $enclosure->id,
            'action' => 'enclosure_created',
            'new_value' => json_encode($enclosure->toArray()),
            'source' => 'web',
        ]);

        return $enclosure;
    }

    public function updateEnclosure(Enclosure $enclosure, array $data): Enclosure
    {
        if (array_key_exists('building_id', $data)) {
            $this->buildingForFarm((int) $enclosure->farm_id, (int) $data['building_id']);
        }

        $enclosure->fill($data);
        $enclosure->save();

        $this->auditService->record([
            'farm_id' => $enclosure->farm_id,
            'user_id' => request()->user()?->id,
            'module' => 'infrastructures',
            'entity_type' => 'enclosure',
            'entity_id' => (string) $enclosure->id,
            'action' => 'enclosure_updated',
            'new_value' => json_encode($enclosure->toArray()),
            'source' => 'web',
        ]);

        return $enclosure;
    }

    public function summaryForFarm(int $farmId): array
    {
        $buildings = Building::query()->where('farm_id', $farmId);
        $enclosures = Enclosure::query()->where('farm_id', $farmId);

        return [
            'buildings' => $buildings->count(),
            'active_buildings' => Building::query()->where('farm_id', $farmId)->where('status', 'active')->count(),
            'enclosures' => $enclosures->count(),
            'active_enclosures' => Enclosure::query()->where('farm_id', $farmId)->where('status', 'active')->count(),
            'total_capacity' => (float) (clone $buildings)->sum('capacity') + (float) (clone $enclosures)->sum('capacity'),
            'used_capacity' => (float) (clone $enclosures)->whereNotNull('assigned_use')->sum('capacity'),
        ];
    }

    private function buildingForFarm(int $farmId, int $buildingId): Building
    {
        return Building::query()
            ->where('farm_id', $farmId)
            ->findOrFail($buildingId);
    }
}
