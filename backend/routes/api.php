<?php

use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;
use App\Http\Controllers\JobPositionController;
use App\Http\Controllers\CvController;
use App\Http\Controllers\CandidateController;
use App\Http\Controllers\ApplicationController;


/*
|--------------------------------------------------------------------------
| Public Routes
|--------------------------------------------------------------------------
*/

// Login
Route::post(
    '/login',
    [AuthController::class, 'login']
)->name('login');

// Candidate registration
Route::post(
    '/register-candidate',
    [AuthController::class, 'registerCandidate']
);


/*
|--------------------------------------------------------------------------
| Protected Routes
|--------------------------------------------------------------------------
*/

Route::middleware('auth:sanctum')->group(function () {

    /*
    |--------------------------------------------------------------------------
    | Authentication
    |--------------------------------------------------------------------------
    */

    Route::post(
        '/logout',
        [AuthController::class, 'logout']
    );


    /*
    |--------------------------------------------------------------------------
    | Job Vacancies
    |--------------------------------------------------------------------------
    */

    Route::get(
        '/job-positions',
        [JobPositionController::class, 'index']
    );

    Route::post(
        '/job-positions',
        [JobPositionController::class, 'store']
    );

    Route::get(
        '/job-positions/{id}',
        [JobPositionController::class, 'show']
    );

    Route::delete(
        '/job-positions/{id}',
        [JobPositionController::class, 'destroy']
    );


    /*
    |--------------------------------------------------------------------------
    | Candidates
    |--------------------------------------------------------------------------
    */

    Route::get(
        '/candidates',
        [CandidateController::class, 'index']
    );

    Route::post(
        '/candidates',
        [CandidateController::class, 'store']
    );

    Route::get(
        '/candidates/{id}',
        [CandidateController::class, 'show']
    );


    /*
    |--------------------------------------------------------------------------
    | CV Management
    |--------------------------------------------------------------------------
    */

    Route::post(
        '/cvs',
        [CvController::class, 'store']
    );

    Route::get(
        '/cvs',
        [CvController::class, 'index']
    );

    Route::get(
        '/cvs/{id}',
        [CvController::class, 'show']
    );


    /*
    |--------------------------------------------------------------------------
    | Applications
    |--------------------------------------------------------------------------
    */

    Route::get(
        '/applications',
        [ApplicationController::class, 'index']
    );

    Route::post(
        '/applications',
        [ApplicationController::class, 'store']
    );

    Route::get(
        '/applications/{id}',
        [ApplicationController::class, 'show']
    );

    Route::patch(
        '/applications/{id}/status',
        [
            ApplicationController::class,
            'updateStatus'
        ]
    );


    /*
    |--------------------------------------------------------------------------
    | Application Evaluation
    |--------------------------------------------------------------------------
    */

    Route::post(
        '/applications/{id}/evaluate',
        [
            ApplicationController::class,
            'evaluate'
        ]
    );

});