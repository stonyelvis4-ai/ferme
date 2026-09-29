<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('api_idempotency', function (Blueprint $table) {
            $table->string('scope', 64)->primary();
            $table->foreignId('farm_id')->constrained()->cascadeOnDelete();
            $table->string('fingerprint', 64);
            $table->unsignedSmallInteger('status');
            $table->longText('body');
            $table->timestamp('created_at');
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('api_idempotency');
    }
};
