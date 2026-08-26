<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Candidate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use App\Models\Role;

class AuthController extends Controller
{
    /**
     * Register a new candidate.
     */
    public function registerCandidate(Request $request)
    {
        /*
        |--------------------------------------------------------------------------
        | 1. Validate registration information
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', 'string', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()],
            'phone' => 'nullable|string|max:30',
            'address' => 'nullable|string|max:255',
            'bio' => 'nullable|string|max:1000',
        ]);

        /*
        |--------------------------------------------------------------------------
        | 2. Create user + candidate profile together
        |--------------------------------------------------------------------------
        |
        | If something fails, neither record will be created.
        |
        */

        $result = DB::transaction(function () use ($validated) {

            /*
            |--------------------------------------------------------------------------
            | Create User account
            |--------------------------------------------------------------------------
            */

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'role_id' => Role::where('name', 'Candidate')->firstOrFail()->id,
            ]);

            /*
            |--------------------------------------------------------------------------
            | Create Candidate profile
            |--------------------------------------------------------------------------
            */

            $candidate = Candidate::create([
                'user_id' => $user->id,
                'phone' => $validated['phone'] ?? null,
                'address' => $validated['address'] ?? null,
                'bio' => $validated['bio'] ?? null,
            ]);

            return [
                'user' => $user,
                'candidate' => $candidate,
            ];
        });

        /*
        |--------------------------------------------------------------------------
        | 3. Return successful registration response
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'message' => 'Candidate registered successfully.',

            'user' => $this->userPayload($result['user']),

            'candidate' => [
                'id' => $result['candidate']->id,
                'phone' => $result['candidate']->phone,
                'address' => $result['candidate']->address,
                'bio' => $result['candidate']->bio,
            ],

            'token' => $result['user']->createToken('recruitment-system')->plainTextToken,
        ], 201);
    }

    public function registerHr(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => ['required', 'string', 'confirmed', Password::min(8)->mixedCase()->numbers()->symbols()],
        ]);

        $role = Role::where('name', 'HR Manager')->firstOrFail();
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role_id' => $role->id,
        ]);

        return response()->json([
            'message' => 'HR account created successfully.',
            'token' => $user->createToken('recruitment-system')->plainTextToken,
            'user' => $this->userPayload($user),
        ], 201);
    }


    /**
     * Login user.
     */
    public function login(Request $request)
    {
        return $this->loginForRole($request);
    }

    public function loginCandidate(Request $request)
    {
        return $this->loginForRole($request, 'Candidate');
    }

    public function loginHr(Request $request)
    {
        return $this->loginForRole($request, 'HR Manager');
    }

    private function loginForRole(Request $request, ?string $requiredRole = null)
    {
        /*
        |--------------------------------------------------------------------------
        | 1. Validate login details
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        /*
        |--------------------------------------------------------------------------
        | 2. Find user with role and candidate
        |--------------------------------------------------------------------------
        */

        $user = User::with([
            'role',
            'candidate'
        ])
            ->where('email', $validated['email'])
            ->first();

        if ($requiredRole && (!$user || $user->role?->name !== $requiredRole)) {
            return response()->json([
                'message' => $requiredRole === 'Candidate'
                    ? 'This account is not registered as a Candidate.'
                    : 'This account is not registered as an HR professional.',
            ], 403);
        }

        /*
        |--------------------------------------------------------------------------
        | 3. Check credentials
        |--------------------------------------------------------------------------
        */

        if (
            !$user ||
            !Hash::check(
                $validated['password'],
                $user->password
            )
        ) {
            return response()->json([
                'message' => 'Invalid email or password.'
            ], 401);
        }

        /*
        |--------------------------------------------------------------------------
        | 4. Create Sanctum token
        |--------------------------------------------------------------------------
        */

        $token = $user
            ->createToken('recruitment-system')
            ->plainTextToken;

        /*
        |--------------------------------------------------------------------------
        | 5. Return login information
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'message' => 'Login successful.',

            'token' => $token,

            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,

                'role' => $user->role?->name,

                'candidate_id' => $user->candidate?->id,
            ],
        ]);
    }

    private function userPayload(User $user): array
    {
        $user->loadMissing(['role', 'candidate']);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role?->name,
            'candidate_id' => $user->candidate?->id,
        ];
    }


    /**
     * Logout authenticated user.
     */
    public function logout(Request $request)
    {
        $token = $request->user()->currentAccessToken();

        if ($token) {
            $token->delete();
        }

        return response()->json([
            'message' => 'Logged out successfully.'
        ]);
    }
}