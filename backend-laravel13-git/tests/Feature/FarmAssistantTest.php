<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Farm;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Http\UploadedFile;
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

    public function test_assistant_can_analyse_a_supported_farm_image_without_persisting_it(): void
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
                        'parts' => [['text' => 'Isolez l’animal si cela est sûr et contactez un vétérinaire.']],
                    ],
                ]],
            ]),
        ]);
        Sanctum::actingAs($user);

        $this->post('/api/v1/assistant/chat', [
            'message' => 'Cette poule présente des lésions sur la crête.',
            'image' => UploadedFile::fake()->image('poule-symptomes.jpg', 640, 480)->size(512),
        ])
            ->assertOk()
            ->assertJsonPath('data.answer', 'Isolez l’animal si cela est sûr et contactez un vétérinaire.');

        Http::assertSent(function (ClientRequest $request): bool {
            $payload = $request->data();
            $imageData = data_get($payload, 'contents.0.parts.1.inline_data.data');

            return data_get($payload, 'contents.0.parts.0.text') === 'Cette poule présente des lésions sur la crête.'
                && data_get($payload, 'contents.0.parts.1.inline_data.mime_type') === 'image/jpeg'
                && is_string($imageData)
                && $imageData !== ''
                && str_contains((string) data_get($payload, 'system_instruction.parts.0.text'), 'une image ne permet pas de confirmer une maladie');
        });
    }

    public function test_assistant_rejects_an_unsupported_image_type(): void
    {
        [$user] = $this->userWithFarm();
        config(['services.gemini.api_key' => 'gemini-testing-key']);
        Http::fake();
        Sanctum::actingAs($user);

        $this->post('/api/v1/assistant/chat', [
            'message' => 'Pouvez-vous analyser ce fichier ?',
            'image' => UploadedFile::fake()->create('symptomes.gif', 80, 'image/gif'),
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('image');

        Http::assertNothingSent();
    }

    public function test_local_development_uses_the_loopback_proxy_without_exposing_the_gemini_key(): void
    {
        [$user] = $this->userWithFarm();
        $this->app->detectEnvironment(fn () => 'local');
        config([
            'services.gemini.api_key' => 'gemini-testing-key',
            'services.gemini.model' => 'gemini-test-flash',
            'services.gemini.local_proxy_url' => 'http://127.0.0.1:8038',
            'services.gemini.local_proxy_token' => 'local-testing-token',
        ]);
        Http::fake([
            'http://127.0.0.1:8038' => Http::response([
                'candidates' => [[
                    'content' => [
                        'parts' => [['text' => 'Vérifiez les abreuvoirs chaque matin.']],
                    ],
                ]],
            ]),
        ]);
        Sanctum::actingAs($user);

        $this->postJson('/api/v1/assistant/chat', [
            'message' => 'Que vérifier le matin ?',
        ])
            ->assertOk()
            ->assertJsonPath('data.answer', 'Vérifiez les abreuvoirs chaque matin.');

        Http::assertSent(function (ClientRequest $request): bool {
            return $request->url() === 'http://127.0.0.1:8038'
                && $request->hasHeader('x-ferm-local-proxy-token', 'local-testing-token')
                && ! $request->hasHeader('x-goog-api-key')
                && data_get($request->data(), 'model') === 'gemini-test-flash'
                && data_get($request->data(), 'request.contents.0.parts.0.text') === 'Que vérifier le matin ?';
        });
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
