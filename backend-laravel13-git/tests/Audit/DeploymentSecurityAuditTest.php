<?php

namespace Tests\Audit;

use App\Enums\Role;
use App\Models\Farm;
use App\Models\StockItem;
use App\Models\User;
use App\Services\StockService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

// Regression tests run with the default suite against an isolated database.
class DeploymentSecurityAuditTest extends TestCase
{
    use RefreshDatabase;

    private function administrator(): User
    {
        $user = User::factory()->create(['role' => Role::Admin, 'account_status' => 'active', 'is_active' => true]);
        $farm = Farm::create(['name' => 'Audit', 'slug' => 'audit-'.$user->id, 'administrator_id' => $user->id,
            'status' => 'active', 'currency' => 'FCFA', 'area_unit' => 'ha',
            'manager_name' => 'Audit', 'contact_email' => $user->email]);
        $user->forceFill(['farm_id' => $farm->id])->save();
        return $user;
    }

    public function test_registration_token_has_server_side_expiration(): void
    {
        $this->postJson('/api/v1/auth/register-admin', ['name' => 'Audit',
            'email' => 'audit@example.test', 'password' => 'AuditSecure!1234'])->assertCreated();
        $this->assertNotNull(User::where('email', 'audit@example.test')->firstOrFail()->tokens()->firstOrFail()->expires_at);
    }

    public function test_public_auth_rejects_cross_site_forms(): void
    {
        $this->post('/api/v1/auth/login', ['email' => 'attacker@example.test', 'password' => 'irrelevant'])->assertStatus(415);
        $this->withHeader('Origin', 'https://evil.example.test')
            ->postJson('/api/v1/auth/login', ['email' => 'attacker@example.test', 'password' => 'irrelevant'])->assertForbidden();
    }

    public function test_google_client_configuration_is_public_but_can_be_disabled_without_exposing_a_secret(): void
    {
        $originalClientId = config('services.google.client_id');

        try {
            config(['services.google.client_id' => 'client-id.apps.googleusercontent.com']);
            $this->getJson('/api/v1/auth/google-config')
                ->assertOk()
                ->assertJsonPath('data.enabled', true)
                ->assertJsonPath('data.client_id', 'client-id.apps.googleusercontent.com');

            config(['services.google.client_id' => '']);
            $this->getJson('/api/v1/auth/google-config')
                ->assertOk()
                ->assertJsonPath('data.enabled', false)
                ->assertJsonPath('data.client_id', null);
        } finally {
            config(['services.google.client_id' => $originalClientId]);
        }
    }

    public function test_valid_cookie_authenticates_the_frontend(): void
    {
        $user = $this->administrator();
        $token = $user->createToken('audit')->plainTextToken;
        config(['cors.allowed_origins' => ['https://app.example.test']]);
        $this->withUnencryptedCookie('fermplus_api_token', $token)
            ->withHeaders(['Origin' => 'https://app.example.test', 'Accept' => 'application/json'])
            ->get('/api/v1/finances')->assertOk();
    }

    public function test_independent_module_operations_do_not_collide(): void
    {
        $user = $this->administrator();
        $service = app(StockService::class);
        foreach (['egg_production', 'crop_harvest'] as $type) {
            $item = StockItem::create(['farm_id' => $user->farm_id, 'name' => $type,
                'category' => 'production', 'unit' => 'kg', 'current_quantity' => 0, 'minimum_threshold' => 0]);
            $service->recordMovement(['farm_id' => $user->farm_id, 'stock_item_id' => $item->id,
                'type' => 'in', 'quantity' => 10, 'source_module' => $type,
                'source_entity_type' => $type, 'source_entity_id' => '1', 'operation_id' => '1']);
            $this->assertEquals(10, $item->fresh()->current_quantity);
        }
    }

