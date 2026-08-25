<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Candidate extends Model
{
    use HasFactory;

    /**
     * Fields that can be mass assigned.
     */
    protected $fillable = [
        'user_id',
        'phone',
        'linkedin',
        'address',
        'bio',
    ];


    /**
     * A candidate belongs to a user.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }


    /**
     * A candidate can have multiple CVs.
     */
    public function cvs()
    {
        return $this->hasMany(Cv::class);
    }


    /**
     * A candidate can have multiple applications.
     */
    public function applications()
    {
        return $this->hasMany(Application::class);
    }
}