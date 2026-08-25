<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class HrTestUserSeeder extends Seeder
{
    public function run(): void
    {
        $role = Role::where('name', 'HR Manager')->firstOrFail();

        User::updateOrCreate(
            ['email' => 'sarah.perera@example.com'],
            [
                'name' => 'Sarah Perera',
                'password' => Hash::make('SarahTest123!'),
                'role_id' => $role->id,
            ]
        );
    }
}
