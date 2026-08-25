<?php

namespace App\Http\Controllers;

use App\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ApplicationController extends Controller
{
    /**
     * Get applications.
     *
     * Candidates only see their own applications.
     * HR/admin users can see all applications.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.'
            ], 401);
        }

        $query = Application::with([
            'candidate.user',
            'jobPosition',
            'cv'
        ]);

        /*
        |--------------------------------------------------------------------------
        | Candidate
        |--------------------------------------------------------------------------
        |
        | If the authenticated user is a candidate, only return
        | applications belonging to that candidate.
        |
        */

        if ($user->candidate) {
            $query->where(
                'candidate_id',
                $user->candidate->id
            );
        }

        $applications = $query
            ->latest()
            ->get();

        return response()->json([
            'applications' => $applications
        ]);
    }


    /**
     * Create a new application.
     *
     * The candidate is automatically determined from
     * the currently authenticated user.
     */
    public function store(Request $request)
    {
        /*
        |--------------------------------------------------------------------------
        | 1. Get authenticated user
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
        | 2. Get candidate belonging to this user
        |--------------------------------------------------------------------------
        */

        $candidate = $user->candidate;

        if (!$candidate) {
            return response()->json([
                'message' =>
                    'No candidate profile is associated with this account.'
            ], 403);
        }


        /*
        |--------------------------------------------------------------------------
        | 3. Validate application information
        |--------------------------------------------------------------------------
        */

        $validated = $request->validate([
            'job_position_id' => [
                'required',
                'exists:job_positions,id',
            ],

            'cv_id' => [
                'nullable',
                'exists:cvs,id',
            ],
        ]);


        /*
        |--------------------------------------------------------------------------
        | 4. Make sure CV belongs to this candidate
        |--------------------------------------------------------------------------
        */

        $cv = null;

        if (!empty($validated['cv_id'])) {

            $cv = $candidate->cvs()
                ->where('id', $validated['cv_id'])
                ->first();

            if (!$cv) {
                return response()->json([
                    'message' =>
                        'The selected CV does not belong to your account.'
                ], 403);
            }
        }


        /*
        |--------------------------------------------------------------------------
        | 5. Check whether candidate already applied
        |--------------------------------------------------------------------------
        */

        $existingApplication = Application::where(
            'candidate_id',
            $candidate->id
        )
            ->where(
                'job_position_id',
                $validated['job_position_id']
            )
            ->first();

        if ($existingApplication) {

            return response()->json([
                'message' =>
                    'You have already applied for this vacancy.',

                'application' => $existingApplication
            ], 409);
        }


        /*
        |--------------------------------------------------------------------------
        | 6. Create application
        |--------------------------------------------------------------------------
        */

        $application = Application::create([
            'candidate_id' =>
                $candidate->id,

            'job_position_id' =>
                $validated['job_position_id'],

            'cv_id' =>
                $validated['cv_id'] ?? null,

            'status' =>
                'new',

            'applied_at' =>
                now(),
        ]);


        /*
        |--------------------------------------------------------------------------
        | 7. Load relationships
        |--------------------------------------------------------------------------
        */

        $application->load([
            'candidate.user',
            'jobPosition',
            'cv'
        ]);


        /*
        |--------------------------------------------------------------------------
        | 8. Automatically evaluate CV
        |--------------------------------------------------------------------------
        */

        if (
            $application->cv &&
            $application->cv->extracted_text &&
            $application->cv->processing_status === 'processed'
        ) {

            $this->runMatching($application);

            $application->refresh();

            $application->load([
                'candidate.user',
                'jobPosition',
                'cv'
            ]);
        }


        /*
        |--------------------------------------------------------------------------
        | 9. Return response
        |--------------------------------------------------------------------------
        */

        return response()->json([
            'message' =>
                'Application created successfully.',

            'application' =>
                $application,

        ], 201);
    }


    /**
     * Get a single application.
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();

        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated.'
            ], 401);
        }

        $application = Application::with([
            'candidate.user',
            'jobPosition',
            'cv'
        ])->findOrFail($id);


        /*
        |--------------------------------------------------------------------------
        | Candidate security
        |--------------------------------------------------------------------------
        |
        | Candidates should only be able to view their own applications.
        |
        */

        if (
            $user->candidate &&
            $application->candidate_id !== $user->candidate->id
        ) {
            return response()->json([
                'message' => 'You are not authorised to view this application.'
            ], 403);
        }


        return response()->json([
            'application' => $application
        ]);
    }


    /**
     * Update application status.
     *
     * Used by HR/admin.
     */
    public function updateStatus(Request $request, $id)
    {
        $validated = $request->validate([
            'status' =>
                'required|string|in:new,screening,shortlisted,interview,selected,rejected'
        ]);

        $application = Application::findOrFail($id);

        $application->update([
            'status' => $validated['status']
        ]);

        $application->load([
            'candidate.user',
            'jobPosition',
            'cv'
        ]);

        return response()->json([
            'message' =>
                'Application status updated successfully.',

            'application' =>
                $application
        ]);
    }


    /**
     * Manually evaluate an application.
     *
     * Endpoint:
     * POST /api/applications/{id}/evaluate
     */
    public function evaluate($id)
    {
        $application = Application::with([
            'candidate.user',
            'jobPosition',
            'cv'
        ])->findOrFail($id);


        if (!$application->cv) {

            return response()->json([
                'message' =>
                    'This application does not have a CV attached.'
            ], 422);
        }


        if (
            !$application->cv->extracted_text ||
            $application->cv->processing_status !== 'processed'
        ) {

            return response()->json([
                'message' =>
                    'The CV has not been processed yet. Please process the CV before evaluating the application.'
            ], 422);
        }


        $matching = $this->runMatching($application);

        $application->refresh();

        $application->load([
            'candidate.user',
            'jobPosition',
            'cv'
        ]);


        return response()->json([
            'message' =>
                'Application evaluated successfully.',

            'application' =>
                $application,

            'matching' =>
                $matching
        ]);
    }


    /**
     * Run the 50/30/20 matching system.
     *
     * Skills / keywords = 50%
     * Experience       = 30%
     * Relevance        = 20%
     */
    private function runMatching(Application $application)
    {
        /*
        |--------------------------------------------------------------------------
        | 1. Get CV and job information
        |--------------------------------------------------------------------------
        */

        $cvText = strtolower(
            $application->cv->extracted_text
        );

        $job = $application->jobPosition;

        $jobText = strtolower(
            implode(' ', [
                $job->title ?? '',
                $job->department ?? '',
                $job->description ?? '',
                $job->responsibilities ?? ''
            ])
        );


        /*
        |--------------------------------------------------------------------------
        | 2. Skills / keyword matching
        |--------------------------------------------------------------------------
        */

        $skillKeywords = [

            // HR
            'recruitment',
            'selection',
            'candidate screening',
            'screening',
            'interview',
            'employee relations',
            'human resources',
            'hr',
            'hr administration',
            'onboarding',
            'offboarding',
            'performance management',
            'performance',
            'training',
            'hr policies',
            'policies',
            'conflict resolution',
            'employee engagement',
            'employee records',
            'hris',
            'documentation',
            'communication',
            'leadership',
            'management',
            'administration',
            'payroll',
            'attendance',
            'leave management',
            'employment law',
            'workplace practices',
            'excel',
            'microsoft office',
            'google workspace',
            'customer service',
            'project management',

            // Software / technical
            'web development',
            'software development',
            'javascript',
            'react',
            'php',
            'laravel',
            'python',
            'sql',
            'database'
        ];


        /*
        |--------------------------------------------------------------------------
        | 3. Get related terms
        |--------------------------------------------------------------------------
        */

        $relatedTerms = $this->getRelatedTerms();

        $jobSkills = [];


        foreach ($relatedTerms as $canonicalSkill => $terms) {

            foreach ($terms as $term) {

                if (
                    Str::contains(
                        $jobText,
                        strtolower($term)
                    )
                ) {

                    $jobSkills[] = $canonicalSkill;

                    break;
                }
            }
        }


        /*
        |--------------------------------------------------------------------------
        | 4. Check original skill list
        |--------------------------------------------------------------------------
        */

        foreach ($skillKeywords as $skill) {

            if (
                Str::contains(
                    $jobText,
                    strtolower($skill)
                )
            ) {

                if (!in_array($skill, $jobSkills)) {
                    $jobSkills[] = $skill;
                }
            }
        }


        /*
        |--------------------------------------------------------------------------
        | 5. Remove duplicate skills
        |--------------------------------------------------------------------------
        */

        $jobSkills = array_values(
            array_unique($jobSkills)
        );


        /*
        |--------------------------------------------------------------------------
        | 6. Compare job skills with CV
        |--------------------------------------------------------------------------
        */

        $matchedSkills = [];
        $skillMatches = [];


        foreach ($jobSkills as $skill) {

            $termsToCheck =
                $relatedTerms[$skill] ?? [$skill];

            $matched = false;
            $matchedTerm = null;


            foreach ($termsToCheck as $term) {

                if (
                    Str::contains(
                        $cvText,
                        strtolower($term)
                    )
                ) {

                    $matched = true;
                    $matchedTerm = $term;

                    break;
                }
            }


            if (
                !$matched &&
                Str::contains(
                    $cvText,
                    strtolower($skill)
                )
            ) {

                $matched = true;
                $matchedTerm = $skill;
            }


            if ($matched) {

                $matchedSkills[] = $skill;

                $skillMatches[] = [
                    'required_skill' => $skill,
                    'matched_term' => $matchedTerm
                ];
            }
        }


        /*
        |--------------------------------------------------------------------------
        | 7. Calculate skill score
        |--------------------------------------------------------------------------
        |
        | Maximum = 50 points
        |
        */

        if (count($jobSkills) > 0) {

            $skillScore = (
                count($matchedSkills) /
                count($jobSkills)
            ) * 50;

        } else {

            // Neutral score when no recognised skills exist
            $skillScore = 25;
        }


        $skillScore = round(
            min($skillScore, 50),
            2
        );


        /*
        |--------------------------------------------------------------------------
        | 8. Experience match
        |--------------------------------------------------------------------------
        |
        | Maximum = 30 points
        |
        */

        $requiredExperience = (float) (
            $job->minimum_experience ?? 0
        );

        $candidateExperience = 0;


        /*
        |--------------------------------------------------------------------------
        | Search years
        |--------------------------------------------------------------------------
        */

        if (
            preg_match(
                '/([0-9]+(?:\.[0-9]+)?)\+?\s*(?:years?|yrs?)/i',
                $application->cv->extracted_text,
                $matches
            )
        ) {

            $candidateExperience =
                (float) $matches[1];
        }


        /*
        |--------------------------------------------------------------------------
        | Search months
        |--------------------------------------------------------------------------
        */

        if (
            $candidateExperience == 0 &&
            preg_match(
                '/([0-9]+(?:\.[0-9]+)?)\+?\s*(?:months?|mos?)/i',
                $application->cv->extracted_text,
                $matches
            )
        ) {

            $candidateExperience = round(
                ((float) $matches[1]) / 12,
                2
            );
        }


        /*
        |--------------------------------------------------------------------------
        | 9. Calculate experience score
        |--------------------------------------------------------------------------
        */

        if ($requiredExperience <= 0) {

            $experienceScore = 30;

        } elseif ($candidateExperience >= $requiredExperience) {

            $experienceScore = 30;

        } else {

            $experienceScore = (
                $candidateExperience /
                $requiredExperience
            ) * 30;
        }


        $experienceScore = round(
            min($experienceScore, 30),
            2
        );


        /*
        |--------------------------------------------------------------------------
        | 10. Job title / department relevance
        |--------------------------------------------------------------------------
        |
        | Maximum = 20 points
        |
        */

        $jobTitleWords = $this->getMeaningfulWords(
            $job->title ?? ''
        );


        /*
        |--------------------------------------------------------------------------
        | Expand title words
        |--------------------------------------------------------------------------
        */

        $titleTerms = [];

        foreach ($jobTitleWords as $word) {

            if (isset($relatedTerms[$word])) {

                $titleTerms = array_merge(
                    $titleTerms,
                    $relatedTerms[$word]
                );

            } else {

                $titleTerms[] = $word;
            }
        }


        $titleTerms = array_values(
            array_unique($titleTerms)
        );


        /*
        |--------------------------------------------------------------------------
        | Check title relevance
        |--------------------------------------------------------------------------
        */

        $matchedTitleTerms = [];

        foreach ($titleTerms as $term) {

            if (
                Str::contains(
                    $cvText,
                    strtolower($term)
                )
            ) {

                $matchedTitleTerms[] = $term;
            }
        }


        /*
        |--------------------------------------------------------------------------
        | Title score = maximum 10
        |--------------------------------------------------------------------------
        */

        if (count($titleTerms) > 0) {

            $titleScore = (
                count($matchedTitleTerms) /
                count($titleTerms)
            ) * 10;

        } else {

            $titleScore = 0;
        }


        /*
        |--------------------------------------------------------------------------
        | 11. Department relevance
        |--------------------------------------------------------------------------
        |
        | Maximum = 10 points
        |
        */

        $department = strtolower(
            trim($job->department ?? '')
        );

        $departmentScore = 0;

        $departmentMatchedTerms = [];


        if ($department !== '') {

            /*
            | First check complete department
            */

            if (
                Str::contains(
                    $cvText,
                    $department
                )
            ) {

                $departmentScore = 10;

                $departmentMatchedTerms[] =
                    $department;

            } else {

                /*
                | Compare meaningful department words
                */

                $departmentWords =
                    $this->getMeaningfulWords(
                        $department
                    );


                /*
                | Expand department words
                */

                $departmentTerms = [];

                foreach ($departmentWords as $word) {

                    if (isset($relatedTerms[$word])) {

                        $departmentTerms = array_merge(
                            $departmentTerms,
                            $relatedTerms[$word]
                        );

                    } else {

                        $departmentTerms[] = $word;
                    }
                }


                $departmentTerms = array_values(
                    array_unique($departmentTerms)
                );


                foreach ($departmentTerms as $term) {

                    if (
                        Str::contains(
                            $cvText,
                            strtolower($term)
                        )
                    ) {

                        $departmentMatchedTerms[] =
                            $term;
                    }
                }


                if (count($departmentTerms) > 0) {

                    $departmentScore = (
                        count($departmentMatchedTerms) /
                        count($departmentTerms)
                    ) * 10;
                }
            }
        }


        /*
        |--------------------------------------------------------------------------
        | 12. Final relevance score
        |--------------------------------------------------------------------------
        */

        $relevanceScore = round(
            min(
                $titleScore + $departmentScore,
                20
            ),
            2
        );


        /*
        |--------------------------------------------------------------------------
        | 13. Final match score
        |--------------------------------------------------------------------------
        */

        $matchScore = round(
            $skillScore +
            $experienceScore +
            $relevanceScore,
            2
        );


        /*
        |--------------------------------------------------------------------------
        | 14. Category
        |--------------------------------------------------------------------------
        */

        if ($matchScore >= 80) {

            $category = 'Strong Match';

        } elseif ($matchScore >= 60) {

            $category = 'Good Match';

        } elseif ($matchScore >= 40) {

            $category = 'Possible Match';

        } else {

            $category = 'Weak Match';
        }


        /*
        |--------------------------------------------------------------------------
        | 15. Save matching result
        |--------------------------------------------------------------------------
        */

        $application->update([

            'match_score' =>
                $matchScore,

            'category' =>
                $category,

            'skills_score' =>
                $skillScore,

            'experience_score' =>
                $experienceScore,

            'relevance_score' =>
                $relevanceScore,
        ]);


        /*
        |--------------------------------------------------------------------------
        | 16. Return detailed breakdown
        |--------------------------------------------------------------------------
        */

        return [

            'total_score' =>
                $matchScore,

            'category' =>
                $category,

            'breakdown' => [

                'skills' => [

                    'score' =>
                        $skillScore,

                    'maximum' =>
                        50,

                    'matched' =>
                        $matchedSkills,

                    'job_keywords' =>
                        $jobSkills,

                    'details' =>
                        $skillMatches,
                ],


                'experience' => [

                    'score' =>
                        $experienceScore,

                    'maximum' =>
                        30,

                    'required_years' =>
                        $requiredExperience,

                    'candidate_years' =>
                        $candidateExperience,
                ],


                'relevance' => [

                    'score' =>
                        $relevanceScore,

                    'maximum' =>
                        20,

                    'title_score' =>
                        round(
                            $titleScore,
                            2
                        ),

                    'title_matches' =>
                        $matchedTitleTerms,

                    'department_score' =>
                        round(
                            $departmentScore,
                            2
                        ),

                    'department_matches' =>
                        $departmentMatchedTerms,
                ],
            ],
        ];
    }


    /**
     * Related terms used for recruitment matching.
     */
    private function getRelatedTerms()
    {
        return [

            /*
            |--------------------------------------------------------------------------
            | Human Resources
            |--------------------------------------------------------------------------
            */

            'recruitment' => [
                'recruitment',
                'recruiting',
                'talent acquisition',
                'hiring',
                'candidate sourcing'
            ],

            'human resources' => [
                'human resources',
                'human resource',
                'hr'
            ],

            'employee relations' => [
                'employee relations',
                'workplace relations',
                'staff relations'
            ],

            'interview' => [
                'interview',
                'interviews',
                'interviewing'
            ],

            'performance management' => [
                'performance management',
                'performance review',
                'performance reviews',
                'employee appraisal',
                'appraisals'
            ],

            'training' => [
                'training',
                'training coordination',
                'learning and development',
                'learning & development',
                'l&d'
            ],

            'onboarding' => [
                'onboarding',
                'employee onboarding',
                'new hire onboarding'
            ],

            'offboarding' => [
                'offboarding',
                'employee exit',
                'exit process'
            ],

            'conflict resolution' => [
                'conflict resolution',
                'conflict management',
                'dispute resolution'
            ],

            'hr administration' => [
                'hr administration',
                'human resources administration',
                'personnel administration'
            ],


            /*
            |--------------------------------------------------------------------------
            | Software / Technology
            |--------------------------------------------------------------------------
            */

            'software development' => [
                'software development',
                'software engineering',
                'programming',
                'application development'
            ],

            'web development' => [
                'web development',
                'web developer',
                'website development',
                'frontend development',
                'backend development'
            ],

            'javascript' => [
                'javascript',
                'js'
            ],

            'database' => [
                'database',
                'database management',
                'sql',
                'mysql',
                'postgresql',
                'mongodb'
            ],

            'react' => [
                'react',
                'react.js',
                'reactjs'
            ],

            'php' => [
                'php',
                'php development'
            ],

            'laravel' => [
                'laravel',
                'laravel framework'
            ],

            'python' => [
                'python',
                'python development'
            ],


            /*
            |--------------------------------------------------------------------------
            | General professional skills
            |--------------------------------------------------------------------------
            */

            'communication' => [
                'communication',
                'written communication',
                'verbal communication',
                'interpersonal communication'
            ],

            'leadership' => [
                'leadership',
                'team leadership',
                'people leadership',
                'team management'
            ],

            'project management' => [
                'project management',
                'project coordination',
                'project planning'
            ],

            'customer service' => [
                'customer service',
                'customer support',
                'client service',
                'client support'
            ],

            'documentation' => [
                'documentation',
                'document management',
                'record keeping',
                'records management'
            ],

            'excel' => [
                'excel',
                'microsoft excel',
                'spreadsheet'
            ],

            'microsoft office' => [
                'microsoft office',
                'ms office',
                'office 365'
            ],
        ];
    }


    /**
     * Get meaningful words from text.
     *
     * Used for job title and department matching.
     */
    private function getMeaningfulWords($text)
    {
        $text = strtolower($text);


        /*
        |--------------------------------------------------------------------------
        | Remove punctuation
        |--------------------------------------------------------------------------
        */

        $text = preg_replace(
            '/[^a-z0-9\s]/',
            ' ',
            $text
        );


        /*
        |--------------------------------------------------------------------------
        | Split into individual words
        |--------------------------------------------------------------------------
        */

        $words = preg_split(
            '/\s+/',
            trim($text)
        );


        /*
        |--------------------------------------------------------------------------
        | Stop words
        |--------------------------------------------------------------------------
        */

        $stopWords = [

            'a',
            'an',
            'the',
            'and',
            'or',
            'of',
            'for',
            'to',
            'in',
            'on',
            'with',
            'at',
            'by',
            'from',
            'as',
            'is',
            'are',
            'be',
            'this',
            'that',

            // Job title filler words
            'junior',
            'senior',
            'manager',
            'professional',
            'position',
            'role',
            'job'
        ];


        /*
        |--------------------------------------------------------------------------
        | Build meaningful word list
        |--------------------------------------------------------------------------
        */

        $meaningfulWords = [];

        foreach ($words as $word) {

            if (
                (
                    strlen($word) >= 3 ||
                    in_array($word, [
                        'hr',
                        'it',
                        'qa',
                        'ui',
                        'ux',
                        'ai'
                    ])
                ) &&
                !in_array($word, $stopWords)
            ) {

                $meaningfulWords[] =
                    $word;
            }
        }


        /*
        |--------------------------------------------------------------------------
        | Remove duplicates
        |--------------------------------------------------------------------------
        */

        return array_values(
            array_unique($meaningfulWords)
        );
    }
}