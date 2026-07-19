<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('layer_weighings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('layer_batch_id')->constrained('layer_batches')->cascadeOnDelete();
            $table->date('weighing_date');
            $table->unsignedInteger('sample_size')->nullable();
            $table->decimal('average_weight_kg', 10, 3);
            $table->decimal('total_weight_kg', 12, 3)->default(0);
            $table->decimal('weight_gain_kg', 10, 3)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['farm_id', 'layer_batch_id', 'weighing_date'], 'layer_weighings_farm_batch_date_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('layer_weighings');
    }
};
