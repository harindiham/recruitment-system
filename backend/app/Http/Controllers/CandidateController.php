<?php

namespace App\Http\Controllers;

use App\Models\Candidate;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;

class CandidateController extends Controller
{
    /**
     * Get all candidates.
     */
    public function index()
    {
        $candidates = Candidate::with('user')
            ->latest()
            ->get();

        return response()->json([
            'candidates' => $candidates,
        ]);
    }


    /**
     * Create a candidate.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',

            'email' => 'required|email|max:255|unique:users,email',

            'phone' => 'nullable|string|max:30',

            'address' => 'nullable|string|max:255',

            'bio' => 'nullable|string',

            'password' => 'nullable|string|min:8',
        ]);


        $candidate = DB::transaction(function () use ($validated) {

            /*
             * Create the user record.
             *
             * Candidates currently depend on users
             * because of the user_id foreign key in
             * the candidates table.
             */

            $user = User::create([
                'name' => $validated['name'],

                'email' => $validated['email'],

                'password' => $validated['password']
                    ?? 'Candidate@123',
            ]);


            /*
             * Create the candidate profile.
             */

            return Candidate::create([
                'user_id' => $user->id,

                'phone' => $validated['phone'] ?? null,

                'address' => $validated['address'] ?? null,

                'bio' => $validated['bio'] ?? null,
            ]);
        });


        $candidate->load('user');


        return response()->json([
            'message' => 'Candidate created successfully.',

            'candidate' => $candidate,
        ], 201);
    }


    /**
     * Get one candidate.
     */
    public function show($id)
    {
        $candidate = Candidate::with([
            'user',
            'cvs',
            'applications',
        ])->findOrFail($id);


        return response()->json([
            'candidate' => $candidate,
        ]);
    }
}