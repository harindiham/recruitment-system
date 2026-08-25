<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use App\Models\Candidate;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CandidateTestUserSeeder extends Seeder
{
    public function run(): void
    {
        $role = Role::where('name', 'Candidate')->firstOrFail();

        $user = User::updateOrCreate(
            ['email' => 'sarah.candidate@example.com'],
            [
                'name' => 'Sarah Perera',
                'password' => Hash::make('SarahTest123!'),
                'role_id' => $role->id,
            ]
        );

        Candidate::firstOrCreate([
            'user_id' => $user->id,
        ]);
    }
}
