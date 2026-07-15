<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\Farm;
use App\Models\FarmSetting;
use App\Models\User;
use Illuminate\Support\Str;

class FarmService
{
    public function createForAdministrator(User $administrator, array $data): Farm
    {
        $farm = Farm::create([
            'name' => $data['name'],
            'slug' => $data['slug'] ?? Str::slug($data['name']),
            'administrator_id' => $administrator->id,
            'status' => $data['status'] ?? 'active',
            'currency' => $data['currency'] ?? 'FCFA',
            'area_unit' => $data['area_unit'] ?? 'ha',
            'manager_name' => $data['manager_name'] ?? $administrator->name,
            'contact_email' => $data['contact_email'] ?? $administrator->email,
        ]);

        FarmSetting::firstOrCreate(
            ['farm_id' => $farm->id],
            [
                'currency' => $farm->currency,
                'area_unit' => $farm->area_unit,
                'weight_unit' => 'kg',
                'egg_tray_default_price' => 0,
                'fish_kg_default_price' => 0,
                'crop_kg_default_price' => 0,
                'low_stock_threshold' => 0,
                'mortalite_threshold_layers' => 0,
                'mortalite_threshold_fish' => 0,
                'egg_breakage_threshold' => 0,
                'laying_rate_low_threshold' => 0,
                'fish_ph_min' => 0,
                'fish_ph_max' => 0,
                'fish_oxygen_min' => 0,
                'fish_temperature_min' => 0,
                'fish_temperature_max' => 0,
                'crop_yield_low_threshold' => 0,
                'default_reminder_24h' => true,
                'default_reminder_6h' => true,
                'default_reminder_1h' => true,
                'task_categories' => ['alimentation', 'sanitaire', 'production', 'recolte', 'vente', 'stock', 'finance', 'maintenance', 'culture', 'reproduction', 'nettoyage', 'controle', 'administratif'],
                'task_priorities' => ['faible', 'normale', 'elevee', 'critique'],
                'alert_rules' => [],
            ]
        );

        return $farm;
    }

    public function createOwner(Farm $farm, array $data): User
    {
        $owner = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => bcrypt($data['password']),
            'role' => Role::Owner,
            'farm_id' => $farm->id,
            'account_status' => 'active',
            'is_active' => $data['is_active'] ?? true,
        ]);

        $owner->assignedFarms()->syncWithoutDetaching([$farm->id]);

        return $owner;
    }
}
