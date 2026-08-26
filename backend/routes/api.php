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

Route::post('/login/candidate', [AuthController::class, 'loginCandidate']);
Route::post('/login/hr', [AuthController::class, 'loginHr']);

// Candidate registration
Route::post(
    '/register-candidate',
    [AuthController::class, 'registerCandidate']
);
Route::post('/register-hr', [AuthController::class, 'registerHr']);


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

    Route::post('/logout', [AuthController::class, 'logout']);


    /*
    |--------------------------------------------------------------------------
    | Job Vacancies
    |--------------------------------------------------------------------------
    */

    Route::get('/job-positions', [JobPositionController::class, 'index']);

    Route::middleware('role:HR Manager')->group(function () {
        Route::post('/job-positions', [JobPositionController::class, 'store']);
        Route::get('/job-positions/{id}', [JobPositionController::class, 'show']);
        Route::delete('/job-positions/{id}', [JobPositionController::class, 'destroy']);
        Route::patch('/applications/{id}/status', [ApplicationController::class, 'updateStatus']);
        Route::post('/applications/{id}/evaluate', [ApplicationController::class, 'evaluate']);
        Route::get('/candidates', [CandidateController::class, 'index']);
        Route::post('/candidates', [CandidateController::class, 'store']);
        Route::get('/candidates/{id}', [CandidateController::class, 'show']);
    });

    /*
    |--------------------------------------------------------------------------
    | Candidates
    |--------------------------------------------------------------------------
    */

    /*
    |--------------------------------------------------------------------------
    | CV Management
    |--------------------------------------------------------------------------
    */

    Route::middleware('role:Candidate')->group(function () {
        Route::post('/cvs', [CvController::class, 'store']);
        Route::get('/cvs', [CvController::class, 'index']);
        Route::get('/cvs/{id}', [CvController::class, 'show']);
    });


    /*
    |--------------------------------------------------------------------------
    | Applications
    |--------------------------------------------------------------------------
    */

    Route::get(
        '/applications',
        [ApplicationController::class, 'index']
    );

    Route::middleware('role:Candidate')->post(
        '/applications',
        [ApplicationController::class, 'store']
    );

    Route::get(
        '/applications/{id}',
        [ApplicationController::class, 'show']
    );

});