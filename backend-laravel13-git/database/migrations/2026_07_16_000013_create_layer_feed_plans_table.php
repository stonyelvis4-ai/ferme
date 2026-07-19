<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('layer_feed_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('layer_batch_id')->constrained('layer_batches')->cascadeOnDelete();
            $table->foreignId('stock_item_id')->nullable()->constrained('stock_items')->nullOnDelete();
            $table->string('plan_name');
            $table->decimal('ration_per_head_kg', 10, 3);
            $table->unsignedTinyInteger('feedings_per_day')->default(2);
            $table->decimal('target_daily_quantity_kg', 10, 3)->default(0);
            $table->date('start_date');
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['farm_id', 'layer_batch_id', 'is_active'], 'layer_feed_plans_farm_batch_active_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('layer_feed_plans');
    }
};
