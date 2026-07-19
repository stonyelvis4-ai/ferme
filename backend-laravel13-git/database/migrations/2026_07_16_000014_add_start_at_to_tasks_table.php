<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->timestamp('start_at')->nullable()->after('source_entity_id');
        });

        DB::table('tasks')
            ->whereNull('start_at')
            ->whereNotNull('due_at')
            ->update([
                'start_at' => DB::raw('due_at'),
            ]);
    }

    public function down(): void
    {
        Schema::table('tasks', function (Blueprint $table) {
            $table->dropColumn('start_at');
        });
    }
};
