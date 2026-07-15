<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('farm_settings', function (Blueprint $table) {
            $table->integer('mortalite_threshold_layers')->default(0)->after('low_stock_threshold');
            $table->integer('mortalite_threshold_fish')->default(0)->after('mortalite_threshold_layers');
            $table->integer('egg_breakage_threshold')->default(0)->after('mortalite_threshold_fish');
            $table->decimal('laying_rate_low_threshold', 8, 2)->default(0)->after('egg_breakage_threshold');
            $table->decimal('fish_ph_min', 8, 2)->default(0)->after('laying_rate_low_threshold');
            $table->decimal('fish_ph_max', 8, 2)->default(0)->after('fish_ph_min');
            $table->decimal('fish_oxygen_min', 8, 2)->default(0)->after('fish_ph_max');
            $table->decimal('fish_temperature_min', 8, 2)->default(0)->after('fish_oxygen_min');
            $table->decimal('fish_temperature_max', 8, 2)->default(0)->after('fish_temperature_min');
            $table->decimal('crop_yield_low_threshold', 8, 2)->default(0)->after('fish_temperature_max');
            $table->json('task_categories')->nullable()->after('crop_yield_low_threshold');
            $table->json('task_priorities')->nullable()->after('task_categories');
            $table->json('alert_rules')->nullable()->after('task_priorities');
        });
    }

    public function down(): void
    {
        Schema::table('farm_settings', function (Blueprint $table) {
            $table->dropColumn([
                'mortalite_threshold_layers',
                'mortalite_threshold_fish',
                'egg_breakage_threshold',
                'laying_rate_low_threshold',
                'fish_ph_min',
                'fish_ph_max',
                'fish_oxygen_min',
                'fish_temperature_min',
                'fish_temperature_max',
                'crop_yield_low_threshold',
                'task_categories',
                'task_priorities',
                'alert_rules',
            ]);
        });
    }
};
