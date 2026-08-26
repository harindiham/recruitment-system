<?php

namespace Tests\Feature;

use App\Models\Candidate;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_candidate_registration_creates_a_candidate_with_a_hashed_password(): void
    {
        $this->createRole('Candidate');

        $response = $this->postJson('/api/register-candidate', [
            'name' => 'Candidate User',
            'email' => 'candidate@example.com',
            'password' => 'StrongPass1!',
            'password_confirmation' => 'StrongPass1!',
        ]);

        $response->assertCreated()->assertJsonPath('user.email', 'candidate@example.com');
        $user = User::where('email', 'candidate@example.com')->firstOrFail();
        $this->assertTrue(Hash::check('StrongPass1!', $user->password));
        $this->assertNotSame('StrongPass1!', $user->password);
        $this->assertNotNull(Candidate::where('user_id', $user->id)->first());
        $this->assertSame('Candidate', $user->role->name);
    }

    public function test_hr_registration_assigns_the_hr_role(): void
    {
        $this->createRole('HR Manager');

        $this->postJson('/api/register-hr', [
            'name' => 'HR User',
            'email' => 'hr@example.com',
            'password' => 'StrongPass1!',
            'password_confirmation' => 'StrongPass1!',
        ])->assertCreated()->assertJsonPath('user.role', 'HR Manager');
    }

    public function test_registration_rejects_duplicate_email_weak_password_and_mismatch(): void
    {
        $this->createRole('Candidate');
        User::create([
            'name' => 'Existing',
            'email' => 'existing@example.com',
            'password' => Hash::make('StrongPass1!'),
            'role_id' => Role::where('name', 'Candidate')->first()->id,
        ]);

        $this->postJson('/api/register-candidate', [
            'name' => 'Duplicate',
            'email' => 'existing@example.com',
            'password' => 'StrongPass1!',
            'password_confirmation' => 'StrongPass1!',
        ])->assertStatus(422)->assertJsonValidationErrors('email');

        $this->postJson('/api/register-candidate', [
            'name' => 'Weak',
            'email' => 'weak@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])->assertStatus(422)->assertJsonValidationErrors('password');

        $this->postJson('/api/register-candidate', [
            'name' => 'Mismatch',
            'email' => 'mismatch@example.com',
            'password' => 'StrongPass1!',
            'password_confirmation' => 'DifferentPass1!',
        ])->assertStatus(422)->assertJsonValidationErrors('password');
    }

    public function test_role_specific_login_and_api_access_are_enforced(): void
    {
        $candidateRole = $this->createRole('Candidate');
        $hrRole = $this->createRole('HR Manager');
        $candidate = User::create([
            'name' => 'Candidate',
            'email' => 'candidate@example.com',
            'password' => Hash::make('StrongPass1!'),
            'role_id' => $candidateRole->id,
        ]);
        Candidate::create(['user_id' => $candidate->id]);
        $hr = User::create([
            'name' => 'HR',
            'email' => 'hr@example.com',
            'password' => Hash::make('StrongPass1!'),
            'role_id' => $hrRole->id,
        ]);

        $this->postJson('/api/login/candidate', [
            'email' => 'candidate@example.com',
            'password' => 'StrongPass1!',
        ])->assertOk()->assertJsonPath('user.role', 'Candidate');

        $this->postJson('/api/login/hr', [
            'email' => 'hr@example.com',
            'password' => 'StrongPass1!',
        ])->assertOk()->assertJsonPath('user.role', 'HR Manager');

        $this->postJson('/api/login/hr', [
            'email' => 'candidate@example.com',
            'password' => 'StrongPass1!',
        ])->assertForbidden();

        $this->actingAs($candidate, 'sanctum')
            ->postJson('/api/job-positions', [
                'title' => 'Restricted',
                'department' => 'Test',
                'description' => 'Test',
                'responsibilities' => 'Test',
                'minimum_experience' => 0,
                'employment_type' => 'Full time',
                'status' => 'open',
            ])->assertForbidden();

        $this->actingAs($hr, 'sanctum')
            ->getJson('/api/cvs')->assertForbidden();
    }

    public function test_invalid_password_is_rejected(): void
    {
        $role = $this->createRole('Candidate');
        User::create([
            'name' => 'Candidate',
            'email' => 'candidate@example.com',
            'password' => Hash::make('StrongPass1!'),
            'role_id' => $role->id,
        ]);

        $this->postJson('/api/login/candidate', [
            'email' => 'candidate@example.com',
            'password' => 'WrongPass1!',
        ])->assertUnauthorized();
    }

    private function createRole(string $name): Role
    {
        $role = new Role();
        $role->name = $name;
        $role->save();

        return $role;
    }
}