    public function test_cookie_write_rejects_missing_or_hostile_origin(): void
    {
        $user = $this->administrator();
        config(['cors.allowed_origins' => ['https://app.example.test']]);
        $this->withCredentials();
        $this->withUnencryptedCookie('fermplus_api_token', $user->createToken('audit')->plainTextToken);
        $payload = ['type' => 'expense', 'amount' => 50, 'category' => 'test'];
        $this->postJson('/api/v1/finances', $payload)->assertForbidden();
        $this->withHeader('Origin', 'https://evil.example.test')->postJson('/api/v1/finances', $payload)->assertForbidden();
        $this->assertDatabaseCount('financial_transactions', 0);
        $this->withHeader('Origin', 'https://app.example.test')->postJson('/api/v1/finances', $payload)->assertCreated();
    }

    public function test_expired_legacy_token_is_rejected(): void
    {
        $user = $this->administrator();
        $token = $user->createToken('legacy');
        $token->accessToken->forceFill(['created_at' => now()->subDays(2)])->save();
        $this->withCredentials()->withUnencryptedCookie('fermplus_api_token', $token->plainTextToken)
            ->getJson('/api/v1/finances')->assertUnauthorized();
    }

    public function test_google_linked_account_must_verify_current_local_password_before_changing_it(): void
    {
        $user = $this->administrator();
        $user->forceFill(['google_id' => 'google-subject', 'password' => bcrypt('CurrentPassword!123')])->save();
        \Laravel\Sanctum\Sanctum::actingAs($user);
        $payload = ['current_password' => '', 'password' => 'ReplacementPassword!123', 'password_confirmation' => 'ReplacementPassword!123'];
        $this->postJson('/api/v1/auth/password', $payload)->assertUnprocessable()->assertJsonValidationErrors('current_password');
        $payload['current_password'] = 'wrong password';
        $this->postJson('/api/v1/auth/password', $payload)->assertUnprocessable();
        $payload['current_password'] = 'CurrentPassword!123';
        $this->postJson('/api/v1/auth/password', $payload)->assertOk();
    }

    public function test_purchase_total_is_recomputed_and_creation_replay_is_safe(): void
    {
        $user = $this->administrator();
        \Laravel\Sanctum\Sanctum::actingAs($user);
        $payload = ['name' => 'Test aliment', 'unit' => 'kg', 'current_quantity' => 2.5,
            'unit_cost' => 100, 'minimum_threshold' => 0, 'purchase_total_cost' => 0];
        $this->withHeader('Idempotency-Key', 'offline:article-1');
        $first = $this->postJson('/api/v1/stocks', $payload)->assertCreated();
        $second = $this->postJson('/api/v1/stocks', $payload)->assertCreated();
        $this->assertSame($first->json(), $second->json());
        $this->assertDatabaseCount('stock_items', 1);
        $this->assertDatabaseHas('financial_transactions', ['farm_id' => $user->farm_id, 'amount' => 250]);
        $payload['current_quantity'] = 3;
        $this->postJson('/api/v1/stocks', $payload)->assertStatus(409);
        $this->assertDatabaseCount('stock_movements', 1);
    }

    public function test_fractional_fish_sale_does_not_generate_feeding_expense(): void
    {
        $user = $this->administrator();
        $item = StockItem::create(['farm_id' => $user->farm_id, 'name' => 'Poissons',
            'category' => 'production', 'unit' => 'kg', 'unit_cost' => 100,
            'current_quantity' => 1, 'minimum_threshold' => 0]);
        app(StockService::class)->recordMovement(['farm_id' => $user->farm_id,
            'stock_item_id' => $item->id, 'type' => 'out', 'quantity' => 0.4,
            'source_module' => 'pisciculture', 'source_entity_type' => 'fish_sale']);
        $this->assertEquals(0.6, $item->fresh()->current_quantity);
        $this->assertDatabaseCount('financial_transactions', 0);
    }

