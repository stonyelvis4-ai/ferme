<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('buildings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type');
            $table->decimal('capacity', 12, 2)->default(0);
            $table->string('assigned_use')->nullable();
            $table->string('status')->default('active');
            $table->string('state')->default('good');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('enclosures', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('building_id')->constrained('buildings')->cascadeOnDelete();
            $table->string('name');
            $table->string('type');
            $table->decimal('capacity', 12, 2)->default(0);
            $table->string('assigned_use')->nullable();
            $table->string('status')->default('active');
            $table->string('state')->default('good');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enclosures');
        Schema::dropIfExists('buildings');
    }
};
