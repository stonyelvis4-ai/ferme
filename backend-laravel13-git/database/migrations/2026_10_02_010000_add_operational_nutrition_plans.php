<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('layer_feed_plans', function (Blueprint $table) {
            $table->date('end_date')->nullable()->after('start_date');
            $table->boolean('tasks_enabled')->default(true)->after('is_active');
        });

        Schema::create('fish_feed_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fish_pond_id')->constrained('fish_ponds')->cascadeOnDelete();
            $table->foreignId('stock_item_id')->nullable()->constrained('stock_items')->nullOnDelete();
            $table->string('plan_name');
            $table->string('ration_mode')->default('fixed_kg');
            $table->decimal('ration_value', 12, 3);
            $table->unsignedTinyInteger('feedings_per_day')->default(1);
            $table->decimal('target_daily_quantity_kg', 12, 3)->default(0);
            $table->date('start_date');
            $table->date('end_date')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['farm_id', 'fish_pond_id', 'is_active']);
        });

        Schema::create('crop_nutrition_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('crop_id')->constrained('crops')->cascadeOnDelete();
            $table->foreignId('plot_id')->constrained('plots')->cascadeOnDelete();
            $table->foreignId('stock_item_id')->nullable()->constrained('stock_items')->nullOnDelete();
            $table->string('plan_name');
            $table->decimal('dose_kg_per_hectare', 12, 3);
            $table->json('application_dates');
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['farm_id', 'crop_id', 'is_active']);
        });

        Schema::create('nutrition_plan_occurrences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->string('plan_type');
            $table->unsignedBigInteger('plan_id');
            $table->foreignId('task_id')->nullable()->unique()->constrained('tasks')->nullOnDelete();
            $table->foreignId('stock_item_id')->nullable()->constrained('stock_items')->nullOnDelete();
            $table->date('scheduled_for');
            $table->decimal('planned_quantity_kg', 12, 3);
            $table->string('status')->default('todo');
            $table->decimal('actual_quantity_kg', 12, 3)->nullable();
            $table->foreignId('actual_stock_item_id')->nullable()->constrained('stock_items')->nullOnDelete();
            $table->text('actual_notes')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['plan_type', 'plan_id', 'scheduled_for'], 'nutrition_plan_occurrence_unique');
            $table->index(['farm_id', 'status', 'scheduled_for']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nutrition_plan_occurrences');
        Schema::dropIfExists('crop_nutrition_plans');
        Schema::dropIfExists('fish_feed_plans');
        Schema::table('layer_feed_plans', function (Blueprint $table) {
            $table->dropColumn(['end_date', 'tasks_enabled']);
        });
    }
};
