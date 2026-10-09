<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Farm;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserPreferencesTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_farm_member_can_update_only_their_own_profile_and_preferences(): void
    {
        [$user, $farm] = $this->userWithFarm();
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/me/preferences', [
            'name' => 'Awa Koné',
            'email' => 'awa.kone@example.test',
            'preferences' => [
                'sound_alerts' => true,
                'warning_alerts' => false,
                'critical_alerts' => true,
                'alert_volume' => 42,
                'default_view' => 'agenda',
            ],
            'role' => 'admin',
            'farm_id' => 999999,
        ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Awa Koné')
            ->assertJsonPath('data.preferences.alert_volume', 42)
            ->assertJsonPath('data.preferences.default_view', 'agenda');

        $user->refresh();
        $this->assertSame(Role::Owner, $user->role);
        $this->assertSame($farm->id, $user->farm_id);
        $this->assertSame(42, $user->preferences['alert_volume']);
        $this->assertSame('agenda', $user->preferences['default_view']);
    }

    public function test_preferences_require_authentication_and_valid_values(): void
    {
        $this->patchJson('/api/v1/me/preferences', [])->assertUnauthorized();

        [$user] = $this->userWithFarm();
        Sanctum::actingAs($user);

        $this->patchJson('/api/v1/me/preferences', [
            'name' => $user->name,
            'email' => $user->email,
            'preferences' => [
                'sound_alerts' => true,
                'warning_alerts' => true,
                'critical_alerts' => true,
                'alert_volume' => 101,
                'default_view' => 'finance',
            ],
        ])->assertUnprocessable()->assertJsonValidationErrors([
            'preferences.alert_volume',
            'preferences.default_view',
        ]);
    }

    /** @return array{User, Farm} */
    private function userWithFarm(): array
    {
        $user = User::factory()->create([
            'role' => Role::Owner,
            'account_status' => 'active',
            'is_active' => true,
        ]);
        $farm = Farm::create([
            'name' => 'Ferme Préférences',
            'slug' => 'ferme-preferences',
            'administrator_id' => null,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => 'Responsable',
            'contact_email' => 'contact@example.test',
        ]);
        $user->forceFill(['farm_id' => $farm->id])->save();

        return [$user, $farm];
    }
}
