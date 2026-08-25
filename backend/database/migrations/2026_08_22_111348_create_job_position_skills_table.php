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
Schema::create('job_position_skills', function (Blueprint $table) {
    $table->id();

    $table->foreignId('job_position_id')
        ->constrained('job_positions')
        ->onDelete('cascade');

    $table->foreignId('skill_id')
        ->constrained('skills')
        ->onDelete('cascade');

    $table->boolean('is_required')->default(true);

    $table->timestamps();

    $table->unique(['job_position_id', 'skill_id']);
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_position_skills');
    }
};
