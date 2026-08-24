<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('sanitary_treatments', function (Blueprint $table): void {
            $table->foreignId('stock_movement_id')->nullable()->constrained('stock_movements')->nullOnDelete();
            $table->foreignId('financial_transaction_id')->nullable()->constrained('financial_transactions')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('sanitary_treatments', function (Blueprint $table): void {
            $table->dropConstrainedForeignId('financial_transaction_id');
            $table->dropConstrainedForeignId('stock_movement_id');
        });
    }
};
