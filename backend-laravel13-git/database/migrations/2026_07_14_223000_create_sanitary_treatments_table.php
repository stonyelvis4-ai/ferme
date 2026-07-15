<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sanitary_treatments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('layer_batch_id')->nullable()->constrained('layer_batches')->nullOnDelete();
            $table->string('type')->default('treatment');
            $table->string('name');
            $table->date('planned_date');
            $table->string('dosage')->nullable();
            $table->foreignId('product_id')->nullable()->constrained('stock_items')->nullOnDelete();
            $table->decimal('quantity_used', 12, 2)->default(0);
            $table->string('status')->default('planned');
            $table->decimal('cost', 12, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sanitary_treatments');
    }
};
