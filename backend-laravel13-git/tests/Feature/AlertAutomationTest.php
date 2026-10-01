<?php

namespace Tests\Feature;

use App\Models\Alert;
use App\Models\Farm;
use App\Models\Task;
use App\Services\AlertService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AlertAutomationTest extends TestCase
{
    use RefreshDatabase;

    public function test_scheduled_alert_command_creates_and_reopens_task_alerts_without_duplicates(): void
    {
        $farm = $this->farm();
        $task = Task::create([
            'farm_id' => $farm->id,
            'title' => 'Contrôler le bassin',
            'status' => 'todo',
            'reminder_at' => now()->subMinute(),
            'due_at' => now()->subMinute(),
        ]);

        $this->artisan('ferm:alerts:evaluate')->assertSuccessful();
        $this->assertDatabaseCount('alerts', 2);

        $this->artisan('ferm:alerts:evaluate')->assertSuccessful();
        $this->assertDatabaseCount('alerts', 2);

        Alert::query()->where('source_entity_id', (string) $task->id)->update([
            'status' => 'resolved',
            'resolved_at' => now(),
        ]);

        $this->artisan('ferm:alerts:evaluate')->assertSuccessful();

        $this->assertDatabaseCount('alerts', 2);
        $this->assertDatabaseMissing('alerts', [
            'source_entity_id' => (string) $task->id,
            'status' => 'resolved',
        ]);
    }

    public function test_low_stock_alert_is_reopened_when_the_condition_is_still_present(): void
    {
        $farm = $this->farm();
        $item = \App\Models\StockItem::create([
            'farm_id' => $farm->id,
            'name' => 'Aliment poisson',
            'category' => 'Aliment',
            'unit' => 'kg',
            'current_quantity' => 1,
            'minimum_threshold' => 5,
            'unit_cost' => 100,
        ]);
        $service = app(AlertService::class);

        $alert = $service->createLowStockAlert($item);
        $alert->update(['status' => 'resolved', 'resolved_at' => now()]);

        $service->createLowStockAlert($item);

        $this->assertDatabaseCount('alerts', 1);
        $this->assertDatabaseHas('alerts', ['id' => $alert->id, 'status' => 'open', 'resolved_at' => null]);
    }

    private function farm(): Farm
    {
        return Farm::create([
            'name' => 'Ferme Alertes',
            'slug' => 'ferme-alertes',
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => 'Gestionnaire',
            'contact_email' => 'alertes@example.test',
        ]);
    }
}
