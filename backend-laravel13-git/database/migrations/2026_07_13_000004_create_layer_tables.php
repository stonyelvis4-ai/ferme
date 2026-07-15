<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('layer_batches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('breed');
            $table->date('entry_date');
            $table->unsignedInteger('initial_count');
            $table->unsignedInteger('mortality_total')->default(0);
            $table->unsignedInteger('reform_total')->default(0);
            $table->unsignedInteger('current_count');
            $table->string('status')->default('active');
            $table->timestamps();
        });

        Schema::create('egg_productions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('layer_batch_id')->constrained('layer_batches')->cascadeOnDelete();
            $table->date('production_date');
            $table->unsignedInteger('eggs_produced');
            $table->unsignedInteger('broken_eggs')->default(0);
            $table->unsignedInteger('dirty_eggs')->default(0);
            $table->unsignedInteger('lost_eggs')->default(0);
            $table->unsignedInteger('mortality')->default(0);
            $table->text('observations')->nullable();
            $table->unsignedInteger('vendable_eggs');
            $table->unsignedInteger('plateaux');
            $table->timestamps();
        });

        Schema::create('egg_sales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->foreignId('layer_batch_id')->constrained('layer_batches')->cascadeOnDelete();
            $table->date('sale_date');
            $table->string('customer_name');
            $table->unsignedInteger('trays_sold');
            $table->unsignedInteger('eggs_sold');
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
        Schema::dropIfExists('egg_sales');
        Schema::dropIfExists('egg_productions');
        Schema::dropIfExists('layer_batches');
    }
};

