<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Candidate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

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
            'password' => 'required|string|min:6|confirmed',
            'phone' => 'required|string|max:30',
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
                'role_id' => null,
            ]);

            /*
            |--------------------------------------------------------------------------
            | Create Candidate profile
            |--------------------------------------------------------------------------
            */

            $candidate = Candidate::create([
                'user_id' => $user->id,
                'phone' => $validated['phone'],
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

            'user' => [
                'id' => $result['user']->id,
                'name' => $result['user']->name,
                'email' => $result['user']->email,
            ],

            'candidate' => [
                'id' => $result['candidate']->id,
                'phone' => $result['candidate']->phone,
                'address' => $result['candidate']->address,
                'bio' => $result['candidate']->bio,
            ],
        ], 201);
    }


    /**
     * Login user.
     */
    public function login(Request $request)
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