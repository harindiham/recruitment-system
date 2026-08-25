<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->decimal('skills_score', 5, 2)->nullable()->after('match_score');
            $table->decimal('experience_score', 5, 2)->nullable()->after('skills_score');
            $table->decimal('relevance_score', 5, 2)->nullable()->after('experience_score');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('applications', function (Blueprint $table) {
            $table->dropColumn([
                'skills_score',
                'experience_score',
                'relevance_score',
            ]);
        });
    }
};