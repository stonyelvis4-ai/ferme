<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('farms', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->foreignId('administrator_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('status')->default('active');
            $table->string('currency')->default('FCFA');
            $table->string('area_unit')->default('ha');
            $table->string('manager_name')->nullable();
            $table->string('contact_email')->nullable();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('farm_id')->nullable()->constrained('farms')->nullOnDelete();
        });

        Schema::create('farm_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->string('currency')->default('FCFA');
            $table->string('area_unit')->default('ha');
            $table->string('weight_unit')->default('kg');
            $table->decimal('egg_tray_default_price', 12, 2)->default(0);
            $table->decimal('fish_kg_default_price', 12, 2)->default(0);
            $table->decimal('crop_kg_default_price', 12, 2)->default(0);
            $table->integer('low_stock_threshold')->default(0);
            $table->integer('default_reminder_24h')->default(1);
            $table->integer('default_reminder_6h')->default(1);
            $table->integer('default_reminder_1h')->default(1);
            $table->timestamps();
        });

        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('source_module')->nullable();
            $table->string('source_entity_type')->nullable();
            $table->string('source_entity_id')->nullable();
            $table->string('priority')->default('normal');
            $table->string('status')->default('todo');
            $table->timestamp('due_at')->nullable();
            $table->timestamp('reminder_at')->nullable();
            $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });

        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('farm_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('module');
            $table->string('entity_type')->nullable();
            $table->string('entity_id')->nullable();
            $table->string('action');
            $table->longText('old_value')->nullable();
            $table->longText('new_value')->nullable();
            $table->string('source')->default('web');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('tasks');
        Schema::dropIfExists('farm_settings');
        Schema::dropIfExists('farms');
    }
};
