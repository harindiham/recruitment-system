<?php

namespace App\Http\Controllers;

use App\Models\Cv;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Smalot\PdfParser\Parser;
use Throwable;

class CvController extends Controller
{
    /**
     * Upload a CV for the currently authenticated candidate.
     *
     * The candidate_id is obtained from the logged-in user's
     * candidate relationship. It is NOT accepted from the request.
     */
    public function store(Request $request)
    {
        /*
        |--------------------------------------------------------------------------
        | 1. Get the logged-in user
        |--------------------------------------------------------------------------
        */

        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.'
            ], 401);
        }

        /*
        |--------------------------------------------------------------------------
        | 2. Get the candidate belonging to this user
        |--------------------------------------------------------------------------
        */

        $candidate = $user->candidate;

        if (!$candidate) {
            return response()->json([
                'message' => 'No candidate profile is associated with this account.'
            ], 403);
        }

        /*
        |--------------------------------------------------------------------------
        | 3. Validate candidate information and CV
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([
            'full_name' => [
                'required',
                'string',
                'max:255',
            ],

            'email' => [
                'required',
                'email',
                'max:255',
            ],

            'phone' => [
                'required',
                'string',
                'max:30',
            ],

            'linkedin' => [
                'nullable',
                'url',
                'max:500',
            ],

            'cv' => [
                'required',
                'file',
                'mimes:pdf,doc,docx',
                'max:10240',
            ],
        ]);

        /*
        |--------------------------------------------------------------------------
        | 4. Update the candidate profile
        |--------------------------------------------------------------------------
        */

        $candidate->update([
            'phone' => $validated['phone'],
            'linkedin' => $validated['linkedin'] ?? null,
        ]);

        /*
        |--------------------------------------------------------------------------
        | 6. Get uploaded CV
        |--------------------------------------------------------------------------
        */

        $file = $request->file('cv');

        /*
        |--------------------------------------------------------------------------
        | 7. Store the CV
        |--------------------------------------------------------------------------
        */

        $filePath = $file->store(
            'cvs',
            'public'
        );

        /*
        |--------------------------------------------------------------------------
        | 8. Create CV database record
        |--------------------------------------------------------------------------
        */

        $cv = Cv::create([
            'candidate_id' => $candidate->id,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $filePath,
            'file_type' => $file->getClientMimeType(),
            'extracted_text' => null,
            'processing_status' => 'pending',
        ]);

        /*
        |--------------------------------------------------------------------------
        | 9. Process PDF
        |--------------------------------------------------------------------------
        |
        | At this stage, PDF files are processed using
        | Smalot PDF Parser.
        |
        */

        if ($file->getClientMimeType() === 'application/pdf') {

            try {

                /*
                |--------------------------------------------------------------------------
                | Get full stored file path
                |--------------------------------------------------------------------------
                */

                $fullPath = Storage::disk('public')
                    ->path($filePath);

                /*
                |--------------------------------------------------------------------------
                | Create PDF parser
                |--------------------------------------------------------------------------
                */

                $parser = new Parser();

                /*
                |--------------------------------------------------------------------------
                | Parse PDF
                |--------------------------------------------------------------------------
                */

                $pdf = $parser->parseFile($fullPath);

                /*
                |--------------------------------------------------------------------------
                | Extract text
                |--------------------------------------------------------------------------
                */

                $text = $pdf->getText();

                /*
                |--------------------------------------------------------------------------
                | Clean extracted text
                |--------------------------------------------------------------------------
                */

                $text = preg_replace(
                    '/[ \t]+/',
                    ' ',
                    $text
                );

                $text = preg_replace(
                    "/\n{3,}/",
                    "\n\n",
                    $text
                );

                $text = trim($text);

                /*
                |--------------------------------------------------------------------------
                | Save extracted text
                |--------------------------------------------------------------------------
                */

                $cv->update([
                    'extracted_text' => $text,
                    'processing_status' => 'processed',
                ]);

            } catch (Throwable $exception) {

                /*
                |--------------------------------------------------------------------------
                | Extraction failed
                |--------------------------------------------------------------------------
                |
                | Keep the uploaded CV but mark processing as failed.
                |
                */

                $cv->update([
                    'processing_status' => 'failed',
                ]);
            }
        }

        /*
        |--------------------------------------------------------------------------
        | 10. Reload CV
        |--------------------------------------------------------------------------
        */

        $cv->refresh();

        /*
        |--------------------------------------------------------------------------
        | 11. Return response
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'message' => 'CV uploaded successfully.',

            'candidate' => [
                'id' => $candidate->id,
                'user_id' => $candidate->user_id,
                'full_name' => $user->name,
                'email' => $user->email,
                'phone' => $candidate->phone,
                'linkedin' => $candidate->linkedin,
            ],

            'cv' => $cv,

        ], 201);
    }


    /**
     * Get all CVs belonging to the authenticated candidate.
     */
    public function index()
    {
        /*
        |--------------------------------------------------------------------------
        | 1. Get logged-in user
        |--------------------------------------------------------------------------
        */

        $user = request()->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.'
            ], 401);
        }

        /*
        |--------------------------------------------------------------------------
        | 2. Get candidate
        |--------------------------------------------------------------------------
        */

        $candidate = $user->candidate;

        if (!$candidate) {
            return response()->json([
                'message' => 'No candidate profile is associated with this account.'
            ], 403);
        }

        /*
        |--------------------------------------------------------------------------
        | 3. Get candidate CVs
        |--------------------------------------------------------------------------
        */

        $cvs = $candidate->cvs()
            ->latest()
            ->get();

        return response()->json([
            'candidate' => [
                'id' => $candidate->id,
                'user_id' => $candidate->user_id,
                'full_name' => $user->name,
                'email' => $user->email,
                'phone' => $candidate->phone,
                'linkedin' => $candidate->linkedin,
            ],

            'cvs' => $cvs,
        ]);
    }


    /**
     * Get a single CV belonging to the authenticated candidate.
     */
    public function show($id)
    {
        /*
        |--------------------------------------------------------------------------
        | 1. Get logged-in user
        |--------------------------------------------------------------------------
        */

        $user = request()->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.'
            ], 401);
        }

        /*
        |--------------------------------------------------------------------------
        | 2. Get candidate
        |--------------------------------------------------------------------------
        */

        $candidate = $user->candidate;

        if (!$candidate) {
            return response()->json([
                'message' => 'No candidate profile is associated with this account.'
            ], 403);
        }

        /*
        |--------------------------------------------------------------------------
        | 3. Find CV belonging to this candidate
        |--------------------------------------------------------------------------
        */

        $cv = Cv::where('id', $id)
            ->where('candidate_id', $candidate->id)
            ->with('candidate')
            ->first();

        if (!$cv) {
            return response()->json([
                'message' => 'CV not found.'
            ], 404);
        }

        /*
        |--------------------------------------------------------------------------
        | 4. Return CV
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'cv' => $cv,
        ]);
    }
}