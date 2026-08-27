<?php

namespace Tests\Feature;

use App\Enums\Role;
use App\Models\Farm;
use App\Models\FinancialTransaction;
use App\Models\Crop;
use App\Models\Plot;
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

    public function test_authenticated_user_without_farm_is_denied_tenant_routes(): void
    {
        $user = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
            'farm_id' => null,
        ]);

        Sanctum::actingAs($user);

        $this->getJson('/api/v1/farms')->assertForbidden();
    }

    public function test_owner_cannot_trigger_alert_evaluation(): void
    {
        $owner = User::factory()->create([
            'role' => Role::Owner,
            'account_status' => 'active',
            'is_active' => true,
        ]);

        $farm = Farm::create([
            'name' => 'Ferme Lecture Seule',
            'slug' => 'ferme-lecture-seule',
            'administrator_id' => null,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => 'Administrateur',
            'contact_email' => 'admin@example.com',
        ]);

        $owner->forceFill(['farm_id' => $farm->id])->save();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/alerts/evaluate')
            ->assertForbidden();
    }

    public function test_completed_sanitary_treatment_creates_stock_and_expense_entries(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);
        $farm = Farm::create([
            'name' => 'Ferme Sanitaire Finance',
            'slug' => 'ferme-sanitaire-finance',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);
        $admin->forceFill(['farm_id' => $farm->id])->save();
        $product = StockItem::create([
            'farm_id' => $farm->id,
            'name' => 'Vaccin test',
            'category' => 'Vaccin',
            'unit' => 'dose',
            'unit_cost' => 1200,
            'minimum_threshold' => 1,
            'current_quantity' => 10,
        ]);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/sanitary', [
            'farm_id' => $farm->id,
            'type' => 'vaccine',
            'name' => 'Vaccination test',
            'planned_date' => now()->toDateString(),
            'product_id' => $product->id,
            'quantity_used' => 2,
            'status' => 'completed',
            'cost' => 2500,
        ]);

        $response->assertCreated();
        $treatment = SanitaryTreatment::query()->latest('id')->firstOrFail();

        $this->assertNotNull($treatment->stock_movement_id);
        $this->assertNotNull($treatment->financial_transaction_id);
        $this->assertDatabaseHas('stock_items', [
            'id' => $product->id,
            'current_quantity' => 8,
        ]);
        $this->assertDatabaseHas('financial_transactions', [
            'id' => $treatment->financial_transaction_id,
            'farm_id' => $farm->id,
            'type' => 'expense',
            'amount' => 2500,
            'source_entity_type' => 'sanitary_treatment',
        ]);

        $this->patchJson('/api/v1/sanitary/' . $treatment->id, [
            'status' => 'completed',
        ])->assertOk();

        $this->assertDatabaseCount('financial_transactions', 1);
        $this->assertDatabaseCount('stock_movements', 1);
    }

    public function test_pisciculture_stock_movement_creates_one_expense_and_debits_stock_once(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);
        $farm = Farm::create([
            'name' => 'Ferme Aliment Piscicole',
            'slug' => 'ferme-aliment-piscicole',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);
        $admin->forceFill(['farm_id' => $farm->id])->save();
        $product = StockItem::create([
            'farm_id' => $farm->id,
            'name' => 'Granulé poissons',
            'category' => 'Aliment',
            'unit' => 'kg',
            'unit_cost' => 900,
            'minimum_threshold' => 1,
            'current_quantity' => 20,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/stocks/movements', [
            'farm_id' => $farm->id,
            'stock_item_id' => $product->id,
            'type' => 'out',
            'quantity' => 5,
            'source_module' => 'Pisciculture',
            'source_entity_type' => 'fish_pond',
            'source_entity_id' => '12',
            'operation_id' => 'fish-feed-test-1',
        ])->assertCreated();

        $this->assertDatabaseHas('stock_items', [
            'id' => $product->id,
            'current_quantity' => 15,
        ]);
        $this->assertDatabaseHas('financial_transactions', [
            'farm_id' => $farm->id,
            'type' => 'expense',
            'amount' => 4500,
            'source_module' => 'pisciculture',
            'operation_id' => 'fish-feed-test-1',
        ]);

        $this->postJson('/api/v1/stocks/movements', [
            'farm_id' => $farm->id,
            'stock_item_id' => $product->id,
            'type' => 'out',
            'quantity' => 5,
            'source_module' => 'Pisciculture',
            'source_entity_type' => 'fish_pond',
            'source_entity_id' => '12',
            'operation_id' => 'fish-feed-test-1',
        ])->assertCreated();

        $this->assertDatabaseHas('stock_items', [
            'id' => $product->id,
            'current_quantity' => 15,
        ]);
        $this->assertDatabaseCount('financial_transactions', 1);
        $this->assertDatabaseCount('stock_movements', 1);
    }

    public function test_pisciculture_flow_connects_stocking_harvest_sale_finance_and_audit(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);
        $farm = Farm::create([
            'name' => 'Ferme Flux Piscicole',
            'slug' => 'ferme-flux-piscicole',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);
        $admin->forceFill(['farm_id' => $farm->id])->save();

        Sanctum::actingAs($admin);

        $pondResponse = $this->postJson('/api/v1/pisciculture', [
            'farm_id' => $farm->id,
            'name' => 'Bassin flux test',
            'pond_type' => 'Bâche',
            'species' => 'Tilapia',
            'initial_fish_count' => 100,
            'stocking_date' => now()->toDateString(),
            'current_estimated_count' => 100,
            'average_weight_kg' => 0.2,
            'biomass_kg' => 20,
            'unit_cost' => 100,
        ])->assertCreated();

        $pondId = (int) $pondResponse->json('data.id');

        $this->postJson('/api/v1/pisciculture/stockings', [
            'farm_id' => $farm->id,
            'fish_pond_id' => $pondId,
            'stocking_date' => now()->toDateString(),
            'fish_count' => 20,
            'average_weight_kg' => 0.1,
            'total_weight_kg' => 2,
            'unit_cost' => 120,
        ])->assertCreated();

        $harvestResponse = $this->postJson('/api/v1/pisciculture/harvests', [
            'farm_id' => $farm->id,
            'fish_pond_id' => $pondId,
            'harvest_date' => now()->toDateString(),
            'total_weight_kg' => 10,
            'losses_kg' => 1,
            'destination' => 'Vente locale',
        ])->assertCreated();

        $this->assertDatabaseHas('stock_items', [
            'farm_id' => $farm->id,
            'name' => 'Poissons',
            'current_quantity' => 9,
        ]);

        $this->postJson('/api/v1/pisciculture/sales', [
            'farm_id' => $farm->id,
            'fish_pond_id' => $pondId,
            'fish_harvest_id' => $harvestResponse->json('data.id'),
            'sale_date' => now()->toDateString(),
            'customer_name' => 'Client piscicole test',
            'kilograms_sold' => 5,
            'unit_price' => 2500,
            'payment_method' => 'cash',
        ])->assertCreated();

        $this->assertDatabaseHas('stock_items', [
            'farm_id' => $farm->id,
            'name' => 'Poissons',
            'current_quantity' => 4,
        ]);
        $this->assertDatabaseHas('financial_transactions', [
            'farm_id' => $farm->id,
            'type' => 'income',
            'amount' => 12500,
            'source_module' => 'pisciculture',
            'source_entity_type' => 'fish_sale',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'farm_id' => $farm->id,
            'module' => 'pisciculture',
            'action' => 'sale_recorded',
        ]);
    }

    public function test_financial_operation_is_idempotent_for_replayed_sync_request(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);
        $farm = Farm::create([
            'name' => 'Ferme Finance Idempotente',
            'slug' => 'ferme-finance-idempotente',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);
        $admin->forceFill(['farm_id' => $farm->id])->save();
        Sanctum::actingAs($admin);

        $payload = [
            'farm_id' => $farm->id,
            'type' => 'expense',
            'amount' => 15000,
            'category' => 'Test synchronisation',
            'description' => 'Ecriture rejouee',
            'source_module' => 'Finances',
            'operation_id' => 'finance-replay-1',
        ];

        $this->postJson('/api/v1/finances', $payload)->assertCreated();
        $this->postJson('/api/v1/finances', $payload)->assertCreated();

        $this->assertDatabaseCount('financial_transactions', 1);
        $this->assertDatabaseHas('financial_transactions', [
            'farm_id' => $farm->id,
            'operation_id' => 'finance-replay-1',
            'amount' => 15000,
        ]);
    }

    public function test_layer_flow_connects_production_stock_sale_finance_and_audit(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);
        $farm = Farm::create([
            'name' => 'Ferme Flux Pondeuses',
            'slug' => 'ferme-flux-pondeuses',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);
        $admin->forceFill(['farm_id' => $farm->id])->save();

        Sanctum::actingAs($admin);

        $batchResponse = $this->postJson('/api/v1/pondeuses', [
            'farm_id' => $farm->id,
            'name' => 'Lot test flux',
            'breed' => 'Isa Brown',
            'entry_date' => now()->toDateString(),
            'initial_count' => 100,
            'unit_cost' => 150,
        ])->assertCreated();

        $batchId = (int) $batchResponse->json('data.id');

        $this->postJson('/api/v1/pondeuses/productions', [
            'farm_id' => $farm->id,
            'layer_batch_id' => $batchId,
            'production_date' => now()->toDateString(),
            'eggs_produced' => 60,
            'broken_eggs' => 2,
        ])->assertCreated();

        $this->assertDatabaseHas('stock_items', [
            'farm_id' => $farm->id,
            'name' => 'Oeufs',
            'current_quantity' => 58,
        ]);

        $this->postJson('/api/v1/pondeuses/sales', [
            'farm_id' => $farm->id,
            'layer_batch_id' => $batchId,
            'sale_date' => now()->toDateString(),
            'customer_name' => 'Client test',
            'trays_sold' => 1,
            'eggs_sold' => 30,
            'unit_price' => 500,
            'payment_method' => 'cash',
        ])->assertCreated();

        $this->assertDatabaseHas('stock_items', [
            'farm_id' => $farm->id,
            'name' => 'Oeufs',
            'current_quantity' => 28,
        ]);
        $this->assertDatabaseHas('financial_transactions', [
            'farm_id' => $farm->id,
            'type' => 'income',
            'amount' => 500,
            'source_module' => 'pondeuses',
            'source_entity_type' => 'egg_sale',
        ]);
        $this->assertDatabaseHas('audit_logs', [
            'farm_id' => $farm->id,
            'module' => 'pondeuses',
            'action' => 'sale_recorded',
        ]);
    }

    public function test_layer_feeding_debits_stock_and_creates_a_traceable_expense(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);
        $farm = Farm::create([
            'name' => 'Ferme Alimentation Test',
            'slug' => 'ferme-alimentation-test',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);
        $admin->forceFill(['farm_id' => $farm->id])->save();
        $feed = StockItem::create([
            'farm_id' => $farm->id,
            'name' => 'Aliment ponte test',
            'category' => 'Aliment',
            'unit' => 'kg',
            'unit_cost' => 900,
            'minimum_threshold' => 1,
            'current_quantity' => 10,
        ]);

        Sanctum::actingAs($admin);

        $batchResponse = $this->postJson('/api/v1/pondeuses', [
            'farm_id' => $farm->id,
            'name' => 'Lot alimentation test',
            'breed' => 'Leghorn',
            'entry_date' => now()->toDateString(),
            'initial_count' => 50,
            'unit_cost' => 100,
        ])->assertCreated();

        $this->postJson('/api/v1/pondeuses/feedings', [
            'farm_id' => $farm->id,
            'layer_batch_id' => $batchResponse->json('data.id'),
            'stock_item_id' => $feed->id,
            'feeding_date' => now()->toDateString(),
            'feeding_time' => '08:00',
            'quantity' => 2,
        ])->assertCreated();

        $this->assertDatabaseHas('stock_items', [
            'id' => $feed->id,
            'current_quantity' => 8,
        ]);
        $this->assertDatabaseHas('financial_transactions', [
            'farm_id' => $farm->id,
            'type' => 'expense',
            'amount' => 1800,
            'source_module' => 'elevage',
            'source_entity_type' => 'layer_feeding',
        ]);
        $this->assertDatabaseHas('layer_feedings', [
            'farm_id' => $farm->id,
            'stock_item_id' => $feed->id,
            'quantity' => 2,
            'total_cost' => 1800,
        ]);
    }

    public function test_standalone_plot_can_be_created_and_updated_without_crop(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);
        $farm = Farm::create([
            'name' => 'Ferme Parcelle Autonome',
            'slug' => 'ferme-parcelle-autonome',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);
        $admin->forceFill(['farm_id' => $farm->id])->save();
        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/cultures/plots', [
            'farm_id' => $farm->id,
            'name' => 'Parcelle Nord',
            'area' => 2.5,
            'soil_type' => 'Argileux',
            'status' => 'preparing',
        ])->assertCreated();

        $plotId = (int) $response->json('data.id');
        $this->assertDatabaseHas('plots', [
            'id' => $plotId,
            'farm_id' => $farm->id,
            'crop_id' => null,
        ]);

        $this->patchJson('/api/v1/cultures/plots/' . $plotId, [
            'name' => 'Parcelle Nord rénovée',
            'area' => 3,
        ])->assertOk();

        $this->assertDatabaseHas('plots', [
            'id' => $plotId,
            'name' => 'Parcelle Nord rénovée',
            'area' => 3,
        ]);
        $this->assertInstanceOf(Plot::class, Plot::query()->find($plotId));
    }

    public function test_crop_relation_must_belong_to_authenticated_farm(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);

        $farm = Farm::create([
            'name' => 'Ferme Courante',
            'slug' => 'ferme-courante',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);
        $otherFarm = Farm::create([
            'name' => 'Ferme Autre',
            'slug' => 'ferme-autre',
            'administrator_id' => null,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => 'Autre administrateur',
            'contact_email' => 'other@example.com',
        ]);

        $admin->forceFill(['farm_id' => $farm->id])->save();
        $crop = Crop::create([
            'farm_id' => $otherFarm->id,
            'name' => 'Culture autre ferme',
            'variety' => 'Test',
            'cycle_days' => 90,
            'planting_date' => now()->toDateString(),
            'area' => 1,
            'status' => 'growing',
        ]);

        Sanctum::actingAs($admin);

        $this->postJson('/api/v1/cultures/plots', [
            'farm_id' => $otherFarm->id,
            'crop_id' => $crop->id,
            'name' => 'Parcelle interdite',
            'area' => 1,
            'soil_type' => 'argileux',
        ])->assertStatus(422)->assertJsonValidationErrors(['crop_id']);
    }

    public function test_register_admin_remains_available_when_an_admin_already_exists(): void
    {
        $firstAdmin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);

        $firstFarm = Farm::create([
            'name' => 'Ferme Alpha',
            'slug' => 'ferme-alpha',
            'administrator_id' => $firstAdmin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $firstAdmin->name,
            'contact_email' => $firstAdmin->email,
        ]);

        $firstAdmin->forceFill(['farm_id' => $firstFarm->id])->save();

        $response = $this->postJson('/api/v1/auth/register-admin', [
            'name' => 'Second Admin',
            'email' => 'second-admin@example.com',
            'password' => 'AdminSecure@123',
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('user.email', 'second-admin@example.com');

        $secondAdmin = User::query()->where('email', 'second-admin@example.com')->firstOrFail();

        $this->assertSame('admin', $secondAdmin->role->value);
        $this->assertNotNull($secondAdmin->farm_id);
        $this->assertDatabaseHas('farms', [
            'id' => $secondAdmin->farm_id,
            'administrator_id' => $secondAdmin->id,
        ]);
    }

    public function test_password_change_revokes_all_tokens(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);

        $farm = Farm::create([
            'name' => 'Ferme Securite',
            'slug' => 'ferme-securite',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);

        $admin->forceFill(['farm_id' => $farm->id])->save();

        $admin->createToken('ancienne-session-1');
        $admin->createToken('ancienne-session-2');

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/auth/password', [
            'current_password' => 'password',
            'password' => 'AdminSecure@123',
            'password_confirmation' => 'AdminSecure@123',
        ]);

        $response->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);
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

    public function test_disabled_account_token_is_blocked_on_protected_routes(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'disabled',
            'is_active' => false,
        ]);

        $farm = Farm::create([
            'name' => 'Ferme Bloquee',
            'slug' => 'ferme-bloquee',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);

        $admin->forceFill(['farm_id' => $farm->id])->save();
        $token = $admin->createToken('session-desactivee')->plainTextToken;

        $response = $this
            ->withHeader('Authorization', 'Bearer '.$token)
            ->getJson('/api/v1/dashboard');

        $response->assertStatus(403);
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_user_assignment_rejects_other_farms(): void
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

        $admin->forceFill(['farm_id' => $firstFarm->id])->save();

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

        $response->assertForbidden();

        $this->assertDatabaseHas('farm_user_assignments', [
            'farm_id' => $firstFarm->id,
            'user_id' => $owner->id,
        ]);

        $this->assertDatabaseMissing('farm_user_assignments', [
            'farm_id' => $secondFarm->id,
            'user_id' => $owner->id,
        ]);
    }

    public function test_finance_write_ignores_forged_farm_id_and_uses_authenticated_farm(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);

        $firstFarm = Farm::create([
            'name' => 'Ferme Finance A',
            'slug' => 'ferme-finance-a',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);

        $secondFarm = Farm::create([
            'name' => 'Ferme Finance B',
            'slug' => 'ferme-finance-b',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);

        $admin->forceFill(['farm_id' => $firstFarm->id])->save();

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/v1/finances', [
            'farm_id' => $secondFarm->id,
            'type' => 'expense',
            'amount' => 25000,
            'category' => 'Test securite',
            'description' => 'Tentative de forge du farm_id',
        ]);

        $response->assertCreated();

        $transaction = FinancialTransaction::query()->latest('id')->firstOrFail();

        $this->assertSame($firstFarm->id, $transaction->farm_id);
        $this->assertNotSame($secondFarm->id, $transaction->farm_id);
    }

    public function test_report_export_rejects_unknown_format(): void
    {
        $admin = User::factory()->create([
            'role' => Role::Admin,
            'account_status' => 'active',
            'is_active' => true,
        ]);

        $farm = Farm::create([
            'name' => 'Ferme Rapport',
            'slug' => 'ferme-rapport',
            'administrator_id' => $admin->id,
            'status' => 'active',
            'currency' => 'FCFA',
            'area_unit' => 'ha',
            'manager_name' => $admin->name,
            'contact_email' => $admin->email,
        ]);

        $admin->forceFill(['farm_id' => $farm->id])->save();

        Sanctum::actingAs($admin);

        $response = $this->get('/api/v1/reports/stocks/export/exe');

        $response->assertStatus(404);
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
