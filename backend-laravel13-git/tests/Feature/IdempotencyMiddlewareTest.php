<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Farm;
use App\Models\Task;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class IdempotencyMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    private function actingAdmin(): array
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);
        $farm = Farm::create([
            'name' => 'Ferme idempotence',
            'slug' => 'ferme-idempotence-'.$admin->id,
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);
        $admin->forceFill(['farm_id' => $farm->id])->save();
        Sanctum::actingAs($admin);

        return [$admin, $farm];
    }

    private function taskFor(Farm $farm, string $title = 'Tâche initiale'): Task
    {
        return Task::create([
            'farm_id' => $farm->id,
            'title' => $title,
            'priority' => 'normal',
            'status' => 'todo',
        ]);
    }

    public function test_patch_replay_returns_the_original_response_without_repeating_side_effects(): void
    {
        [, $farm] = $this->actingAdmin();
        $task = $this->taskFor($farm);
        $payload = ['title' => 'Tâche mise à jour'];

        $first = $this->withHeader('Idempotency-Key', 'offline:task-patch-1')
            ->patchJson("/api/v1/tasks/{$task->id}", $payload)
            ->assertOk();
        $second = $this->withHeader('Idempotency-Key', 'offline:task-patch-1')
            ->patchJson("/api/v1/tasks/{$task->id}", $payload)
            ->assertOk();

        $this->assertSame($first->getContent(), $second->getContent());
        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'title' => 'Tâche mise à jour']);
        $this->assertDatabaseCount('audit_logs', 1);
    }

    public function test_patch_rejects_reusing_a_key_with_a_different_payload(): void
    {
        [, $farm] = $this->actingAdmin();
        $task = $this->taskFor($farm);

        $this->withHeader('Idempotency-Key', 'offline:task-patch-conflict')
            ->patchJson("/api/v1/tasks/{$task->id}", ['title' => 'Premier titre'])
            ->assertOk();
        $this->withHeader('Idempotency-Key', 'offline:task-patch-conflict')
            ->patchJson("/api/v1/tasks/{$task->id}", ['title' => 'Autre titre'])
            ->assertConflict();

        $this->assertDatabaseHas('tasks', ['id' => $task->id, 'title' => 'Premier titre']);
    }

    public function test_delete_replay_returns_the_cached_response_after_the_resource_is_gone(): void
    {
        [, $farm] = $this->actingAdmin();
        $task = $this->taskFor($farm);

        $first = $this->withHeader('Idempotency-Key', 'offline:task-delete-1')
            ->deleteJson("/api/v1/tasks/{$task->id}")
            ->assertOk();
        $second = $this->withHeader('Idempotency-Key', 'offline:task-delete-1')
            ->deleteJson("/api/v1/tasks/{$task->id}")
            ->assertOk();

        $this->assertSame($first->getContent(), $second->getContent());
        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
        $this->assertDatabaseCount('audit_logs', 1);
    }

    public function test_same_key_is_safe_to_reuse_for_different_mutation_methods(): void
    {
        [, $farm] = $this->actingAdmin();
        $task = $this->taskFor($farm);

        $this->withHeader('Idempotency-Key', 'offline:task-method-1')
            ->patchJson("/api/v1/tasks/{$task->id}", ['title' => 'À supprimer'])
            ->assertOk();
        $this->withHeader('Idempotency-Key', 'offline:task-method-1')
            ->deleteJson("/api/v1/tasks/{$task->id}")
            ->assertOk();

        $this->assertDatabaseMissing('tasks', ['id' => $task->id]);
    }
}
