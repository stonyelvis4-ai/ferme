<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Farm;
use App\Models\SanitaryTreatment;
use App\Models\StockItem;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthAndSanitaryTest extends TestCase
{
    use RefreshDatabase;

    public function test_bootstrap_status_reports_when_no_admin_exists(): void
    {
        $response = $this->getJson('/api/v1/auth/bootstrap-status');

        $response
            ->assertOk()
            ->assertJsonPath('data.has_admin', false);
    }

    public function test_register_admin_is_locked_when_an_admin_already_exists(): void
    {
        User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);

        $response = $this->postJson('/api/v1/auth/register-admin', [
            'name' => 'Second Admin',
            'email' => 'second-admin@example.com',
            'password' => 'Admin@12345',
        ]);

        $response->assertStatus(403);
    }

    public function test_authenticated_user_can_list_sanitary_treatments_for_own_farm(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);

        $farm = Farm::create([
            'name' => 'Ferme Test',
            'slug' => 'ferme-test',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);

        $admin->forceFill(['farm_id' => $farm->id])->save();

        SanitaryTreatment::create([
            'farm_id' => $farm->id,
            'type' => 'treatment',
            'name' => 'Vitamine croissance',
            'planned_date' => now()->toDateString(),
            'dosage' => '1 ml / litre',
            'quantity_used' => 2,
            'status' => 'planned',
            'cost' => 15000,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/v1/sanitary');

        $response
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Vitamine croissance');
    }

    public function test_user_assignment_is_limited_to_a_single_farm(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);

        $firstFarm = Farm::create([
            'name' => 'Ferme A',
            'slug' => 'ferme-a',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);

        $secondFarm = Farm::create([
            'name' => 'Ferme B',
            'slug' => 'ferme-b',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);

        $owner = User::factory()->create([
            'role' => Role::Owner,
            'account_status' => 'active',
            'is_active' => true,
            'farm_id' => $firstFarm->id,
        ]);

        DB::table('farm_user_assignments')->insert([
            'farm_id' => $firstFarm->id,
            'user_id' => $owner->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson("/api/v1/users/{$owner->id}/farms", [
            'farm_ids' => [$secondFarm->id],
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('data.farm_id', $secondFarm->id)
            ->assertJsonCount(1, 'data.assigned_farms');

        $this->assertDatabaseHas('farm_user_assignments', [
            'farm_id' => $secondFarm->id,
            'user_id' => $owner->id,
        ]);

        $this->assertDatabaseMissing('farm_user_assignments', [
            'farm_id' => $firstFarm->id,
            'user_id' => $owner->id,
        ]);
    }

    public function test_account_cannot_create_a_second_farm(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);

        $farm = Farm::create([
            'name' => 'Ferme Unique',
            'slug' => 'ferme-unique',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);

        $admin->forceFill(['farm_id' => $farm->id])->save();

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/farms', [
            'name' => 'Ferme Interdite',
            'slug' => 'ferme-interdite',
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('message', 'Ce compte est deja rattache a une ferme et ne peut pas en creer une deuxieme.');
    }

    public function test_stock_item_supports_unit_cost_column(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);

        $farm = Farm::create([
            'name' => 'Ferme Stock',
            'slug' => 'ferme-stock',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);

        $admin->forceFill(['farm_id' => $farm->id])->save();

        $stock = StockItem::create([
            'farm_id' => $farm->id,
            'name' => 'Aliment croissance',
            'category' => 'Aliment',
            'unit' => 'kg',
            'unit_cost' => 1250,
            'minimum_threshold' => 5,
            'current_quantity' => 30,
            'location' => 'Magasin A',
        ]);

        $this->assertDatabaseHas('stock_items', [
            'id' => $stock->id,
            'unit_cost' => 1250,
        ]);
    }
}
