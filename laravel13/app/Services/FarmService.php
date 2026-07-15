<?php

namespace App\Services;

use App\Enums\Role;
use App\Models\Farm;
use App\Models\User;
use Illuminate\Support\Str;

class FarmService
{
    public function createForAdministrator(User $administrator, array $data): Farm
    {
        return Farm::create([
            'name' => $data['name'],
            'slug' => $data['slug'] ?? Str::slug($data['name']),
            'administrator_id' => $administrator->id,
            'status' => $data['status'] ?? 'active',
            'currency' => $data['currency'] ?? 'FCFA',
            'area_unit' => $data['area_unit'] ?? 'ha',
            'manager_name' => $data['manager_name'] ?? $administrator->name,
            'contact_email' => $data['contact_email'] ?? $administrator->email,
        ]);
    }

    public function createOwner(Farm $farm, array $data): User
    {
        return User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => bcrypt($data['password']),
            'role' => Role::Owner,
            'farm_id' => $farm->id,
            'is_active' => $data['is_active'] ?? true,
        ]);
    }
}

