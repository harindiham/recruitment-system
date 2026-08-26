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
        * Run the 30/25/20/15/10 matching system.
     *
        * Responsibilities = 30%
        * Required skills = 25%
        * Relevant experience = 20%
        * Professional relevance = 15%
    * Education / certification = 10%
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

        $genericSkills = [
            'communication', 'leadership', 'management', 'administration',
            'documentation', 'training', 'performance', 'customer service',
            'project management', 'excel', 'microsoft office',
            'google workspace', 'policies', 'selection', 'screening',
        ];

        $jobSkills = [];


        foreach ($relatedTerms as $canonicalSkill => $terms) {
            foreach ($terms as $term) {
                if ($this->containsTerm($jobText, $term)) {
                    $jobSkills[] = $canonicalSkill;
                    break;
                }
            }
        }

        foreach ($skillKeywords as $skill) {
            if ($this->containsTerm($jobText, $skill)) {
                $jobSkills[] = $skill;
            }
        }

        foreach ($this->getMeaningfulWords($job->title ?? '') as $titleSkill) {
            if (!in_array($titleSkill, $genericSkills, true)) {
                $jobSkills[] = $titleSkill;
            }
        }

        $jobSkills = array_values(array_unique($jobSkills));
        $matchedSkills = [];
        $skillMatches = [];

        foreach ($jobSkills as $skill) {
            $termsToCheck = $relatedTerms[$skill] ?? [$skill];
            foreach ($termsToCheck as $term) {
                if ($this->containsTerm($cvText, $term)) {
                    $matchedSkills[] = $skill;
                    $skillMatches[] = [
                        'required_skill' => $skill,
                        'matched_term' => $term,
                    ];
                    break;
                }
            }
        }

        $weightedJobSkills = array_sum(array_map(
            fn ($skill) => in_array($skill, $genericSkills, true) ? 0.15 : 1,
            $jobSkills
        ));
        $weightedMatchedSkills = array_sum(array_map(
            fn ($skill) => in_array($skill, $genericSkills, true) ? 0.15 : 1,
            $matchedSkills
        ));
        $skillScore = $weightedJobSkills > 0
            ? ($weightedMatchedSkills / $weightedJobSkills) * 25
            : 0;
        $skillScore = round(min($skillScore, 25), 2);

        $requiredExperience = (float) ($job->minimum_experience ?? 0);
        $candidateExperience = 0;
        if (preg_match('/([0-9]+(?:\.[0-9]+)?)\+?\s*(?:years?|yrs?)/i', $cvText, $matches)) {
            $candidateExperience = (float) $matches[1];
        } elseif (preg_match('/([0-9]+(?:\.[0-9]+)?)\+?\s*(?:months?|mos?)/i', $cvText, $matches)) {
            $candidateExperience = round(((float) $matches[1]) / 12, 2);
        }

        $jobTitleWords = $this->getMeaningfulWords($job->title ?? '');
        $titleTerms = [];
        foreach ($jobTitleWords as $word) {
            $titleTerms = array_merge($titleTerms, $relatedTerms[$word] ?? [$word]);
        }
        $titleTerms = array_values(array_unique($titleTerms));
        $matchedTitleTerms = array_values(array_filter(
            $titleTerms,
            fn ($term) => $this->containsTerm($cvText, $term)
        ));
        $titleScore = count($titleTerms) > 0
            ? (count($matchedTitleTerms) / count($titleTerms)) * 10
            : 0;

        $department = strtolower(trim($job->department ?? ''));
        $departmentMatchedTerms = [];
        if ($department !== '' && $this->containsTerm($cvText, $department)) {
            $departmentMatchedTerms[] = $department;
        }
        $departmentScore = $department !== '' && count($departmentMatchedTerms) > 0 ? 5 : 0;
        $relevanceScore = round(min($titleScore + $departmentScore, 15), 2);

        $responsibilityTerms = array_values(array_unique(array_merge(
            $jobSkills,
            $this->getMeaningfulPhrases(
                implode(' ', [
                    $job->description ?? '',
                    $job->responsibilities ?? '',
                ])
            )
        )));
        $matchedResponsibilities = array_values(array_filter(
            $responsibilityTerms,
            fn ($term) => $this->containsTerm($cvText, $term)
        ));
        $responsibilitiesScore = count($responsibilityTerms) > 0
            ? (count($matchedResponsibilities) / count($responsibilityTerms)) * 30
            : 0;
        $responsibilitiesScore = round($responsibilitiesScore, 2);

        $hasRelevantExperience =
            count($matchedTitleTerms) > 0 ||
            count($departmentMatchedTerms) > 0 ||
            count(array_diff($matchedSkills, $genericSkills)) > 0 ||
            count($matchedResponsibilities) > 0;
        $experienceScore = $requiredExperience > 0 && $hasRelevantExperience
            ? min(($candidateExperience / $requiredExperience) * 20, 20)
            : 0;
        $experienceScore = round($experienceScore, 2);

        $educationTerms = [
            'degree', 'diploma', 'bachelor', 'master', 'phd', 'certification',
            'certified', 'license', 'licence', 'cpr', 'bls', 'rn',
        ];
        $jobEducationTerms = array_values(array_filter(
            $educationTerms,
            fn ($term) => $this->containsTerm($jobText, $term)
        ));
        $matchedEducationTerms = array_values(array_filter(
            $jobEducationTerms,
            fn ($term) => $this->containsTerm($cvText, $term)
        ));
        $educationScore = count($jobEducationTerms) > 0
            ? (count($matchedEducationTerms) / count($jobEducationTerms)) * 10
            : 0;
        $educationScore = round($educationScore, 2);

        $matchScore = round(min(
            $responsibilitiesScore + $skillScore + $experienceScore +
                $relevanceScore + $educationScore,
            100
        ), 2);
        if (!$hasRelevantExperience) {
            $matchScore = min($matchScore, 39.99);
        }

        if ($matchScore >= 80) {
            $category = 'Strong Match';
        } elseif ($matchScore >= 60) {
            $category = 'Good Match';
        } elseif ($matchScore >= 40) {
            $category = 'Possible Match';
        } else {
            $category = 'Weak Match';
        }

        $application->update([
            'match_score' => $matchScore,
            'category' => $category,
            'skills_score' => $skillScore,
            'experience_score' => $experienceScore,
            'relevance_score' => $relevanceScore,
        ]);

        return [
            'total_score' => $matchScore,
            'category' => $category,
            'breakdown' => [
                'responsibilities' => [
                    'score' => $responsibilitiesScore,
                    'maximum' => 30,
                    'matched' => $matchedResponsibilities,
                    'requirements' => $responsibilityTerms,
                ],
                'skills' => [
                    'score' => $skillScore,
                    'maximum' => 25,
                    'matched' => $matchedSkills,
                    'job_keywords' => $jobSkills,
                    'details' => $skillMatches,
                ],
                'experience' => [
                    'score' => $experienceScore,
                    'maximum' => 20,
                    'required_years' => $requiredExperience,
                    'candidate_years' => $candidateExperience,
                ],
                'relevance' => [
                    'score' => $relevanceScore,
                    'maximum' => 15,
                    'title_score' => round($titleScore, 2),
                    'title_matches' => $matchedTitleTerms,
                    'department_score' => round($departmentScore, 2),
                    'department_matches' => $departmentMatchedTerms,
                    'education' => [
                        'score' => $educationScore,
                        'maximum' => 10,
                        'matched' => $matchedEducationTerms,
                        'job_requirements' => $jobEducationTerms,
                    ],
                ],
            ],
        ];


        if (false) {

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

        $genericSkills = [
            'communication',
            'leadership',
            'management',
            'administration',
            'documentation',
            'training',
            'performance',
            'customer service',
            'project management',
            'excel',
            'microsoft office',
            'google workspace',
        ];

        $meaningfulSkillMatches = array_diff(
            $matchedSkills,
            $genericSkills
        );

        $hasMeaningfulRelevance =
            count($matchedTitleTerms) > 0 ||
            count($departmentMatchedTerms) > 0 ||
            count($meaningfulSkillMatches) > 0;

        $matchScore = round(
            $skillScore +
            $experienceScore +
            $relevanceScore,
            2
        );

        if (!$hasMeaningfulRelevance) {
            $matchScore = min($matchScore, 39.99);
        }


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
    }


    /**
     * Match a whole word or phrase rather than an arbitrary substring.
     */
    private function containsTerm(string $text, string $term): bool
    {
        $term = trim(strtolower($term));

        if ($term === '') {
            return false;
        }

        return preg_match(
            '/(?<![a-z0-9])' . preg_quote($term, '/') . '(?![a-z0-9])/i',
            $text
        ) === 1;
    }


    private function getMeaningfulPhrases(string $text): array
    {
        $phrases = [];
        $segments = preg_split('/[.;:\n]+/', strtolower($text));

        foreach ($segments as $segment) {
            $words = $this->getMeaningfulWords($segment);

            for ($index = 0; $index < count($words) - 1; $index++) {
                $phrases[] = $words[$index] . ' ' . $words[$index + 1];
            }
        }

        return array_values(array_unique($phrases));
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

            'hr' => [
                'hr',
                'human resources',
                'human resource'
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