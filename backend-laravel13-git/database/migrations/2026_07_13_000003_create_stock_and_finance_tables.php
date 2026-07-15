<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('category');
            $table->string('unit');
            $table->unsignedInteger('minimum_threshold')->default(0);
            $table->unsignedInteger('current_quantity')->default(0);
            $table->string('location')->nullable();
            $table->timestamps();
        });

        Schema::create('stock_movements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('stock_item_id')->constrained('stock_items')->cascadeOnDelete();
            $table->string('type');
            $table->unsignedInteger('quantity');
            $table->decimal('unit_cost', 12, 2)->nullable();
            $table->string('source_module')->nullable();
            $table->string('source_entity_type')->nullable();
            $table->string('source_entity_id')->nullable();
            $table->string('operation_id')->nullable();
            $table->timestamps();
        });

        Schema::create('financial_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->decimal('amount', 14, 2);
            $table->string('category');
            $table->text('description')->nullable();
            $table->string('source_module')->nullable();
            $table->string('source_entity_type')->nullable();
            $table->string('source_entity_id')->nullable();
            $table->string('operation_id')->nullable();
            $table->timestamp('occurred_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('financial_transactions');
        Schema::dropIfExists('stock_movements');
        Schema::dropIfExists('stock_items');
    }
};

