<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plots', function (Blueprint $table): void {
            $table->dropForeign(['crop_id']);
            $table->foreignId('crop_id')->nullable()->change();
            $table->foreign('crop_id')->references('id')->on('crops')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('plots', function (Blueprint $table): void {
            $table->dropForeign(['crop_id']);
            $table->foreignId('crop_id')->nullable(false)->change();
            $table->foreign('crop_id')->references('id')->on('crops')->cascadeOnDelete();
        });
    }
};
