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
Schema::create('job_positions', function (Blueprint $table) {

    $table->id();

    $table->string('title');

    $table->string('department');

    $table->text('description');

    $table->text('responsibilities')->nullable();

    $table->integer('minimum_experience')->default(0);

    $table->string('employment_type')->nullable();

    $table->string('status')->default('open');

    $table->foreignId('created_by')
        ->constrained('users')
        ->onDelete('cascade');

    $table->timestamps();

});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_positions');
    }
};
