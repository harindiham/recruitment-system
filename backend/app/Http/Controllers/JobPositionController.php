<?php

namespace App\Http\Controllers;

use App\Models\JobPosition;
use Illuminate\Http\Request;

class JobPositionController extends Controller
{
    // Get all job vacancies
    public function index()
    {
        $jobs = JobPosition::latest()->get();

        return response()->json($jobs);
    }

    // Create a new job vacancy
    public function store(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'department' => 'required|string|max:255',
            'description' => 'required|string',
            'responsibilities' => 'nullable|string',
            'minimum_experience' => 'nullable|integer|min:0',
            'employment_type' => 'nullable|string|max:100',
            'status' => 'nullable|in:open,closed,on_hold',
        ]);

        $validated['created_by'] = auth()->id();

        $job = JobPosition::create($validated);

        return response()->json([
            'message' => 'Job vacancy created successfully.',
            'job' => $job,
        ], 201);
    }

    // Get one specific vacancy
    public function show($id)
    {
        $job = JobPosition::findOrFail($id);

        return response()->json($job);
    }

    /**
 * Delete a vacancy.
 */
public function destroy($id)
{
    $jobPosition = JobPosition::findOrFail($id);

    $jobPosition->delete();

    return response()->json([
        'message' => 'Vacancy deleted successfully.'
    ]);
}

}