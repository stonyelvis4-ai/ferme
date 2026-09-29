<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Preserve historical rows; services also check their original operation fields.
        foreach (['stock_movements', 'financial_transactions'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->string('idempotency_key', 64)->nullable()->unique();
            });
        }
    }

    public function down(): void
    {
        foreach (['stock_movements', 'financial_transactions'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->dropUnique(['idempotency_key']);
                $blueprint->dropColumn('idempotency_key');
            });
        }
    }
};
