<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Crop;
use App\Models\Farm;
use App\Models\FishPond;
use App\Models\NutritionPlanOccurrence;
use App\Models\Plot;
use App\Models\StockItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NutritionPlanTest extends TestCase
{
    use RefreshDatabase;

    public function test_fish_plan_calculates_biomass_ration_and_creates_thirty_unique_tasks(): void
    {
        [$admin, $farm] = $this->farmContext();
        $pond = FishPond::create([
            'farm_id' => $farm->id, 'name' => 'Bassin Nord', 'pond_type' => 'bassin', 'capacity_kg' => 500,
            'species' => 'Tilapia', 'initial_fish_count' => 1000, 'current_estimated_count' => 980,
            'stocking_date' => now()->toDateString(), 'status' => 'active', 'biomass_kg' => 200,
        ]);
        $feed = $this->stock($farm, 'Granulé piscicole', 200);
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/pisciculture/feed-plans', [
            'farm_id' => $farm->id, 'fish_pond_id' => $pond->id, 'stock_item_id' => $feed->id,
            'plan_name' => 'Croissance tilapia', 'ration_mode' => 'biomass_percent', 'ration_value' => 2,
            'feedings_per_day' => 3, 'start_date' => now()->toDateString(),
        ])->assertCreated()->assertJsonPath('data.target_daily_quantity_kg', '4.000');

        $planId = $response->json('data.id');
        $this->assertDatabaseCount('nutrition_plan_occurrences', 30);
        $this->assertDatabaseCount('tasks', 30);

        app(\App\Services\NutritionPlanService::class)->maintainHorizon();
        $this->assertDatabaseCount('nutrition_plan_occurrences', 30);
        $this->assertDatabaseHas('nutrition_plan_occurrences', [
            'plan_type' => 'fish', 'plan_id' => $planId, 'planned_quantity_kg' => 4,
        ]);
    }

    public function test_fish_occurrence_validation_consumes_real_stock_once_and_rejects_insufficient_stock(): void
    {
        [$admin, $farm] = $this->farmContext();
        $pond = FishPond::create([
            'farm_id' => $farm->id, 'name' => 'Bassin Sud', 'pond_type' => 'bassin', 'capacity_kg' => 500,
            'species' => 'Tilapia', 'initial_fish_count' => 100, 'current_estimated_count' => 100,
            'stocking_date' => now()->toDateString(), 'status' => 'active', 'biomass_kg' => 100,
        ]);
        $feed = $this->stock($farm, 'Granulé réel', 10);
        Sanctum::actingAs($admin);
        $this->postJson('/api/v1/pisciculture/feed-plans', [
            'farm_id' => $farm->id, 'fish_pond_id' => $pond->id, 'stock_item_id' => $feed->id,
            'plan_name' => 'Plan réel', 'ration_mode' => 'fixed_kg', 'ration_value' => 2,
            'feedings_per_day' => 2, 'start_date' => now()->toDateString(),
        ])->assertCreated();

        $occurrence = NutritionPlanOccurrence::query()->where('farm_id', $farm->id)->firstOrFail();
        $this->postJson('/api/v1/nutrition-plan-occurrences/' . $occurrence->id . '/complete', [
            'actual_quantity_kg' => 4, 'stock_item_id' => $feed->id, 'notes' => 'Deux passages effectués',
        ])->assertOk();

        $this->assertDatabaseHas('nutrition_plan_occurrences', ['id' => $occurrence->id, 'status' => 'completed', 'actual_quantity_kg' => 4]);
        $this->assertDatabaseHas('stock_items', ['id' => $feed->id, 'current_quantity' => 6]);
        $this->assertDatabaseHas('tasks', ['id' => $occurrence->task_id, 'status' => 'completed']);
        $this->postJson('/api/v1/nutrition-plan-occurrences/' . $occurrence->id . '/complete', ['actual_quantity_kg' => 1])
            ->assertUnprocessable();

        $next = NutritionPlanOccurrence::query()->where('farm_id', $farm->id)->where('status', 'todo')->firstOrFail();
        $this->postJson('/api/v1/nutrition-plan-occurrences/' . $next->id . '/complete', ['actual_quantity_kg' => 99])
            ->assertUnprocessable()->assertJsonValidationErrors('actual_quantity_kg');
    }

    public function test_crop_plan_calculates_dose_from_plot_area_and_creates_traceable_operation(): void
    {
        [$admin, $farm] = $this->farmContext();
        $crop = Crop::create([
            'farm_id' => $farm->id, 'name' => 'Maïs', 'variety' => 'Test', 'cycle_days' => 100,
            'planting_date' => now()->toDateString(), 'area' => 2, 'status' => 'growing',
        ]);
        $plot = Plot::create([
            'farm_id' => $farm->id, 'crop_id' => $crop->id, 'name' => 'Parcelle A', 'area' => 2,
            'soil_type' => 'Argileux', 'status' => 'active',
        ]);
        $fertilizer = $this->stock($farm, 'NPK 15-15-15', 50);
        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/cultures/nutrition-plans', [
            'farm_id' => $farm->id, 'crop_id' => $crop->id, 'plot_id' => $plot->id, 'stock_item_id' => $fertilizer->id,
            'plan_name' => 'Fumure de fond', 'dose_kg_per_hectare' => 10, 'application_dates' => [now()->toDateString()],
        ])->assertCreated();

        $occurrence = NutritionPlanOccurrence::query()->where('farm_id', $farm->id)->firstOrFail();
        $this->assertDatabaseHas('nutrition_plan_occurrences', ['id' => $occurrence->id, 'planned_quantity_kg' => 20]);
        $this->postJson('/api/v1/nutrition-plan-occurrences/' . $occurrence->id . '/complete', ['actual_quantity_kg' => 18])
            ->assertOk();

        $this->assertDatabaseHas('stock_items', ['id' => $fertilizer->id, 'current_quantity' => 32]);
        $this->assertDatabaseHas('crop_operations', ['farm_id' => $farm->id, 'crop_id' => $crop->id, 'plot_id' => $plot->id, 'type' => 'fertilization', 'quantity' => 18]);
    }

    public function test_owner_cannot_create_a_nutrition_plan_or_access_another_farm_occurrence(): void
    {
        [$admin, $farm] = $this->farmContext();
        $owner = User::factory()->create(['role' => Role::Owner, 'farm_id' => $farm->id, 'account_status' => 'active', 'is_active' => true]);
        $pond = FishPond::create([
            'farm_id' => $farm->id, 'name' => 'Bassin lecture', 'pond_type' => 'bassin', 'capacity_kg' => 20,
            'species' => 'Silure', 'initial_fish_count' => 20, 'current_estimated_count' => 20,
            'stocking_date' => now()->toDateString(), 'status' => 'active', 'biomass_kg' => 10,
        ]);
        $feed = $this->stock($farm, 'Aliment restreint', 10);
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/pisciculture/feed-plans', [
            'farm_id' => $farm->id, 'fish_pond_id' => $pond->id, 'stock_item_id' => $feed->id,
            'plan_name' => 'Interdit', 'ration_mode' => 'fixed_kg', 'ration_value' => 1,
            'feedings_per_day' => 1, 'start_date' => now()->toDateString(),
        ])->assertForbidden();
    }

    private function farmContext(): array
    {
        $admin = User::factory()->create(['role' => Role::Admin, 'account_status' => 'active', 'is_active' => true]);
        $farm = Farm::create([
            'name' => 'Ferme Nutrition ' . $admin->id, 'slug' => 'ferme-nutrition-' . $admin->id,
            'administrator_id' => $admin->id, 'status' => 'active', 'currency' => 'FCFA', 'area_unit' => 'ha',
            'manager_name' => $admin->name, 'contact_email' => $admin->email,
        ]);
        $admin->forceFill(['farm_id' => $farm->id])->save();

        return [$admin, $farm];
    }

    private function stock(Farm $farm, string $name, float $quantity): StockItem
    {
        return StockItem::create([
            'farm_id' => $farm->id, 'name' => $name, 'category' => 'Aliment', 'unit' => 'kg',
            'unit_cost' => 100, 'minimum_threshold' => 1, 'current_quantity' => $quantity,
        ]);
    }
}
