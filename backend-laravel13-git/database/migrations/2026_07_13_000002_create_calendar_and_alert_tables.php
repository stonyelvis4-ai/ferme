<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('calendar_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->timestamp('start_at');
            $table->timestamp('end_at')->nullable();
            $table->foreignId('linked_task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->string('source_module')->nullable();
            $table->string('source_entity_type')->nullable();
            $table->string('source_entity_id')->nullable();
            $table->timestamps();
        });

        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('severity')->default('medium');
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('source_module')->nullable();
            $table->string('source_entity_type')->nullable();
            $table->string('source_entity_id')->nullable();
            $table->string('status')->default('open');
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alerts');
        Schema::dropIfExists('calendar_events');
    }
};

