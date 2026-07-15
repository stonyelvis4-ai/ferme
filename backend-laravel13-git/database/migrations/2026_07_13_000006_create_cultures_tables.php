<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crops', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('variety');
            $table->unsignedInteger('cycle_days');
            $table->date('planting_date');
            $table->decimal('area', 12, 2);
            $table->string('status')->default('growing');
            $table->date('estimated_harvest_date')->nullable();
            $table->decimal('expected_yield_kg', 12, 2)->default(0);
            $table->decimal('total_operations_cost', 14, 2)->default(0);
            $table->decimal('total_harvest_kg', 14, 2)->default(0);
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('plots', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('crop_id')->constrained('crops')->cascadeOnDelete();
            $table->string('name');
            $table->decimal('area', 12, 2);
            $table->string('soil_type');
            $table->string('location')->nullable();
            $table->string('status')->default('active');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('crop_operations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('crop_id')->constrained('crops')->cascadeOnDelete();
            $table->foreignId('plot_id')->constrained('plots')->cascadeOnDelete();
            $table->date('operation_date');
            $table->string('type');
            $table->text('description')->nullable();
            $table->decimal('quantity', 12, 2)->default(0);
            $table->string('unit')->default('unite');
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->decimal('total_cost', 14, 2)->default(0);
            $table->text('notes')->nullable();
            $table->foreignId('financial_transaction_id')->nullable()->constrained('financial_transactions')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('crop_harvests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('crop_id')->constrained('crops')->cascadeOnDelete();
            $table->foreignId('plot_id')->constrained('plots')->cascadeOnDelete();
            $table->date('harvest_date');
            $table->decimal('harvested_kg', 12, 2);
            $table->decimal('losses_kg', 12, 2)->default(0);
            $table->decimal('sellable_kg', 12, 2);
            $table->string('destination');
            $table->text('notes')->nullable();
            $table->foreignId('stock_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('crop_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('crop_id')->constrained('crops')->cascadeOnDelete();
            $table->foreignId('crop_harvest_id')->nullable()->constrained('crop_harvests')->nullOnDelete();
            $table->date('sale_date');
            $table->string('customer_name');
            $table->decimal('kilograms_sold', 12, 2);
            $table->decimal('unit_price', 12, 2);
            $table->decimal('amount_paid', 14, 2)->default(0);
            $table->decimal('remaining_due', 14, 2)->default(0);
            $table->string('payment_method');
            $table->text('notes')->nullable();
            $table->foreignId('stock_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete();
            $table->foreignId('financial_transaction_id')->nullable()->constrained('financial_transactions')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crop_sales');
        Schema::dropIfExists('crop_harvests');
        Schema::dropIfExists('crop_operations');
        Schema::dropIfExists('plots');
        Schema::dropIfExists('crops');
    }
};
