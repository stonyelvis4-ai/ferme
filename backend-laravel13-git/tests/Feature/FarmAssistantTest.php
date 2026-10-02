<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Farm;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FarmAssistantTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_farm_member_can_receive_a_farm_assistant_response(): void
    {
        [$user] = $this->userWithFarm();
        config([
            'services.gemini.api_key' => 'gemini-testing-key',
            'services.gemini.model' => 'gemini-test-flash',
        ]);
        Http::fake([
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [[
                    'content' => [
                        'parts' => [['text' => 'Commencez par nettoyer les abreuvoirs chaque jour.']],
                    ],
                ]],
            ]),
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/assistant/chat', [
            'message' => 'Comment protéger mon poulailler ?',
            'history' => [['role' => 'assistant', 'content' => 'Bonjour.']],
        ])
            ->assertOk()
            ->assertJsonPath('data.answer', 'Commencez par nettoyer les abreuvoirs chaque jour.');

        Http::assertSent(function (ClientRequest $request): bool {
            $payload = $request->data();

            return $request->hasHeader('x-goog-api-key', 'gemini-testing-key')
                && str_contains($request->url(), 'gemini-test-flash:generateContent')
                && data_get($payload, 'contents.0.role') === 'model'
                && data_get($payload, 'contents.1.parts.0.text') === 'Comment protéger mon poulailler ?'
                && str_contains((string) data_get($payload, 'system_instruction.parts.0.text'), 'ne pose aucun diagnostic');
        });
    }

    public function test_assistant_does_not_call_gemini_when_no_key_is_configured(): void
    {
        [$user] = $this->userWithFarm();
        config(['services.gemini.api_key' => '']);
        Http::fake();
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/assistant/chat', [
            'message' => 'Comment améliorer mon stock d’aliment ?',
        ])
            ->assertStatus(503)
            ->assertJsonPath('message', 'L’assistant agricole n’est pas encore configuré.');

        Http::assertNothingSent();
    }

    public function test_assistant_requires_an_authenticated_farm_member_and_valid_message(): void
    {
        $this->postJson('/api/v1/assistant/chat', ['message' => 'Bonjour'])
            ->assertUnauthorized();

        [$user] = $this->userWithFarm();
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/assistant/chat', ['message' => 'x'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('message');
    }

    /** @return array{User, Farm} */
    private function userWithFarm(): array
    {
        $user = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);
        $farm = Farm::create([
            'name' => 'Ferme Assistant',
            'slug' => 'ferme-assistant',
            'administrator_id' => $user->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $user->name,
            'contact_email' => $user->email,
        ]);
        $user->forceFill(['farm_id' => $farm->id])->save();

        return [$user, $farm];
    }
}
