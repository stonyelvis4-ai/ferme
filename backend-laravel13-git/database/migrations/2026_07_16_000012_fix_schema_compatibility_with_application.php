<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('stock_items', 'unit_cost')) {
            Schema::table('stock_items', function (Blueprint $table) {
                $table->decimal('unit_cost', 12, 2)->default(0)->after('unit');
            });
        }

        $settingsIdsToKeep = [];

        foreach (DB::table('farm_settings')->orderBy('id')->get()->groupBy('farm_id') as $settingsRows) {
            $keptSettings = $settingsRows->last();
            $settingsIdsToKeep[] = $keptSettings->id;
        }

        if ($settingsIdsToKeep !== []) {
            DB::table('farm_settings')
                ->whereNotIn('id', $settingsIdsToKeep)
                ->delete();
        }

        Schema::table('farm_settings', function (Blueprint $table) {
            $table->unique('farm_id');
        });
    }

    public function down(): void
    {
        Schema::table('farm_settings', function (Blueprint $table) {
            $table->dropUnique(['farm_id']);
        });

        if (Schema::hasColumn('stock_items', 'unit_cost')) {
            Schema::table('stock_items', function (Blueprint $table) {
                $table->dropColumn('unit_cost');
            });
        }
    }
};
