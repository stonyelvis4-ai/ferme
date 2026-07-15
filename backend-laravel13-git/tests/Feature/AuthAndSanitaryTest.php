<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Farm;
use App\Models\SanitaryTreatment;
use App\Models\User;
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
}
