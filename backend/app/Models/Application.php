<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    use HasFactory;

protected $fillable = [
    'candidate_id',
    'job_position_id',
    'cv_id',
    'status',
    'match_score',
    'category',
    'skills_score',
    'experience_score',
    'relevance_score',
    'applied_at',
];

protected $casts = [
    'match_score' => 'float',
    'skills_score' => 'float',
    'experience_score' => 'float',
    'relevance_score' => 'float',
];

    public function candidate()
    {
        return $this->belongsTo(Candidate::class);
    }

    public function jobPosition()
    {
        return $this->belongsTo(JobPosition::class);
    }

    public function cv()
    {
        return $this->belongsTo(Cv::class);
    }
}