    public function test_invalid_harvest_is_rejected_before_any_sale_side_effect(): void
    {
        $user = $this->administrator();
        try {
            app(\App\Services\PiscicultureService::class)->recordSale([
                'farm_id' => $user->farm_id, 'fish_pond_id' => 9, 'fish_harvest_id' => 99,
            ]);
            $this->fail('Invalid harvest accepted');
        } catch (\Illuminate\Validation\ValidationException $error) {
            $this->assertArrayHasKey('fish_harvest_id', $error->errors());
        }
        $this->assertDatabaseCount('fish_sales', 0);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_stock_and_audit_are_rolled_back_together(): void
    {
        $user = $this->administrator();
        $item = StockItem::create(['farm_id' => $user->farm_id, 'name' => 'Rollback',
            'category' => 'other', 'unit' => 'kg', 'current_quantity' => 10, 'minimum_threshold' => 0]);
        $this->mock(\App\Services\AuditService::class)->shouldReceive('record')->andThrow(new \RuntimeException('Test failure'));
        try {
            app(StockService::class)->recordMovement(['farm_id' => $user->farm_id,
                'stock_item_id' => $item->id, 'type' => 'out', 'quantity' => 2]);
            $this->fail('Expected failure');
        } catch (\RuntimeException $error) {
            $this->assertSame('Test failure', $error->getMessage());
        }
        $this->assertEquals(10, $item->fresh()->current_quantity);
        $this->assertDatabaseCount('stock_movements', 0);
    }

    public function test_sale_rejects_harvest_from_another_farm_or_pond(): void
    {
        $user = $this->administrator();
        $other = $this->administrator();
        $makePond = fn ($farmId) => \App\Models\FishPond::create([
            'farm_id' => $farmId, 'name' => 'Pond', 'pond_type' => 'bassin',
            'species' => 'tilapia', 'initial_fish_count' => 10, 'stocking_date' => '2026-09-01',
        ]);
        $pond = $makePond($user->farm_id);
        foreach ([$makePond($user->farm_id), $makePond($other->farm_id)] as $wrongPond) {
            $harvest = \App\Models\FishHarvest::create(['farm_id' => $wrongPond->farm_id,
                'fish_pond_id' => $wrongPond->id, 'harvest_date' => '2026-09-10',
                'total_weight_kg' => 1, 'sellable_weight_kg' => 1, 'destination' => 'stock']);
            \Laravel\Sanctum\Sanctum::actingAs($user);
            $this->postJson('/api/v1/pisciculture/sales', [
                'fish_pond_id' => $pond->id, 'fish_harvest_id' => $harvest->id,
                'sale_date' => '2026-09-10', 'customer_name' => 'Client',
                'kilograms_sold' => 0.4, 'unit_price' => 100, 'payment_method' => 'cash',
            ])->assertUnprocessable()->assertJsonValidationErrors('fish_harvest_id');
        }
        $this->assertDatabaseCount('fish_sales', 0);
        $this->assertDatabaseCount('financial_transactions', 0);
    }

    public function test_production_verification_rejects_unsafe_configuration_and_accepts_safe_configuration(): void
    {
        config(['app.env' => 'local', 'app.debug' => true, 'app.key' => null,
            'app.url' => 'http://localhost', 'session.secure' => false,
            'ferm.deployment.database_driver' => 'sqlite', 'cors.allowed_origins' => ['http://localhost:3000']]);
        $this->assertSame(1, Artisan::call('ferm:verify-production'));

        config(['app.env' => 'production', 'app.debug' => false, 'app.key' => 'base64:'.base64_encode(random_bytes(32)),
            'app.url' => 'https://api.fermplus.test', 'session.secure' => true,
            'session.same_site' => 'lax', 'ferm.deployment.database_driver' => 'mysql',
            'cors.allowed_origins' => ['https://app.fermplus.test']]);
        $this->assertSame(0, Artisan::call('ferm:verify-production'));
    }
}
