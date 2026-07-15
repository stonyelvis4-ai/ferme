<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fish_ponds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('pond_type');
            $table->decimal('capacity_kg', 12, 2)->default(0);
            $table->string('species');
            $table->unsignedInteger('initial_fish_count');
            $table->date('stocking_date');
            $table->string('status')->default('active');
            $table->unsignedInteger('current_estimated_count')->default(0);
            $table->unsignedInteger('mortality_total')->default(0);
            $table->decimal('average_weight_kg', 12, 2)->default(0);
            $table->decimal('biomass_kg', 12, 2)->default(0);
            $table->decimal('feed_distributed_kg', 12, 2)->default(0);
            $table->decimal('fcr', 8, 2)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('fish_stockings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fish_pond_id')->constrained('fish_ponds')->cascadeOnDelete();
            $table->date('stocking_date');
            $table->unsignedInteger('fish_count');
            $table->decimal('average_weight_kg', 12, 2)->default(0);
            $table->decimal('total_weight_kg', 12, 2)->default(0);
            $table->string('supplier_name')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('fish_monitorings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fish_pond_id')->constrained('fish_ponds')->cascadeOnDelete();
            $table->date('monitoring_date');
            $table->unsignedInteger('estimated_count');
            $table->unsignedInteger('mortality')->default(0);
            $table->decimal('average_weight_kg', 12, 2);
            $table->decimal('biomass_kg', 12, 2)->default(0);
            $table->decimal('feed_distributed_kg', 12, 2)->default(0);
            $table->decimal('fcr', 8, 2)->nullable();
            $table->decimal('growth_kg', 12, 2)->nullable();
            $table->decimal('water_temperature', 8, 2)->nullable();
            $table->decimal('ph', 8, 2)->nullable();
            $table->decimal('oxygen', 8, 2)->nullable();
            $table->decimal('turbidity', 8, 2)->nullable();
            $table->decimal('water_renewal_percent', 8, 2)->nullable();
            $table->text('observations')->nullable();
            $table->timestamps();
        });

        Schema::create('fish_harvests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fish_pond_id')->constrained('fish_ponds')->cascadeOnDelete();
            $table->date('harvest_date');
            $table->decimal('total_weight_kg', 12, 2);
            $table->decimal('losses_kg', 12, 2)->default(0);
            $table->decimal('sellable_weight_kg', 12, 2);
            $table->string('destination');
            $table->text('notes')->nullable();
            $table->foreignId('stock_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('fish_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('fish_pond_id')->constrained('fish_ponds')->cascadeOnDelete();
            $table->foreignId('fish_harvest_id')->nullable()->constrained('fish_harvests')->nullOnDelete();
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
        Schema::dropIfExists('fish_sales');
        Schema::dropIfExists('fish_harvests');
        Schema::dropIfExists('fish_monitorings');
        Schema::dropIfExists('fish_stockings');
        Schema::dropIfExists('fish_ponds');
    }
};
