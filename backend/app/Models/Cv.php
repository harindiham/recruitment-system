<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cv extends Model
{
    use HasFactory;

    protected $fillable = [
        'candidate_id',
        'file_name',
        'file_path',
        'file_type',
        'extracted_text',
        'processing_status',
    ];

    public function candidate(): BelongsTo
    {
        return $this->belongsTo(Candidate::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(Application::class);
    }
}