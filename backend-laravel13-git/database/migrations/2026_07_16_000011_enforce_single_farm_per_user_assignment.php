<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $assignmentIdsToKeep = [];

        foreach (DB::table('farm_user_assignments')->orderBy('id')->get()->groupBy('user_id') as $userId => $assignments) {
            $preferredFarmId = DB::table('users')->where('id', $userId)->value('farm_id');
            $keptAssignment = $assignments->firstWhere('farm_id', $preferredFarmId) ?? $assignments->last();
            $assignmentIdsToKeep[] = $keptAssignment->id;

            DB::table('users')
                ->where('id', $userId)
                ->update(['farm_id' => $keptAssignment->farm_id]);
        }

        if ($assignmentIdsToKeep !== []) {
            DB::table('farm_user_assignments')
                ->whereNotIn('id', $assignmentIdsToKeep)
                ->delete();
        }

        Schema::table('farm_user_assignments', function (Blueprint $table) {
            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::table('farm_user_assignments', function (Blueprint $table) {
            $table->dropUnique(['user_id']);
        });
    }
};
