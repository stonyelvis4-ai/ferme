<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('layer_feedings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('layer_batch_id')->constrained('layer_batches')->cascadeOnDelete();
            $table->foreignId('stock_item_id')->constrained('stock_items')->cascadeOnDelete();
            $table->date('feeding_date');
            $table->string('feeding_time', 5)->nullable();
            $table->decimal('quantity', 12, 2);
            $table->string('unit', 50);
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->decimal('total_cost', 14, 2)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('stock_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete();
            $table->foreignId('financial_transaction_id')->nullable()->constrained('financial_transactions')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('layer_feedings');
    }
};
