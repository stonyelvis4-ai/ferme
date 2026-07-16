<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('layer_batches', function (Blueprint $table) {
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->decimal('acquisition_cost', 14, 2)->default(0);
            $table->foreignId('financial_transaction_id')->nullable()->constrained('financial_transactions')->nullOnDelete();
        });

        Schema::table('fish_ponds', function (Blueprint $table) {
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->decimal('acquisition_cost', 14, 2)->default(0);
        });

        Schema::table('fish_stockings', function (Blueprint $table) {
            $table->decimal('unit_cost', 12, 2)->default(0);
            $table->decimal('acquisition_cost', 14, 2)->default(0);
            $table->foreignId('financial_transaction_id')->nullable()->constrained('financial_transactions')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('fish_stockings', function (Blueprint $table) {
            $table->dropConstrainedForeignId('financial_transaction_id');
            $table->dropColumn(['unit_cost', 'acquisition_cost']);
        });

        Schema::table('fish_ponds', function (Blueprint $table) {
            $table->dropColumn(['unit_cost', 'acquisition_cost']);
        });

        Schema::table('layer_batches', function (Blueprint $table) {
            $table->dropConstrainedForeignId('financial_transaction_id');
            $table->dropColumn(['unit_cost', 'acquisition_cost']);
        });
    }
};
