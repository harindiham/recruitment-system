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
        Schema::create('applications', function (Blueprint $table) {
    $table->id();

    $table->foreignId('candidate_id')
        ->constrained('candidates')
        ->onDelete('cascade');

    $table->foreignId('job_position_id')
        ->constrained('job_positions')
        ->onDelete('cascade');

    $table->foreignId('cv_id')
        ->nullable()
        ->constrained('cvs')
        ->nullOnDelete();

    $table->string('status')->default('new');

    $table->decimal('match_score', 5, 2)->nullable();

    $table->string('category')->nullable();

    $table->timestamp('applied_at')->nullable();

    $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('applications');
    }
};
